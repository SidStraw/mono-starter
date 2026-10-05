---
id: TASK-1
title: 'P0: Toolchain baseline'
status: Done
assignee:
  - '@codex'
created_date: '2026-10-05 08:07'
updated_date: '2026-10-05 09:10'
labels: []
dependencies: []
references:
  - docs/2026-10-05-vite-plus-starter-agent-spec.md
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
固定版本、冷卻與配套需可重現
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 官方版本證據完整
- [x] #2 固定 bootstrap 與工具配套可用
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
依已核准計畫實作並保存客觀驗收結果。
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
固定 Node 24.21.0、pnpm 12.8.2、Vite+ 1.0.0 配套；官方 registry／release／GHCR 冷卻與相容性已核實。bootstrap、凍結安裝與 dist consumer 實測通過。
<!-- SECTION:FINAL_SUMMARY:END -->
