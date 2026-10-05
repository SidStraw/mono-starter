# 維護與外部啟用

目前遠端維護與 Pi 都停用。沒有設定 repository、Secrets、保護規則與實際驗證之前，不宣稱 auto-merge 或模型修復已啟用。

## 版本更新路徑

| 固定位置                                               | 更新者／驗收                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 各 manifest 的 exact dependencies、root packageManager | Renovate npm manager                                                         |
| `.node-version`                                        | Renovate nvm manager，Node 24 Krypton LTS track                              |
| Vite alias、Vitest、精確 peer 配對                     | 可信 `sync-toolchain.mjs` 從 Vite+ 官方 bundle 推導                          |
| baseline JSON／Markdown                                | 同一工具由 manifests、Node release metadata 產生；fingerprint 防止無變更循環 |
| Actions 完整 SHA                                       | Renovate github-actions manager                                              |
| Renovate version 與 digest                             | custom regex docker manager，位於 `maintenance/images.json`                  |
| lockfile                                               | 不含寫入／模型憑證的 artifact worker；週一另跑全新解析                       |

Node track 的 major 切換需人工查證新的 LTS 與相容性；一般 npm 套件的 major 更新仍可自動合併。原生伴隨套件受 72 小時冷卻與 30 分鐘 Renovate buffer 保護。

Renovate controller 關閉 scripts、plugins、post-upgrade commands、autodiscover 與 artifact 安裝，只有指定 repository。repository config 與 admin config 分開驗證。原生 Renovate lockfile maintenance 停用，改用週一可信排程的獨立 worker，避免帶寫入 token 執行候選安裝。

## GitHub 設定

取得使用者明確指定並授權的 `owner/repo` 後，先處理首次 push 的獨立授權。App 只安裝到這個 repository；不要同時啟用另一個 Renovate App 排程。

App 需要 Contents、Pull requests、Checks 寫入，Issues 寫入供每 PR 修復 ledger，Actions 讀取供查核；若採下面的保護檢查，也需要 Administration 讀取。只有可信階段交換限縮到單一 repository 的 installation token；candidate checkout 都設定 `persist-credentials: false`。

Repository variables：

- `MAINTENANCE_APP_ID`、`MAINTENANCE_INSTALLATION_ID`、`MAINTENANCE_GIT_AUTHOR`（App bot 的實際身分）。
- `MAINTENANCE_ENABLED=true`、`PI_REPAIR_ENABLED=true` 只能在相應外部驗收完成後設定。

Repository Secrets：`MAINTENANCE_APP_PRIVATE_KEY`、`PI_MODEL_API_KEY`。不要提交或將值放入 prompt／logs。

設定 policy 的 `repository`、數值 `updaterAppId` 與 `updaterBotUserId`；bot ID 必須由 App 的實際 GitHub bot 帳號查得，不能靠 branch prefix 或 label。HEAD 必須是同一 App bot 的 GitHub verified commit。Renovate 使用 `platformCommit: enabled`；patch writer 使用 `createCommitOnBranch` 綁定 `expectedHeadOid`，維持 App 簽章與原子 HEAD 檢查。

在預設分支開 auto-merge 與嚴格 branch protection，要求最新 base、禁止 bypass，必要 check 設為 `starter/verification` 並綁定指定 App ID。至少要求 Linux x64 與 macOS arm64 真正成功；獨立 aggregate 從 GitHub API 讀取 job conclusions，skipped、neutral、cancelled 或缺少結果都失敗。`check-protection.mjs` 在維護執行前向 GitHub 查核上述必要 App check、strict、管理員限制與 force-push／刪除政策；此版採 classic branch protection，僅使用 ruleset 的專案需先補上對應 verifier。保護方案不支援時維持停用。

CI 先整合最新 base，再恢復可信 verifier。舊 HEAD、base、policy 或 run ID 的結果無效。預設分支有變更時，需要重新驗證／更新 PR；不能沿用舊成功 check。排程使用 `timezone: Asia/Taipei` 的每日 04:00，GitHub 不保證精準到分鐘。

## Pi

policy 的 `repair.provider`、`model`、`endpoint` 必須明確設定且實際查證。此版 broker 支援 OpenAI-compatible Chat Completions 的文字／tool protocol；其他協定需先實作與驗證 adapter，不能猜測 model ID。

每 PR 最多兩次、累計 20 分鐘。App bot comment 保存可信 ledger；每次開始先預留全部剩餘時間，程序 crash 不會重新取得時間。用量也在每次模型 request 前持久預留；缺少 provider usage 保留全部預留量並失敗。token 上限預設 60000，output 每次最多 4096；以輸入 byte 數加固定額度保守預留，provider 回報超出預留即拒絕後續使用。

費用上限預設 USD 5。要強制費用限制，需在 `repair.pricing` 設定 `inputUsdPerMillion`、`outputUsdPerMillion`、官方 `source` 與 `verifiedAt`，實際核實符合這個 endpoint 的計價。沒有可靠價格時，費用限制標成未驗證，仍強制 token、次數與時間限制。

只有安裝與供應鏈 gates 成功、相容性 step 明確失敗的當前 bot PR 才進入修復；漏洞、冷卻、未知 scripts、provenance、權限、網路與 fresh-starter 失敗不能觸發修復。官方 migration guide 可加入受保護的 `migrationGuides` 清單，controller 只讀指定 HTTPS URL。

可信 dependencies 在取得 Secrets 的步驟之前完成安裝。容器準備與 candidate commands 只收到明確最小 environment。Pi 容器只掛可信 SDK runtime 與 prompt，不載入候選 extensions、skills 或設定；模型 key 不進容器。候選 container `--network=none`，Pi 的 commands 在候選 container 執行。發布階段只匯出 source allowlist，不能使用模型的完成文字作為成功證據。

超限／失敗保留 PR 與 ledger，停止嘗試；日常沒有變更不通知。涉及受保護測試或控制流程的 migration 交給人工，不自動放寬驗收。

## 管理員驗證

固定 image 的 schema 與 extraction smoke：

```sh
image=$(node -p "JSON.parse(require('fs').readFileSync('maintenance/images.json')).renovate")
docker run --rm --entrypoint renovate-config-validator --mount "type=bind,src=$PWD,dst=/workspace,readonly" "$image" --strict /workspace/renovate.json /workspace/maintenance/renovate-config.cjs
docker run --rm --entrypoint /usr/local/renovate/node --mount "type=bind,src=$PWD,dst=/workspace,readonly" "$image" /workspace/maintenance/renovate-extraction-smoke.mjs
```

遠端驗收需使用真正 App 建立測試更新 PR，核實 Actions 不需逐次人工啟動、兩個平台的完整驗收、最新 base gate、auto-merge、受限修復與回復流程。這些外部結果尚未執行，見 setup-evidence。
