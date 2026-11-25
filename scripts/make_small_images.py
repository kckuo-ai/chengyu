#!/usr/bin/env python3
"""為每張成語插圖產生手機用的小圖（800 px 寬、WebP），放在 img/idioms/sm/。

手機畫面用小圖（約 80 KB），iPad 與電腦仍用原圖。
發佈新的插圖批次後執行一次即可；已經存在且比原圖新的小圖會略過。

    python3 scripts/make_small_images.py
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
WIDTH, QUALITY = 800, 72


def small_path(src: str) -> Path:
    p = Path(src)
    return ROOT / p.parent / "sm" / p.name


def main():
    entries = json.loads((ROOT / "data" / "illustrations.json").read_text(encoding="utf-8"))["entries"]
    made = skipped = missing = 0
    for e in entries.values():
        full = ROOT / e["src"]
        if not full.exists():
            missing += 1
            print(f"找不到原圖：{e['src']}", file=sys.stderr)
            continue
        out = small_path(e["src"])
        if out.exists() and out.stat().st_mtime >= full.stat().st_mtime:
            skipped += 1
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(full) as im:
            h = round(im.height * WIDTH / im.width)
            im.convert("RGB").resize((WIDTH, h), Image.LANCZOS).save(out, "WEBP", quality=QUALITY, method=6)
        made += 1
    print(f"新產生 {made} 張，已是最新 {skipped} 張，缺原圖 {missing} 張")


if __name__ == "__main__":
    main()
