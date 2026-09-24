"""Database-free saved preview validation, not an evaluator or legal oracle.

Run from repository root: python docs/usability/check_fixtures.py
Uses the existing Pydantic contracts; does not alter shared test discovery/CI.
"""

import json
import sys
import unittest
from copy import deepcopy
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from pydantic import ValidationError  # noqa: E402

from app.contracts.common import SourceSnapshot  # noqa: E402
from app.contracts.results import EvaluationResult  # noqa: E402
from app.contracts.rules import AcceptedRuleRevision  # noqa: E402


class PreviewFixtures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = json.loads((ROOT / "frontend/src/preview/fixtures.json").read_text())

    def test_saved_payloads_and_evidence_references(self):
        sources = {
            s.snapshot_id: s for s in map(SourceSnapshot.model_validate, self.saved["sources"])
        }
        for source in sources.values():
            artifact = ROOT / source.artifact.uri
            self.assertEqual(sha256(artifact.read_bytes()).hexdigest(), source.artifact.sha256)
            self.assertEqual(source.category, "test_fixture")
            self.assertIsNone(source.effective_from)
        for scenario in self.saved["scenarios"]:
            for item in [scenario] + ([scenario["correction"]] if scenario["correction"] else []):
                result = EvaluationResult.model_validate(item["result"])
                rules = {
                    r.identity: r for r in map(AcceptedRuleRevision.model_validate, item["rules"])
                }
                self.assertTrue(result.evaluation_id.startswith("synthetic-"))
                self.assertEqual(result.dataset.evaluator_version, "none-hand-authored-v1")
                for alternative in result.dataset.alternatives:
                    self.assertTrue(set(alternative.rules) <= rules.keys())
                for alternative in result.alternatives:
                    for check in alternative.checks:
                        self.assertIn(check.rule, rules)
                        for evidence in check.evidence:
                            self.assertIn(evidence.snapshot_id, sources)
                            text = (ROOT / sources[evidence.snapshot_id].artifact.uri).read_text()
                            self.assertIn(evidence.excerpt, text)
                            self.assertIn(evidence, rules[check.rule].content.evidence)
                self.assertEqual(
                    EvaluationResult.model_validate_json(result.model_dump_json()), result
                )

    def test_missing_and_outside_cannot_be_candidates(self):
        for index in [1, 3, 4]:
            result = deepcopy(self.saved["scenarios"][index]["result"])
            self.assertEqual(result["outcome"], "needs_investigation")
            result["outcome"] = result["alternatives"][0]["outcome"] = "candidate"
            with self.assertRaises(ValidationError):
                EvaluationResult.model_validate(result)

    def test_correction_cannot_rewrite_original_release(self):
        scenario = self.saved["scenarios"][5]
        original, corrected = scenario["result"], scenario["correction"]["result"]
        self.assertEqual(original["dataset"]["release_id"], "synthetic-release-1")
        self.assertEqual(original["outcome"], "candidate")
        self.assertEqual(corrected["dataset"]["release_id"], "synthetic-release-2")
        self.assertEqual(corrected["outcome"], "no_match_under_evaluated_pathways")
        mixed = deepcopy(original)
        mixed["alternatives"][0]["checks"] = corrected["alternatives"][0]["checks"]
        with self.assertRaises(ValidationError):
            EvaluationResult.model_validate(mixed)


if __name__ == "__main__":
    unittest.main(verbosity=2)
