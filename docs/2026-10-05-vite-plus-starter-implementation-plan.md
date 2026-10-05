# Vite+ starter 實作計畫

> 此文件保留初版實作歷程。2026-10-05 精簡調整由 Backlog TASK-9 追蹤；現行流程以 README、architecture.md、maintenance.md 及修訂後規格為準。


規劃日期：2026-10-05（Asia/Taipei）。狀態：計畫文件，尚未開始 starter 實作。

依據：[Agent 執行提示規格](./2026-10-05-vite-plus-starter-agent-spec.md)。本計畫將規格轉成有相依順序、產物與驗收條件的工作階段；工具版本仍須在實作時完成 registry 與 release 查證。

## 1. 目前基準與執行範圍

已檢查 `/Users/sid/Developer/sid-starter`：只有原始規格與 `.DS_Store`，尚未初始化 Git，沒有 `package.json`、workspace 或適用的既有 `AGENTS.md`。本機為 macOS arm64，現有 Node.js 為 `22.22.0`，pnpm 為 `10.33.2`；這些是環境盤點結果，不是 starter 已選定的版本。

實作目標目錄以目前專供 starter 的目錄為預設。專案名稱依原規格預設使用 `vite-plus-starter`，scope 使用 `@starter`；目錄名稱 `sid-starter` 不必跟 package 名稱一致。保留原始規格與不相關檔案。

首版建立 vanilla TypeScript web app、純 TypeScript core、專案本機工具、驗收流程與自動維護控制流程。GitHub `owner/repo`、遠端設置授權、App installation 與 Pi provider/model 尚未提供；不妨礙先完成本機 starter 和外部啟用前的控制流程驗證。

本次規劃已查閱官方文件，但透過 shell 查詢 npm registry 時得到 `fetch failed`，未取得完整版本、發布時間及相容性資料。因此本文件不填入猜測的工具版本，也不將官網範例版本視為已選定版本。

## 2. 已查證的技術條件

