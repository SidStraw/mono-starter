---
id: TASK-6
title: 'P5: Renovate controller'
status: Done
assignee: []
created_date: '2026-10-05 08:07'
updated_date: '2026-10-05 09:11'
labels: []
dependencies:
  - TASK-5
references:
  - docs/2026-10-05-vite-plus-starter-agent-spec.md
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
升版須保持工具配套與權限邊界
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 schema 與 extraction 實證完整
- [x] #2 可信版本欄位範圍與冷卻控制完成
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
分離 Renovate writer 與 artifact container，驗證 schema/extraction、精確配套與官方冷卻 metadata。
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
固定 Renovate 44.132.1 image/digest；repo/admin schema、npm/nvm/Actions/custom regex 實際 extraction 通過。官方 Actions release tag、GHCR digest 與版本範圍拒絕案例通過；遠端更新/auto-merge 尚未啟用。
<!-- SECTION:FINAL_SUMMARY:END -->
