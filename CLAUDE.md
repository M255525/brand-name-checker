# brand-name-checker — 品牌命名與商標初篩

給要開店或推新品牌的人：選產業與品牌個性 → 規則式產生候選名／自己輸入／AI 想 → 依商標法第 29、30 條規則初篩（紅黃綠燈＋理由＋法條）、比對內建常見知名品牌 → 木刻／霓虹／壓克力招牌預覽 → 收藏的名字整理成查證清單（智慧局商標檢索、商工登記、Google、IG、FB、網域，查完自己記結果，給一句結論）→ 複製／列印初篩報告；AI 寫品牌故事與標語。2026-11-21 用 `小工具/tool-scaffold`（`--ai byok`）建立；使用者從新工具清單挑了這個，規格由 Claude 自行決定。

- 純靜態：`index.html`（CSS）＋`data.js`（規則引擎 `window.BNC`，node 可 require）＋`app.js`（畫面）＋`ai.js`（BYOK 7 家，`window.TOOL_AI`）＋`watermark.js`（`TOOL_WATERMARK`）＋`manual.html`＋PWA。
- 本機預覽 port **8907**（`.claude/launch.json` 的 `brand-name-checker`；程式牆 `LOCAL_APPS`＋`MARKETING_SUB` 行銷・創意發想）。visitor-badge `m255525.brandnamechecker`（手冊 `.manual`）。
- 尚未上線。上線後在這裡記網址與日期；改版要升 `service-worker.js` 的 `CACHE_NAME` 再 push。
- **工具不連線查智慧局**（沒有公開 API、也不爬網站）；查證一律開連結讓使用者自己查。智慧局、商工登記無法用網址帶入名稱，點連結時會順便把名稱複製到剪貼簿。

## 規則（改了 `data.js` 跑 `node tools/test_engine.mjs`，2064 項含 2000 組亂數）
- **識別性（第 29 條）**：依產業的通用名稱 `INDUSTRIES[x].generic`、說明字 `DESCRIPTIVE`、地名 `PLACES`、誤認字 `MISLEADING` 從名字裡拿掉，剩下沒有自己的部分（中文 ≥1 字或英文 ≥3 字母）→ 🔴 `noDistinct`；有剩 → 各自 🟡（通用／說明／地名不能單獨主張）。**通用名稱依產業**：「咖啡」對咖啡店是通用，對服飾不是。英文字一律整字比對（`wordIn`）。
- **第 30 條**：國家名號 `NATIONAL` 🔴（第 2～4 款）、不雅 `OFFENSIVE` 🔴（第 7 款）、誤認誤信 `MISLEADING` 🔴／🟡（第 8 款；有機要驗證）、知名品牌 `FAMOUS` 約 70 組（第 11 款）。
- **知名品牌比對**：中文包含 → 🔴；三字以上品牌有 round(長度×0.67) 個字依序相同（`lcs`）→ 🟡（星巴客、麥當當）。英文：4 字母以下只比完整單字（Online 不算 LINE、Kara 不算 ZARA），5 字母以上單字以品牌開頭也算（Applestore 算、Pineapple 不算）→ 🔴；整個名字或任一單字編輯距離 ≤1（7 字母以上 ≤2）→ 🟡（Starbuck Tea）。**清單只是提醒，不是官方著名商標名錄**（頁面與手冊有寫）。
- 好記：一個字、超過 5／8 個中文字、超過 14 個英文字母、全是常見英文字、三連字 → 🟡。識別性分數 90 起扣，自訂估計。
- 產業 12 種，各有建議尼斯類別 `classes`（例：咖啡店 43／30／32，烘焙 30／43／35）。
- 產生器 `generate`：6 種個性字庫 × 組字樣式（兩字、加後綴、小＋、疊字、與、產業後綴）＋英文（字庫字、自造字、加產業英文後綴），種子＝設定雜湊＋`round`（同設定同結果、再產生換一批）。**產生器自己會丟掉初篩紅燈或撞知名品牌的名字**（測試掃 432 次）；字庫裡原本的 Nestle（雀巢）已換掉。
- 查證 `verdict`：初篩紅 → 紅；智慧局或商工登記「已被使用」→ 紅；其他項被用 → 黃；有近似 → 黃；智慧局＋商工登記都「沒找到相同的」→ 綠；其餘 → 還沒查完。
- AI：`aiNamePrompt`（要 JSON、禁誇大／療效／知名品牌）、`cleanAiNames`（去 HTML 標籤與危險字元、去重、20 字）、`aiStoryPrompt`（不改名字）。AI 想的名字一樣進初篩。

## 架構
- localStorage 前綴 `bnc.`：`state`（`{industry, style, keyword, audience, avoid, lang, round, sign, names:[{name, src:gen|me|ai, idea, fav}], checks:{正規化名:{handle, tipo, findbiz, google, ig, fb, domain}}}`，最多 80 個候選名）、`tab`、`fold`、`fsize`、`warnSeen`、`marquee`、`ai`。
- 分頁：① 品牌設定（`#classBox` 依產業即時更新）② 候選與初篩（篩選燈號／收藏、招牌樣式）③ 查證清單（收藏的名字）④ 說明。名字的 key 是 `D.norm(name)`（全形、臺→台、去空白標點）。
- 設定輸入只存不重畫；帳號欄 input 只存、change 才重畫（連結要更新）；查證選單 change 後重畫並把焦點放回同一個選單。
- 列印只印候選與查證兩個分頁（隱藏按鈕），每頁浮水印。測試掛鉤 `window._tool`（`S`、`rows()`）。
- 畫風：**招牌試寫台**（灰泥牆、深靛主色＋粉紅霓虹；招牌三種：木刻木紋陰刻字、深色磚牆霓虹光暈、壓克力板＋四角螺絲）。`tools/make_icons.py` 畫磚牆霓虹「名」字（`ImageChops.lighter` 疊兩層模糊光暈）。

## 標準配備
跑馬燈（工作區公告 GAS，滑鼠移入暫停，不可關）、⚙ 常用設定（收合式：資料／🤖 AI 設定／顯示／關於本工具）、首訪警語＋頁面入口、`manual.html#creator` 完整版（改 `tools/manual_body.html` 後跑 `python tools/build_manual.py`）、PWA、訪客計數器、列印浮水印，無序號。

## 測試
- `node tools/test_engine.mjs`：正規化、識別性各情形（含依產業判斷）、第 30 條各款、知名品牌（中文包含／相似、英文整字／開頭／拼法、不誤判 Pineapple／Online／Kara／春日）、好記、去重排序、產生器（決定性、換批、中英比例、避開字、432 次不出紅燈）、查證連結與結論、AI 提示詞與回覆整理、報告、2000 組亂數。
- `python tools/e2e_bnc.py [截圖資料夾]`（Playwright，自己在 port 8917 起伺服器，擋計數器）：標準配備＋產業換類別、產生 12 個無紅燈、再產生、自己的名字去重與燈號、篩選、霓虹招牌、收藏刪除、AI 沒金鑰／複製提示詞／貼上回覆（含 HTML 與撞名）、去查證、帳號欄、查證結論綠／黃、焦點、點連結複製名稱、品牌故事提示詞、報告只含收藏、重新整理、備份還原、AI 設定 7 家、SW、手冊、列印、390px。2026-11-21 全過。
