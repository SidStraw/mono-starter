# Vite+ monorepo starter

框架中立的 TypeScript 起點。`apps/web` 透過公開 API 使用 `packages/core`；Vite+ 負責開發、檢查、測試與建置。Renovate 提出依賴更新，GitHub Actions 執行驗證，Pi 可按需協助分析 CI 失敗。

## 開始使用

需先有 Node.js 24、npm、Git 與網路。以下用原生 npm/pnpm 建立專案本機工具，不修改全域設定。專案使用的 Node 版本取自 `package.json` 的 `devEngines.runtime`，pnpm 版本取自 `packageManager`。

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

Linux 缺少瀏覽器函式庫時，改用 `pnpm exec playwright install --with-deps chromium`。CI 涵蓋 Linux x64、macOS arm64；上述安裝方式目前不涵蓋 Windows。重開終端機後，重新執行 PATH 設定。

| 指令               | 用途                                                    |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | 啟動 web，並監看、重新建置 core                         |
| `pnpm check`       | 格式、lint、嚴格 TypeScript 型別檢查                    |
| `pnpm test`        | 單元測試、公開套件介面測試、Playwright production 測試  |
| `pnpm build`       | 依相依性順序建置 packages 與 apps                       |
| `pnpm verify`      | 不使用任務快取的完整建置、檢查、測試與 production audit |
| `pnpm tasks`       | 專案本機 Backlog CLI                                    |
| `pnpm tasks:board` | 終端機看板                                              |
| `pnpm tasks:web`   | localhost 看板，不自動開啟瀏覽器                        |

測試需要 Chromium 與 localhost 監聽權限；audit 需要網路，查詢失敗會使驗收失敗。

## 專案結構

- `apps/web`：最小網頁範例。
- `packages/core`：共用邏輯、單元測試與公開 exports，建置後輸出 JavaScript 和型別宣告。
- `tests`：套件使用端測試與瀏覽器測試。
- `.github/workflows`：一般 CI、選用的 Pi 失敗診斷。
- `backlog`：使用 Backlog CLI 管理的任務。

跨 package 使用套件名稱與 `workspace:*`，透過 `dist` 的公開 exports 匯入。新增 package 時，沿用嚴格 TypeScript 設定，以 Vite+ 的 `dependsOn` 宣告建置順序；避免 TS paths、來源 alias、反向匯入 app 與循環相依。

## CI 與依賴更新

[Starter CI](.github/workflows/ci.yml) 在 PR、main push 或手動觸發時執行。官方 [pnpm/setup](https://github.com/pnpm/setup) 讀取 `package.json`，以 frozen lockfile 安裝；兩個平台都直接執行 `pnpm verify`。PR job 僅有讀取權限，不使用模型憑證。

在 GitHub 為目標 repository 安裝 [Renovate App](https://docs.renovatebot.com/getting-started/installing-onboarding/)，即可使用 [renovate.json](renovate.json)。它管理版本、catalog、overrides、Node、pnpm、Actions 與每週 lockfile 更新。預設由維護者審查合併；若要開啟 automerge，先將 `starter/linux-x64`、`starter/macos-arm64` 設為必要檢查，並要求分支與 main 同步。

共用開發依賴的版本放在 `pnpm-workspace.yaml` 的 catalog。Vite+ 的 Vite alias 與 Vitest override 依[官方安裝方式](https://github.com/voidzero-dev/vite-plus/tree/main/packages/cli#installation) 保持與其內含版本一致；相關更新會放在同一個 Renovate PR。若升版需要調整設定，使用 `pnpm exec vp migrate` 協助遷移，再執行完整驗證。安裝腳本由 pnpm 的 `allowBuilds` 管理，新增允許項目需要審查。

## Pi 協助診斷 CI

[Pi CI diagnosis](.github/workflows/pi-diagnose.yml) 使用 Pi 原生 CLI。維護者在預設分支手動選擇失敗的 Actions run ID，Pi 讀取失敗日誌的最後 100,000 bytes，將原因分析、修正建議與待執行測試寫入該次診斷的 Actions summary。

啟用前設定 repository variables `PI_DIAGNOSE_ENABLED=true`、`PI_PROVIDER`、`PI_MODEL`，以及 secret `PI_API_KEY`。日誌片段會送往所選模型供應商；費用上限由供應商端設定。workflow 有 10 分鐘逾時限制，這不等於費用上限。

診斷時停用 Pi 的工具、擴充功能、專案設定與 session 儲存。Pi 提供建議，實際測試結果以 CI 為準；此流程沒有自動修復、寫回 PR 或改寫檢查結果的功能。未設定以上項目時，Pi workflow 會跳過，一般 CI 照常執行。

本機可使用 `PI_CODING_AGENT_DIR="$PWD/.pi/agent" pnpm exec pi` 協助開發與執行測試，將設定及 session 留在已忽略的專案目錄。依 [Pi 文件](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs) 設定自己的模型認證，完成變更後執行 `pnpm verify`。

## 建立另一個專案

複製來源時排除 `.git`、`backlog/`、`node_modules/`、`.toolchain/`、產物、快取與秘密。修改 root 名稱；若更換 scope，同步修改 package 名稱、workspace 相依性及程式碼／Vite+ 設定中的引用，再用 `pnpm install` 更新 lockfile。

依上面的步驟建立本機工具，再初始化新的 Backlog：

```sh
pnpm exec backlog init my-project --defaults --no-git --integration-mode cli --agent-instructions agents --include-remote false --check-branches false --auto-open-browser false
pnpm exec backlog config set filesystemOnly true
pnpm verify
```

新 repository 需要自行啟用 Renovate、設定必要 CI 檢查；只有需要 Pi 診斷時才設定模型。
