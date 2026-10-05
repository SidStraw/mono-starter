---
id: TASK-8
title: 'P7: Remote end-to-end activation'
status: To Do
assignee: []
created_date: '2026-10-05 08:07'
updated_date: '2026-10-05 11:40'
labels: []
dependencies:
  - TASK-7
references:
  - docs/2026-10-05-vite-plus-starter-agent-spec.md
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
真實 PR/run 不能以設定替代
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 兩平台真實 CI 成功
- [ ] #2 Renovate 真實更新並自動合併
- [ ] #3 Pi 真實呼叫、patch 與新 HEAD CI 成功
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BLOCKED：尚未提供並授權 owner/repo 與首次 push、GitHub App/Secrets/branch protection，以及 Pi provider/model/endpoint/key。兩平台 GitHub runs、真實 Renovate/auto-merge、真實模型修復均 NOT RUN；policy.enabled=false，所有外部啟用 AC 保留未勾選。

TASK-9 將版本及 lockfile 更新交回 Renovate 原生功能，刪除自訂 artifact/weekly workflow。遠端啟用條件與授權未變，仍 NOT RUN／BLOCKED。
<!-- SECTION:NOTES:END -->
