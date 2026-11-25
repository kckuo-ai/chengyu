#!/usr/bin/env python3
"""為每張成語插圖產生手機用的檔案：

- img/idioms/sm/<名稱>.avif：800 px 寬 AVIF（約 40 KB），iPhone（iOS 16 以上）使用
- img/idioms/sm/<名稱>.webp：800 px 寬 WebP（約 80 KB），不支援 AVIF 的手機使用
- data/art-lqip/NN.json：每張圖約 200 bytes 的模糊預覽，畫面一打開就先顯示

iPad 與電腦仍用原圖。發佈新的插圖批次後執行一次即可；已是最新的檔案會略過。

    python3 scripts/make_small_images.py
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
WIDTH, QUALITY, AVIF_QUALITY = 800, 72, 45
LQIP_W = 24
CHUNK = 100  # 與 data/moe-index.json 的 k（每 100 條一包）一致


def small_path(src: str) -> Path:
    p = Path(src)
    return ROOT / p.parent / "sm" / p.name


def main():
    import base64, io
    entries = json.loads((ROOT / "data" / "illustrations.json").read_text(encoding="utf-8"))["entries"]
    index = json.loads((ROOT / "data" / "moe-index.json").read_text(encoding="utf-8"))
    chunk_of = {str(i["no"]): i["k"] for i in index}
    lqip = {}
    made = skipped = missing = 0
    for no, e in entries.items():
        full = ROOT / e["src"]
        if not full.exists():
            missing += 1
            print(f"找不到原圖：{e['src']}", file=sys.stderr)
            continue
        out = small_path(e["src"])
        avif = out.with_suffix(".avif")
        with Image.open(full) as im:
            rgb = im.convert("RGB")
            b = io.BytesIO()
            rgb.resize((LQIP_W, round(rgb.height * LQIP_W / rgb.width)), Image.LANCZOS).save(b, "WEBP", quality=40)
            lqip.setdefault(chunk_of[no], {})[no] = "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()
            fresh = all(p.exists() and p.stat().st_mtime >= full.stat().st_mtime for p in (out, avif))
            if fresh:
                skipped += 1
                continue
            out.parent.mkdir(parents=True, exist_ok=True)
            small = rgb.resize((WIDTH, round(rgb.height * WIDTH / rgb.width)), Image.LANCZOS)
            small.save(out, "WEBP", quality=QUALITY, method=6)
            small.save(avif, "AVIF", quality=AVIF_QUALITY, speed=6)
        made += 1
    d = ROOT / "data" / "art-lqip"
    d.mkdir(parents=True, exist_ok=True)
    for k, m in lqip.items():
        (d / f"{k:02d}.json").write_text(json.dumps(m, separators=(",", ":")), encoding="utf-8")
    print(f"新產生 {made} 張，已是最新 {skipped} 張，缺原圖 {missing} 張；模糊預覽 {sum(map(len, lqip.values()))} 張")


if __name__ == "__main__":
    main()
