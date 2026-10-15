#!/usr/bin/env python3
"""Validate a Bastiyan HIS code-only release ZIP and stage it under apps/his/src.
No database, patient data, runtime configuration, secrets, backups or licensed fonts.
This import NEVER deploys to Chabokan.
"""
import argparse
import hashlib
import json
import pathlib
import re
import shutil
import stat
import sys
import tempfile
import zipfile

MAX_FILES = 700
MAX_UNCOMPRESSED = 120 * 1024 * 1024
EXPECTED = "5.1.16"
CLEAN_EXT = (".sqlite", ".sqlite3", ".db", ".db-journal", ".log", ".zip", ".tar", ".gz",
             ".7z", ".pem", ".key", ".crt", ".p12", ".pfx", ".jks", ".keystore",
             ".ttf", ".otf", ".woff", ".woff2")
PRIVATE_PARTS = {"node_modules", ".git", "private_uploads", "full_backups", "backups",
                 "backup", "runtime-data", "__pycache__", ".venv"}
PRIVATE_FILES = {"config.local.php", "admin-seed.json", ".env", ".env.local"}


def validate_name(name):
    p = pathlib.PurePosixPath(name)
    lower = name.lower()
    if not name or name.startswith(("/", "./")) or "\\" in name or ".." in p.parts or ":" in name:
        raise ValueError("Invalid entry path")
    if lower.startswith(("api/data/", "uploads/", "fonts/", "bootstrap/")):
        raise ValueError("Runtime/private files forbidden")
    if any(part.lower() in PRIVATE_PARTS for part in p.parts):
        raise ValueError("Private folder forbidden")
    if p.name.lower() in PRIVATE_FILES or (p.name.startswith(".env") and p.name != ".env.example"):
        raise ValueError("Private configuration forbidden")
    if lower.endswith(CLEAN_EXT):
        raise ValueError("Sensitive or copyrighted binary forbidden")
    return p


def extract_checked(package, dest):
    with zipfile.ZipFile(package) as z:
        members = [i for i in z.infolist() if not i.is_dir()]
        if not members or len(members) > MAX_FILES:
            raise ValueError("Unexpected archive entry count")
        if sum(i.file_size for i in members) > MAX_UNCOMPRESSED:
            raise ValueError("Unexpected archive size")
        names = set()
        for i in members:
            p = validate_name(i.filename)
            if str(p) in names:
                raise ValueError("Duplicate archive paths")
            names.add(str(p))
            mode = i.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise ValueError("Symbolic links not accepted")
        if z.testzip() is not None:
            raise ValueError("CRC integrity failure")
        for i in members:
            path = dest.joinpath(*pathlib.PurePosixPath(i.filename).parts)
            path.parent.mkdir(parents=True, exist_ok=True)
            with z.open(i) as inp, path.open("wb") as out:
                shutil.copyfileobj(inp, out)
    meta = json.loads((dest / "version.json").read_text(encoding="utf-8"))
    if meta.get("version") != EXPECTED or "r37" not in str(meta.get("release", "")).lower():
        raise ValueError("Only reviewed R37 5.1.16 allowed")
    if not (dest / "api/config.local.example.php").is_file():
        raise ValueError("Missing public config template")
    files = [p for p in dest.rglob("*") if p.is_file()]
    if len(files) != len(members):
        raise ValueError("Unexpected extracted file count")
    return meta, files


def run(package, target, expected_sha):
    pkg = pathlib.Path(package)
    if not pkg.is_file():
        raise FileNotFoundError("Release file not uploaded")
    h = hashlib.sha256(pkg.read_bytes()).hexdigest()
    if expected_sha and h.lower() != expected_sha.lower():
        raise ValueError("Release archive SHA256 mismatch")
    with tempfile.TemporaryDirectory(prefix="bastiyan_his_import_") as tmp:
        staging = pathlib.Path(tmp) / "src"
        staging.mkdir()
        meta, files = extract_checked(pkg, staging)
        target = pathlib.Path(target)
        if not (target / "version.json").is_file():
            raise ValueError("Refusing to overwrite an unexpected source directory")
        backup = pathlib.Path(tmp) / "old-source"
        shutil.move(str(target), str(backup))
        try:
            shutil.copytree(staging, target)
        except Exception:
            if target.exists():
                shutil.rmtree(target)
            shutil.move(str(backup), str(target))
            raise
        print("IMPORTED", meta["version"], "FILES", len(files), "SHA256", h)
        print("SOURCE-ONLY: NO DATABASE, PATIENT DATA, SECRETS OR FONTS")
        print("CHABOKAN DEPLOY: NOT TRIGGERED")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--package", required=True)
    parser.add_argument("--target", default="apps/his/src")
    parser.add_argument("--sha256", default="")
    args = parser.parse_args()
    try:
        run(args.package, args.target, args.sha256)
    except Exception as exc:
        print("ERROR:", type(exc).__name__, str(exc), file=sys.stderr)
        sys.exit(1)
