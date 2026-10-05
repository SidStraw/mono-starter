---
id: TASK-5
title: 'P4: Trusted CI gate'
status: Done
assignee: []
created_date: '2026-10-05 08:07'
updated_date: '2026-10-05 09:11'
labels: []
dependencies:
  - TASK-4
references:
  - docs/2026-10-05-vite-plus-starter-agent-spec.md
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
排除 skipped、舊 SHA 與偽造來源
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 固定 SHA Linux/macOS workflow 完成
- [x] #2 gate 拒絕缺漏、skipped、舊 SHA
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
固定 trusted checkout、分階段 candidate 驗收與獨立 aggregate；以實際 workflow 結構及 gate 拒絕測試查核。
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Linux x64/macOS arm64 workflow、整合 base、固定 checkout SHA、隔離憑證與可信 aggregate 完成。實際 YAML 結構及 skipped/缺平台/過期 SHA/偽造來源測試通過；GitHub 真實 jobs 保留 TASK-8 未驗收。
<!-- SECTION:FINAL_SUMMARY:END -->
