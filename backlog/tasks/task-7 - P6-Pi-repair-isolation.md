---
id: TASK-7
title: 'P6: Pi repair isolation'
status: In Progress
assignee: []
created_date: '2026-10-05 08:07'
updated_date: '2026-10-05 11:55'
labels: []
dependencies:
  - TASK-6
references:
  - docs/2026-10-05-vite-plus-starter-agent-spec.md
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
模型不能放寬驗收或取得寫入憑證
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 固定 Pi、broker 及隔離 runner 完成
- [x] #2 patch 範圍及累計預算拒絕案例通過
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
固定 Pi SDK、模型 broker、候選 container 與可信 ledger/publisher；只接受相容性失敗與允許 source patch。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
固定 SDK fixture protocol、broker、token/cost/次數/累計時間拒絕與 container canary 實測通過。完整 repair-runner 的 GitHub ledger、兩容器與真實模型端到端尚未執行，因此 AC1 保留未勾選；需要 TASK-8 的 repository/App/provider/model 設定。

追加客觀拒絕證據：實際 ancestor symlink 在讀取 patch 前被拒絕；有價格設定時費用上限在模型 dispatch 前拒絕。最終 macOS 治理測試 33 項、core 6 項全部通過。

TASK-9 精簡後，Pi 使用原生 install-tool 準備固定 Node/pnpm，並執行 Vite+ check／unit tests；完整瀏覽器與 audit 由修復後 CI 驗收。SDK/broker、allowlist 與累計預算保留，真實模型與遠端 ledger/publisher 閉環仍待外部設定。

最終改用含 npm 的官方 Node image，避免 containerbase parent 工具安裝成本；Linux arm64 原生 bootstrap、frozen install、check 與單元測試及隔離 canary 已通過。真實模型與 GitHub ledger/publisher 閉環仍 NOT RUN。
<!-- SECTION:NOTES:END -->
