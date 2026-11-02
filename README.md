# 成語小格子

給國小學生的成語學習網站。純靜態網頁，放在 GitHub Pages，iPad / iPhone 可加到主畫面、離線使用。

- 每天一個成語，田字格 + 注音呈現
- 查詢：國字、注音、拼音都能找
- 每個成語：簡單的意思（簡編本）、成語故事、怎麼用、相似相反、比一比、《成語典》原文
- 測驗：看意思選成語、看成語選意思、相似或相反、填填看
- 情境插圖與看圖猜成語：已完成的插圖會出現在對應成語頁，並自動加入看圖題庫
- 收藏、學會了、答錯過的（存在裝置上）
- 朗讀：使用裝置內建中文語音

收錄範圍：《成語典》主條成語中，同時收錄於《國語辭典簡編本》的 1,466 條。

## 資料夾

```
index.html            網站入口
css/app.css
js/app.js             畫面、路由、測驗、學習紀錄
js/render.js          原文欄位的顯示格式處理（不改文字）
sw.js                 離線快取（改版時把 VERSION 加 1）
data/moe-index.json   索引（教育部原文欄位）
data/detail/NN.json   完整條目，每 100 條一包
data/mine.json        你自己寫的補充內容
img/rare/             罕用字圖片（教育部字圖資料中實際用到的）
licenses/             教育部授權使用說明（依規定須完整保留）
scripts/build_data.py 資料轉換腳本
```

## 上傳到 GitHub Pages

```bash
cd chengyu
git add -A && git commit -m "First version"
gh repo create kckuo-ai/chengyu --public --source . --push
```

然後到 repo 的 **Settings → Pages**，Source 選 **Deploy from a branch**、Branch 選 **main / (root)**。
幾分鐘後網址為 `https://kckuo-ai.github.io/chengyu/`。

## 教育部資料更新時

從[教育部國語辭典公眾授權網](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/index.html)下載新版 zip 解壓縮後：

```bash
pip install openpyxl
python3 scripts/build_data.py \
  --idioms   ~/Downloads/dict_idioms_2020_XXXXXXXX.xlsx \
  --concised ~/Downloads/dict_concised_2014_XXXXXXXX.xlsx \
  --pics     ~/Downloads/dict_idioms_pic_2020_XXXXXXXX/
```

再把 `sw.js` 的 `VERSION` 加 1、更新 `NOTICE.md` 的版本編號。原始 xlsx 不用放進 repo。

## 自己寫的內容（data/mine.json）

教育部內容不能改寫，想加給孩子看的白話說明或生活例句，寫在 `data/mine.json`：

```json
{
  "守株待兔": {
    "note": "自己寫的說明",
    "examples": ["自己寫的例句"]
  }
}
```

會顯示在該成語的「我們的補充」區塊，和教育部原文分開。

## 本機預覽

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000
```

## 授權

程式碼 MIT；教育部辭典資料 CC BY-ND 3.0 TW。詳見 `NOTICE.md`。

## 成語插圖

插圖使用鉛筆線條、柔和水彩、彩色鉛筆疊色與米白紙紋。能準確表達寓意時優先以現代生活情境演繹；典故更清楚時保留原場景。新增圖片以 `data/illustrations.json` 的成語編號對應，不修改教育部原文。

查看實際完成數與待製作詞條：

```bash
python3 scripts/illustration_status.py
python3 scripts/illustration_status.py --pending
```

看圖題目僅使用已有插圖的詞條，每次最多 10 題；收藏或錯題不足 10 個時依實際數量出題，成績仍以百分制計算。「我的 → 下載全部內容」包含現有插圖，需 HTTPS 與已啟用的 service worker。圖片不會在啟動時全部預載。

製作流程與測試方式見 [插圖維護說明](docs/illustrations.md)。

原始 PNG、修訂前版本與完整校驗清單保存在 [2026-11-02 插圖備份分支](https://github.com/kckuo-ai/chengyu/tree/backup/illustrations-20261102-220913/backup)，還原方式見該分支的 `backup/README.md`。`main` 保留網站使用的 WebP 與詞條對應，原始備份不納入 GitHub Pages 部署。

最新完成批次：514 個成語插圖；原始 PNG 與完整校驗清單見 [514 張插圖備份](https://github.com/kckuo-ai/chengyu/tree/backup/illustrations-20261103-075234/backup)。
