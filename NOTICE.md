# 資料來源與授權聲明

本專案包含兩種授權的內容，請分開看待。

## 1. 教育部辭典資料（`data/detail/`、`data/moe-index.json`、`img/rare/`）

- 中華民國教育部（Ministry of Education, R.O.C.）。《成語典》（版本編號：2020_20260929）網址：http://dict.idioms.moe.edu.tw/
- 中華民國教育部（Ministry of Education, R.O.C.）。《國語辭典簡編本》（版本編號：2014_20260929）網址：https://dict.concised.moe.edu.tw/

授權條款：創用 CC－姓名標示－禁止改作 臺灣 3.0 版
https://creativecommons.org/licenses/by-nd/3.0/tw/legalcode

處理方式：`scripts/build_data.py` 只做格式轉換（xlsx → JSON、移除 Excel 的 `_x000D_` 換行跳脫碼、移除字詞號的公式外框、修剪頭尾空白），
未修改任何條目的詞目、音讀、釋義、典源、書證及用法說明，也未轉為簡化字。

授權使用說明全文保留於 `licenses/`。

## 2. 本專案自行編寫的內容

- 程式碼（`js/`、`css/`、`scripts/`、`sw.js`、`index.html` 等）：MIT License，見 `LICENSE`
- `data/mine.json`（自己寫的補充與例句）、主題分類與測驗題目組合方式：由專案作者另行選擇授權（例如 CC BY 4.0）

本網站不是教育部官方網站。
