# 持續維護的 Vite+ monorepo starter：Agent 執行提示規格

整理日期：2026-10-05。版本：1。

使用方式：將本文件全文交給設置 agent，並在專供 starter 的新目錄或 repository 執行。這份文件是實作指令，不是要求修改目前存放本文件的 Hermes 專案。版本號必須在實作當下重新查證。

---

你是一名負責建立與驗證開發基礎設施的工程 agent。請完整實作下列 starter，執行驗證並交付可使用的成果。不要只提出計畫或產生設定範例。合理的實作細節可自行決定，缺少遠端權限或秘密時，先完成不受影響的本機工作，最後精確列出尚未啟用的項目。

## 1. 目標與已確定的決策

建立可作為未來 TypeScript 專案起點的 monorepo starter，並讓它持續追上「經過冷卻、符合工具相容性要求且通過完整驗證的最新穩定版本」。

- workspace 採 `apps/*` 與 `packages/*`。
- 套件管理器使用 pnpm；提交 `pnpm-lock.yaml`。
- 使用 Vite+ 的專案本機 CLI 與內建工具，任務排程統一使用 `vp run`。
- 不加入 moon、Turborepo、Nx，或另一套重複的任務排程系統。
- TypeScript 採嚴格設定；格式、lint、型別檢查、測試與打包優先使用 Vite+ 的支援工具組合。
- Backlog.md 安裝於專案內，用 CLI 管理任務進度與驗收。
- GitHub Actions 定時執行 Renovate，更新版本與 lockfile；完整 CI 通過後自動合併。
- patch、minor、major 更新都可自動合併，不能把 major 一律改成人工審核。
- Pi 用於升版後的相容性修正；合併結果由固定且受保護的驗證規則決定。
- 首版保持框架中立，採最小 vanilla TypeScript web app 與純 TypeScript 共用 package，驗證跨 package 使用。
- 不加入產品功能、資料庫、登入、部署平台或 npm 發布流程。

「最新」是可相容且符合防護政策的最新版；不為追求數字最大而破壞 Vite+ 的受支援組合。架構更新以官方 migration、棄用設定及以下結構規則為依據，不讓 agent 自行擴大重構範圍。

## 2. 執行參數與預設值

| 參數 | 預設／處理方式 |
|---|---|
| 目標目錄 | 使用者指定的 starter 目錄；在新 repository 的 chat 執行時可使用目前目錄 |
| 專案名稱 | 未指定時使用 `vite-plus-starter` |
| workspace scope | 未指定時使用 `@starter`，並提供改名方式 |
| GitHub repository | 使用者指定的 `owner/repo`；不能猜測或建立遠端 repository |
| Node.js | 最新、受 Vite+ 支援的穩定 LTS patch；明確維護 LTS track |
| 其他工具版本 | 實作當下最新、通過 72 小時冷卻且符合相容性要求的穩定版本 |
| 更新頻率 | Asia/Taipei 每天 04:00；另提供 `workflow_dispatch` |
| lockfile 維護 | 每週一次，依相同驗收規則合併 |
| Pi provider／model | 使用者提供或既有明確設定；核實可用性，不猜測模型識別碼 |
| Pi 修正上限 | 每 PR 最多 2 次、累計最多 20 分鐘；另實作可設定的 token／費用上限 |

先檢查目標的 `AGENTS.md`、Git 狀態、現有檔案與相關工具版本。保留無關變更，不覆寫不相關專案。沒有目標目錄時，先取得這項必要資訊；不要把存放本提示的目錄當成 starter 目標。

本機實作與驗證可直接完成。在使用者已指定並授權設置的 GitHub repository，有可用權限時可完成自動維護與保護設定，不要逐項重複請求確認。建立遠端 repository、初次 push、發布、部署或更改其他 repository，不因本提示而自動取得授權。

## 3. 先查證工具與版本

閱讀實作當下的官方文件與 release 資訊，至少包含：

