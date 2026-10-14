import io
import json
import unittest
from pathlib import Path
from urllib import error
import sys
sys.path.insert(0, str(Path(__file__).parents[1]))
import chabokan_bridge as c

class FakeOpener:
    def __init__(self, body):
        self.body = body
        self.calls = []
    def open(self, req, timeout):
        self.calls.append((req.full_url, req.get_header("Authorization"), timeout))
        return io.BytesIO(json.dumps(self.body).encode())

class BridgeTests(unittest.TestCase):
    def test_good_base(self):
        self.assertEqual(c.api_base(c.DEFAULT_BASE), c.DEFAULT_BASE)
    def test_reject_http_and_external_host(self):
        for base in ("http://apihub.chabokan.net/fa/api/v1/", "https://evil.test/v1/",
                     "https://apihub.chabokan.net.evil.test/v1/", "https://apihub.chabokan.net/fa/api/"):
            with self.assertRaises(ValueError):
                c.api_base(base)
    def test_list_services_no_secrets(self):
        fake = FakeOpener({"results": [{"main_name": "his", "status": "active",
                                       "password": "secret", "env": {"token": "secret"}}]})
        body = c.fetch_json("services/", "testing-token", opener=fake, pause=lambda _: None)
        rows = c.safe_service_rows(body)
        self.assertEqual(rows, [{"name": "his", "status": "active", "type": "unknown"}])
        self.assertEqual(fake.calls[0][1], "Token testing-token")
        self.assertNotIn("secret", json.dumps(rows))
    def test_nested_services(self):
        self.assertEqual(len(c.extract_services({"data": {"services": [{"name": "website"}]}})), 1)
    def test_no_token(self):
        with self.assertRaises(ValueError):
            c.fetch_json("services/", "", opener=FakeOpener({}))
    def test_block_arbitrary_path(self):
        with self.assertRaises(ValueError):
            c.fetch_json("../../other", "t", opener=FakeOpener({}))
    def test_refuse_redirect(self):
        with self.assertRaises(RuntimeError):
            c.NoRedirect().redirect_request(None, None, 302, "Redirect", {}, "https://evil.test/")

if __name__ == "__main__":
    unittest.main()
