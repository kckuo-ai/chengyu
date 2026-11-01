#!/usr/bin/env python3
"""把教育部《成語典》與《國語辭典簡編本》的 xlsx 轉成網站用的 JSON。

授權重點（CC BY-ND 3.0 TW）：只做「格式轉換」，不改任何條目文字。
本腳本只做以下處理，皆不涉及內容修改：
  - 去掉 Excel 匯出時產生的 `_x000D_`（Windows 換行符號的跳脫碼）
  - 去掉簡編本字詞號外層的 Excel 公式包裝 ="0001"
  - 頭尾空白修剪
  - 依欄位重新排列成 JSON

收錄範圍：《成語典》的「主條成語」中，同時收錄於《國語辭典簡編本》者
（簡編本的適用對象為國中小學生）。

用法：
  python3 scripts/build_data.py \
      --idioms   path/to/dict_idioms_2020_XXXXXXXX.xlsx \
      --concised path/to/dict_concised_2014_XXXXXXXX.xlsx \
      --pics     path/to/dict_idioms_pic_2020_XXXXXXXX/   # 罕用字圖片資料夾
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("需要 openpyxl：pip install openpyxl")

ROOT = Path(__file__).resolve().parent.parent

# 《成語典》欄位 → JSON key
IDIOM_COLS = {
    "編號": "no",
    "成語": "w",
    "注音": "zy",
    "漢語拼音": "py",
    "釋義": "def",
    "典源文獻名稱": "srcName",
    "典源文獻內容": "src",
    "典源注解": "srcNote",
    "典源參考資料": "srcRef",
    "典故說明": "story",
    "書證": "cite",
    "用法說明-語義說明": "sem",
    "用法說明-使用類別": "usage",
    "用法說明-例句": "ex",
    "辨識-形音辨誤": "confuse",
    "辨識-同": "same",
    "辨識-異": "diff",
    "辨識-例句": "cmp",
    "近義成語": "syn",
    "反義成語": "ant",
    "參考詞語": "ref",
    "主條成語／非主條成語": "kind",
}

IMG_RE = re.compile(r"&([^;&\s]+?\.(?:jpg|gif|png))\s*;", re.I)


def clean(v):
    """只處理格式，不改文字。"""
    if v is None:
        return ""
    if not isinstance(v, str):
        return v
    v = v.replace("_x000D_\n", "\n").replace("_x000D_", "")
    return v.strip()


def read_sheet(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    rows = wb.worksheets[0].iter_rows(values_only=True)
    header = [str(h).strip() if h else "" for h in next(rows)]
    for r in rows:
        yield dict(zip(header, r))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--idioms", required=True)
    ap.add_argument("--concised", required=True)
    ap.add_argument("--pics", help="成語典字圖資料夾（含 .jpg/.gif）")
    ap.add_argument("--out", default=str(ROOT / "data"))
    args = ap.parse_args()

    # 簡編本：只取成語用得到的欄位
    concised = {}
    for r in read_sheet(args.concised):
        w = clean(r.get("字詞名"))
        if not w or len(w) < 3:
            continue
        concised.setdefault(w, []).append({
            "id": re.sub(r'[="]', "", str(r.get("字詞號") or "")),
            "zy": clean(r.get("注音一式")),
            "py": clean(r.get("漢語拼音")),
            "def": clean(r.get("釋義")),
            "syn": clean(r.get("相似詞")),
            "ant": clean(r.get("相反詞")),
        })

    idioms = []
    for r in read_sheet(args.idioms):
        d = {k: clean(r.get(col)) for col, k in IDIOM_COLS.items()}
        if d["kind"] != "主條成語" or d["w"] not in concised:
            continue
        del d["kind"]
        d["no"] = int(d["no"])
        d["c"] = concised[d["w"]]  # 簡編本對應條目（可能多於一筆）
        idioms.append({k: v for k, v in d.items() if v not in ("", None)})

    idioms.sort(key=lambda x: x["no"])
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    # 1) 完整資料（逐字保留），每 100 條切一包，看詳細頁時才載入
    chunk = 100
    det = out / "detail"
    if det.exists():
        shutil.rmtree(det)
    det.mkdir()
    for i in range(0, len(idioms), chunk):
        with open(det / f"{i // chunk:02d}.json", "w", encoding="utf-8") as f:
            json.dump(idioms[i:i + chunk], f, ensure_ascii=False, separators=(",", ":"))

    # 2) 輕量索引：搜尋、列表、測驗用（內容仍為原文欄位，不改寫）
    index = [{
        "no": d["no"], "w": d["w"], "zy": d.get("zy", ""), "py": d.get("py", ""),
        "sem": d.get("sem", ""), "syn": d.get("syn", ""), "ant": d.get("ant", ""),
        "story": 1 if d.get("story") else 0, "cmp": d.get("cmp", ""),
        "k": i // chunk,
    } for i, d in enumerate(idioms)]
    with open(out / "moe-index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))

    # 3) 只複製實際用到的罕用字圖片
    used = set()
    for d in idioms:
        for v in d.values():
            if isinstance(v, str):
                used.update(m.strip() for m in IMG_RE.findall(v))
    copied, missing = 0, []
    if args.pics:
        src = Path(args.pics)
        files = {p.name.strip(): p for p in src.iterdir() if p.is_file()}
        dst = ROOT / "img" / "rare"
        dst.mkdir(parents=True, exist_ok=True)
        for name in sorted(used):
            if name in files:
                shutil.copy2(files[name], dst / name)
                copied += 1
            else:
                missing.append(name)

    print(f"收錄成語：{len(idioms)} 條")
    print(f"罕用字圖片：引用 {len(used)}，複製 {copied}，缺 {len(missing)} {missing[:10]}")
    print(f"moe-index.json: {(out / 'moe-index.json').stat().st_size / 1024:.0f} KB")
    print(f"detail/: {len(list(det.iterdir()))} 包，共 "
          f"{sum(p.stat().st_size for p in det.iterdir()) / 1024:.0f} KB")
    with open(out / "meta.json", "w", encoding="utf-8") as f:
        json.dump({"idiomsFile": Path(args.idioms).name, "concisedFile": Path(args.concised).name,
                   "count": len(idioms), "chunks": len(list(det.iterdir()))}, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
