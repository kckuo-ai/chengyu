# 全量插圖自動接續目標

依使用者授權，完成全站尚未製作的成語插圖。沿用鉛筆手繪線條、柔和水彩、彩色鉛筆疊色與米白紙紋；能準確表意時採現代情境，否則保留典故或自然場景。

目前 842 張有效插圖中有 815 張（96.8%）為橫向，且 731 張（86.8%）為 1536×1024 的 3:2 橫向構圖；後續產圖以 3:2 橫向為主要輸出格式，只有詞義確實需要時才使用正方形或直向，並在 metadata 記錄實際尺寸。

最新詞義修正：優先呈現當代常用的引申義，不能只因字面可畫就用字面替代寓意。例如「入木三分」應表現評論深刻中肯、分析直指核心；墨跡滲入木板的版本已依使用者回饋撤換。生成前先確認場景能表現詞義的關鍵因果或特徵。

- 只呼叫對話提供的內建圖片工具，不設定或呼叫另行計費的圖片 API，不新增 API 金鑰或付費服務。
- 工具若明確回報額度上限，保存已完成進度與重試時間，立即暫停產圖、驗證、備份與發布，保存全域暫停狀態，並排程 3 小時後自動接續中斷的任務。不要改用付費 API 或要求使用者逐批確認。只有與額度無關、無法恢復的其他阻擋，才將自動目標標為 blocked。
- `data/illustrations.json` 是已完成的唯一依據。每次先執行 `python3 scripts/illustration_status.py --pending`，核對圖片與驗證紀錄；從共用原子佇列一次領取一個未完成編號，跳過已有圖片。
- 每次開始先比對本機有效目錄與 GitHub `main` 已發布目錄，列出差異編號。若有已登錄且獨立驗證通過、但網站尚未發布的插圖，優先為這些差異圖建立原圖備份與 SHA-256 manifest、測試並推送 `main`，核對遠端目錄及離線快取版本後才繼續新圖。同步可少於 50 張；網站已發布的圖片數應與當次有效目錄數一致。未驗證或僅生成的圖片不得算入。
- 先讀教育部原始詞義，再自行設計原創場景，不修改教育部原文，不引用第三方插畫、品牌或既有角色，也不指定模仿特定創作者。
- 每張生成後立即保存可讀取的本機 PNG 與 metadata，新增獨立的實際看圖驗證任務，檢視「台灣人物／台灣場景」與「無紅領巾」（任一不符合即失敗），再檢視詞義、人物手腳數量、姿勢、接觸關係、物件結構、車輪位置、透視與物理合理性；不合格時保留失敗紀錄與原圖，依缺陷重新生成並再次驗證。只有 review 通過、review path 與 metadata path 完全一致時才可登錄。替代文字須符合實際畫面且不包含完整成語答案。用 `scripts/add_illustration.cjs` 登錄 WebP 與原圖雜湊，原 PNG 保留。
- 文字相關場景要讓書寫確實可見，可用不可讀的鉛筆書寫肌理，避免空白書稿削弱詞義。圖中一律不可出現可讀文字、字母或數字；「一字千金」也只能使用不可讀的抽象墨痕，不再允許原創單字例外。
- 本次自動接續的完整畫風與場景提示保存於 `docs/illustration-prompts.json`，唯一畫風來源為該檔案根層的 `style_prompt`（獨立審查的 `fixed_style_prompt` 原文）；不得使用各項覆寫、舊 metadata 或歷史備份中的畫風。以 `python3 scripts/illustration_brief.py NUMBER` 取得完整提示。
- 本輪從目前最新領取項目起累積 50 張已獨立驗證且登錄的新圖；每批保存新增圖片和提示紀錄，更新 `sw.js` 的版本，執行狀態檢查與有意義的圖片／題庫驗證。每 50 張凍結 manifest、備份、測試並發布一次，50 張目標不是停止點。保留既有檔案與使用者變更，不重新套用已發布的舊變更。
- 批次只是備份與發布的門檻，**不是停止點**。每完成一次備份與發布，在同一執行回合立即重新讀取最新待辦並領下一筆，不等待排程或使用者提醒。只有全量 1,466 條完成、圖片工具明確回報額度上限，或實際無法恢復的外部阻擋時才暫停。
- 只使用一個總控產圖 session，一次從共用原子佇列領取一個編號。獨立看圖驗證可以交由驗證者執行；由總控負責登錄、備份、發布與恢復，避免重複產圖或覆寫。
- 每新增 50 張已登錄且通過獨立驗證的插圖，凍結含編號、原圖路徑、SHA-256、提示、替代文字與 review 的 manifest；保留既有備份並推送 GitHub 原圖備份分支。通過 `git diff --check` 與整合測試後，只 stage manifest 列出的通過驗證 WebP 及網站文件，推送 `main` 並核對遠端。未滿 50 張時逐張保存持久化進度；若開始或接續時發現網站落後於本機有效圖庫，立即以現有有效差異做同步發布，不等湊滿 50 張。最後不足 50 張時仍照樣備份發布。

