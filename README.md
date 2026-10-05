# Vite+ monorepo starter

框架中立的 TypeScript 起點：vanilla web app 實際使用 core 公開 API，所有任務由專案本機 Vite+ 排程。Node、pnpm、相依套件、Actions 與維護 image 都固定版本。

## 開始使用

需先有 Node 22.19 以上供 bootstrap 執行、Git、tar 與網路；bootstrap 只安裝在專案的 `.toolchain`，不改全域設定。支援 Linux x64、macOS arm64；首版不支援 Windows。

```sh
node scripts/bootstrap.mjs
export PATH="$PWD/.toolchain/bin:$PATH"
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
# Linux 系統缺少瀏覽器函式庫時使用 install --with-deps chromium。
pnpm dev
```

core 修改後先執行 `pnpm build`，再重新載入開發頁面。開發入口明確選定 `apps/web`，初次啟動會先建置 core。

| 指令                  | 用途                                           |
| --------------------- | ---------------------------------------------- |
| `pnpm dev`            | core 初次建置後啟動 web                        |
| `pnpm check`          | 格式、lint、完整 TypeScript 型別檢查           |
| `pnpm test`           | core 與維護防護測試，非 watch 模式             |
| `pnpm build`          | 依相依性順序建置 core、web                     |
| `pnpm verify:policy`  | 精確版本、嚴格設定與 package 邊界              |
| `pnpm smoke:consumer` | 在 workspace 外使用 core dist 與宣告           |
| `pnpm smoke:starter`  | 全新改名副本、獨立 store 與完整內部驗收        |
| `pnpm verify`         | 不使用任務快取的完整驗收，包含重新下載的新副本 |
| `pnpm tasks`          | 專案本機 Backlog CLI                           |
| `pnpm tasks:board`    | 終端機看板                                     |
| `pnpm tasks:web`      | localhost 看板，不自動開啟瀏覽器               |

`pnpm verify` 需要網路與本機瀏覽器程序／監聽權限。每次重新查安全情報與發布政策；查詢失敗會失敗。驗收前需有 Git 追蹤的 manifests 與 lockfile 基準，避免把未追蹤檔案當成「沒有變動」。

## 建立另一個專案

在已安裝此 starter 的目錄執行，目的地必須是 workspace 外的空目錄：

```sh
node scripts/create-project.mjs /absolute/path/my-project my-project @my-project
cd /absolute/path/my-project
node scripts/bootstrap.mjs
export PATH="$PWD/.toolchain/bin:$PATH"
pnpm install --frozen-lockfile
pnpm exec backlog init my-project --defaults --no-git --integration-mode cli --agent-instructions agents --include-remote false --check-branches false --auto-open-browser false
pnpm exec backlog config set filesystemOnly true
pnpm exec playwright install chromium
git init -b main
pnpm exec vp fmt --write
git add .
pnpm verify
```

初始化工具同步名稱、scope、workspace 引用與 lockfile importer；不複製既有 Backlog 任務、依賴、工具 runtime 或秘密，自動維護會回到停用狀態。新副本須自行通過驗收，原 starter 的證據不代表新專案完成。

## 自動維護

每天 Asia/Taipei 04:00 預期執行 Renovate；週一由獨立 worker 重新解析 lockfile。patch、minor、major 與 lockfile PR 全部需通過同一保護 gate。初始 `maintenance/policy.json` 的 `enabled` 為 `false`，尚未設定遠端或付費模型。

啟用所需的 GitHub App、Secrets、branch protection 與 Pi 參數見 [維護說明](docs/maintenance.md)。本機成果與尚未執行項目見 [驗收證據](docs/setup-evidence.md)。不得只開 auto-merge 而省略嚴格 branch protection。

架構見 [architecture.md](docs/architecture.md)，精確版本、發布時間與選版理由見 [toolchain-baseline.md](docs/toolchain-baseline.md)。
