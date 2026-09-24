"""Offline real-byte integrity tests plus explicitly synthetic failure mutations."""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from intake import ROOT, Corpus, IntakePacket, build, contained, map_source, spatial_sample
from pydantic import ValidationError


class IntakeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.packet = build()

    def test_real_portable_subset_and_roundtrip(self):
        packet = self.packet
        saved = IntakePacket.model_validate_json(
            (ROOT / "intake-packet.json").read_text(encoding="utf-8")
        )
        self.assertEqual(packet, saved)  # Saved portable packet must match verified inputs.
        self.assertEqual(len(packet.sources), 26)
        verified = [s for s in packet.sources if s.status == "verified_repository"]
        self.assertEqual(len(verified), 15)
        self.assertEqual(len({s.snapshot.artifact.sha256 for s in verified}), 14)
        self.assertEqual(len(packet.spatial_samples), 9)
        self.assertEqual(IntakePacket.model_validate_json(packet.model_dump_json()), packet)
        self.assertTrue(all(s.snapshot.effective_from is None for s in verified))
        self.assertTrue(all(s.snapshot.review.status == "unreviewed" for s in verified))
        sources = {s.capture.source_id: s for s in packet.sources}
        self.assertNotEqual(
            sources["site-80-zones"].snapshot_id, sources["site-86-zones"].snapshot_id
        )
        self.assertEqual(
            sources["site-80-zones"].snapshot.artifact, sources["site-86-zones"].snapshot.artifact
        )
        for sample in packet.spatial_samples:
            self.assertEqual(
                sample.coordinate_dimensions,
                (3,) if sample.source_id.endswith("rooflines") else (2,),
            )
            self.assertIsNone(sample.vertical_datum)

    def test_missing_private_is_actionable_not_accepted(self):
        blocked = [s for s in self.packet.sources if s.status == "blocked"]
        self.assertEqual(len(blocked), 11)
        self.assertTrue(all(s.snapshot is None for s in blocked))
        self.assertTrue(all("--private-root" in s.diagnostics[0] for s in blocked))

    def test_corruption_and_absence_preserve_source(self):
        source = self.packet.sources[0]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = map_source(source.capture, root, None)
            self.assertIn("missing_artifact", result.diagnostics[0])
            target = root / source.capture.repository_path
            target.parent.mkdir()
            target.write_bytes(b"synthetic corruption")
            result = map_source(source.capture, root, None)
            self.assertIn("integrity_mismatch", result.diagnostics[0])
            self.assertIsNone(result.snapshot)
            self.assertEqual(target.read_bytes(), b"synthetic corruption")
            self.assertEqual(result.capture.sha256, source.capture.sha256)

    def test_restricted_bytes_never_promote_rights(self):
        # Synthetic rights mutation of a licensed object; not a real permission decision.
        source = self.packet.sources[0]
        capture = source.capture.model_copy(
            update={"redistribution": "withheld-no-redistribution-grant", "repository_path": None}
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / capture.object
            target.parent.mkdir()
            shutil.copyfile(ROOT / source.capture.repository_path, target)
            result = map_source(capture, ROOT, root)
            self.assertEqual(result.status, "verified_private_restricted")
            self.assertTrue(result.snapshot.artifact.uri.startswith("private-capture:"))
            self.assertEqual(result.snapshot.review.status, "unreviewed")
            self.assertIn("no redistribution grant", result.snapshot.reuse_constraints)
        invalid = source.capture.model_copy(
            update={"redistribution": "withheld-no-redistribution-grant"}
        )
        self.assertIsNone(map_source(invalid, ROOT, None).snapshot)

    def test_paths_cannot_escape_roots(self):
        for path in ("../outside.json", str(ROOT.parent / "outside.json")):
            with self.assertRaises(ValueError):
                contained(ROOT, path)

    def test_holdout_leakage_and_invented_acceptance_rejected(self):
        data = self.packet.corpus.model_dump(mode="json")
        data["clauses"][12]["split"] = "development"
        with self.assertRaises(ValidationError):
            Corpus.model_validate(data)
        data = self.packet.corpus.model_dump(mode="json")
        data["clauses"][0]["dependency_groups"] = ["H"]
        with self.assertRaises(ValidationError):
            Corpus.model_validate(data)
        for field, value in (
            ("review_status", "accepted"),
            ("benchmark_eligible", True),
            ("exact_excerpt", "invented excerpt"),
        ):
            data = self.packet.corpus.model_dump(mode="json")
            data["clauses"][0][field] = value
            with self.assertRaises(ValidationError):
                Corpus.model_validate(data)

    def test_real_sites_have_no_placement_or_fit(self):
        self.assertEqual(len(self.packet.corpus.sites), 3)
        for site in self.packet.corpus.sites:
            self.assertIsNone(site.supplied_placement)
            self.assertIsNone(site.expected_fit)
            self.assertTrue(site.missing_facts)
        data = self.packet.corpus.model_dump(mode="json")
        data["sites"][0]["expected_fit"] = "candidate"
        with self.assertRaises(ValidationError):
            Corpus.model_validate(data)

    def test_stale_snapshot_and_unknown_version_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(ROOT / "source-manifest.json", root / "source-manifest.json")
            data = self.packet.corpus.model_dump(mode="json")
            data["clauses"][0]["snapshot_id"] = "synthetic-stale-reference"
            (root / "corpus.json").write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "different source snapshot"):
                build(root)
        data = self.packet.model_dump(mode="json")
        data["schema_version"] = "future"
        with self.assertRaises(ValidationError):
            IntakePacket.model_validate(data)

    def test_spatial_failures_are_not_usable_samples(self):
        source = next(s for s in self.packet.sources if s.capture.source_id == "site-59-parcel")
        original = json.loads((ROOT / source.capture.repository_path).read_bytes())
        for mutation in ("crs", "truncated", "geometry", "nonfinite"):
            data = json.loads(json.dumps(original))
            if mutation == "crs":
                data["spatialReference"]["wkid"] = 4326
            elif mutation == "truncated":
                data["exceededTransferLimit"] = True
            elif mutation == "geometry":
                data["features"][0]["geometry"] = None
            else:
                data["features"][0]["geometry"]["rings"][0][1][0] = float("inf")
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                path = root / source.capture.repository_path
                path.parent.mkdir()
                path.write_text(json.dumps(data), encoding="utf-8")
                with self.assertRaises(ValueError):
                    spatial_sample(source, root)

    def test_cli_subset_and_strict_missing_private_exit(self):
        with tempfile.TemporaryDirectory() as directory:
            base = [sys.executable, str(ROOT / "intake.py"), "--private-root", directory]
            subset = subprocess.run(base, capture_output=True, text=True, check=False)
            self.assertEqual(subset.returncode, 0, subset.stderr)
            self.assertIn("missing_artifact", subset.stdout)
            strict = subprocess.run(
                base + ["--require-all"], capture_output=True, text=True, check=False
            )
            self.assertEqual(strict.returncode, 1)


if __name__ == "__main__":
    unittest.main()