| 條件 | 對實作的影響 |
|---|---|
| Vite+ 提供 project-local CLI；手動安裝需維持 core alias 與 bundled Vitest 配套 | 先核實套件 metadata 與 `vp` 的工具版本輸出，再鎖定整組；不能只用 Renovate group 假設版本必定相容。[官方文件](https://viteplus.dev/guide/local-cli) |
| `vp run` 支援 workspace 相依順序、`dependsOn`；filter 未命中預設仍可成功退出 | 明確指定 packages，必要 filter 加 `--fail-if-no-match`，另外驗證必跑 task 清單。[官方文件](https://viteplus.dev/guide/run) |
| `vp run --no-cache` 可停用整次執行的 task cache | 最終驗收一律重新執行；網路、時間與安全情報 gate 本身設為不可快取。[官方文件](https://viteplus.dev/guide/cache) |
| `vp pack` 支援 library 建置與型別宣告 | core 採 `pack` 設定，app 採 web build；consumer 必須使用 core 的 `dist`。[官方文件](https://viteplus.dev/guide/pack) |
| pnpm 的嚴格冷卻、缺少發布時間處理與 lockfile 重驗設定各有版本要求 | 目前文件標示 `minimumReleaseAgeStrict`、`minimumReleaseAgeIgnoreMissingTime` 自 v11.0.0，`trustLockfile` 自 v11.3.0 提供；若採這組原生設定，選版須涵蓋其能力，不能直接沿用本機 pnpm 10。[官方文件](https://pnpm.io/settings/dependency-resolution) |
| pnpm 提供 `allowBuilds`，並已調整舊版 build allowlist 設定 | 根據選定 release 使用正確設定與最小名單，搭配 `strictDepBuilds`；以真實 install 案例驗證。[官方文件](https://pnpm.io/settings/build) |
| Renovate 提供 `timestamp-required` 與 release-age buffer | 明確設定 3 天冷卻、發布時間必要、伴隨套件 buffer；CI 再獨立檢查。[官方文件](https://docs.renovatebot.com/configuration-options/#minimumreleaseagebehaviour) |
| GitHub schedule 文件已提供 IANA timezone | 優先採 `Asia/Taipei` 每天 04:00；若目標平台尚不接受，改用 UTC 每天 20:00，記錄台灣日期對應。排程不保證準時。[官方文件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) |
| App installation token 可讓自動建立／更新的 PR 觸發後續 workflow | updater 與 patch writer 使用 repository 限縮的 App token，候選執行環境不取得它。[官方文件](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) |
| GitHub required checks 可接受 skipped／neutral | 自行實作只接受必要 jobs 全數 `success` 的 gate；啟用 strict base 整合驗證，不能只勾 required checks。[官方文件](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) |
| Pi 官方 main 的 package 名稱目前是 `@earendil-works/pi-coding-agent` | 查證 registry、release 與來源對應後才決定套件；不直接採用舊 namespace。[官方 package manifest](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/package.json) |

以上確認的是文件所述能力；尚未對選定套件 release 執行相容性測試。Pi 的 SDK 可明確提供 resource loader 與 tools，但 API 能力本身不等於秘密隔離；隔離必須由實際執行環境完成。[Pi SDK 文件](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)

## 3. 實作順序與階段出口

建議依 `P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7` 執行。P0 同時處理工具相容性與維護隔離的小型驗證，提早發現會影響整體可行性的條件。每個階段完成驗收後才進入下一個階段；已授權的本機 commits 各自對應一個可驗證階段。

### P0：選版、相容性與隔離可行性

**工作**

1. 確認目標目錄，盤點 Git 與既有檔案；進入實作時初始化本機 repository，保留原始規格。
2. 查證 Node LTS、pnpm、Vite+、Backlog.md、Pi、Renovate、Actions 與必要 smoke 工具的官方來源、穩定 release、發布時間、engines、peerDependencies。
3. 對 npm 套件以查證當下時間扣除 72 小時，選擇符合相容性與冷卻的最新穩定版本。Node 採受支援 LTS 的最新 patch，記錄 LTS track；涉及 track 轉換時仍需驗證工具支援。
4. 在暫存最小 workspace 驗證：本機 `vp`、core alias、Vitest 配套、strict type check、library declaration、`dependsOn`、filter 未命中失敗與 cache 停用。
5. 驗證 pnpm 對新解析及 frozen lockfile 都重新套用冷卻與 trust policy；缺少發布時間、冷卻未滿與未知 install script 都確實阻擋。
6. 確認 Renovate 的 lockfile 更新能在無寫入 token 的 worker 執行。只設定 `ignoreScripts` 或清空子行程 env 不足以證明隔離；要檢查容器 mount、行程、socket 與憑證可見性。
7. 小型驗證 Pi 與候選工具分開執行的介面，以及外部 model broker 的請求、使用量回報與中止能力。

**產物**：`docs/toolchain-baseline.md` 初版、機器可讀選版證據、明確的能力矩陣與隔離方案。

**驗收出口**：找到可重現的受支援工具組合與安全執行路徑。沒有穩定版本支援必要 pnpm 防護時，starter 安裝階段為 `BLOCKED`。若僅維護隔離驗證受阻，先完成不受影響的本機 starter，遠端自動維護保持未啟用。

### P1：workspace、Backlog 與工程指引

**工作**

1. 建立 root manifest、`pnpm-workspace.yaml`、`.node-version`、`.gitignore`、`tsconfig.base.json` 與 root `vite.config.ts`。
2. registry 直接相依性與 aliases 鎖定精確版本；root、app、core 都設 `private: true`。
3. Node 精確版本只以 `.node-version` 為權威來源；`packageManager` 維護 pnpm 精確版本。本機 bootstrap 與 CI 都讀取這些來源，不更動使用者全域設定。
4. 將必要防護放在 workspace 設定：4320 分鐘冷卻、strict、缺少時間失敗、`trustLockfile: false`、`trustPolicy: no-downgrade`、`blockExoticSubdeps: true`、最小 `allowBuilds` 與 `strictDepBuilds`。
5. 安裝本機 Backlog CLI，依選定 release 的 `--help` 以非互動方式初始化。讀取 `overview`、`task-creation` 後，將本計畫轉成真實任務；執行／完成時讀對應 lifecycle instructions。
6. 透過 CLI 關閉 Backlog auto commit 與 remote operations，web UI 維持 localhost。建立 `AGENTS.md`，記錄 package 邊界、驗證入口、秘密處理與 agent 可修改範圍。

**產物**：可安裝的 workspace、lockfile、Backlog 設置任務、工程指引。

**驗收出口**：精確版本 bootstrap 可重現；frozen install 成功，沒有未知 install script 或未記錄的例外；Backlog 讀取的是這個專案。[Backlog CLI 依據](https://github.com/MrLesk/Backlog.md/blob/main/CLI-INSTRUCTIONS.md)

### P2：最小 core／web 與任務圖

**工作**

1. 建立 `packages/core`，提供一個小型純函式 API，例如數值摘要，測試正常值、空集合及邊界行為。
2. 以公開 exports 指向實際 JavaScript 與型別宣告；採最小 ESM 輸出，沒有需求時不增加 CJS。
3. 建立 `apps/web`，以 `@starter/core` 與 `workspace:*` 宣告相依性，在頁面顯示 API 執行結果。
4. 每個 package 宣告自己使用的工具與執行相依性，不以 root hoisting 或 TS paths 替代 package 邊界。
5. 根目錄集中 lint／format，啟用 `typeAware`、`typeCheck` 與 TS strict。根目錄設定、維護程式與 smoke scripts 也納入檢查範圍。
6. 以 `vp run` 建立根入口與 package tasks。根 script 名稱與 config task 名稱避免衝突或遞迴；必要 filter 使用 `--fail-if-no-match`。
7. core build 先完成，再執行需要其輸出的 app check、build 與 consumer。`pnpm dev` 明確選擇 web，並確保 core 的初始輸出可用；在 smoke 中測試修改 core 後的開發更新方式。

**產物**：core、web、API 測試、完整根 scripts、`docs/architecture.md` 初版。

**驗收出口**：從沒有 dist 的狀態，check、非 watch tests 與 build 成功；故意破壞 core 型別或必要 task 選擇時失敗；實際任務紀錄證明 core 先於 app 建置。

### P3：政策 gate、consumer 與乾淨 starter 驗收

**工作**

1. 建立 `scripts/verify-policy.*`，用結構化解析驗證 manifests、aliases、Node／pnpm 來源、strict、install allowlist、workspace protocol、exports、跨 package 引用、反向／循環相依性與必要 tasks。
2. 將靜態政策檢查與即時 release-age／trust／漏洞查詢分開回報；即時查詢不得快取。至少阻擋 production 相依性的 high／critical；查詢失敗回報不可判定並阻擋，不能當成零漏洞。
3. 建立 `scripts/smoke-consumer.*`：在 workspace 外僅放入 core 的 package metadata 與 dist，驗證 Node 執行及嚴格型別檢查；移除或禁止原 source 可見性，證明沒有 source alias。
4. 建立 production preview smoke，以瀏覽器檢查頁面上的 core 結果與 runtime errors；由 finally 清理服務，HTTP 可達只是前置條件。
5. 建立新專案初始化／改名工具，結構化更新 package 名稱、scope、引用與 lockfile 中對應 workspace key，保留所有 registry resolved versions，不重新選版。
6. 建立 `scripts/smoke-starter.*`：依明確 copy allowlist 建立乾淨副本，排除 Git、node_modules、dist、快取、秘密、個人資料與原 Backlog 任務歷史；套用改名與 CLI 初始化。
7. 新副本用獨立 pnpm store 與 `pnpm install --frozen-lockfile`，重新執行不含 starter smoke 的完整驗收。內層入口不能遞迴呼叫自己。
8. 安裝與驗收前後比較 tracked manifests、workspace 設定與 lockfile；預期 build outputs 不算來源異動。新專案的遠端綁定預設未啟用，不能沿用 starter repository 的寫入目標。

**產物**：policy verifier、consumer／browser／starter smoke、初始化工具、`pnpm verify`。

**驗收出口**：乾淨副本真正完成安裝、check、tests、build、consumer、畫面結果與 Backlog 初始化；故意使用浮動版本、停用 typeCheck、放寬 scripts、source alias 或選不到必要 package 時確實失敗。

### P4：跨平台 CI 與受保護驗收結果

**工作**

1. 建立 `ci.yml`，固定 Actions 完整 SHA。Linux x64 與 macOS arm64 各跑完整驗收，開頭核實 `process.platform`／`process.arch`。首版不宣告 Windows 支援。
2. CI 用精確 Node／pnpm、乾淨 checkout、frozen install；最終 `vp run` 使用 `--no-cache`。使用 runner 標籤前確認目標 repository 的方案、配額與實際架構。[Runner 依據](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
3. 候選程式、dependencies、配置檔與測試執行於無 repository 寫入 token、App private key、模型 key 的環境。checkout 不保留 Git credentials。
4. verifier、controller、受保護測試與驗收命令採預設分支的受信任版本；將候選設定視為資料進行政策比對，不在持有寫入憑證的 controller 執行它。
5. 設計固定 required check `starter/verification`：聚合器自身不執行候選程式，核實兩個平台、policy、安全情報與 smoke jobs 全數 `success`，拒絕 skipped、neutral、cancelled、missing 與部分成功。
6. 結果紀錄包含 repository、PR、HEAD SHA、base SHA、受信任 policy SHA、run ID 與必要 job 集合。任何基準改變都使舊結果失效。
7. 檢查 required check 的來源綁定與受信任 workflow 機制；相同名稱的候選 job 不得冒充 gate。依目標平台能力採 required workflow 或獨立 App 回報，無法保護時不啟用 automerge。

**產物**：CI、結果格式、可信聚合器、政策負向案例與平台證據。

**驗收出口**：本機可驗證 gate 對舊 SHA、改動受保護測試、skipped matrix、缺少 job、偽造來源都拒絕。真實遠端平台執行在 P7 驗收；workflow 存在不能記為跨平台 PASS。

### P5：Renovate 更新與合併控制

**工作**

1. 建立 repository Renovate 設定與 `maintenance/renovate-config.*` admin 設定，分別驗證 schema。明確綁定唯一 `owner/repo`，停用廣泛 autodiscover。
2. 建立 `dependency-maintenance.yml`，每天台灣時間 04:00 與手動 dispatch；每週一次 lockfile maintenance。controller 只取預設分支受信任版本。
3. 固定 Renovate release／image digest，為它、Actions SHA、Node、pnpm、manifests、catalogs 與 overrides 建立 extraction 對應。Node `.node-version` 可用 nodenv manager；仍需驗證實際 extraction。[nodenv manager 依據](https://docs.renovatebot.com/modules/manager/nodenv/)
4. 建立 Vite+ 配套版本同步器：依已選 Vite+ 的可信 metadata 推導 core alias 與 bundled Vitest；只改版本欄位並驗證三者相容。分組只是 PR 組織方式，不能取代這項推導。
5. 版本 baseline 從 manifests、lockfile 與可查證 release metadata 產生；既有版本不可僅由手寫文件維護。檢查機器紀錄與文件更新是否完整，避免不同來源漂移。
6. npm 採精確版本、排除 prerelease、3 天冷卻與 timestamp-required，保留伴隨套件 buffer。Actions／container 的發布時間以可信 release metadata 查證；缺少證據時保持待處理。
7. patch、minor、major 與 lockfile 都設定 automerge 資格。無關工具分組，限制 PR 併行；版本相容性或 gate 失敗時保留 PR。
8. 受信任 updater 身分檢查涵蓋 App ID、installation、repository、PR 建立者與 branch provenance；不能只看 label、prefix 或可偽造的 commit author。
9. manifests 的 script／exports／權限變更與 workflow 結構不屬於版本更新 allowlist。Actions／controller 只允許指定版本欄位、已核實來源與 digest／SHA 變動。
10. lockfile／相依性更新 worker 沿用 P0 驗證的隔離方案。禁止候選 post-upgrade 程式在有 token 的 controller 執行；若 Renovate 整合無法滿足，保持遠端維護 `BLOCKED`，先交付不受影響的本機成果。
11. 在外部啟用階段先配置 branch protection／ruleset、required check 來源、禁止 bypass 與最新 base 驗證，再開 auto-merge。無保護能力時保持關閉。

**產物**：Renovate 設定、排程 workflow、同步／範圍檢查、版本來源對應表。

**驗收出口**：schema 驗證成功，實際 extraction 涵蓋所有固定版本；可控 fixture 的更新與 lockfile 結果可重現，超出版本欄位的改動會被拒絕。dry-run 只算設定驗證，遠端合併需 P7 證據。

### P6：Pi 有限修正、model broker 與 patch 回寫

**工作**

1. 建立 `maintenance/policy.*`、`repair-prompt.md`、`repair-runner.*` 與 `dependency-repair.yml`。
2. 以可信 stage 結果區分「相容性失敗」與 policy、cooldown、未知 scripts、漏洞、網路、權限失敗；後者不啟動 Pi。無法可靠分類則停止，保留證據。
3. 核實 PR／App／repository／run ID／目前 HEAD 與 base；`workflow_run` 只作通知來源，不能直接信任其 artifact 或執行候選 controller。
4. 採三個隔離邊界：可信 controller 管授權與狀態；外部 model broker 持有模型 key；拋棄式候選 sandbox 執行安裝、測試與檔案操作。
5. Pi 以明確 resource loader、prompt 與 allowlisted tools 啟動；禁用候選提供的 extensions、skills、MCP、設定與 auth discovery。Pi 只透過受限 broker 呼叫指定 provider/model，沒有 GitHub 寫入 token 或真實模型 key。
6. 候選 sandbox 不掛載 broker secrets、controller 工作目錄、宿主 Docker socket 或既有 auth；限制網路與工具權限。model broker 不提供任意 URL、任意 provider 或其他秘密讀取介面。
7. 每 PR 累計最多 2 次、20 分鐘；以可信持久化 ledger 跨 workflow 計數，不讓 rerun 或新 HEAD 無限重置。HEAD 改變時舊 patch 失效，仍保留 PR 累計預算。
8. token／費用上限由 broker／controller 強制。每次請求先預留可用預算與最大輸出，再結算可信 usage；單純回應後累加不足以防止超支。provider 沒有可靠 usage／價格時記錄限制，至少強制次數與時間，不宣稱費用上限已驗證。
9. Pi 可改 app／core 原始碼與明確列出的相容性設定欄位，不能改測試／snapshots、驗證命令、CI、controller、required checks、strict 或 trust allowlist。設定檔用結構化 diff 檢查，不能只看路徑。
10. Pi 僅輸出 patch 與報告。獨立可信階段檢查路徑、檔案型態、symlink、刪除／rename、diff、基準 SHA 與政策；套用至乾淨 checkout 後再比對。
11. patch writer 在獨立可信 job 才取得 App token；回寫前再次確認當前 HEAD，拒絕競態，不 force push。新 HEAD 必須重新觸發完整 CI。
12. 成功、耗盡預算或需要人處理時產生可追溯報告；無變更或非 actionable 狀態不發通知。

**產物**：repair controller、broker adapter、隔離 runner、patch verifier、重試 ledger 與修正報告格式。

**驗收出口**：本機可控案例證明越界 patch、受保護設定修改、舊 HEAD、重試耗盡與憑證讀取被拒絕；fake provider 只用於協定／政策測試。真實模型修正完成與遠端重新驗證必須取得 P7 證據後才標 PASS。

### P7：真實遠端閉環與交付

**工作**

1. 取得使用者明確指定的 `owner/repo`、遠端設置與初次 push 授權；核實 repository 方案、Actions 權限、runner 配額、App installation 與可用保護功能。
2. 設定 Secrets／Variables；文件只寫名稱、用途、位置與最小權限，不保存值。Pi provider/model 由使用者或既有明確設定提供。
3. 跨 Linux x64、macOS arm64 真實執行完整 CI；記錄版本、架構、SHA 與 run URL。
4. 至少一次 Renovate 偵測、manifest／lockfile 更新、App 建立 PR、自動觸發 CI、全數通過後合併；保存 PR URL、HEAD/base SHA、run URL。
5. 用不破壞 main 的隔離情境證明失敗 gate 阻擋合併，並清理測試 PR／分支。
6. 用不合併的隔離 PR 完成至少一次真實模型呼叫、合法 patch 回寫與新 HEAD CI；同時驗證越界拒絕、次數／時間上限及憑證隔離。
7. 完成 README 與架構、工具基準、維護、setup evidence 文件；提供新專案初始化、暫停／恢復維護與以明確 revert commit 回復單次更新的操作。
8. 透過 Backlog CLI 按證據更新任務；外部未啟用項目留下具體阻擋條件與可重跑指令。

**驗收出口**：分開回報本機、跨平台、Renovate 自動維護與 Pi 真實閉環，全部有可追溯證據。沒有遠端／模型條件時，交付完成的本機與控制流程，外部項目標 `BLOCKED`／`NOT RUN`。

## 4. 任務與驗收入口

以下為實作目標；確切 CLI flags 由 P0 核實後寫入正式設定。

| 根指令 | 必要行為 |
|---|---|
| `pnpm dev` | 明確選 web，準備 core 輸出並提供開發更新方式 |
| `pnpm check` | root 共用 format、lint、完整 strict type check |
| `pnpm test` | 非 watch，執行所有必須存在的測試 |
| `pnpm build` | core packaging → web production build |
| `pnpm verify:policy` | 鎖版、結構、工具相容性與供應鏈政策 |
| `pnpm smoke:consumer` | 只有 core 建置輸出的外部 consumer |
| `pnpm smoke:starter` | 乾淨副本、改名、獨立 store、frozen install、完整內層驗收 |
| `pnpm verify` | policy、check、test、build、consumer、browser、Backlog 與 starter smoke；不吞錯誤 |
| `pnpm tasks`／`tasks:board`／`tasks:web` | 專案本機 Backlog CLI、看板與 localhost web UI |

增加僅供驗收內部使用的入口，例如 `verify:inner`，供乾淨副本跑同一組檢查但排除 starter smoke；它不形成第二套任務排程器。全部任務圖由 `vp run` 管理。

## 5. 必須實際攔截的失敗案例

| 注入情境 | 必須觀察到的結果 |
|---|---|
| registry dependency 改成 `^`、`latest` 或浮動 alias | 版本 policy 失敗 |
| Vite+／core／Vitest 不相容 | 配套檢查失敗，不獨立放行版本 |
| 發布未滿 72 小時／發布時間缺失，包括已有 lockfile | 安裝或獨立可信 gate 失敗 |
| 新增未知 install script／trust 降級 | frozen install 或可信供應鏈 gate 失敗，Pi 不啟動 |
| production high／critical 漏洞／安全情報查詢中斷 | gate 失敗或阻擋，不回報沒有漏洞 |
| 關閉 strict／typeCheck，縮小 lint／test 範圍 | 政策與 patch verifier 失敗 |
| core 引用 app、循環相依性、跨目錄 source import | workspace policy 失敗 |
| core 宣告缺失／exports 指向 source | consumer 型別或執行驗證失敗 |
| 移除必要測試／使用 skip 或 passWithNoTests | 必要測試與受保護 diff 檢查失敗 |
| filter 未命中或必要 task 缺失 | task 執行失敗，不以零工作量成功 |
| matrix skipped／cancelled／missing 或一平台失敗 | `starter/verification` 失敗 |
| HEAD、base、policy SHA 改變或 gate 來源偽造 | 舊證據失效，合併或回寫被拒絕 |
| updater 同時改 workflow 權限／驗收命令 | 版本欄位範圍檢查失敗 |
| Pi patch 改測試、policy、symlink、刪檔或越界路徑 | patch verifier 拒絕，不取得寫入 token |
| workflow rerun 想重置 2 次／20 分鐘上限 | 可信 ledger 阻止新嘗試 |
| 候選 install／測試企圖讀取 controller 或模型憑證 | 隔離驗證確認不可取得；以非秘密 canary 測試，不輸出真實值 |
| starter 副本企圖使用原 node_modules／source／store 或維護目標 | smoke 失敗，副本不取得原專案寫入能力 |

測試重點是實際失敗與執行邊界，不能只以 grep、檔案存在或模型成功文字作為證據。

## 6. 規格覆蓋與完成狀態

| 原規格章節 | 對應階段 |
|---|---|
| 1–2：目標、決策、參數、授權 | P0、P1、P7 |
| 3：官方來源與選版 | P0、P5 |
| 4：結構與 package 邊界 | P1、P2、P3 |
| 5：指令、順序、cache、必要 tasks | P2、P3、P4 |
| 6：鎖版與供應鏈 | P0、P1、P3、P4、P5 |
| 7：Backlog 與 Agent 指引 | P1、P3、P7 |
| 8：Renovate、App、自動合併與保護 | P4、P5、P7 |
| 9：Pi、隔離、預算與 patch | P0、P6、P7 |
| 10：跨平台 CI 與乾淨副本 | P3、P4、P7 |
| 11：遠端真實閉環 | P7 |
| 12：文件、證據、交付與完成判定 | 每階段更新證據，P7 完整交付 |

P3 通過才可說「本機 starter 可用」。兩平台真實執行通過才可說「跨平台驗證完成」。Renovate 真實合併完成才可說「遠端自動更新已啟用且驗證」。Pi 真實模型、patch 回寫與新 HEAD CI 通過才可說「修正閉環已驗證」。

`docs/setup-evidence.md` 每項使用 `PASS`、`FAIL`、`BLOCKED`、`NOT RUN`，附環境、指令、時間、SHA 與 run／PR URL。計畫文件、設定檔、dry-run、mock 與 Backlog 完成狀態不替代驗收結果。

本計畫目前只完成環境盤點與官方文件查證；P0–P7 的實作及驗收均尚未執行。
