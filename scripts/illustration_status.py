#!/usr/bin/env python3
"""Validate the illustration catalog and list entries still needing original art."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pending", action="store_true", help="Print pending entries as JSON")
    args = parser.parse_args()
    index = json.loads((ROOT / "data/moe-index.json").read_text())
    art = json.loads((ROOT / "data/illustrations.json").read_text())["entries"]
    by_no = {str(i["no"]): i for i in index}
    for no, item in art.items():
        assert no in by_no, f"Unknown idiom number: {no}"
        assert item["word"] == by_no[no]["w"], f"Wrong mapping: {no}"
        path = (ROOT / item["src"]).resolve()
        assert path.is_relative_to(ROOT / "img/idioms"), f"Invalid asset path: {path}"
        assert path.is_file() and path.stat().st_size > 0, f"Missing image: {no}"
        assert item["alt"] and item["word"] not in item["alt"], f"Answer in image description: {no}"
        assert item["width"] > 0 and item["height"] > 0
    pending = [i for i in index if str(i["no"]) not in art]
    if args.pending:
        print(json.dumps(pending, ensure_ascii=False, indent=2))
    else:
        print(f"Illustrated: {len(art)}/{len(index)}; pending: {len(pending)}")


if __name__ == "__main__":
    main()
