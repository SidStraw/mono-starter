---
id: TASK-7
title: 'P6: Pi repair isolation'
status: In Progress
assignee: []
created_date: '2026-10-05 08:07'
updated_date: '2026-10-05 09:29'
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
<!-- SECTION:NOTES:END -->
