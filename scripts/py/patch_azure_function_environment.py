#!/usr/bin/env python3
"""
Patch an Azure Function App environment export JSON in place using:
- config/.env.public.{ENV}
- config/.env.{ENV}

Usage:
    python3 patch_azure_function_environment.py azure_function_environment.json

Behavior:
- Updates matching Azure setting values from local .env files
- Adds local keys missing from Azure export
- Preserves: Azure-only keys, Azure-specific fields on existing entries (e.g. slotSetting)

Edit this:
    ENV = "dev"   # or "prod"
"""

import json
import sys
from pathlib import Path

# config
ENV = "dev"  # dev/prod


def parse_env_file(env_file: Path) -> dict[str, str]:
    env_vars: dict[str, str] = {}

    with env_file.open("r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()

            if not line or line.startswith("#"):
                continue

            if "=" not in line:
                raise ValueError(f"Invalid line in {env_file}: {raw_line.rstrip()}")

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()

            # Strip inline comments only for unquoted values
            if value and value[0] not in ("'", '"'):
                value = value.split("#", 1)[0].strip()

            # Strip matching surrounding quotes
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]

            env_vars[key] = value

    return env_vars


def load_local_settings() -> dict[str, str]:
    repo_root = Path(__file__).resolve().parents[2]
    config_dir = repo_root / "config"

    env_files = [
        config_dir / f".env.public.{ENV}",
        config_dir / f".env.{ENV}",
        ]

    merged: dict[str, str] = {}

    for env_file in env_files:
        if not env_file.exists():
            raise FileNotFoundError(f"Missing env file: {env_file}")

        merged.update(parse_env_file(env_file))

    return merged


def load_azure_settings(json_path: Path) -> list[dict]:
    with json_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array in {json_path}")

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"Expected object at index {i} in {json_path}")
        if "name" not in item:
            raise ValueError(f"Missing 'name' at index {i} in {json_path}")

    return data


def patch_azure_settings(azure_settings: list[dict], local_settings: dict[str, str]) -> tuple[list[dict], list[str], list[str], list[str]]:
    azure_by_name = {item["name"]: item for item in azure_settings}
    azure_order = [item["name"] for item in azure_settings]

    updated: list[str] = []
    added: list[str] = []
    unchanged: list[str] = []

    for key, local_value in local_settings.items():
        if key in azure_by_name:
            current_value = azure_by_name[key].get("value")
            if current_value != local_value:
                azure_by_name[key]["value"] = local_value
                updated.append(key)
            else:
                unchanged.append(key)
        else:
            azure_by_name[key] = {"name": key, "value": local_value}
            azure_order.append(key)
            added.append(key)

    patched = [azure_by_name[name] for name in azure_order]
    return patched, updated, added, unchanged


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 patch_azure_function_environment.py azure_function_environment.json", file=sys.stderr)
        return 1

    json_path = Path(sys.argv[1]).resolve()

    if not json_path.exists():
        print(f"File not found: {json_path}", file=sys.stderr)
        return 1

    try:
        local_settings = load_local_settings()
        azure_settings = load_azure_settings(json_path)
        patched, updated, added, unchanged = patch_azure_settings(azure_settings, local_settings)

        with json_path.open("w", encoding="utf-8") as file:
            json.dump(patched, file, indent=2)
            file.write("\n")

        print(f"Patched: {json_path}")
        print(f"ENV: {ENV}")
        print(f"Updated: {len(updated)}")
        print(f"Added: {len(added)}")
        print(f"Unchanged: {len(unchanged)}")

        if updated:
            print("\nUpdated keys:")
            for key in updated:
                print(f"  - {key}")

        if added:
            print("\nAdded keys:")
            for key in added:
                print(f"  - {key}")

        return 0

    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())