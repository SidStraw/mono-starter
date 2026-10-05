# 自動維護

目前遠端維護與 Pi 都停用。尚未設定 repository、Secrets、保護規則與真實模型，沒有遠端端到端成功證據。

## 分工

Renovate 負責版本、catalogs、overrides 與 lockfile；每天 Asia/Taipei 04:00 預期啟動，週一使用原生 lockFileMaintenance。GitHub 排程不保證精準時間。使用一份 self-hosted Renovate 排程，不另外啟用 App 排程。

Renovate admin 設定關閉安裝 scripts、plugins 與 post-upgrade commands，只處理指定 repository。版本／lockfile 更新使用 Renovate 自己的功能，沒有額外 artifact 或 weekly lockfile workflow。候選 CI 與 Pi 安裝／測試環境不取得 repository 寫入憑證。

CI 使用原生 pnpm/Vite+/Playwright 命令，在 Linux x64 與 macOS arm64 執行 build、check、test、production audit 與 lockfile 變動檢查。可信 controller 對自動維護 PR 保護測試與設定，aggregate 檢查實際 job、HEAD 與 base，再發布受保護 App check。

只有安裝與供應鏈檢查成功、Compatibility checks 失敗的當前 updater PR 才啟動 Pi。Pi 可以在隔離環境分析、修改允許的 source、執行同一套原生檢查；新 HEAD 必須通過完整 CI。冷卻、漏洞、網路、安裝權限或設定失敗保留 PR，交由人處理。

## 啟用

先明確指定並授權 owner/repo 與首次 push。設定 `maintenance/policy.json` 的 repository、updaterAppId、updaterBotUserId；bot ID 由實際 App 帳號取得。App 只安裝到目標 repository。GitHub App private key 放 Secret `MAINTENANCE_APP_PRIVATE_KEY`，不放來源或證據。

設定 repository variables：`MAINTENANCE_ENABLED`、`MAINTENANCE_APP_ID`、`MAINTENANCE_INSTALLATION_ID`、`MAINTENANCE_GIT_AUTHOR`；App token 使用 signed platform commits，git author 採實際 bot 身分。App 需要 contents、pull requests、checks、statuses、issues 的必要權限與 administration read。

啟用 auto-merge，branch protection 使用 policy 的 requiredCheck 並綁定 updater App，要求最新 base，禁止管理者繞過、force push 及刪除。`maintenance/check-protection.mjs` 在啟動前驗證；方案不支援時保持停用。

Pi 另設定 `PI_REPAIR_ENABLED`、Secret `PI_MODEL_API_KEY`，以及 policy 中的 provider、model、endpoint、pricing 與必要 migrationGuides。模型需支援 coding-agent 的工具呼叫；定價與用量需可可靠取得。不能只填模型名稱後宣稱已驗證。

## 修復界線

最多每個 PR 2 次、累計 20 分鐘；token 與費用另由 broker 強制限制。持久 ledger 綁定 PR，不能換 HEAD 或重跑 workflow 重置預算。

Pi 不取得 App private key 或真實模型 key；只透過 broker 執行受限工具。Pi runtime 使用固定 digest 的官方 Node image，工具準備使用原生 npm/pnpm。候選 container 不掛 host HOME、Git metadata 或 Docker socket，執行測試時沒有外部網路。模型 key 留在 broker，寫入 token 留在可信發布階段。

允許變更既有 app／package source；測試、快照、workflow、controller、strict、安裝 allowlist 與驗收命令保持受保護。獨立發布器驗證檔案、diff、原始 HEAD，再原子回寫同一 PR；不能以模型文字或自己的成功紀錄代替 CI。

啟用後需實際驗證 Renovate PR、完整 CI、自動合併、失敗阻擋及一次真實 Pi 修復閉環。啟用之前，本機測試與 SDK fixture 僅提供本機證據。
