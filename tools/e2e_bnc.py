# 端對端測試：python tools/e2e_bnc.py [截圖資料夾]
# 自己在 port 8917 起靜態伺服器（不佔用正式預覽的 8907）
# 範本產生的部分只驗標準配備；這個工具自己的功能測試加在「主功能」那段。
import sys, io, os, json, subprocess, time, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools', '_shots')
os.makedirs(SHOTS, exist_ok=True)
PORT = 8917
BASE = 'http://127.0.0.1:%d/' % PORT
fails = []
def ok(name, cond, extra=''):
    print(('✓ ' if cond else '✗ ') + name + (('  ' + str(extra)) if extra and not cond else ''))
    if not cond: fails.append(name)

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '--directory', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(40):
    try: urllib.request.urlopen(BASE, timeout=1); break
    except Exception: time.sleep(.25)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1280, 'height': 900})
        # 擋掉訪客計數器，測試不灌「工具使用分析」的數字
        ctx.route('**/visitor-badge.laobi.icu/**', lambda r: r.abort())
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE); pg.wait_for_timeout(700)

        # ---------- 標準配備 ----------
        ok('首次造訪跳出警語', pg.locator('#modal.show').count() == 1 and '使用警語' in pg.inner_text('#modalBox'))
        pg.click('#modalBox [data-act=close]')
        ok('重新整理不再跳警語', (pg.reload(), pg.wait_for_timeout(500), pg.locator('#modal.show').count() == 0)[2])
        ok('沒有 JS 錯誤', not errs, errs)
        ok('頁面上看得到警語入口', pg.locator('.warn-line [data-act=warn]').count() == 1)
        ok('頁尾有創作者、手冊、計數器', '創作者' in pg.inner_text('.foot') and pg.locator('.foot a[href="manual.html"]').count() == 1 and pg.locator('.foot img[src*="page_id=m255525.brandnamechecker"]').count() == 1)
        ok('跑馬燈存在且沒有關閉鈕', pg.locator('#marqueeBar #marqueeTrack').count() == 1 and pg.locator('#marqueeBar button').count() == 0)
        css = pg.evaluate("Array.from(document.styleSheets).map(s=>{try{return Array.from(s.cssRules).map(r=>r.cssText).join('\\n')}catch(e){return ''}}).join('\\n')")
        ok('跑馬燈滑鼠移入暫停', 'paused' in css and '#marqueeBar:hover' in css)
        ok('[hidden] 有 !important', '[hidden] { display: none !important; }' in css)

        pg.click('[data-act=settings]')
        ok('⚙ 常用設定是收合式', pg.locator('#modalBox details.set-sec').count() >= 3 and pg.locator('#modalBox details.set-sec[open]').count() == 0)
        ok('設定裡沒有跑馬燈開關', '跑馬燈' not in pg.inner_text('#modalBox'))
        pg.click('#modalBox details[data-sec=about] > summary')
        about = pg.inner_text('#modalBox details[data-sec=about]')
        ok('關於本工具集中五項入口', all(k in about for k in ('創作者', '操作手冊', '使用警語', '加入主畫面', '訪客數')), about)
        pg.click('[data-act=close]'); pg.click('[data-act=settings]')
        ok('記住展開狀態', pg.locator('#modalBox details[data-sec=about][open]').count() == 1)
        pg.click('#modalBox details[data-sec=view] > summary'); pg.click('[data-fontsize=xl]')
        ok('大字', pg.evaluate("document.documentElement.dataset.fsize") == 'xl')
        pg.click('[data-fontsize=m]'); pg.click('[data-act=close]')

        # ---------- 主功能：品牌設定 → 候選與初篩 → 查證 ----------
        ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=BASE.rstrip('/'))
        ok('一開始在品牌設定', pg.locator('#panel-setup').is_visible())
        pg.click('[data-set=industry][data-val=bakery]')
        ok('換產業會換建議類別', '第 30 類' in pg.inner_text('#classBox') and '麵包' in pg.inner_text('#classBox'))
        pg.click('[data-set=industry][data-val=cafe]')
        ok('咖啡店建議第 43 類', '第 43 類' in pg.inner_text('#classBox'))
        pg.click('[data-set=style][data-val=nature]')
        k = pg.locator('[data-g=keyword]'); k.fill(''); k.type('森林')
        ok('打字時焦點還在', pg.evaluate("document.activeElement.dataset.g") == 'keyword')
        pg.click('#panel-setup [data-act=gen]'); pg.wait_for_timeout(200)
        ok('產生後跳到候選與初篩', pg.locator('#panel-names').is_visible())
        ok('產生 12 張候選卡', pg.locator('.cand').count() == 12)
        ok('每張都有招牌預覽與燈號', pg.locator('.cand .sign.wood').count() == 12 and pg.locator('.cand .lamp').count() == 12)
        ok('產生的名字沒有紅燈', pg.locator('.cand.red').count() == 0)
        names0 = pg.evaluate("window._tool.S.names.map(x => x.name)")
        pg.click('#panel-names [data-act=gen]'); pg.wait_for_timeout(200)
        ok('再產生一批會加新的', pg.locator('.cand').count() > 12)
        # 自己的名字
        pg.click('[data-act=mine]')
        pg.fill('#mineText', '好喝咖啡\n星巴克小館\n禾日\n禾日\n台北咖啡')
        pg.click('[data-act=mineYes]'); pg.wait_for_timeout(200)
        r = pg.evaluate("window._tool.rows().filter(x => x.meta.src === 'me').map(x => [x.name, x.light])")
        ok('自己的名字去重後加入', len(r) == 4, r)
        ok('好喝咖啡紅燈（缺乏識別性）', ['好喝咖啡', 'red'] in r)
        ok('星巴克小館紅燈（知名品牌）', ['星巴克小館', 'red'] in r)
        ok('禾日綠燈', ['禾日', 'green'] in r)
        card = pg.locator('.cand', has_text='好喝咖啡')
        ok('卡片寫出理由與法條', '缺乏識別性' in card.inner_text() and '商標法第 29 條' in card.inner_text())
        # 篩選與招牌樣式
        pg.click('[data-filter=red]')
        ok('篩選紅燈', pg.locator('.cand').count() >= 3 and pg.locator('.cand.green').count() == 0)
        pg.click('[data-filter=all]')
        pg.click('[data-set=sign][data-val=neon]')
        ok('換成霓虹招牌', pg.locator('.cand .sign.neon').count() == pg.locator('.cand').count())
        # 收藏與刪除
        pg.locator('.cand', has_text='禾日').locator('[data-fav]').click()
        ok('收藏後分頁顯示數字', pg.inner_text('#cntFav') == '1')
        n0 = pg.locator('.cand').count()
        pg.locator('.cand', has_text='台北咖啡').locator('[data-del]').click()
        ok('刪除候選名', pg.locator('.cand').count() == n0 - 1)
        # AI：沒金鑰提示、複製提示詞、貼上回覆
        pg.click('[data-act=aiGen]')
        ok('沒金鑰時提示去設定', '還沒有設定 AI 金鑰' in pg.inner_text('#aiMsg'))
        pg.click('[data-act=aiGenCopy]'); pg.wait_for_timeout(200)
        ok('複製 AI 提示詞', '自然療癒' in pg.evaluate('navigator.clipboard.readText()') and 'JSON' in pg.evaluate('navigator.clipboard.readText()'))
        pg.click('[data-act=aiPaste]')
        pg.fill('#pasteText', '好的，以下是名字：\n```json\n{"names":[{"name":"森語","idea":"森林的聲音"},{"name":"Starbuck Tea","idea":"x"},{"name":"<b>綠芽</b>"}]}\n```')
        pg.click('[data-act=pasteYes]'); pg.wait_for_timeout(200)
        ai = pg.evaluate("window._tool.rows().filter(x => x.meta.src === 'ai').map(x => [x.name, x.light])")
        ok('貼上 AI 回覆：讀到 3 個並初篩', len(ai) == 3 and any(a[0] == 'Starbuck Tea' and a[1] != 'green' for a in ai), ai)
        ok('AI 的命名想法顯示出來', '森林的聲音' in pg.inner_text('#panel-names'))
        ok('AI 回覆的 HTML 標籤被清掉', '綠芽' in [a[0] for a in ai] and not any('/b' in a[0] for a in ai))
        ok('Starbuck Tea 提醒像知名品牌', '和知名品牌「Starbucks」拼法很像' in pg.locator('.cand', has_text='Starbuck Tea').inner_text())
        # 查證清單
        pg.locator('.cand', has_text='森語').locator('[data-goverify]').click(); pg.wait_for_timeout(300)
        ok('去查證會收藏並跳到查證清單', pg.locator('#panel-verify').is_visible() and pg.locator('.vcard').count() == 2)
        v = pg.locator('.vcard', has_text='禾日')
        ok('中文名沒填帳號只有三項查證', v.locator('select[data-check]').count() == 3)
        v.locator('[data-handle]').fill('heri.cafe'); v.locator('[data-handle]').press('Tab'); pg.wait_for_timeout(200)
        v = pg.locator('.vcard', has_text='禾日')
        ok('填帳號後多了 IG／FB／網域', v.locator('select[data-check]').count() == 6 and 'instagram.com/heri.cafe/' in v.inner_html())
        ok('還沒查完的提醒', '還沒查完' in v.locator('.verdict').inner_text())
        v.locator('select[data-k=tipo]').select_option('clear'); pg.wait_for_timeout(100)
        pg.locator('.vcard', has_text='禾日').locator('select[data-k=findbiz]').select_option('clear'); pg.wait_for_timeout(100)
        ok('兩項主要查證都沒找到 → 綠色結論', 'verdict green' in pg.locator('.vcard', has_text='禾日').inner_html())
        pg.locator('.vcard', has_text='禾日').locator('select[data-k=ig]').select_option('taken'); pg.wait_for_timeout(100)
        ok('IG 被用 → 黃色結論', 'verdict yellow' in pg.locator('.vcard', has_text='禾日').inner_html())
        ok('改選單後焦點留在選單', pg.evaluate("document.activeElement.dataset.k") == 'ig')
        pg.locator('.vcard', has_text='禾日').locator('a', has_text='智慧局商標檢索系統').click(modifiers=['Control']); pg.wait_for_timeout(300)
        ok('點智慧局連結會複製名稱', pg.evaluate('navigator.clipboard.readText()') == '禾日')
        for extra in ctx.pages[1:]:
            if extra != pg: extra.close()
        pg.locator('.vcard', has_text='禾日').locator('[data-story]').click()
        ok('品牌故事沒金鑰提示', '還沒有設定 AI 金鑰' in pg.locator('.vcard', has_text='禾日').locator('.aiout').inner_text())
        pg.locator('.vcard', has_text='禾日').locator('[data-storycopy]').click(); pg.wait_for_timeout(200)
        ok('品牌故事提示詞不改名字', '不要改名字本身' in pg.evaluate('navigator.clipboard.readText()'))
        pg.click('#panel-verify [data-act=copyReport]'); pg.wait_for_timeout(200)
        rep = pg.evaluate('navigator.clipboard.readText()')
        ok('初篩報告只含收藏的名字', '禾日' in rep and '森語' in rep and '好喝咖啡' not in rep and '第 43 類' in rep, rep[:120])
        pg.reload(); pg.wait_for_timeout(500)
        ok('重新整理後查證結果還在', pg.locator('.vcard', has_text='禾日').locator('select[data-k=ig]').input_value() == 'taken')

        # 備份還原
        pg.click('[data-act=settings]')
        if pg.locator('#modalBox details[data-sec=data][open]').count() == 0: pg.click('#modalBox details[data-sec=data] > summary')
        with pg.expect_download() as dl: pg.click('[data-act=backup]')
        path = os.path.join(SHOTS, 'backup.json'); dl.value.save_as(path)
        j = json.load(open(path, encoding='utf-8'))
        ok('備份檔格式', j.get('app') == 'brand-name-checker' and len(j['state']['names']) >= 20)
        pg.click('[data-act=wipe]'); pg.click('[data-act=wipeYes]')
        ok('清除後沒有候選名', pg.evaluate("window._tool.S.names.length") == 0)
        pg.click('[data-act=settings]')
        if pg.locator('#modalBox details[data-sec=data][open]').count() == 0: pg.click('#modalBox details[data-sec=data] > summary')
        pg.set_input_files('#restoreFile', path); pg.wait_for_timeout(300)
        ok('從備份還原', pg.evaluate("window._tool.S.names.length") >= 20)
        pg.click('[data-tab=names]')
        pg.screenshot(path=os.path.join(SHOTS, 'names.png'), full_page=True)
        pg.click('[data-tab=verify]')
        pg.screenshot(path=os.path.join(SHOTS, 'verify.png'), full_page=True)

        # ---------- AI 設定（不連外） ----------
        pg.click('[data-act=settings]')
        if pg.locator('#modalBox details[data-sec=ai][open]').count() == 0: pg.click('#modalBox details[data-sec=ai] > summary')
        ok('AI 設定有 7 家', pg.locator('#aiProv option').count() == 7)
        pg.fill('#aiKey', 'sample-value-123')
        ok('金鑰只存本機', 'sample-value-123' in (pg.evaluate("localStorage.getItem('bnc.ai')") or ''))
        pg.select_option('#aiProv', 'custom'); pg.wait_for_timeout(200)
        ok('切到自訂端點會出現網址欄', pg.locator('#aiBase').count() == 1)
        pg.click('[data-ai-clear]'); pg.click('#modalBox [data-act=close]')
        ok('Gemini 舊模型自動換新', pg.evaluate("TOOL_AI.geminiModelFix('gemini-2.0-flash')") != 'gemini-2.0-flash')

        # ---------- PWA、手冊、列印 ----------
        pg.wait_for_timeout(800)
        ok('service worker 已註冊', pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r)"))
        mf = json.loads(urllib.request.urlopen(BASE + 'manifest.json').read().decode('utf-8'))
        ok('manifest 圖示', len(mf.get('icons', [])) == 3 and all(os.path.exists(os.path.join(ROOT, i['src'])) for i in mf['icons']))
        sw = open(os.path.join(ROOT, 'service-worker.js'), encoding='utf-8').read()
        ok('SW 只刪自己前綴的快取', "k.indexOf(CACHE_NAME.replace(" in sw)
        pg.emulate_media(media='print')
        ok('列印有浮水印', pg.evaluate("getComputedStyle(document.getElementById('pdfWatermark')).display") == 'flex')
        pg.emulate_media(media='screen')
        mp = ctx.new_page(); mp.goto(BASE + 'manual.html')
        ok('手冊有完整版創作者資料', mp.locator('#creator .mk-creator').count() == 1 and len(mp.inner_text('#creator')) > 400)
        ok('手冊有手冊計數器', mp.locator('img[src*="m255525.brandnamechecker.manual"]').count() == 1)
        mp.close()

        # ---------- 手機寬度 ----------
        pg.set_viewport_size({'width': 390, 'height': 800}); pg.wait_for_timeout(200)
        ok('390px 不橫向捲動', pg.evaluate("document.documentElement.scrollWidth <= 391"))
        pg.screenshot(path=os.path.join(SHOTS, 'mobile.png'), full_page=True)
        pg.set_viewport_size({'width': 1280, 'height': 900}); pg.screenshot(path=os.path.join(SHOTS, 'desktop.png'), full_page=True)
        ok('全程沒有 JS 錯誤', not errs, errs)
        b.close()
finally:
    srv.terminate()

print('\n' + ('全部通過' if not fails else '失敗 %d 項：%s' % (len(fails), '、'.join(fails))))
sys.exit(1 if fails else 0)
