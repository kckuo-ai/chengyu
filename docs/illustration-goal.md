# 插圖最終目標與唯一工作清單

最終目標為教育部索引的全部 **1,466 個詞條**都有能準確表意、通過實際看圖驗證並發布的原創插圖。完成與否只認 `data/illustrations.json`，不以產圖數、ZIP、分支名稱或舊 `progress.json` 判斷。

2026-11-17 盤點：main 已發布 **1,290 張（87.99%）**，尚缺 **176 張**；快取版本 v99。既有 21 項 P1 重製全部 published。這是檔案及紀錄盤點，不是重新逐張看完 1,290 張；不得據此宣稱全圖庫已通過最新視覺標準。

## 清單與資料各只有一個來源

- 完成目錄：`data/illustrations.json`；原始詞條：`data/moe-index.json`。
- 待辦入口：`docs/illustration-worklist.json`。每個編號只出現一次，`actions` 可同時列多個缺口；分類張數不可相加當成不同圖片。
- 清單由 `python3 scripts/illustration_audit.py --write` 產生。新增、重製或補紀錄後重新產生；用 `--json` 輸出完整即時報告。不要手改產生檔，亦不要建立第二份 done、pending 或重畫名單。
- 提示與唯一畫風：`docs/illustration-prompts.json`；逐張審查：`docs/illustration-reviews.json`；更換沿革：`docs/illustration-revisions.json`。
- `docs/illustration-regeneration-queue.json` 保留原 P1 的缺陷、建議及完成沿革，不再將已 published 的 P1 當待辦。
- `docs/reviews/2026-11-14-independent-review.json` 為歷史審查依據，不覆寫或刪除。工作清單引用其發現，不再另抄一份缺陷說明。
- 根目錄 `progress.json` 僅保留來源指標，舊批次狀態可從 Git 歷史查回。

## 完成順序

1. **補齊 176 張缺圖**：按工作清單中的 `create_new_art`，依索引原有順序處理。編號不連續，不能把範圍內每個整數都當詞條。當前首項是 1421。
2. **P1 僅恢復未完成項**：本次 21/21 均已發布，沒有待重製 P1；不可重複排入。往後新確認的嚴重缺陷另以實際審查證據建項。
3. **全量達 1,466 後處理既有品質候選**：48 項 P2 畫風、10 項仍待核對的紅領巾抽樣、42 項 P3 建議。三組合計只有 97 個不同編號；紅領巾名單是舊抽樣，非全站完整檢查。1046 已完成 P1 更換，不再重列舊紅巾問題。P3 含條件式或可保留項，須先看現圖，不能一律重畫。
4. **補齊可追溯紀錄**：556 張缺逐張 review；546 張有舊版 review，但未完整具備目前八項結構化證據；188 張具備八項通過證據。缺紀錄不等於圖片不合格，也不能靠補填 true 代替實際看圖。另有 25 張缺 prompt 紀錄，21 張 alt 含成語連續兩字，111 張為歷史非 3:2 格式候選；各項可能重疊，依同一編號合併處理。
5. **收尾**：確認全部有效圖已發布、品質問題已核實處理、原圖與雜湊及 review 可追溯，通過圖片、手機、測驗及離線檢查。歷史非 3:2 或舊紀錄不自動視為視覺失敗；須實際審查後決定修正。

## 每張新圖及重製的門檻

生成前讀教育部詞義、近反義與既有插圖；用 `python3 scripts/illustration_brief.py NUMBER` 取得根層唯一 `style_prompt`。橫式 3:2、現代台灣情境、鉛筆線、柔和水彩、色鉛筆疊色與米白紙紋。只使用對話內建圖片工具，不設定額外付費 API 或金鑰。

每張先看全圖，再看手腳、泡泡、鞋面與道具的原尺寸細部，逐項記錄具體觀察：meaning、composition、hands_feet_pose、objects_contact_perspective、text_brand_watermark、style、taiwan_context、no_red_neckerchief。須核對關鍵因果與構圖重複；任一項失敗或拿不準即不登錄。全圖無文字、字母、數字、類字形、品牌、浮水印、紅領巾或紅圍巾。書寫場景可改取景角度，不以仿字肌理規避無類文字要求。

alt 使用繁體中文 40–70 字，不得含該成語任一連續兩字。原 PNG、metadata、review 放 repo 外同一批資料夾；metadata 使用目前根層 style_prompt 原文及原圖 SHA-256，review path 必須完全一致。先執行 `python3 scripts/validate_illustration_review.py METADATA REVIEW`，再以 `scripts/add_illustration.cjs` 登錄。不得把缺審查或只有生成的圖片算入完成。

處理歷史品質候選後，在當次 revisions 的 `resolved_findings` 記錄實際解決的 action（例如 `P2_style_review`），並連同目前替換圖及通過 review 保存。待辦程式僅在該替換圖仍為現行圖時關閉相應發現，不因換圖就抹去其他缺陷。

重製時保留舊圖與紀錄，使用含原圖雜湊的新 WebP 路徑，追加 revisions 後才更新目錄；不得先刪除舊有效目錄。原 P1 清單中的重製流程仍適用。

## 多 session 與發布

只有一個總控可產圖及登錄，其他 session 可讀清單或處理明確分配的檢查。每次接續先 fetch main、核對有效目錄與現有 claim；不得清空其他 session 的 claim。不能以各分支自己的 progress 推斷全域完成狀態。沒有共用原子 claim 時，不允許多個 session 同時產圖。

一般每 50 張通過後發布，使用者提供的批次按批發布；最後不足 50 張仍發布。若有已驗證登錄但尚未發布的差異，先同步，不等湊滿。工具明確回報額度上限時保存狀態，依既有授權的恢復機制處理；不把本文件當作新排程或額外付費授權。

發布前更新 sw.js VERSION，執行狀態檢查、`git diff --check`，並在 Chromium/Playwright 可用時執行 `node tests/illustrations.cjs`。fetch main 後如有變更先合併或 rebase 並重跑檢查；先推備份分支，再推 main，最後核對遠端 HEAD、圖片數與版本。

## 暫存分支整理與數量保護

以使用者最新確認的 **1,290 張線上有效圖**為本次清理下限。清理不改 main 的圖片目錄或被引用 WebP；若任何刪除可能降低線上有效張數，必須停止並先詢問使用者。

已結案的 handoff、illustration-delivery 與 illustrations/batch 暫存分支，只保留指向 main 工作清單的共同 README。清理以原 HEAD 為父提交、附 expected-head 檢查更新分支，不刪分支、不改寫歷史；舊交付原圖仍能從父提交追溯。保留所有 backup 分支、原始審查證據，以及 main 內的歷史未引用 WebP。清理紀錄見 `docs/illustration-staging-cleanup.json`。這會移除分支最新樹的重複檔案，不代表 Git 歷史儲存量已縮減。
