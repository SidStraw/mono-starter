---
id: TASK-9
title: 精簡 starter 與原生工具維護流程
status: Done
assignee:
  - '@codex'
created_date: '2026-10-05 11:18'
updated_date: '2026-10-05 11:56'
labels: []
dependencies: []
type: chore
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用者認為自訂腳本維護成本不值得，授權改為 Renovate 管理版本與 lockfile、CI 執行原生檢查、Pi 處理相容性失敗。縮減實作與日常驗收負擔。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 移除重複版本同步、初始化、報告與完整副本驗收腳本，原生工具承擔可替代工作
- [x] #2 Renovate 管理版本與 lockfile，CI 和 Pi 分工一致且保留修復權限與上限
- [x] #3 pnpm verify 通過且文件反映精簡後流程與未驗證的遠端範圍
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 使用原生 pnpm/Vite+/Renovate 減少自訂腳本與版本資料來源。
2. 改為一般整合測試，簡化 CI 與 Pi 指令。
3. 更新規格、文件和 Backlog，執行本機驗收並提交。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
以 pnpm devEngines.runtime 驗證專案本機 Node；移除 scripts 全部 13 個檔案及自訂 artifact、weekly lockfile、toolchain sync，改用原生 Renovate 與一般整合測試。

驗證：macOS arm64 pnpm verify 35 項測試全數通過、0 cache hit；frozen install 前後 manifests/lockfile SHA-256 一致；固定 Renovate image schema 與 npm/catalog/runtime/兩種 image extraction 通過；官方 Node image Linux arm64 bootstrap/frozen install/check/7 項單元測試及隔離 canary 通過。遠端及真實模型仍停用，GitHub CI/auto-merge/Pi 全閉環未執行。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
移除 scripts 全部 13 個檔案及自訂生成器、政策掃描、版本 metadata/sync、artifact 與 weekly lockfile workflow。改用原生 npm/pnpm runtime、catalog、Vite+、Vitest/Playwright 與 Renovate；保留 Pi 必要的權限及預算邊界。完整本機驗收 35 項通過，Linux arm64 工具準備與來源檢查通過，遠端閉環待原有外部設定。
<!-- SECTION:FINAL_SUMMARY:END -->
