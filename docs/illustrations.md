# 成語插圖製作與驗證

`data/illustrations.json` 是已完成圖片的唯一目錄。只有實際生成、檢視且已存在於 `img/idioms/` 的 WebP 檔才能登錄。未完成的成語不放佔位圖片，也不進入看圖題庫。

執行 `python3 scripts/illustration_status.py` 可取得即時完成數；加上 `--pending` 可列出全站 1,466 個詞條中尚未製作的項目。完整單一待辦入口為 `docs/illustration-worklist.json`，以 `python3 scripts/illustration_audit.py --write` 更新，包含缺圖、歷史品質候選及紀錄缺口，每個編號只列一次。這是待辦清單，並非背景生成工作；停止執行工具後不會自行繼續生成。

## 畫風與原創原則

- 鉛筆手繪線條、柔和水彩與彩色鉛筆疊色，保留米白紙張紋理。
- 自然草綠、天空藍、暖棕色，不採用鮮豔電腦色塊或 3D 效果。
- 每張獨立構圖，以人物動作、物件與關係解釋詞義；不只把成語中的名詞拼在一起。
- 優先呈現當代常用引申義，不以單純字面畫面代替寓意。「入木三分」已改成深入分析、評論切中核心的情境，字面墨滲木板版本不再用於成語頁或題庫。
- 能準確解釋詞義時，優先使用現代校園、家庭、社區、運動或工作情境；插畫媒材與配色維持原畫風，不因現代場景改成照片或科技風。
- 現代情境須保留成語的關鍵因果與寓意，不能只是更換衣服。例如「紙上談兵」可畫學生只顧講解漂亮的橋梁設計圖，卻無法解決眼前承重失敗的模型；不能畫成正在成功合作的科學實驗。
- 典故或特定動物、物件本身是主要辨識線索時，可保留古代或寓言場景。已有合適插圖不因這項偏好一律重製，後續逐條判斷。
- 兒童可理解的情境，避免血腥與危險動作；無標題、文字、浮水印，避免看圖題洩漏答案。
- 不指定特定創作者的風格、不使用第三方插畫參考、不使用知名角色或商標。製作來源記錄不等於零侵權風險的法律保證。

已生成插圖使用 image generation 工具，依各詞條的意義撰寫獨立場景提示。原始 PNG 以 SHA-256 去重，保留於 `illustration-archive` 分支的 `originals/` 及工作區 `/workspace/chengyu-preservation/originals/`；舊 `/workspace/generated_images/` 路徑可為相容符號連結。網頁使用重新編碼的 WebP，不裁切或改動構圖。各張原圖 SHA-256 記在目錄中，可對照原始檔。

從「一諾千金」開始的現代情境批次，完整共用畫風提示、個別場景提示與替代文字另存於 `docs/illustration-prompts.json`，便於追溯與後續調整。

## 新增一張插圖

1. 讀取 `data/moe-index.json` 與對應 `data/detail/NN.json`，釐清詞義、故事與容易混淆的成語。
2. 依上述畫風生成獨立原創場景；檢視成語的關鍵動作是否正確，避免誤導、文字與不合適的人物細節。
3. 寫一段描述畫面、但不包含完整成語答案的替代文字。
4. 在儲存庫根目錄登錄圖片（需 Node.js 與 `sharp`；雲端環境已提供）：

   ```bash
   node scripts/add_illustration.cjs 39 /path/to/original.png '農夫放下鋤頭，坐在樹樁旁幻想兔子再次自己跑來。'
   ```

   上例僅示範參數；39 已有插圖時腳本會拒絕覆寫。腳本核對成語編號、保留原圖雜湊，以品質 85 重新編碼 WebP，並將實際尺寸寫入目錄。

5. 更新 `sw.js` 的 `VERSION`，讓已安裝的網站取得新目錄。之後執行狀態驗證與瀏覽器測試。

新增目錄項目後，成語頁與看圖練習會直接使用對應圖片，不需修改題庫程式。相近成語不放在同一題的干擾選項中；題目圖片的替代文字與圖說不包含答案。

## 驗證

先在根目錄啟動 `python3 -m http.server 8000 --bind 127.0.0.1`，另一個執行階段執行：

```bash
python3 scripts/illustration_status.py
node tests/illustrations.cjs
```

瀏覽器測試使用環境提供的 Playwright 與 `/usr/bin/chromium`。覆蓋每張已登錄圖片、手機版面、尚未完成插圖的成語、看圖測驗、單題百分制、錯題紀錄、空題庫、目錄載入失敗與離線下載。結果截圖存於 `/tmp/chengyu-picture-quiz.png`。

