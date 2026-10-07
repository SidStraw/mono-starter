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

使用 OpenCode Go 的 GLM-5.3 時，到 repository 的 **Settings → Secrets and variables → Actions** 設定：

| 類型     | 名稱                  | 值                                      |
| -------- | --------------------- | --------------------------------------- |
| Variable | `PI_DIAGNOSE_ENABLED` | `true`                                  |
| Variable | `PI_PROVIDER`         | `opencode-go`                           |
| Variable | `PI_MODEL`            | `glm-5.3`                               |
| Secret   | `PI_API_KEY`          | OpenCode Console 中已訂閱 Go 的 API key |

Pi 已內建此 [provider/model](https://pi.dev/models/opencode-go/glm-5-3)，會使用 Go 的 `/zen/go/v1` endpoint，無須另外建立 provider。日誌片段會送往 OpenCode；Go 用量以 [Console 與方案限制](https://opencode.ai/docs/go/) 為準。`Use balance` 開啟後，超出 Go 用量可能改扣 Zen 餘額。

workflow 使用 `pi --print --session <檔案>`，每次執行完成就退出，不開啟互動介面。一次性執行與 session 保存是分開的功能。Pi 的工具、擴充功能與專案設定仍停用；它提供建議，實際測試結果以 CI 為準，沒有自動修復或 PR 回寫。

失敗與接續方式：

- [原生 Pi 設定](.github/pi-settings.json) 將 HTTP 無回應逾時設為 90 秒，暫時性錯誤最多自動重試 2 次。認證錯誤、Go 額度用盡等非暫時性錯誤會失敗，需要先處理原因。
- 單次 Pi 行程最多執行 6 分鐘，整個 job 最多 15 分鐘；失敗或空白結果不算成功。這些是時間與重試限制，不是費用上限。
- session 以 `pi-session-<CI run ID>` artifact 保存 7 天，包含對話與日誌片段，不上傳 Pi 的認證檔。其可見範圍依 repository 的 Actions artifact 存取權限。
- 同一次 Pi workflow 選 **Re-run failed jobs** 時，會先下載既有 session，再接續診斷。若第一次失敗在建立 session 之前，會重新建立診斷。
- 若要另開 workflow 接續，`run_id` 填原本失敗的 **CI run ID**，`resume_run_id` 填先前的 **Pi diagnosis run ID**。指定的 artifact 不存在或下載失敗時，流程會失敗，不會默默改開新對話。

接續使用已落盤的對話歷史，不保證保留中斷瞬間尚未寫入的串流內容。runner 消失或 artifact 上傳失敗時，也無法保證復原該次新增紀錄；模型正常失敗及行程逾時後，workflow 會嘗試保存 session。

未啟用 `PI_DIAGNOSE_ENABLED` 時，Pi job 會跳過；啟用後缺少 provider、model 或 key，job 會失敗。一般 CI 不受 Pi 設定影響。手動 workflow 必須先合併到預設分支才能執行。

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