- [Vite+ 建立專案](https://viteplus.dev/guide/create)、[本機 CLI](https://viteplus.dev/guide/local-cli)、[升級](https://viteplus.dev/guide/upgrade)。
- [Vite+ monorepo](https://viteplus.dev/guide/monorepo)、[任務](https://viteplus.dev/guide/run)、[檢查](https://viteplus.dev/guide/check)、[快取](https://viteplus.dev/guide/cache)。
- [pnpm 設定](https://pnpm.io/settings)、[相依性防護](https://pnpm.io/settings/dependency-resolution)、[build scripts](https://pnpm.io/settings/build)。
- [Renovate npm manager](https://docs.renovatebot.com/modules/manager/npm/)、[設定](https://docs.renovatebot.com/configuration-options/)、[自動合併](https://docs.renovatebot.com/key-concepts/automerge/)。
- [Backlog.md](https://github.com/MrLesk/Backlog.md)、[CLI 文件](https://github.com/MrLesk/Backlog.md/blob/main/CLI-INSTRUCTIONS.md)。
- [Pi coding agent](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)；若官方位置或 npm 名稱改變，追蹤官方重新導向後驗證身分。

查詢 registry 的版本、dist-tags、發布時間、engines、peerDependencies 與官方來源。不要直接使用本提示整理時的版本，也不要將 `latest`、`next`、`beta` 等浮動字串寫成實際使用版本。

Vite+ 若需要 npm aliases、overrides 或特定 Vitest 相依性，保留官方要求並轉成精確版本；把 Vite+ 與必須協同更新的項目當作一組。不要獨立把它內部的 Vite、Vitest、Oxlint、Oxfmt 或 tsdown 強制升到不支援的版本。

將選定版本、發布時間、查證日期、官方來源、Node 相容性與選版理由記錄在 `docs/toolchain-baseline.md`。對所有固定版本位置建立明確的 Renovate 更新對應，避免紀錄檔與實際設定各自漂移。

## 4. 專案結構與 package 邊界

至少建立以下結構；檔名可因當前工具要求調整，但責任要維持清楚：

```text
apps/
  web/                     # 最小 TypeScript web app，實際引用 core
packages/
  core/                    # 純 TypeScript 邏輯與公開 exports
scripts/
  verify-policy.*          # 驗證版本、結構與防護政策
  smoke-starter.*          # 從乾淨副本驗證新專案起點
  smoke-consumer.*         # 驗證 core 的實際建置輸出與宣告
maintenance/
  renovate-config.*        # self-hosted controller 設定
  repair-runner.*          # Pi 執行、修正上限與結果整理
  repair-prompt.md          # 只處理升版相容性的明確指令
  policy.*                 # 自動維護的受保護規則
.github/workflows/
  ci.yml
  dependency-maintenance.yml
  dependency-repair.yml
backlog/
docs/
  architecture.md
  toolchain-baseline.md
  maintenance.md
  setup-evidence.md
AGENTS.md
README.md
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
vite.config.ts
tsconfig.base.json
```

- root 與示例 packages 預設 `private: true`，避免誤發布。
- 每個 package 明確宣告自己使用的相依性，不依賴 root 的偶然 hoisting。
- 內部相依性使用 `workspace:*` 等明確的 workspace protocol，避免誤從 registry 下載同名套件。
- `apps` 是可執行應用程式，`packages` 是可重用模組；禁止 core 反向引用 app，也禁止循環相依性。
- 使用 package 名稱與公開 exports 引用 core，不使用跨目錄相對路徑或 TS paths 繞過 package 邊界。
- core 的範例 API 至少有一項有意義的測試；web 實際呈現呼叫該 API 的結果。
- core 以 Vite+ 支援的 library packaging 流程產生 JavaScript 與型別宣告；驗證 consumer 使用建置輸出，不只使用 source alias。
- 共用 TS 設定保持小型；app 與 library 只覆寫必要的 compiler options。
- 根目錄共享 lint／format 政策，明確啟用 Vite+ 的 `typeAware`、`typeCheck` 與 TS strict。

## 5. 指令與任務設定

提供以下根目錄指令，README 必須說明用途。指令透過 pnpm 使用專案本機工具，不要求安裝全域 `vp` 或 Backlog CLI。

| 指令 | 行為 |
|---|---|
| `pnpm dev` | 啟動 web app，明確指定 package |
| `pnpm check` | 格式、lint、完整 TS 型別檢查 |
| `pnpm test` | 非 watch 模式執行全部示例測試 |
| `pnpm build` | 依相依性順序建置 packages 與 apps |
| `pnpm verify:policy` | 驗證鎖版、workspace 邊界與安全政策 |
| `pnpm smoke:consumer` | 用實際建置輸出驗證 package exports 與型別 |
| `pnpm smoke:starter` | 從乾淨副本完成完整新專案驗證 |
| `pnpm verify` | 完整、本機可重現的驗收入口 |
| `pnpm tasks` | Backlog 本機 CLI 入口 |
| `pnpm tasks:board` | Backlog 任務看板 |
| `pnpm tasks:web` | Backlog 本機 web 介面 |

使用 `vp run` 的 workspace、filter 與 `dependsOn` 能力建立任務順序，明確測試 package 建置在 app／consumer 前完成。禁止 CI 使用互動式 package picker。

CI 的最終升版驗收必須重新執行，使用 `--no-cache` 或等效的確定設定；開發時可以快取。需要快取的任務設定檔、環境變數、lockfile 與工具版本要納入失效條件。網路結果、目前時間、外部安全情報、發布或其他副作用任務不得快取成永久成功。

缺少測試、選不到 package、跳過必要任務或根目錄腳本遞迴，不能算驗收成功；禁止使用 `passWithNoTests` 或吞掉錯誤來完成設置。

## 6. 版本鎖定與供應鏈政策

把可支援的防護設定寫在 `pnpm-workspace.yaml`，不要依賴開發者的全域設定。實作當下驗證鍵名與語義；若版本不支援必要防護，選擇可支援的穩定版本或明確報告阻擋，不靜默略過。

必要政策：

- registry 直接相依性鎖定精確版本；npm aliases 也必須鎖定實際版本。若使用 catalogs，catalog 內的值仍需精確。
- workspace protocol 不是 registry 的浮動版本，不需錯誤地改成普通 SemVer。
- `packageManager` 鎖定 pnpm 精確版本，Node 有單一、可由 CI 與本機一致讀取的精確版本來源。
- 安裝用 pnpm；CI 與重新生成的專案用 `pnpm install --frozen-lockfile`，不在驗收中重新選版。
- pnpm 的 `minimumReleaseAge` 設為 4320 分鐘，對新解析與現有 lockfile 都維持防護。
- 使用受支援的嚴格冷卻設定；缺少發布時間或沒有符合冷卻的版本時 fail closed。
- 啟用 `trustPolicy: no-downgrade` 與 `blockExoticSubdeps: true`；維持 `trustLockfile: false` 或當前等效設定。
- 套件安裝腳本預設不執行，透過當前 pnpm 的明確 allowlist 機制管理；開啟 `strictDepBuilds` 或等效的未知腳本失敗機制。
- 不啟用 `dangerouslyAllowAllBuilds`；不加入全套件信任、整個 scope 的冷卻豁免或自動安全例外。
- 初次設置時檢查確實必要的 install scripts，再允許最小範圍；升版新增權限需求時保留失敗，不能由 Pi 自行放行。
- GitHub Actions 固定完整 commit SHA；若用 container image，固定可追蹤版本及 digest，並納入自動更新。
- 不使用未鎖版本的 `curl | bash`、`npx`、`pnpm dlx` 作為日常 CI bootstrap。
- 執行候選相依性、程式碼與測試的環境，不持有 repository 寫入 token、App private key 或部署憑證。

加入已知漏洞的必要檢查，至少阻擋 production 相依性的 high／critical；說明其資料來源與限制。安全情報查詢失敗不能報成沒有漏洞。冷卻期、provenance 與測試只能降低風險，不宣稱可完全防止惡意套件。

防護設定依據：[pnpm 相依性解析設定](https://pnpm.io/settings/dependency-resolution)、[pnpm build 設定](https://pnpm.io/settings/build)。

## 7. Backlog.md 與 Agent 指引

- 安裝精確版本的 `backlog.md` 為 root devDependency，使用 `pnpm exec backlog`。
- 以當前 CLI 支援的非互動方式初始化，採 project-local CLI instructions，維持 `AGENTS.md` 中其他指引。
- 建立任務前讀 `backlog instructions overview` 與 `task-creation`；執行與完成時分別讀 `task-execution`、`task-finalization`。
- 透過 CLI 建立並維護設置任務、狀態、驗收證據與阻擋事項；不直接改寫任務 Markdown。
- Backlog 本身的 auto commit、remote operations 預設關閉；web UI 保持 localhost。
- 不預先載入大量假想產品任務；將實際失敗的維護項目與未完成外部啟用項目記錄清楚。
- 新專案複製 starter 後，要有文件化的名稱、scope 與 Backlog 初始化／重設步驟；不要把 starter 的維護狀態當成新專案的完成證據。

`AGENTS.md` 應記錄 package 邊界、指令、驗證與 commit 慣例、秘密處理、Backlog 操作方式及自動修正限制。不要在使用者全域安裝 MCP、skills 或修改全域設定。

CLI 操作依據：[Backlog.md CLI 文件](https://github.com/MrLesk/Backlog.md/blob/main/CLI-INSTRUCTIONS.md)。

## 8. 定時 Renovate 與自動合併

預設實作 self-hosted Renovate 的 GitHub Actions workflow，符合「CI 定時跑更版」的目標。不要同時啟用另一份 Renovate App 排程造成重複處理。

- 每天 Asia/Taipei 04:00 執行，提供手動 dispatch；依 GitHub 當前時區能力設定並記錄換算。排程時間是預期啟動時間，不保證精準到分鐘。
- workflow 執行當前預設分支的受信任 controller，只處理指定的這個 repository；關閉廣泛 autodiscover。
- 分開 repository 設定與 self-hosted admin 設定，分別使用對應 schema 驗證。
- Renovate 執行版本／image digest 必須固定，並有自己的更新路徑，不能永久停在初始版本。
- npm 更新排除 prerelease、preview 與不受支援的相容性組合，維持精確版本策略。
- 更新所有 manifests、catalogs、必要 overrides、pnpm 版本來源、Node 版本來源、Actions SHA 與使用中的 container digest；驗證實際 extraction，而非只看設定檔。
- Renovate 的 release age 設為 3 天，與 pnpm 一致；保留原生伴隨套件稍晚發布所需的 buffer。無發布時間的來源採可查證的等效政策，不一律繞過。
- Vite+ 相關必要版本一起更新；無關套件避免全部塞進一個巨大 PR。
- 每週執行 lockfile maintenance，仍需通過完整 CI。
- 開啟 patch、minor、major 與 lockfile 更新的 automerge，採 PR 流程留下變更、證據與可回復紀錄。
- 僅合併符合機器人身分與變更範圍規則的維護 PR；不讓任意 PR 自動取得合併資格。
- 設定合理的並行上限；同一 PR 的修正序列化，HEAD 改變時舊結果失效。

使用限縮到目標 repository 的 GitHub App installation token 建立與更新 PR。不要讓自動維護依賴每次手動核准 Actions；實作時核實 GitHub 的 token 觸發規則。App ID、installation 與 private key 的設定方式需完整文件化，秘密只放在 Secrets。

在已授權的目標 repository 啟用 auto-merge 與 branch protection／ruleset：明確指定必要 checks，要求與最新 base 的整合驗證，禁止直接繞過 checks。若平台方案不支援必要保護，列出限制並保持 auto-merge 未啟用，不能以無保護合併代替。

必要檢查必須包含冷卻與政策 gate，不能只要求 app tests。只要 HEAD、base 或必要政策改變，就重新驗證。未建立、skipped、cancelled 或部分 matrix 成功的檢查，都不能被當成「全部通過」。

合併政策與範圍檢查以預設分支的受信任版本為準，不能讓候選 PR 自行修改 verifier 後通過自己的規則。Renovate 更新 Actions／controller 工具版本時，只允許已定義的版本欄位變更，並驗證沒有同時放寬權限、移除 jobs 或改寫驗收命令。

流程依據：[Renovate 自動合併](https://docs.renovatebot.com/key-concepts/automerge/)、[self-hosted 設定](https://docs.renovatebot.com/self-hosted-configuration/)、[GitHub workflow 觸發規則](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)。

## 9. Pi 相容性修正與權限隔離

不要每次更新都呼叫模型。一般更新由 Renovate 完成；必要 CI 明確因相容性失敗時，才啟動 Pi。

- 只處理同一 repository、受信任 updater 所建立的 PR，驗證 App 身分、repository、branch、run ID、目前 HEAD SHA 與失敗類型；不能只靠 label 或分支前綴。
- 冷卻未滿、未知 install scripts、provenance 降級、漏洞 gate、權限不足或網路失敗，不屬於可以由 Pi 放寬政策的相容性問題。
- controller 與修正 runner 使用預設分支的受信任版本。`workflow_run` 若被使用，不因它能取得 secrets 就直接執行候選 PR 的控制腳本。
- 使用固定版本、已核實來源的 Pi；只載入明確指定的 prompt、tools 與必要 extensions，不自動執行候選 PR 提供的 extension／skill／設定。
- 在拋棄式隔離環境讀取官方 migration guide、精簡去敏 logs 與候選程式碼；記錄基準 SHA、Pi 版本、provider、model 與修正摘要。
- Pi 不持有 GitHub 寫入 token 或 App private key。模型 API key 只提供模型呼叫邊界，候選測試／安裝行程不能讀到它；以外部 broker 或同等隔離設計實作，不能只靠 prompt 要求不讀 secrets。
- 最多 2 次修正、20 分鐘，另提供由 controller 強制執行的 token／費用限制。模型、計價或用量無法可靠取得時，清楚記錄限制並至少強制次數與時間上限。
- Pi 可修改 app／package 原始碼及明確允許的相容性設定。相容性設定的修改必須保留 strict、typeCheck、lint／測試範圍與原有驗證強度。
- 禁止修改驗收測試與快照、CI workflow、controller、required-check 定義、防護政策與信任清單；禁止刪測試、skip、吞錯誤或更改驗證指令讓其直接成功。
- 若升版確實需要遷移受保護的測試或控制流程，保留失敗 PR 並交代原因，不假裝已自動修好。
- Pi 只輸出 patch 與報告。獨立可信階段檢查允許路徑、檔案型態、diff、原始 SHA 與政策，再使用 App token 將通過範圍檢查的 patch 寫回既有分支。
- 回寫必須再次觸發完整 CI；模型的成功文字、自己的測試紀錄或修正 artifact 不作為合併證據。
- 超過上限或無法修正，停止該 PR 的嘗試；保留可追溯狀態與錯誤。只在需要使用者處理或有實質結果時通知，不因每天無變更而發出通知。

預期閉環：`Renovate 更新 → 必要 CI → 全數通過自動合併；相容性失敗 → Pi 有限修正 → 新 HEAD 的完整 CI → 通過才合併`。

Pi 介面依據：[官方 coding-agent 文件](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)。

## 10. CI 與 starter 驗收

建立固定、可由 branch protection 指定的驗收 check；matrix 的聚合 gate 必須明確檢查所有必要 jobs 真正成功。

CI 至少涵蓋 Linux x64 與 macOS arm64；核實 runner 實際架構與可用性。無權限或配額時標成 `NOT RUN`／`BLOCKED`，不要宣稱跨平台已通過。Windows 首版不列入支援範圍，文件須說明。

每個支援環境執行：

1. 驗證選定 Node、pnpm 與本機工具版本。
2. 從乾淨 checkout 安裝，執行 `pnpm install --frozen-lockfile`。
3. 執行版本／防護／workspace 邊界政策檢查。
4. 執行完整 check、非 watch tests、core packaging 與 web production build。
5. 以獨立 consumer 驗證 core 的輸出、exports、型別宣告及執行結果。
6. 啟動 web production preview，驗證可達及跨 package 的實際結果；必要時使用真實瀏覽器 smoke，不能僅以 HTTP 200 代替畫面行為。
7. 執行 Backlog CLI 的初始化／讀取 smoke，確認對應的是當前專案。
8. 驗證 tracked manifests 與 lockfile 沒有因安裝／測試而改寫；忽略預期 build artifacts，清理背景服務。

`smoke:starter` 必須建立一份乾淨的新專案副本，排除 `.git`、`node_modules`、dist、快取、秘密與個人資料，套用文件化的名稱／scope 初始化步驟，再重新安裝並驗證。內層執行不可再次遞迴呼叫 `smoke:starter`。不要用原 workspace 的 node_modules、store linkage 或 source aliases 假裝新專案成功。

加入會實際攔截錯誤的政策驗證案例：浮動 registry 版本、停用 typeCheck、放寬 install scripts、修改受保護測試、舊 SHA 結果、matrix skipped 與選不到必要 package 時，應得到失敗結果。這些案例用於驗證自動合併邊界，不是單純檢查檔案存在。

## 11. 遠端流程的真實驗證

在已授權且具備憑證的目標 repository，驗證至少一輪真實閉環：

- Renovate 確實偵測固定版本並產生 manifest／lockfile 更新，PR 自動觸發完整 CI。
- 一個符合條件的升版 PR 通過 checks 後自動合併；保留 PR URL、SHA 與 run URL。
- 一個可控的失敗驗證情境確實阻擋合併；測試後清理測試分支／PR。
- Pi 修正路徑至少完成一次模型呼叫、patch 範圍檢查與新 HEAD 的重新驗證；可用隔離且不合併的測試 PR，避免刻意損壞 main。
- 驗證超出範圍的 patch 被拒絕、重試上限生效，且候選測試環境無法取得 controller／模型憑證。

目前沒有可用升版時，不在 main 人為降版製造機會；可以在已授權的隔離驗證分支建立可控情境。沒有遠端或模型憑證時，先完成本機與 workflow 設定，交付最小啟用清單與可重跑指令，明確標示端到端驗證尚未完成。

## 12. 文件、交付與完成判定

交付完整程式碼、設定、Backlog 任務與以下文件：

- `README.md`：快速開始、本機指令、新專案複製／改名、支援平台及啟用維護所需的外部設定。
- `AGENTS.md`：工程與任務操作規則，以及 agent 可修改範圍。
- `docs/architecture.md`：package 邊界、Vite+ 任務圖與框架擴充方式。
- `docs/toolchain-baseline.md`：可追溯的選版證據與所有版本來源。
- `docs/maintenance.md`：排程、Renovate／Pi 分工、App 權限、Secrets 名稱、required checks、停用／恢復與回復單次更新的方法。
- `docs/setup-evidence.md`：驗收結果、平台、指令、SHA、run／PR URL、失敗與未驗證項目。

Secrets 文件只列名稱、用途、設定位置與權限，不列值。對維護的暫停、恢復與更新回復提供明確操作，不把回復機制建立在 AI 即席判斷上。

報告中分別標示 `PASS`、`FAIL`、`BLOCKED`、`NOT RUN`；分開「本機 starter 可用」「遠端自動更新啟用」「Pi 修正閉環驗證」。禁止因設定檔存在、dry-run 成功、模型說已完成或 Backlog checkbox 勾選就宣稱全部完成。

完成條件是：乾淨的新專案能安裝、檢查、測試、建置與使用跨 package 輸出；版本與防護政策確實被執行；在已授權的遠端，定時更新、真實 CI 與自動合併可追溯地運作。外部條件不足時，準確交付已完成部分與唯一必要的後續操作，不以假通過補齊。

採小型、可獨立驗證的階段完成工作；可依使用者既有授權建立本機 commits。只有取得對應遠端操作授權後才 push。最終回覆提供實際版本、驗證結果、維護啟用狀態與仍需要的資訊，避免只留下「下一步可以做」的計畫。
