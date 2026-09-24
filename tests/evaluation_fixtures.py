"""Invented direct-measurement cases; see fixtures/evaluation/README.md."""

import json
from copy import deepcopy
from hashlib import sha256
from pathlib import Path

from contract_tests.fixtures import DESIGN, PLACEMENT, SITE

ORACLE = Path(__file__).parent / "fixtures/evaluation/README.md"
V = "sr-04.v1-provisional"


def ref(name):
    return {"logical_id": name, "revision_id": f"{name}-r1"}


def quantity(value="10", unit="m", normalized=None, basis=None):
    # Explicit expected conversions come from test cases, not a conversion helper.
    dimension = {
        "m": "length",
        "ft": "length",
        "m2": "area",
        "ft2": "area",
        "%": "ratio",
        "fraction": "ratio",
        "count": "count",
    }[unit]
    canonical = {"ft": "m", "ft2": "m2", "%": "fraction"}.get(unit, unit)
    return dict(
        original_text=f"{value} {unit}",
        original_value=value,
        original_unit=unit,
        dimension=dimension,
        value=normalized or value,
        unit=canonical,
        basis=basis,
    )


def request():
    review = dict(
        status="accepted",
        reviewer="synthetic-test-author",
        reviewed_at="2026-09-24T12:00:00Z",
        scope="synthetic arithmetic only",
        rationale="Invented fixture, not professional review or legal evidence",
    )
    evidence = dict(
        snapshot_id="synthetic-arithmetic",
        locator="Independent expected arithmetic",
        excerpt="Ten feet is exactly 3.048 metres",
        context="Invented evaluator software test; no municipal source",
    )
    provenance = dict(method="supplied", evidence=[evidence], review=review, uncertainty=[])
    # Reuse only SR-04 synthetic input geometry structure, never asserted results.
    design, site, placement = deepcopy((DESIGN, SITE, PLACEMENT))

    def replace_provenance(node):
        if isinstance(node, dict):
            for key, value in list(node.items()):
                if key == "provenance":
                    node[key] = deepcopy(provenance)
                else:
                    replace_provenance(value)
        elif isinstance(node, list):
            for value in node:
                replace_provenance(value)

    for item in (design, site, placement):
        replace_provenance(item)
    inputs = dict(design=design["identity"], site=site["identity"], placement=placement["identity"])
    source = dict(
        schema_version=V,
        source_id="synthetic-arithmetic",
        snapshot_id=evidence["snapshot_id"],
        category="test_fixture",
        jurisdiction="synthetic",
        instrument="arithmetic oracle",
        source_url="repo:tests/fixtures/evaluation/README.md",
        artifact=dict(
            uri="repo:tests/fixtures/evaluation/README.md",
            sha256=sha256(ORACLE.read_bytes()).hexdigest(),
        ),
        captured_at="2026-09-24T12:00:00Z",
        printed_revision=None,
        effective_from=None,
        effective_to=None,
        effective_date_evidence=[],
        original_crs=None,
        original_units=["m"],
        reuse_constraints="Synthetic tests only",
        review=review,
    )
    rule = dict(
        schema_version=V,
        identity=ref("width-rule"),
        candidate_id="synthetic-candidate",
        content=dict(
            pathway_id="synthetic",
            alternative_id="A",
            text="Invented width <= 10",
            evidence=[evidence],
            applicability=dict(
                jurisdiction="synthetic",
                use="garden suite",
                building_role="accessory",
                conditions=[],
                exceptions=[],
                status="reviewed_scope",
            ),
            approval="as_of_right",
            semantics=dict(
                kind="scalar_bound",
                subject="width",
                measurement_definition="synthetic measured width",
                operator="<=",
                threshold=quantity(),
            ),
            runtime_support="supported",
            references=[],
        ),
        review=review,
        supersedes=[],
        identity_decision="Invented initial revision",
    )
    fact = dict(
        identity=ref("width-fact"),
        inputs=inputs,
        definition="synthetic measured width",
        status="known",
        quantity=quantity(),
        provenance=provenance,
    )
    binding = dict(
        rule=rule["identity"],
        fact=fact["identity"],
        inputs=inputs,
        measurement_definition=fact["definition"],
        definition_support="reviewed_direct_measurement",
        applicability="applicable",
        provenance=provenance,
    )
    return json.loads(
        json.dumps(
            dict(
                schema_version="sr-10.v1",
                evaluator_version="bounded-scalar.v1",
                evaluation_id="synthetic-evaluation",
                draft=ref("synthetic-draft"),
                data_state="draft_only",
                sources=[source],
                design=design,
                site=site,
                placement=placement,
                scope=dict(
                    jurisdiction="synthetic",
                    use="garden suite",
                    building_role="accessory",
                    coverage="within_coverage",
                    description="One invented direct width check",
                    exclusions=["All legal use"],
                    provenance=provenance,
                ),
                alternatives=[
                    dict(pathway_id="synthetic", alternative_id="A", rules=[rule["identity"]])
                ],
                rules=[rule],
                facts=[fact],
                bindings=[binding],
            )
        )
    )
