"""Enterprise AI installer. Python 3.9+; macOS, Linux and Windows. No dependencies.

Download this file, inspect it, then run from your cloned Git repository.
Only downloads project data; never runs downloaded source, installs packages,
changes Git configuration, commits, pushes, or launches an evaluation.
"""
import argparse
import base64
import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
import re
import subprocess
import sys
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener
import uuid


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError("Redirect refused. Use the platform URL from the permission center.")


def outside_repo(path, root):
    root = root.resolve()
    path = Path(path).expanduser().resolve()
    if path == root or root in path.parents:
        raise ValueError("Keep personal config and token files outside this Git repository.")
    return path


def load_config(path, root):
    config_path = outside_repo(path, root)
    config = json.loads(config_path.read_text(encoding="utf-8-sig"))
    url = urlparse(config.get("platformUrl", ""))
    allowed = url.hostname in {"agentist.org", "test.agentist.org", "parallight-lab-git-staging-mrvgaos-projects.vercel.app"} or re.fullmatch(r"parallight-[a-z0-9]+-mrvgaos-projects\.vercel\.app", url.hostname or "")
    if not allowed or url.scheme != "https" or url.username or url.password or url.port or url.path != "/lab/api/enterprise-ai" or url.query or url.fragment:
        raise ValueError("Use the unified Enterprise-AI.json config from the permission center.")
    token = config.get("token", "")
    if config.get("tokenFile"):
        token_path = Path(config["tokenFile"]).expanduser()
        if not token_path.is_absolute():
            token_path = config_path.parent / token_path
        token = outside_repo(token_path, root).read_text(encoding="utf-8-sig").strip()
    if not re.fullmatch(r"[\x21-\x7e]{32,512}", token):
        raise ValueError("Invalid personal credential. Download a new config; do not paste keys here.")
    return config["platformUrl"], token


def git(*args):
    return subprocess.check_output(["git", *args], text=True, encoding="utf-8", stderr=subprocess.PIPE).strip()


def repo_name(remote):
    match = re.fullmatch(r"(?:https://github\.com/|git@github\.com:|ssh://git@github\.com/)([\w.-]+/[\w.-]+?)(?:\.git)?/?", remote)
    if not match:
        raise ValueError("Origin must be a GitHub HTTPS or SSH repository URL without credentials.")
    return match[1].lower()


def safe_path(name):
    if not isinstance(name, str) or not name or "\\" in name or ":" in name or any(ord(c) < 32 for c in name):
        raise ValueError("Unsafe package path.")
    parts = name.split("/")
    if any(p in {"", ".", ".."} or p.lower() == ".git" or p.endswith((".", " ")) or PureWindowsPath(p).is_reserved() for p in parts) or PurePosixPath(name).is_absolute():
        raise ValueError("Unsafe package path.")
    if any(p.startswith(".") for p in parts) and name not in {".gitignore", ".hyper-tau-lab.json", ".github/workflows/hyper-lab.yml"}:
        raise ValueError("Unexpected hidden file in package.")
    return parts


