# brand-name-checker — 品牌命名與商標初篩

幫店名、品牌名做初步把關：產生候選名字，依商標法檢查識別性與不得註冊的情形、比對常見知名品牌，整理智慧局、商工登記、社群帳號的查證清單，並預覽招牌效果。（2026-11-21 由 tool-scaffold 建立骨架）

- 純靜態：`index.html`（CSS）＋`data.js`（計算引擎 `window.BNC`，node 可 require）＋`app.js`（畫面）＋`watermark.js`（`TOOL_WATERMARK` 馬克老師浮水印，列印用）＋`manual.html`＋PWA。
- 本機預覽 port **8907**（`.claude/launch.json` 的 `brand-name-checker`）。visitor-badge `m255525.brandnamechecker`（手冊 `.manual`）。
- 尚未上線。上線後在這裡記網址與日期；改版要升 `service-worker.js` 的 `CACHE_NAME` 再 push。

## 規則
- （待補）計算規則、資料來源與查證日期、自訂門檻。改了 `data.js` 跑 `node tools/test_engine.mjs`。

## 架構
- localStorage 前綴 `bnc.`：`state`、`tab`、`fold`、`fsize`、`warnSeen`、`marquee`。
- 輸入只呼叫 `refresh()`，不重繪表單（焦點才不會跑掉）；欄位 change 時**只有數值真的被修正才重繪**，否則會吃掉使用者的下一次點擊。
- 備份 JSON `app:'brand-name-checker'`。測試掛鉤 `window._tool`。
- 畫風：（待設計）範本配色 `plum` 只是起點；姊妹作的畫面要明顯不同。圖示由 `tools/make_icons.py` 產生。

## AI（BYOK）
- `ai.js`：7 家 `callLLM`＋`geminiModelFix` 複製自 `政府補助認證產生器/shop-opening-checklist/ai.js`（正本改了這裡也要改）。金鑰存 `bnc.ai`，只在這台瀏覽器。⚙「🤖 AI 設定」。
- 原則：AI 只做解說與文字，數字與判斷一律由 `data.js` 規則決定；每個 AI 功能都要有「📋 複製提示詞」（沒金鑰也能用）。

## 標準配備
跑馬燈（工作區公告 GAS，滑鼠移入暫停，不可關）、⚙ 常用設定（收合式：資料／顯示／關於本工具）、首訪警語＋頁面入口、`manual.html#creator` 完整版（改 `tools/manual_body.html` 後跑 `python tools/build_manual.py`，創作者區塊從賞鳥地圖範本複製）、PWA、訪客計數器、列印浮水印。

## 測試
- `node tools/test_engine.mjs`：（待補手算案例）＋亂數。
- `python tools/e2e_bnc.py [截圖資料夾]`（Playwright，自己在 port 8917 起伺服器）：標準配備（警語、跑馬燈、收合設定、關於本工具、大字、備份還原、SW、manifest、手冊創作者、列印浮水印、390px）＋主功能。
