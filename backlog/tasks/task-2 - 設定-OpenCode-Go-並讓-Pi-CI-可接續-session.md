---
id: TASK-2
title: 設定 OpenCode Go 並讓 Pi CI 可接續 session
status: Done
assignee:
  - '@codex'
created_date: '2026-10-07 04:52'
updated_date: '2026-10-07 05:04'
labels: []
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用者選用 OpenCode Go GLM-5.3，要求 CI 以一次性非互動指令執行，模型失敗或沒有回應時能在原 session 接續。維持原生 Pi 與 Actions 設定，避免重新引入自訂維護平台。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 README 說明 OpenCode Go 的 provider/model/key 設定及一次性執行方式
- [x] #2 Pi 暫時性錯誤有有界重試及逾時，失敗與空白輸出不可當成診斷成功
- [x] #3 session 可保存並於重新執行 workflow 時接續，artifact 不包含模型憑證，模型故障及復原經本機 fixture 驗證
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 核對 Pi 1.0 原生 provider、print、session、retry 語意。2. 在既有 workflow 加入 session 保存/復原與原生逾時重試設定。3. 補齊設定及恢復操作文件。4. 用本機假模型驗證正常、失敗、空白、無回應與復原，執行完整驗證及 workflow 檢查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
PASS：核對 Pi 1.0.0 本機 CLI、session/retry 實作與 OpenCode Go 官方文件，provider=opencode-go、model=glm-5.3。
PASS：隔離 Linux 容器使用專案 frozen lockfile 安裝的真實 Pi CLI，將原生 OpenCode Go endpoint 指向本機假模型，執行實際 workflow shell。503 暫時性錯誤最多重試 2 次後成功；持續 503、無回應、401、Go 額度用盡、空白回應均非零退出。GNU timeout 真正終止行程後仍保存原提示。
PASS：用下載 artifact 的替身在全新 runner 目錄復原，驗證同一 run 重跑及新 run 指定 resume_run_id 皆保留 session ID；送出的 x-opencode-session 相同，原始日誌保留且不重複附加。session 檔不含測試用 key，模型請求無工具。指定 artifact 缺失或讀取失敗時非零退出。
PASS：pnpm verify（無任務快取）：build、格式、lint、TypeScript、7 個 Vitest、1 個 Playwright 與正式依賴 audit；官方 actionlint 1.7.12、變更檔案格式檢查及 git diff --check。
NOT RUN：真實 OpenCode Go 付費呼叫、遠端 GitHub artifact 上傳/下載及 workflow rerun。未更改遠端設定，未 push。
實作只使用既有 workflow、原生 Pi JSON 設定及 Actions artifact，臨時故障測試不加入專案。session 保存 7 天；尚未落盤的串流與 runner 遺失、artifact 上傳失敗無法保證復原。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已加入 OpenCode Go GLM-5.3 設定說明，CI 維持非互動 pi --print，搭配固定 session、原生有界重試及逾時；透過 artifact 接續原對話。實際 Pi CLI 的 Linux 故障與復原測試、pnpm verify、actionlint 均通過；真實模型與遠端 Actions 尚未執行。
<!-- SECTION:FINAL_SUMMARY:END -->
