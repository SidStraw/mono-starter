# 版本管理

2026-10-05 精簡後，不再複製一份版本／發布時間／integrity 資料或維護同步器。現行版本以以下原生設定與 lockfile 為準：

| 項目                         | 唯一設定來源                            | 更新工具                                |
| ---------------------------- | --------------------------------------- | --------------------------------------- |
| Node                         | root package.json 的 devEngines.runtime | Renovate npm manager；pnpm 安裝 runtime |
| pnpm                         | root package.json 的 packageManager     | Renovate npm manager                    |
| Vite+、TypeScript、Node 型別 | pnpm-workspace.yaml catalog             | Renovate npm manager                    |
| 其餘直接依賴                 | 各 package.json                         | Renovate npm manager                    |
| Vite alias、Vitest override  | pnpm-workspace.yaml overrides           | Renovate Vite+ 群組                     |
| 間接依賴                     | pnpm-lock.yaml                          | Renovate 原生 lockFileMaintenance       |
| Actions SHA                  | workflow 的 uses                        | Renovate github-actions manager         |
| 維護 image digest            | maintenance/images.json                 | Renovate custom regex manager           |

版本採精確值，Node 維持 24 LTS track。Renovate 群組提出 Vite+ 關聯更新；需要 bundle 對齊時使用 `pnpm exec vp migrate`，依官方工具處理，再安裝並執行完整 CI。Pi 不自動放寬 overrides、安裝權限或受保護設定。

pnpm 原生設定執行 72 小時冷卻、缺時間失敗、信任不可降級與未知安裝腳本失敗。production 漏洞檢查直接使用 `pnpm audit --prod --audit-level high`。TypeScript 7 的 tsdown 宣告 API 仍有 experimental 提示，以實際建置及 package 宣告測試驗證。

官方依據：[pnpm runtime](https://pnpm.io/cli/runtime)、[catalogs](https://pnpm.io/catalogs)、[Renovate npm manager](https://docs.renovatebot.com/modules/manager/npm/)、[Vite+ upgrade](https://viteplus.dev/guide/upgrade-project)。
