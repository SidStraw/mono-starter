---
id: TASK-4
title: 'P3: Clean starter verification'
status: Done
assignee:
  - '@codex'
created_date: '2026-10-05 08:07'
updated_date: '2026-10-05 09:10'
labels: []
dependencies:
  - TASK-3
references:
  - docs/2026-10-05-vite-plus-starter-agent-spec.md
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
乾淨副本才是可重用成果證據
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 dist consumer 型別與執行通過
- [x] #2 改名副本 frozen install 與完整驗收通過
- [x] #3 真實 browser 及負向政策驗證通過
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
依已核准計畫實作並保存客觀驗收結果。
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
macOS arm64 完整 pnpm verify 通過，0 cache hit；乾淨 @fresh 副本用自己的 runtime/store/browser 完成 frozen install 與 verify:inner；供應鏈拒絕 fixture 與 browser 通過。
<!-- SECTION:FINAL_SUMMARY:END -->