現有工作區為 `/workspace/chengyu`。若需網站測試，先確認本機 8002 port 是否已有自己的測試伺服器；沒有時從儲存庫根目錄執行 `python3 -m http.server 8002 --bind 127.0.0.1`。完整整合檢查為 `TEST_BASE_URL=http://127.0.0.1:8002 node tests/illustrations.cjs`；不要把尚未跑過的測試記成通過。

佇列恢復與流水線收尾規則：每次循環先讀取 queue-state、metadata、review 與 `data/illustrations.json`，逐一恢復 active claim。review 存在且 `passed=true` 且 path 完全一致時，立即執行 `register_reviewed.py`；review 超過 120 秒未出現時，由總控直接查看原圖完成驗證；review 失敗則保留紀錄並依缺陷重製。只有登錄成功後才能釋放 claim，不得在通過 review 尚未登錄時結束回合。最多保留 3 張待驗圖片，驗證延遲不得阻塞下一張產圖；每張必須完成 PNG、metadata、review、登錄與釋放 claim。每回合結束前強制核對 active claim、未登錄、未發布、本機 catalog、GitHub main catalog 與 50 張批次計數。

## 2026-11-14 獨立審查執行規則

- P0 已固定畫風；生成時必須逐次讀取根層 `style_prompt`，不沿用記憶或歷史 prompt。舊實際畫風留在 `docs/reviews/2026-11-14-prompt-history.json` 作追溯，不代表舊圖已重製。
- `docs/illustration-regeneration-queue.json` 是 21 項 P1 重製的持久清單。先恢復既有 active claim；下一個安全領取點取 1 項 P1，接著最多 19 項尚未完成的新圖，再取下一項 P1。維持既有新圖順序與唯一總控，不能因 P1 已在 catalog 中就略過。不得重建或覆寫既有 queue-state。
- P1 依清單的 `suggested_scene_prompt` 設計，保留關鍵表意並避開 `avoid_composition_of` 的構圖；reason 必須引用 `defect`。原圖、原 WebP、舊 prompt 與 review 全部保留。驗證前不得刪除 catalog 舊項或覆寫舊 WebP。
- 每張新圖及 P1 都要保存 PNG、metadata、獨立實際看圖 review。review 的 `checks.taiwan_context` 與 `checks.no_red_neckerchief` 各需含 `passed: true` 與具體 `evidence`，另保留詞義、解剖、物理、畫風、文字與 alt 檢查。先執行 `python3 scripts/validate_illustration_review.py METADATA_JSON REVIEW_JSON`，通過後才可登錄。
- P1 通過後使用帶原圖雜湊的新 WebP 路徑，向 revisions 追加 previousEntry、previousBrief、previousReview、reason、replacement 與原圖／review 路徑；更新實際 alt、prompt、review、catalog 與 `sw.js VERSION`，然後才把 P1 標為 registered。發布遠端核對後才標為 published。重製不增加有效詞條數，但計入 50 張發布批次。
- P2、P3 均等有效 catalog 達 1,466 條且完成本輪 P1 後再處理；本次不清理未引用的舊圖。附件是審查依據，遇到附件建議與本段使用者指定優先序不同，以本段為準。
