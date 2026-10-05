---
id: TASK-1
title: 全面精簡 starter 與驗證原生工具流程
status: Done
assignee:
  - '@codex'
created_date: '2026-10-05 12:28'
updated_date: '2026-10-05 12:40'
labels: []
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用者要求重新檢查整個專案，降低自訂腳本與維護框架成本。以 Renovate 管理更新、標準 CI 驗證、Pi 按需診斷為範圍，保留工作目錄中既有的文件及任務刪除。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 自訂 maintenance 控制平台移除，標準 CI 執行與本機相同的完整驗證
- [x] #2 Renovate 與 Pi 使用原生入口，README 及 AGENTS 與實作一致，沒有已刪檔案的失效引用
- [x] #3 套件邊界、嚴格型別、單元測試與瀏覽器測試通過，驗證範圍及未執行項目有紀錄
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 盤點全部設定、來源、測試與現有刪除。2. 移除自訂維護平台，改用標準 CI、Renovate 設定及手動 Pi 診斷。3. 移除多餘依賴與設定，修正使用文件和開發流程。4. 執行原生設定檢查與無任務快取驗證，確認乾淨安裝及變更範圍。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
移除 maintenance 全部 22 個檔案、2 個自訂維護 workflow、直接 pi-ai/yaml 依賴及過時引用。CI 改為標準 pull_request + push，以官方 pnpm/setup 和 pnpm verify 驗證 Linux x64 / macOS arm64；Renovate 使用 hosted App 設定，預設關閉 automerge。Pi 僅由維護者手動觸發失敗日誌診斷，停用工具與專案資源，不提供自動修復或 PR 回寫。原來的 broker、跨 run 重試預算與 App aggregate 功能已隨平台移除，不再宣稱有這些保證。
開發模式改用 Vite+ 原生 pack watch；瀏覽器實測 core 總和 12 → 112 → 12，無需手動建置或重新載入，測試後完整還原來源。移除 Backlog 預設的個人 Zed 設定；保留使用者先前刪除的舊文件與任務。
驗證：macOS arm64 本機 pnpm verify 及新的純來源副本（依 README 完整 bootstrap）皆通過，含 7 項 Vitest + 1 項 Playwright、嚴格型別/lint/format、production audit，均無任務快取。frozen install 通過。actionlint 1.7.12 與官方 Renovate 44.132.1 strict config validator 通過；本機假模型執行 Pi workflow 的實際 shell 指令，確認工具及 AGENTS context 未送出、讀取測試日誌並產生 summary。檔案連結與 git diff --check 通過。
未執行：GitHub 遠端 workflow、Linux x64 runner、Renovate 遠端 onboarding、真實付費模型。Pi 模型費用限制改由供應商管理；10 分鐘 workflow timeout 不代表費用上限。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已將 starter 精簡為原生 Vite+、pnpm、Renovate 與 GitHub Actions 設定，移除自訂維護平台並保留按需 Pi 診斷。原始工作目錄與純來源副本完整驗證均通過，開發即時更新及 Pi CLI 假模型整合另經實測。遠端服務及真實模型尚未啟用或驗收。
<!-- SECTION:FINAL_SUMMARY:END -->