def install(bundle, root, mode, expected_binding, repository, branch):
    root = root.resolve()
    binding = bundle.get("binding", {})
    if bundle.get("version") != 1 or binding.get("id") != expected_binding:
        raise ValueError("Package binding mismatch.")
    if binding.get("repository", "").lower() != repository or binding.get("branch") != branch:
        raise ValueError("Repository/branch differs from the website binding. Nothing installed.")
    files = bundle.get("files")
    if not isinstance(files, dict) or len(files) > 2048 or "hyper-lab.yml" not in files:
        raise ValueError("Invalid package manifest.")
    if binding.get("task") == "project-1-2" and mode == "new":
        raise ValueError("For the seven-case assignment, clone the assignment first and use --mode existing.")
    if mode == "existing" and binding.get("task") != "project-1-2":
        manifest = root / "agent/agent.json"
        if manifest.is_symlink() or (root / "agent").is_symlink():
            raise ValueError("Symlink in existing Agent directory.")
        data = json.loads(manifest.read_text(encoding="utf-8-sig"))
        if data.get("domain") != binding.get("domain") or data.get("language") != binding.get("language"):
            raise ValueError("Existing agent.json scenario/language differs from the binding. Nothing installed.")
    plan, conflicts, seen, total = [], [], set(), 0
    integration = {"hyper-lab.yml", "GITHUB-SETUP.md", "scripts/git-evaluate.py", "scripts/git-evaluate.sh", "scripts/git-evaluate.ps1"}
    for name, encoded in files.items():
        safe_path(name)
        if mode == "existing" and name not in integration:
            continue
        data = base64.b64decode(encoded, validate=True)
        total += len(data)
        if total > 32 * 1024 * 1024:
            raise ValueError("Package exceeds 32 MiB.")
        destinations = [name, ".github/workflows/hyper-lab.yml"] if name == "hyper-lab.yml" else [name]
        for dest in destinations:
            parts = safe_path(dest)
            if dest.lower() in seen:
                raise ValueError("Duplicate package path.")
            seen.add(dest.lower())
            target = root
            for part in parts:
                target = target / part
                if target.is_symlink() or getattr(target, "is_junction", lambda: False)():
                    raise ValueError("Symlink/junction in destination. Nothing installed.")
                if root not in target.resolve().parents:
                    raise ValueError("Destination escapes repository. Nothing installed.")
                if target != root / dest and target.exists() and not target.is_dir():
                    raise ValueError("A destination parent is not a directory.")
            if target.exists():
                if not target.is_file() or target.read_bytes() != data:
                    conflicts.append(dest)
            else:
                plan.append((target, data))
    if conflicts:
        raise ValueError("No files changed. Back up/move conflicting files first (no automatic overwrite): " + ", ".join(conflicts[:20]))
    created = []
    try:
        for target, data in plan:
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as output:
                created.append(target)
                output.write(data)
    except Exception:
        for target in reversed(created):
            target.unlink()
        raise
    return len(created)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binding", required=True)
    parser.add_argument("--config", default=os.environ.get("HYPER_LAB_CONFIG"))
    parser.add_argument("--mode", choices=["new", "existing"], required=True)
    parser.add_argument("--lang", choices=["zh", "en"], default="zh")
    args = parser.parse_args()
    binding = str(uuid.UUID(args.binding))
    root = Path(git("rev-parse", "--show-toplevel")).resolve()
    if root != Path.cwd().resolve():
        raise ValueError("Run this command in the root of your cloned Git repository.")
    if not args.config:
        raise ValueError("Use --config with Enterprise-AI.json downloaded from the permission center (outside the repository).")
    repository, branch = repo_name(git("remote", "get-url", "origin")), git("symbolic-ref", "--short", "HEAD")
    base, token = load_config(args.config, root)
    request = Request(base + "/v1/github/bindings/" + binding + "/setup.json?lang=" + args.lang, headers={"Authorization": "Bearer " + token})
    try:
        with build_opener(NoRedirect()).open(request, timeout=60) as response:
            raw = response.read(48 * 1024 * 1024 + 1)
            if len(raw) > 48 * 1024 * 1024:
                raise ValueError("Response too large.")
            bundle = json.loads(raw)
    except HTTPError as error:
        raise ValueError(f"Download HTTP {error.code}: 401 renew config; 403 course access; 404 binding not owned/active. No files changed.") from None
    count = install(bundle, root, args.mode, binding, repository, branch)
    print(f"Installed {count} files. No commit, push or evaluation was performed.")
    print("Read GITHUB-SETUP.md. Authenticate once: gh auth login")
    if os.name == "nt":
        print("PowerShell: . .\\scripts\\git-evaluate.ps1\nThen commit your changes and git push.\nAlternative: py -3 scripts/git-evaluate.py push")
    else:
        print("bash/zsh: source scripts/git-evaluate.sh\nThen commit your changes and git push.\nAlternative: python3 scripts/git-evaluate.py push")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        # Never echo config contents, authorization headers or full HTTP responses.
        message = str(error) if isinstance(error, ValueError) else type(error).__name__
        print("Installation stopped: " + message, file=sys.stderr)
        sys.exit(2)