網站只在 HTTPS 自動註冊 service worker；測試在可信任的 loopback HTTP 手動註冊，以驗證快取本身。可選的 Google Fonts 在測試中封鎖，使用本機字型。

離線下載使用獨立的 `chengyu-offline-v1` 快取，更新應用程式 shell 時保留。下載完成前會等待每個檔案寫入快取；HTTP 錯誤或儲存空間不足時提供重試，不宣稱已全部下載。

## 固定畫風與獨立驗證檢查表（2026-11-14 起）

生成提示一律使用 `docs/illustration-prompts.json` 根層唯一的 `style_prompt`，不得逐項覆寫。執行 `python3 scripts/illustration_brief.py NUMBER` 取得固定畫風加場景；P1 重製自動使用持久清單的建議場景與避用構圖編號。歷史提示僅供追溯。

每張新圖與重製圖都須獨立實際看圖，逐項記錄：

- 詞義與關鍵因果清楚、與相近成語可辨；alt 符合畫面且不含答案。
- **台灣人物／台灣場景**：台灣人物的繪本設定、國小兒童年齡比例、台灣現代生活環境及服裝符合固定提示；不能僅憑臉孔推斷國籍。`checks.taiwan_context = {"passed": true, "evidence": "具體畫面觀察"}`。
- **無紅領巾**：所有人物均無紅色領巾或圍巾。`checks.no_red_neckerchief = {"passed": true, "evidence": "具體服裝觀察"}`。
- 手腳數量、肩臂連接、姿勢、接觸支撐、工具結構、透視與物理合理。
- 鉛筆、水彩、色鉛筆及米白紙紋符合固定畫風。
- 無可讀文字（含單字）、字母、數字、品牌、浮水印與不適內容。

新增兩項任一不符合即驗證失敗，不得登錄。metadata 的 `path` 必須與 review 的 `path` 完全一致，且 metadata 的 `style_prompt` 必須等於當前固定提示。登錄前執行 `python3 scripts/validate_illustration_review.py METADATA_JSON REVIEW_JSON`；此檢查只驗證紀錄門檻，實際看圖仍須由獨立驗證者完成。

P1 排程及保留原圖、revisions、獨立驗證、每 50 張發布等規則見 `docs/illustration-goal.md` 與 `docs/illustration-regeneration-queue.json`。P2、P3 等全量 1,466 條完成後再處理。

## 原圖保存與既有圖片複審

`docs/illustration-originals.json` 僅記錄封存分支可取得的原圖雜湊，不是另一份待辦。`illustration_audit.py` 將原圖缺口與缺少審核、歷史品質候選合併到同一編號；WebP 轉存 PNG 不能視為補回原圖。

既有圖片重新檢視後，將八項檢查與具體證據寫入 `illustration-reviews.json`，以 `kind: existing` 區分新圖登錄；`webp_sha256` 綁定實際受審網站檔，替換後須重新審核。新的 alt 是此次獨立觀察，不自動改寫網站的既有 alt。複審失敗的圖片仍保留在線上，待替代圖通過才覆寫；單一待辦列為 `review_unresolved`。缺少完整證據不能視為通過。

2026-11-22 首批已實際檢視 20 張的全圖、原尺寸細節及 109 張相似／同義候選對照，9 張通過、11 張需重畫。逐張結果見目前審核紀錄；原圖與新紀錄另以雜湊去重封存在 `illustration-archive`，不保留檢視用裁切或拼圖。

2026-11-22 第二批再複審 20 張（編號 26–46 中尚缺紀錄且有原圖的項目），逐張檢視全圖、原尺寸細節及 110 張候選構圖；7 張通過、13 張需重畫。兩批累計 40 張，16 張通過、24 張需重畫。替代場景僅為未來重畫建議，不冒充缺失的歷史生成提示。

batch-18-redraw-11 重畫複驗：11 張皆已檢視全圖、原尺寸細節及 142 張構圖候選，8 張通過更換（2、4、8、16、18、19、21、25），3 張保留現圖待重畫（15、17、23）。失敗候選的原圖與新問題保存在 illustration-archive，現行 review 的 latest_rejected_candidate 僅指向該候選紀錄，不把未上線候選當成現行圖。舊 WebP 與逐檔歷史審核均保留。

batch-19-redraw-13 重畫複驗：13 張皆已檢視全圖、原尺寸細節及 107 張構圖候選，9 張通過更換（26、27、33、35、36、39、41、43、45），4 張保留現圖待重畫（32、37、40、44）。失敗候選的原圖與新問題保存在 illustration-archive，現行 review 的 latest_rejected_candidate 僅指向該候選紀錄，不把未上線候選當成現行圖。舊 WebP 與逐檔歷史審核均保留。
