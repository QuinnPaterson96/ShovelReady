"""Offline checks; run this file directly, never through legacy conftest."""
from pathlib import Path
import tempfile
import unittest
from acquire import capture


class CaptureTests(unittest.TestCase):
    def test_identical_changed_and_failed_captures_preserve_objects(self):
        source = {"id": "sample", "url": "https://example.invalid/data", "format": "json"}
        def response(data):
            return lambda url: (data, url, {"Content-Type": "application/json"})
        with tempfile.TemporaryDirectory() as directory:
            dest = Path(directory)
            first = capture(source, dest, response(b'{"value":1}'))
            same = capture(source, dest, response(b'{"value":1}'))
            changed = capture(source, dest, response(b'{"value":2}'))
            self.assertEqual(first["object"], same["object"])
            self.assertNotEqual(first["object"], changed["object"])
            before = (dest / "receipts.jsonl").read_bytes()
            for bad in (b'not-json', b'{"error":{"code":500}}'):
                with self.assertRaises(ValueError):
                    capture(source, dest, response(bad))
            def failure(url):
                raise TimeoutError()
            with self.assertRaises(TimeoutError):
                capture(source, dest, failure)
            self.assertEqual(before, (dest / "receipts.jsonl").read_bytes())
            self.assertEqual(b'{"value":1}', (dest / first["object"]).read_bytes())
            self.assertEqual(2, len(list((dest / "objects").iterdir())))

    def test_binary_sources_reject_html_error_page(self):
        with tempfile.TemporaryDirectory() as directory:
            for extension in ("pdf", "png"):
                with self.assertRaises(ValueError):
                    capture({"id": extension, "url": "https://example.invalid", "format": extension},
                            Path(directory), lambda u: (b'<html>Error</html>', u, {}))
            self.assertFalse((Path(directory) / "receipts.jsonl").exists())


if __name__ == "__main__":
    unittest.main()
