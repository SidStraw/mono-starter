# 設置驗收證據

驗證日期：2026-10-05。下列結果會在最後完整驗收後更新。

| 項目                                                              | 狀態    | 證據／邊界                                                                    |
| ----------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| 精確版本與官方 registry／Node metadata                            | PASS    | toolchain-baseline.json；72 小時冷卻                                          |
| root bootstrap、core→web、dist consumer                           | PASS    | 固定 runtime，本機 macOS arm64                                                |
| strict／typeAware／typeCheck                                      | PASS    | vp check，未放寬驗收                                                          |
| 冷卻、缺發布時間、poisoned frozen lock、未知 scripts 拒絕         | PASS    | 實際 pnpm 與隔離 HTTP registry fixture                                        |
| production high／critical audit                                   | PASS    | registry advisory；查詢失敗會失敗                                             |
| Backlog CLI                                                       | PASS    | local instructions、remote／auto commit 關閉                                  |
| Renovate repo/admin schema 與實際 extraction                      | PASS    | 固定 image 44.132.1；npm/nvm/Actions/custom regex                             |
| skipped／缺平台／過期 SHA／偽造結果／測試與政策修改／累計預算拒絕 | PASS    | 31 項治理測試、6 項 core 測試；全部實際執行                                   |
| 候選容器憑證 canary                                               | PASS    | 真實 container 無 controller key/token、host secret、Docker socket 與外部網路 |
| Actions／image 官方 release、冷卻與 digest                        | PASS    | GitHub release/tag SHA 與 GHCR tag/digest 實際比對                            |
| Pi SDK／broker protocol                                           | PASS    | 固定 SDK 1.0.0、fixture model，無付費模型呼叫                                 |
| macOS arm64 完整 pnpm verify                                      | NOT RUN | 待最後驗收                                                                    |
| 全新改名 starter、獨立 store／runtime                             | NOT RUN | 待最後驗收                                                                    |
| Linux x64 本機容器驗收                                            | NOT RUN | 待最後驗收                                                                    |
| GitHub Linux x64／macOS arm64 CI                                  | NOT RUN | 未提供或授權遠端 repository                                                   |
| App、branch protection、auto-merge、週期排程                      | BLOCKED | 需要 owner/repo、首次 push 授權、App 設定與保護方案                           |
| 真實模型修復與計價                                                | BLOCKED | 未提供 provider/model/endpoint/key／價格；fixture 不代表真實模型成功          |

TypeScript 7.0.2 的宣告 API 在 tsdown 有 experimental 提示；建置與 consumer 均須實際通過。pnpm 安裝有 Pi transitive deprecated packages 提示，未自動豁免或強制覆寫。

本機 commit 不代表取得 push 或發布授權。所有 remote maintenance 開關維持停用。
