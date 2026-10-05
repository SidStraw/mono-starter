# 架構

`apps/web` 是可執行應用程式，透過 `workspace:*` 使用 `@starter/core`。`packages/core` 只包含純 TypeScript 邏輯，公開 exports 指向 JavaScript 與型別宣告的建置輸出。packages 不引用 apps，不使用 TS paths 或 source aliases 繞過邊界。

Vite+ 執行格式、lint、型別檢查、Vitest 與建置。root 共享 strict、typeAware、typeCheck；`vp run` 依 core → web 相依關係排程。最終 `pnpm verify` 使用 `--no-cache`，網路 audit 與測試任務不快取。

`tests/package.test.ts` 透過套件名稱驗證公開 exports 與宣告，`tests/e2e/web.spec.ts` 使用 Playwright 驗證 production 畫面。Playwright 原生 webServer 負責啟動、等待及關閉 preview。Backlog 初始化使用 CLI；新專案複製／改名使用文件步驟，不再維護專用生成器或每次 CI 重建整份 starter。

Node 的唯一來源是 root `devEngines.runtime`，由 pnpm 管理下載與完整性。共用開發依賴集中於 pnpm catalog；pnpm 原生設定執行冷卻、信任與安裝權限政策。Renovate 負責所有版本與 lockfile 更新，不另建版本 metadata、同步器或 lockfile worker。Vite+ 關聯版本使用 Renovate 群組；需要對齊 bundle 時使用官方本機 `vp migrate`，並重新驗收。

CI 以原生命令安裝、audit、check、test、build，最後檢查 manifests／lockfile 沒有被改寫。自動維護的候選 PR 仍使用受信任分支的測試與設定；少量 controller 只負責自動修復所需的身分、權限、結果與預算邊界。

Pi 在相容性失敗後讀取錯誤與 migration guide、執行檢查並提出 source patch。Pi 的兩個容器使用含 npm 的官方 Node image，bootstrap 與本機使用相同原生命令。候選 container 不取得寫入／模型憑證；broker 強制執行用量限制。Pi 不能更改測試、workflow、strict、安裝權限或驗收命令。獨立發布階段驗證 diff 與 HEAD，修復後由新 HEAD 的完整 CI 決定能否合併。

新增 package 時宣告自己的相依性、exports、建置順序與一般測試；若要納入自動修復，再審查修復 allowlist 與 updater 允許範圍。
