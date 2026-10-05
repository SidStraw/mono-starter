---
id: TASK-3
title: 'P2: Core, web and task graph'
status: Done
assignee:
  - '@codex'
created_date: '2026-10-05 08:07'
updated_date: '2026-10-05 09:10'
labels: []
dependencies:
  - TASK-2
references:
  - docs/2026-10-05-vite-plus-starter-agent-spec.md
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
驗證跨 package 公開輸出
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 core 行為測試與 web build 通過
- [x] #2 strict checks 與相依建置順序通過
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
依已核准計畫實作並保存客觀驗收結果。
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
core 6 項測試、strict/typeAware/typeCheck、core→web 相依建置與瀏覽器結果通過；consumer 只使用 dist JS 與宣告。
<!-- SECTION:FINAL_SUMMARY:END -->
