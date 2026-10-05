# 設置驗收證據

2026-10-05 精簡版。此文件描述現行版本，早期完整副本 smoke、AST 政策掃描與版本 metadata 的證據保留在 Git 歷史，不作為現行流程的驗收結果。

| 項目                                  | 狀態    | 證據／邊界                                                                                  |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| 專案本機 Node／pnpm                   | PASS    | 原生 npm 安裝 pnpm；pnpm devEngines.runtime 管理 Node 24.21.0，pnpm 12.8.2                  |
| frozen install                        | PASS    | 現行 catalog、runtime 與 lockfile 可安裝，不重新選版                                        |
| core → web 建置                       | PASS    | pnpm build 與完整 verify 實際執行相依圖                                                     |
| strict／typeAware／typeCheck          | PASS    | vp check，沒有 lint／型別錯誤                                                               |
| 公開 package exports 與宣告           | PASS    | 一般 Vitest consumer 測試、TypeScript 編譯，使用 dist 公開 exports                          |
| production 畫面                       | PASS    | Playwright 啟動 preview，驗證跨 package 結果與 page errors                                  |
| production audit                      | PASS    | 原生 pnpm audit；查詢 npm advisory，未發現已知漏洞                                          |
| Pi／broker／權限邊界                  | PASS    | SDK fixture 與權限／累計預算測試；沒有真實模型呼叫                                          |
| Renovate schema／extraction           | PASS    | 固定 image 44.132.1 validator；實際 npm manager 辨識 Node runtime、pnpm、catalog、overrides |
| 原生 lockfile maintenance             | PASS    | 設定經實際 validator 通過，原生功能啟用且 artifact 更新未停用；遠端 PR 尚未執行             |
| Pi 容器原生工具準備                   | NOT RUN | 正在驗證；與真實模型閉環分開                                                                |
| macOS arm64 完整 pnpm verify          | PASS    | build、check、Vitest、Node tests、Playwright、audit；0 cache hit                            |
| 現行 Linux x64／macOS arm64 GitHub CI | NOT RUN | 未提供並授權遠端 repository                                                                 |
| App／保護規則／排程／auto-merge       | BLOCKED | 尚需 owner/repo、push 授權、App Secrets 與 branch protection                                |
| 真實 Pi 修復閉環                      | BLOCKED | 尚需 provider/model/endpoint/key／pricing，以及真實 PR/run                                  |

本機 `pnpm verify` 實際通過 35 項測試：7 項 Vitest、27 項 Node 維護邊界、1 項 Playwright，沒有 skipped，0 cache hit。frozen install 前後 manifests 與 lockfile 的 SHA-256 完全一致。刪除的測試對應已移除的生成器、AST 掃描與工具實作 fixture；既有 app 功能與 Pi 權限邊界測試保留。

TypeScript 7 的 tsdown 宣告 API 仍提示 experimental；pnpm 安裝有 transitive deprecated packages 提示。Playwright 的 FORCE_COLOR／NO_COLOR 訊息屬測試輸出設定提示，沒有影響驗收。

早期版本 `973ac34` 曾在 Linux x64 模擬容器與全新改名副本完成驗收；這不代表本次調整已在 GitHub runner 或真實模型完成。遠端維護與 Pi 保持停用，沒有 push、發布或部署。
