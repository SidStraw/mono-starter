# Vite+ monorepo starter

框架中立的 TypeScript 起點：`apps/web` 使用 `packages/core` 的公開 API。Vite+ 負責檢查、測試與建置；Renovate 負責版本及 lockfile 更新；Pi 在升版造成相容性失敗時協助修復。

## 開始使用

需先有 Node 22.19 以上、npm、Git 與網路。以下使用原生 npm/pnpm 建立專案本機工具，不修改全域設定。Node 的唯一版本來源是 `package.json` 的 `devEngines.runtime`，pnpm 版本由 `packageManager` 決定。

```sh
mkdir -p .toolchain/bin
npm install --prefix .toolchain --no-save --package-lock=false --ignore-scripts --no-audit --no-fund "pnpm@$(node -p 'require("./package.json").packageManager.split("@")[1]')"
ln -sf "../node_modules/@pnpm/exe.$(node -p 'process.platform + "-" + process.arch')/pnpm" .toolchain/bin/pnpm
ln -sf ../../node_modules/.bin/node .toolchain/bin/node
export PATH="$PWD/.toolchain/bin:$PATH"
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm dev
```

Linux 缺少瀏覽器函式庫時使用 `pnpm exec playwright install --with-deps chromium`。支援 Linux x64、macOS arm64；目前不支援 Windows。Node 由 pnpm 原生下載、驗證與管理；重開終端機時重新設定上面的 PATH。

| 指令               | 用途                                                    |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | core 初次建置後啟動 web                                 |
| `pnpm check`       | 格式、lint、嚴格 TypeScript 型別檢查                    |
| `pnpm test`        | Vitest、維護權限測試、Playwright production 測試        |
| `pnpm build`       | 依相依性順序建置 packages 與 apps                       |
| `pnpm verify`      | 不使用任務快取的 build、check、test 與 production audit |
| `pnpm tasks`       | 專案本機 Backlog CLI                                    |
| `pnpm tasks:board` | 終端機看板                                              |
| `pnpm tasks:web`   | localhost 看板，不自動開啟瀏覽器                        |

core 修改後先執行 `pnpm build`，再重新載入開發頁面。測試需要瀏覽器及 localhost 監聽權限；audit 需要網路，服務查詢失敗會使驗收失敗。新 package 的相依關係與建置順序使用 Vite+ 原生 `dependsOn`。

## 建立另一個專案

複製受 Git 追蹤的來源到新目錄，排除原專案的 `.git`、`backlog/`、依賴、工具、產物、快取與秘密。修改 root 名稱；需要新 scope 時修改 package 名稱、workspace 相依性與程式碼／Vite+ 設定中的引用，再執行 `pnpm install` 更新 lockfile。

新專案依上面的步驟建立工具，並用 Backlog 原生 CLI 初始化：

```sh
pnpm exec backlog init my-project --defaults --no-git --integration-mode cli --agent-instructions agents --include-remote false --check-branches false --auto-open-browser false
pnpm exec backlog config set filesystemOnly true
pnpm verify
```

確認 Backlog 沒有繼承 starter 的任務。維護設定保持停用，重新設定 repository／App／模型身分；原專案的驗收紀錄不代表新專案已驗收。

## 自動維護

Renovate 處理版本、catalogs、overrides、Node、pnpm、Actions、image 與每週 lockfile maintenance。CI 使用相同的原生檢查；相容性失敗才啟動 Pi，修復後重新執行完整 CI。

遠端維護與 Pi 目前停用。啟用方式見 [maintenance.md](docs/maintenance.md)，實際驗證範圍見 [setup-evidence.md](docs/setup-evidence.md)。[架構](docs/architecture.md)與[版本管理方式](docs/toolchain-baseline.md)說明各工具的責任。
