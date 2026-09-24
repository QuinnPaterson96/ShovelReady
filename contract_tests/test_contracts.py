"""Run explicitly; never imports application startup or legacy database fixtures."""

import json
import unittest
from decimal import Decimal

from pydantic import ValidationError

from app.contracts.bundle import BoundaryBundle
from app.contracts.common import Quantity, SourceSnapshot
from app.contracts.inputs import DesignRevision, PlacementRevision, SiteRevision
from app.contracts.results import DatasetReference, EvaluationResult
from app.contracts.rules import AcceptedRuleRevision, RuleCandidate
from contract_tests.fixtures import (
    CANDIDATE,
    DATASET,
    DESIGN,
    PLACEMENT,
    QUANTITY,
    RESULT,
    RULE,
    SITE,
    SOURCE,
    VERSION,
    copy_fixture,
    quantity,
)


class ContractTests(unittest.TestCase):
    boundaries = (
        (SourceSnapshot, SOURCE),
        (DesignRevision, DESIGN),
        (SiteRevision, SITE),
        (PlacementRevision, PLACEMENT),
        (RuleCandidate, CANDIDATE),
        (AcceptedRuleRevision, RULE),
        (DatasetReference, DATASET),
        (EvaluationResult, RESULT),
    )

    def test_wire_roundtrips_and_schema_generation(self):
        for model, fixture in self.boundaries:
            with self.subTest(model=model.__name__):
                obj = model.model_validate_json(json.dumps(fixture))
                self.assertEqual(obj, model.model_validate_json(obj.model_dump_json()))
                self.assertIn("schema_version", model.model_json_schema()["properties"])
                with self.assertRaises(ValidationError):
                    obj.schema_version = "changed"

    def test_every_boundary_rejects_unknown_version_fields_and_missing_identity(self):
        for model, fixture in self.boundaries:
            for change in ({"schema_version": "v99"}, {"unexpected": "ignored?"}):
                with self.subTest(model=model.__name__, change=change):
                    with self.assertRaises(ValidationError):
                        model.model_validate({**fixture, **change})
            payload = copy_fixture(fixture)
            key = next(
                k
                for k in ("identity", "snapshot_id", "candidate_id", "release_id", "evaluation_id")
                if k in payload
            )
            del payload[key]
            with self.assertRaises(ValidationError):
                model.model_validate(payload)

    def test_malformed_json_and_boolean_numeric_are_rejected(self):
        with self.assertRaises(ValidationError):
            RuleCandidate.model_validate_json('{"content":')
        for value in (True, "NaN", "Infinity", "-1"):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                Quantity.model_validate({**QUANTITY, "original_value": value})

    def test_percent_fsr_and_equivalent_units(self):
        self.assertEqual(Quantity.model_validate(QUANTITY).value, Decimal("0.45"))
        fsr = {
            **QUANTITY,
            "original_text": "FSR 1.2",
            "original_value": "1.2",
            "original_unit": "fraction",
            "value": "1.2",
            "basis": {"numerator": "regulatory_floor_area", "denominator": "lot_area"},
        }
        self.assertEqual(Quantity.model_validate(fsr).value, Decimal("1.2"))
        self.assertEqual(
            Quantity.model_validate(quantity("10", "ft", "3.048")).value,
            Quantity.model_validate(quantity("3.048")).value,
        )
        self.assertEqual(
            Quantity.model_validate(quantity("100", "ft2", "9.290304")).value,
            Quantity.model_validate(quantity("9.290304", "m2")).value,
        )
        for changes in ({"value": "45"}, {"basis": None}, {"unit": "m"}, {"dimension": "length"}):
            with self.assertRaises(ValidationError):
                Quantity.model_validate({**QUANTITY, **changes})

    def test_source_dates_are_not_capture_dates(self):
        self.assertIsNone(SourceSnapshot.model_validate(SOURCE).effective_from)
        with self.assertRaises(ValidationError):
            SourceSnapshot.model_validate({**SOURCE, "effective_from": "2026-09-18"})

    def test_measurements_preserve_missing_and_definition(self):
        design = DesignRevision.model_validate(DESIGN)
        self.assertIsNone(design.measurements[-1].quantity)  # roof not ceiling
        self.assertIsNone(design.measurements[-2].quantity)  # floor area not marketing area
        for change in ({"domain": "regulatory"}, {"status": "missing"}, {"quantity": quantity()}):
            payload = copy_fixture(DESIGN)
            payload["measurements"][0].update(change)
            with self.assertRaises(ValidationError):
                DesignRevision.model_validate(payload)

    def test_geometry_requires_crs_classification_and_review_provenance(self):
        for field in ("crs", "coordinates"):
            payload = copy_fixture(PLACEMENT)
            del payload["footprint"]["geometry"][field]
            with self.assertRaises(ValidationError):
                PlacementRevision.model_validate(payload)
        payload = copy_fixture(SITE)
        payload["geometry_facts"][2]["lot_line_classification"] = None
        with self.assertRaises(ValidationError):
            SiteRevision.model_validate(payload)
        payload = copy_fixture(SITE)
        payload["geometry_facts"][3]["provenance"]["review"]["reviewer"] = None
        with self.assertRaises(ValidationError):
            SiteRevision.model_validate(payload)

    def test_extraction_failure_absence_and_ambiguity_survive(self):
        for status in ("failed", "not_found_in_reviewed_scope", "ambiguous"):
            payload = {
                **CANDIDATE,
                "extraction_status": status,
                "content": None,
                "issues": ["Fixture reason"],
            }
            self.assertEqual(RuleCandidate.model_validate(payload).extraction_status, status)
        with self.assertRaises(ValidationError):
            RuleCandidate.model_validate({**CANDIDATE, "extraction_status": "failed"})

    def test_unresolved_comparison_and_external_reference_are_not_executable(self):
        payload = copy_fixture(RULE)
        payload["content"]["semantics"] = {
            "kind": "unresolved",
            "text": "7.5 m or 25% of lot depth, whichever is greater",
            "reason": "Historical handoff example; comparison not supported",
        }
        payload["content"]["references"] = [
            {
                "instrument": "Schedule C",
                "locator": "parking requirements",
                "relationship": "depends_on",
                "status": "unresolved",
                "target": None,
            }
        ]
        with self.assertRaises(ValidationError):
            AcceptedRuleRevision.model_validate(payload)
        payload["content"]["runtime_support"] = "unsupported"
        accepted = AcceptedRuleRevision.model_validate(payload)
        self.assertEqual(accepted.content.references[0].status, "unresolved")
        payload["review"]["status"] = "unreviewed"
        with self.assertRaises(ValidationError):
            AcceptedRuleRevision.model_validate(payload)

    def test_exact_bound_operator_is_preserved(self):
        for operator in ("<", "<=", ">", ">=", "=="):
            payload = copy_fixture(RULE)
            payload["content"]["semantics"]["operator"] = operator
            self.assertEqual(
                AcceptedRuleRevision.model_validate(payload).content.semantics.operator, operator
            )
        payload["content"]["semantics"]["operator"] = "minimum_and_maximum"
        with self.assertRaises(ValidationError):
            AcceptedRuleRevision.model_validate(payload)

    def test_nonconclusive_checks_cannot_be_candidates(self):
        for status in (
            "missing_fact",
            "extraction_failure",
            "outside_coverage",
            "unsupported_semantics",
            "unresolved_reference",
        ):
            payload = copy_fixture(RESULT)
            check = payload["alternatives"][0]["checks"][0]
            check["status"] = status
            check["missing_facts"] = ["roof_height"] if status == "missing_fact" else []
            with self.assertRaises(ValidationError):
                EvaluationResult.model_validate(payload)
            payload["outcome"] = payload["alternatives"][0]["outcome"] = "needs_investigation"
            result = EvaluationResult.model_validate(payload)
            self.assertEqual(result.alternatives[0].checks[0].status, status)

    def test_failed_placement_is_scoped_and_evidenced(self):
        payload = copy_fixture(RESULT)
        payload["outcome"] = payload["alternatives"][0]["outcome"] = (
            "no_match_under_evaluated_pathways"
        )
        payload["alternatives"][0]["checks"][0]["status"] = "supported_failure"
        self.assertEqual(EvaluationResult.model_validate(payload).scope, "supplied_placement_only")
        for change in ({"scope": "all_possible_placements"}, {"coverage": "outside_coverage"}):
            with self.assertRaises(ValidationError):
                EvaluationResult.model_validate({**payload, **change})
        payload["alternatives"][0]["checks"][0]["evidence"] = []
        with self.assertRaises(ValidationError):
            EvaluationResult.model_validate(payload)
        payload = copy_fixture(RESULT)
        payload["outcome"] = payload["alternatives"][0]["outcome"] = (
            "no_match_under_evaluated_pathways"
        )
        payload["alternatives"][0]["checks"][0]["status"] = "supported_failure"
        payload["alternatives"][0]["checks"].append(
            {
                "check_id": "unknown-overlay",
                "rule": None,
                "status": "unresolved_reference",
                "explanation": "Scope unresolved",
                "evidence": [],
                "missing_facts": [],
            }
        )
        with self.assertRaises(ValidationError):
            EvaluationResult.model_validate(payload)

    def test_alternatives_and_release_references_cannot_be_mixed(self):
        for change in ({"revision_id": "unreleased"}, {"logical_id": "other-alternative"}):
            payload = copy_fixture(RESULT)
            payload["alternatives"][0]["checks"][0]["rule"].update(change)
            with self.assertRaises(ValidationError):
                EvaluationResult.model_validate(payload)
        payload = copy_fixture(RESULT)
        other = copy_fixture(payload["dataset"]["alternatives"][0])
        other["alternative_id"] = "unresolved-alternative"
        payload["dataset"]["alternatives"].append(other)
        with self.assertRaises(ValidationError):
            EvaluationResult.model_validate(payload)

    def test_bundle_rejects_dangling_and_cross_crs_references(self):
        bundle = {
            "schema_version": VERSION,
            "sources": [SOURCE],
            "designs": [DESIGN],
            "sites": [SITE],
            "placements": [PLACEMENT],
            "candidates": [CANDIDATE],
            "rules": [RULE],
            "dataset": DATASET,
            "evaluations": [RESULT],
        }
        BoundaryBundle.model_validate(bundle)
        payload = copy_fixture(bundle)
        payload["dataset"]["source_snapshot_ids"] = ["absent"]
        with self.assertRaises(ValidationError):
            BoundaryBundle.model_validate(payload)
        payload = copy_fixture(bundle)
        payload["placements"][0]["footprint"]["geometry"]["crs"]["identifier"] = "other-crs"
        with self.assertRaises(ValidationError):
            BoundaryBundle.model_validate(payload)
        payload = copy_fixture(bundle)
        payload["evaluations"][0]["design"]["revision_id"] = "different-design"
        with self.assertRaises(ValidationError):
            BoundaryBundle.model_validate(payload)


if __name__ == "__main__":
    unittest.main()
