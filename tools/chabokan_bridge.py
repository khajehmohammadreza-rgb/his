#!/usr/bin/env python3
"""Read-only Chabokan OpenAPI connection check. No secrets in repository."""
from __future__ import annotations
import argparse
import json
import os
import re
import sys
import time
from urllib import error, parse, request

DEFAULT_BASE = "https://apihub.chabokan.net/fa/api/v1/"
ALLOWED_HOSTS = frozenset({"apihub.chabokan.net", "hub.chabokan.net", "openapi.chabokan.net"})

class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("Chabokan API redirected; refusing to forward credentials")

def api_base(value: str) -> str:
    parsed = parse.urlsplit(value)
    if (parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS or
            parsed.username or parsed.password or parsed.query or parsed.fragment or
            parsed.port not in (None, 443)):
        raise ValueError("Chabokan API URL must be HTTPS on an approved Chabokan host")
    if not parsed.path.endswith("/v1/"):
        raise ValueError("Chabokan API base URL must end with /v1/")
    return value

def fetch_json(endpoint: str, token: str, *, base: str = DEFAULT_BASE, opener=None, pause=time.sleep):
    if not token or any(c in token for c in "\r\n"):
        raise ValueError("CHABOKAN_API_TOKEN is missing or invalid")
    if not re.fullmatch(r"[a-z0-9_/-]+", endpoint):
        raise ValueError("Invalid API endpoint")
    url = api_base(base) + endpoint.lstrip("/")
    opener = opener or request.build_opener(NoRedirect())
    req = request.Request(url, headers={
        "Authorization": "Token " + token,
        "Accept": "application/json",
        "User-Agent": "Bastiyan-Chabokan-ReadOnly/1.0",
    }, method="GET")
    for attempt in range(3):
        try:
            with opener.open(req, timeout=20) as response:
                content = response.read(2_000_001)
                if len(content) > 2_000_000:
                    raise RuntimeError("API response exceeds safe size limit")
                return json.loads(content.decode("utf-8"))
        except error.HTTPError as exc:
            if exc.code in (429, 502, 503, 504) and attempt < 2:
                pause(2 ** attempt)
                continue
            raise RuntimeError("Chabokan API returned HTTP " + str(exc.code)) from None
        except (error.URLError, TimeoutError):
            if attempt < 2:
                pause(2 ** attempt)
                continue
            raise RuntimeError("Chabokan API network/TLS error") from None
    raise RuntimeError("Chabokan API did not respond")

def extract_services(body):
    if isinstance(body, list):
        return body
    if not isinstance(body, dict):
        return []
    for key in ("results", "services", "data", "items", "result"):
        value = body.get(key)
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            nested = extract_services(value)
            if nested:
                return nested
    return []

def safe_service_rows(body):
    rows = []
    for item in extract_services(body):
        if not isinstance(item, dict):
            continue
        name = next((item[k] for k in ("main_name", "mainName", "name", "slug")
                     if isinstance(item.get(k), str)), "")
        status = item.get("status", "unknown")
        if not isinstance(status, (str, int, bool)):
            status = "unknown"
        category = item.get("type", item.get("platform", "unknown"))
        if not isinstance(category, str):
            category = "unknown"
        rows.append({"name": name, "status": status, "type": category})
    return rows

def main(argv=None):
    parser = argparse.ArgumentParser(description="Read-only Chabokan service connection check")
    parser.add_argument("--service", choices=("all", "his", "website", "kiosk"), default="all")
    parser.add_argument("--base-url", default=os.environ.get("CHABOKAN_API_BASE_URL", DEFAULT_BASE))
    parser.add_argument("--quiet", action="store_true", help="Hide service details in public CI logs")
    args = parser.parse_args(argv)
    try:
        body = fetch_json("services/", os.environ.get("CHABOKAN_API_TOKEN", ""), base=args.base_url)
        rows = safe_service_rows(body)
        if not isinstance(body, (list, dict)):
            raise RuntimeError("Unexpected Chabokan response format")
        if args.service != "all":
            rows = [r for r in rows if r["name"] == args.service]
        if args.quiet:
            print("Chabokan API authentication succeeded; response validated")
        else:
            print(json.dumps({"authenticated": True, "service_filter": args.service, "services": rows}, ensure_ascii=False))
        if args.service != "all" and not rows:
            print("Target service not found in API response", file=sys.stderr)
            return 3
        return 0
    except (ValueError, RuntimeError) as exc:
        print("Chabokan check failed: " + str(exc), file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
