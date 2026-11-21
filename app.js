/* 品牌命名與商標初篩：畫面
   骨架由 tool-scaffold 產生（跑馬燈、⚙ 常用設定、首訪警語、手冊／創作者／加入主畫面／訪客數、備份還原、大字、列印浮水印、AI 設定）。 */
(function(){
'use strict';
var D = window.BNC, PFX = 'bnc.';
function lsGet(k){ try{ return localStorage.getItem(PFX + k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(PFX + k, v); }catch(e){} }
function lsDel(k){ try{ localStorage.removeItem(PFX + k); }catch(e){} }
function lsJson(k, d){ try{ var v = JSON.parse(lsGet(k)); return v == null ? d : v; }catch(e){ return d; } }
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }
function today(){ var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

var COUNTER = 'https://visitor-badge.laobi.icu/badge?page_id=m255525.brandnamechecker';
var standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
var TABS = [['setup', '① 品牌設定'], ['names', '② 候選與初篩'], ['verify', '③ 查證清單'], ['about', '說明']];
var SIGNS = {wood:'木刻', neon:'霓虹', acrylic:'壓克力'};
var LIGHT = {red:'不建議', yellow:'要注意', green:'初篩通過'};
var V = {tab:lsGet('tab') || 'setup', filter:'all'};
if(!TABS.some(function(t){ return t[0] === V.tab; })) V.tab = 'setup';

/* ---------- 資料 ---------- */
function defaults(){ return {industry:'cafe', style:'warm', keyword:'', audience:'', avoid:'', lang:'both', round:0, sign:'wood', names:[], checks:{}}; }
function load(){ var s = lsJson('state', null); return s && Array.isArray(s.names) ? Object.assign(defaults(), s) : defaults(); }
var S = load();
function save(){ lsSet('state', JSON.stringify(S)); }
function addNames(list, src){
  var have = {}, added = 0;
  S.names.forEach(function(x){ have[D.norm(x.name)] = 1; });
  list.forEach(function(x){
    var nm = typeof x === 'string' ? x : x.name, idea = typeof x === 'string' ? '' : x.idea || '';
    nm = String(nm || '').replace(/\s+/g, ' ').trim().slice(0, 30); var k = D.norm(nm);
    if(!k || have[k] || S.names.length >= 80) return;
    have[k] = 1; S.names.push({name:nm, src:src, idea:idea, fav:false}); added++;
  });
  save(); return added;
}
function rows(){ var r = D.screenAll(S.names.map(function(x){ return x.name; }), S.industry); var m = {}; S.names.forEach(function(x){ m[D.norm(x.name)] = x; }); r.forEach(function(x){ x.meta = m[x.n] || {}; }); return r; }
function checksOf(n){ return S.checks[n] || (S.checks[n] = {}); }

/* ---------- 畫面 ---------- */
function render(){
  var h = '<div class="print-head"><h1>品牌命名初篩報告</h1><div class="small">' + esc(D.INDUSTRIES[S.industry].label) + '・' + esc(D.STYLES[S.style].label) + '・列印日期 ' + today() + '</div></div>' +
    '<div class="bar"><h1><span class="neon">名</span>品牌命名與商標初篩<small>想名字、先自己篩一輪，再去智慧局查</small></h1>' +
    '<a class="ibtn noprint" href="manual.html">📖 操作手冊</a><button class="ibtn" data-act="print">🖨 列印</button><button class="ibtn" data-act="settings" aria-label="常用設定">⚙</button></div>' +
    '<p class="warn-line">初篩只依商標法條文整理的規則與內建品牌清單比對，不能保證可以註冊。<button data-act="warn">⚠ 使用警語</button></p>' +
    '<nav class="tabs" role="tablist">' + TABS.map(function(t){ return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (V.tab === t[0]) + '">' + t[1] + (t[0] === 'names' ? '<span class="cnt" id="cntNames"></span>' : t[0] === 'verify' ? '<span class="cnt" id="cntFav"></span>' : '') + '</button>'; }).join('') + '</nav>' +
    TABS.map(function(t){ return '<section class="panel" data-p="' + t[0] + '" id="panel-' + t[0] + '"' + (V.tab === t[0] ? '' : ' hidden') + '></section>'; }).join('') +
    '<footer class="foot">👤 創作者 Mark Tsai（蔡豐全）・<a href="manual.html">📖 操作手冊</a>・<a href="#" data-act="warn">⚠ 使用警語</a>' + (standalone ? '' : '・<a href="#" data-act="install">📲 加入主畫面</a>') +
    '<br><img src="' + COUNTER + '" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle;margin-top:.4rem"></footer>';
  $('app').innerHTML = h;
  $('panel-setup').innerHTML = setupHTML();
  $('panel-about').innerHTML = aboutHTML();
  refresh();
}
function refresh(){
  var r = rows();
  $('panel-names').innerHTML = namesHTML(r);
  $('panel-verify').innerHTML = verifyHTML(r);
  $('cntNames').textContent = S.names.length || '';
  var f = S.names.filter(function(x){ return x.fav; }).length; $('cntFav').textContent = f || '';
  var cl = $('classBox'); if(cl) cl.innerHTML = classHTML();
}
function seg(key, opts){ return '<div class="seg" role="group">' + Object.keys(opts).map(function(k){ return '<button data-set="' + key + '" data-val="' + k + '" aria-pressed="' + (S[key] === k) + '">' + esc(opts[k]) + '</button>'; }).join('') + '</div>'; }
function classHTML(){
  var ind = D.INDUSTRIES[S.industry];
  return '<b>建議申請的商標類別</b>（尼斯分類，依你實際的商品／服務增減）<ul>' + ind.classes.map(function(c){ return '<li>' + (c[0] ? '<span class="cls">第 ' + c[0] + ' 類</span>' : '') + esc(c[1]) + '</li>'; }).join('') + '</ul>' +
    '<p class="small">這個產業的通用字（不能單獨當品牌）：' + (ind.generic.length ? ind.generic.slice(0, 10).map(esc).join('、') : '—') + '</p>';
}
function setupHTML(){
  var styles = {}; Object.keys(D.STYLES).forEach(function(k){ styles[k] = D.STYLES[k].label; });
  return '<div class="card"><h3><span class="tag">1</span>賣什麼？</h3><div class="inds">' + Object.keys(D.INDUSTRIES).map(function(k){ return '<button data-set="industry" data-val="' + k + '" aria-pressed="' + (S.industry === k) + '">' + esc(D.INDUSTRIES[k].label) + '</button>'; }).join('') + '</div>' +
      '<div class="classbox" id="classBox">' + classHTML() + '</div></div>' +
    '<div class="card"><h3><span class="tag">2</span>品牌個性</h3>' + seg('style', styles) + '</div>' +
    '<div class="card"><h3><span class="tag">3</span>想放進去的意思</h3><div class="row">' +
      '<label class="fld">想傳達的字或感覺<input type="text" maxlength="30" data-g="keyword" value="' + esc(S.keyword) + '" placeholder="例如：暖、家、慢慢來"><small>中文字會優先拿來組名字</small></label>' +
      '<label class="fld">主要客群<input type="text" maxlength="30" data-g="audience" value="' + esc(S.audience) + '" placeholder="例如：附近上班族"><small>給 AI 參考</small></label>' +
      '<label class="fld">不要出現的字<input type="text" maxlength="30" data-g="avoid" value="' + esc(S.avoid) + '" placeholder="用空白或逗號分開"></label></div>' +
      '<div style="margin-top:.6rem"><b class="small">名字語言</b><br>' + seg('lang', {both:'中英都要', zh:'只要中文', en:'只要英文'}) + '</div>' +
      '<div class="btns"><button class="btn" data-act="gen">🎲 產生 12 個候選名</button><button class="btn alt" data-tab="names">已經有想好的名字 →</button></div></div>';
}
function signHTML(name, kind){ return '<div class="sign ' + (kind || S.sign) + '"><span>' + esc(name) + '</span></div>'; }
function namesHTML(r){
  var cnt = {all:r.length, green:0, yellow:0, red:0, fav:0};
  r.forEach(function(x){ cnt[x.light]++; if(x.meta.fav) cnt.fav++; });
  var list = r.filter(function(x){ return V.filter === 'all' || (V.filter === 'fav' ? x.meta.fav : x.light === V.filter); });
  var top = '<div class="card tools"><div class="btns" style="margin-top:0">' +
      '<button class="btn" data-act="gen">🎲 ' + (S.names.some(function(x){ return x.src === 'gen'; }) ? '再產生一批' : '產生 12 個候選名') + '</button>' +
      '<button class="btn alt" data-act="mine">✍️ 加入我想的名字</button>' +
      '<button class="btn alt" data-act="aiGen">🤖 AI 想 15 個</button><button class="btn alt" data-act="aiGenCopy">📋 複製提示詞</button><button class="btn alt" data-act="aiPaste">📥 貼上 AI 回覆</button></div>' +
      '<p class="small" id="aiMsg"></p>' +
      '<div class="filt">' + [['all', '全部'], ['green', '🟢 通過'], ['yellow', '🟡 注意'], ['red', '🔴 不建議'], ['fav', '★ 收藏']].map(function(f){ return '<button data-filter="' + f[0] + '" aria-pressed="' + (V.filter === f[0]) + '">' + f[1] + ' ' + cnt[f[0]] + '</button>'; }).join('') +
      '<span class="sp"></span><span class="small">招牌</span>' + seg('sign', SIGNS) + '</div></div>';
  if(!r.length) return top + '<div class="card empty">還沒有候選名。按「🎲 產生 12 個候選名」，或把你想好的名字加進來。</div>';
  return top + '<div class="grid">' + list.map(function(x){
    var src = {gen:'規則產生', me:'我想的', ai:'AI 想的'}[x.meta.src] || '';
    return '<article class="cand ' + x.light + '" data-n="' + esc(x.n) + '">' + signHTML(x.name) +
      '<div class="cbody"><div class="chead"><span class="lamp ' + x.light + '" aria-hidden="true"></span><b>' + LIGHT[x.light] + '</b><span class="score" title="識別性自估（越高越容易和別人區分）">識別性 ' + x.score + '</span>' +
      '<button class="star" data-fav="' + esc(x.n) + '" aria-pressed="' + !!x.meta.fav + '" aria-label="收藏 ' + esc(x.name) + '">' + (x.meta.fav ? '★' : '☆') + '</button></div>' +
      '<div class="bar2"><i style="width:' + x.score + '%"></i></div>' +
      (x.issues.length ? '<ul class="iss">' + x.issues.map(function(i){ return '<li class="' + i.lv + '">' + esc(i.msg) + (i.law ? '<small>' + esc(i.law) + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="small ok">規則初篩沒有發現問題。下一步：收藏起來去查證。</p>') +
      (x.meta.idea ? '<p class="small idea">💡 ' + esc(x.meta.idea) + '</p>' : '') +
      '<div class="cfoot"><span class="small">' + src + '</span><button class="lnk" data-goverify="' + esc(x.n) + '">🔍 去查證</button><button class="lnk del" data-del="' + esc(x.n) + '" aria-label="刪除 ' + esc(x.name) + '">✕</button></div></div></article>';
  }).join('') + '</div>' + (list.length ? '' : '<div class="card empty">這個篩選沒有名字。</div>');
}
function verifyHTML(r){
  var fav = r.filter(function(x){ return x.meta.fav; });
  var head = '<div class="card"><h3>查證清單</h3><p class="small">收藏的名字會出現在這裡。每一項打開查完，在右邊選結果；至少要查<b>智慧局商標檢索</b>和<b>商工登記</b>。</p><div class="classbox">' + classHTML() + '</div>' +
    '<div class="btns"><button class="btn alt" data-act="copyReport">📋 複製初篩報告</button><button class="btn alt" data-act="print">🖨 列印報告</button></div></div>';
  if(!fav.length) return head + '<div class="card empty">還沒有收藏的名字。到「② 候選與初篩」按 ☆ 收藏。</div>';
  return head + fav.map(function(x){
    var c = checksOf(x.n), links = D.checkLinks(x.name, c.handle), v = D.verdict(x, c);
    return '<div class="card vcard" data-n="' + esc(x.n) + '"><div class="vtop">' + signHTML(x.name, 'acrylic mini') +
      '<div><b class="vname">' + esc(x.name) + '</b><div class="small"><span class="lamp ' + x.light + '"></span>' + LIGHT[x.light] + '・識別性 ' + x.score + '</div></div></div>' +
      '<label class="fld">社群帳號／網域寫法<input type="text" maxlength="30" data-handle="' + esc(x.n) + '" value="' + esc(c.handle || D.handleOf(x.name)) + '" placeholder="英文小寫，例如 heri.cafe"><small>中文名請自己想一個英文帳號，才會列出 IG、FB、網域</small></label>' +
      '<table class="chk"><tbody>' + links.map(function(l){
        return '<tr><td><a href="' + esc(l.url) + '" target="_blank" rel="noopener" data-open="' + esc(l.copy ? x.name : '') + '">' + esc(l.label) + ' ↗</a><small>' + esc(l.how) + '</small></td>' +
          '<td><select data-check="' + esc(x.n) + '" data-k="' + l.key + '" aria-label="' + esc(l.label) + ' 查證結果">' + Object.keys(D.STATUS).map(function(s){ return '<option value="' + s + '"' + ((c[l.key] || 'todo') === s ? ' selected' : '') + '>' + D.STATUS[s] + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="verdict ' + v.lv + '">' + esc(v.text) + '</div>' +
      '<div class="btns"><button class="btn alt" data-story="' + esc(x.n) + '">🤖 AI 寫品牌故事與標語</button><button class="btn alt" data-storycopy="' + esc(x.n) + '">📋 複製提示詞</button></div><div class="aiout" id="story-' + esc(x.n) + '"></div></div>';
  }).join('');
}
function aboutHTML(){
  var L = [['缺乏識別性', '只由商品的品質、用途、原料、產地等說明構成；或是商品的通用名稱（例如咖啡店叫「好喝咖啡」）', '第 29 條第 1 項'], ['說明字的部分', '名字裡的通用名稱、說明字可以用，但不能單獨主張專用', '第 29 條第 3 項'],
    ['國家名號', '中華民國國旗、國徽、國家名號、政府機關、國際組織的名稱或標章', '第 30 條第 1 項第 2～4 款'], ['公序良俗', '妨害公共秩序或善良風俗', '第 30 條第 1 項第 7 款'],
    ['誤認誤信', '使公眾誤認誤信商品的性質、品質或產地（例如沒有驗證卻叫「有機」、食品名字暗示療效）', '第 30 條第 1 項第 8 款'], ['已註冊商標', '和他人已註冊、用在同一或類似商品的商標相同或近似', '第 30 條第 1 項第 10 款（要到智慧局查）'],
    ['著名商標', '和他人著名商標相同或近似，有混淆誤認或減損識別性之虞', '第 30 條第 1 項第 11 款']];
  return '<div class="card"><h3>這是什麼</h3><p>開店或推新品牌前，先把名字想好、自己篩一輪：哪些名字一看就很難註冊、哪些可能撞到知名品牌，再把留下來的名字拿去智慧局、商工登記、社群帳號一一查證。</p></div>' +
    '<div class="card"><h3>初篩依據（商標法）</h3><div class="tw"><table class="law"><thead><tr><th>情形</th><th>說明</th><th>條文</th></tr></thead><tbody>' + L.map(function(x){ return '<tr><td><b>' + x[0] + '</b></td><td>' + x[1] + '</td><td>' + x[2] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    '<p class="small">條文以 <a href="' + D.LAW_URL + '" target="_blank" rel="noopener">全國法規資料庫・商標法</a> 為準（2026-11 整理）。</p></div>' +
    '<div class="card"><h3>這個工具做不到的</h3><ul><li><b>不會連線查智慧局</b>：「和已註冊商標近似」是最常見的駁回理由，一定要自己到商標檢索系統查。</li><li>知名品牌只比對內建約 ' + D.FAMOUS.length + ' 個常見品牌，不是官方的著名商標名錄。</li><li>近似與否最後由智慧局審查判斷；重要的品牌建議請商標代理人評估。</li><li>識別性分數是本工具自訂的估計，只用來比較候選名之間的強弱。</li></ul></div>';
}

/* ---------- 彈窗、警語、設定 ---------- */
function openModal(h){ $('modalBox').innerHTML = h; $('modal').classList.add('show'); $('modalBox').scrollTop = 0; var f = $('modalBox').querySelector('textarea,button,a,input'); if(f) f.focus(); }
function closeModal(){ $('modal').classList.remove('show'); }
var toastT;
function toast(m){ var o = document.querySelector('.toast'); if(o) o.remove(); var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function(){ t.remove(); }, 3000); }
var WARN_HTML = '<h2>⚠ 使用警語</h2><p><b>本工具是命名的初步篩選，不是法律意見，也不能保證商標可以註冊。</b></p><ul>' +
  '<li>規則依商標法第 29、30 條整理（2026-11），實際以智慧局審查與全國法規資料庫的條文為準。</li>' +
  '<li><b>本工具不會連線查詢已註冊商標</b>。和他人已註冊商標相同或近似是最常見的不准註冊原因，請一定到智慧局商標檢索系統查詢。</li>' +
  '<li>知名品牌只比對內建的一小份常見清單，沒有亮燈不代表沒有撞名。</li>' +
  '<li>重要的品牌、要投入大量資金的店名，建議委託商標代理人評估。</li>' +
  '<li>AI 想的名字一樣要經過初篩與查證；AI 回覆可能有錯。金鑰只存在這台瀏覽器。</li>' +
  '<li>資料只存在這台裝置的瀏覽器，不會上傳。</li></ul>';
function showWarn(){ openModal(WARN_HTML + '<div class="vstack"><button class="btn" data-act="close">我知道了</button></div>'); }
function sec(id, title, val, body){ return '<details class="set-sec" data-sec="' + id + '"><summary><span class="sst">' + title + '</span><span class="ssv">' + esc(val) + '</span></summary><div class="set-body">' + body + '</div></details>'; }
function openSettings(){
  var xl = lsGet('fsize') === 'xl';
  openModal('<div class="bar"><h2 style="flex:1 1 0">⚙ 常用設定</h2><button class="ibtn" data-act="foldall">全部展開／收合</button></div>' +
    sec('data', '資料', S.names.length + ' 個候選名', '<p class="small">資料只存在這台裝置。換電腦或手機前先下載備份檔，再到新裝置還原。</p><div class="vstack"><button class="btn" data-act="backup">下載備份檔</button><button class="btn alt" data-act="restore">從備份檔還原</button><button class="btn alt" data-act="clearNames">清空候選名（保留設定）</button><button class="btn red" data-act="wipe">清除全部資料</button></div><input type="file" id="restoreFile" accept=".json,application/json" hidden>') +
    sec('ai', '🤖 AI 設定', window.TOOL_AI ? TOOL_AI.status() : '', window.TOOL_AI ? TOOL_AI.settingsHTML() : '') +
    sec('view', '顯示', xl ? '大字' : '標準字', '<div class="vstack"><button class="btn' + (xl ? ' alt' : '') + '" data-fontsize="m">標準字</button><button class="btn' + (xl ? '' : ' alt') + '" data-fontsize="xl">大字</button></div>') +
    sec('about', '關於本工具', '', '<p>👤 創作者 Mark Tsai（蔡豐全）<br><a href="manual.html#creator">創作者資料與聯絡方式</a></p><div class="vstack"><a class="btn alt" href="manual.html">📖 操作手冊</a><button class="btn alt" data-act="warn">⚠ 使用警語</button>' +
      (standalone ? '' : '<button class="btn alt" data-act="install">📲 加入主畫面</button>') + '</div><p class="small" style="margin-top:.5rem">訪客數 <img src="' + COUNTER + '" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle"></p>') +
    '<div class="vstack"><button class="btn" data-act="close">關閉</button></div>');
  var open = lsJson('fold', []);
  document.querySelectorAll('.set-sec').forEach(function(d){ d.open = open.indexOf(d.dataset.sec) >= 0; d.addEventListener('toggle', saveFold); });
  $('restoreFile').addEventListener('change', restoreFile);
  if(window.TOOL_AI) TOOL_AI.bind(function(){ openSettings(); var d = document.querySelector('.set-sec[data-sec="ai"]'); if(d) d.open = true; });
}
function saveFold(){ var o = []; document.querySelectorAll('.set-sec').forEach(function(d){ if(d.open) o.push(d.dataset.sec); }); lsSet('fold', JSON.stringify(o)); }
function applyView(){ document.documentElement.dataset.fsize = lsGet('fsize') === 'xl' ? 'xl' : 'm'; }

/* ---------- 檔案、複製 ---------- */
function download(name, text, type){ var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:type})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function copyText(text, msg){
  function fb(){ var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); toast(msg); }catch(e){ toast('複製失敗，請手動選取'); } ta.remove(); }
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ toast(msg); }, fb); else fb();
}
function restoreFile(ev){
  var f = ev.target.files[0]; if(!f) return;
  var rd = new FileReader();
  rd.onload = function(){
    try{ var j = JSON.parse(rd.result); if(j.app !== 'brand-name-checker' || !j.state || !Array.isArray(j.state.names)) throw 0; S = Object.assign(defaults(), j.state); save(); closeModal(); render(); toast('已還原備份'); }
    catch(e){ toast('這不是品牌命名與商標初篩的備份檔'); }
  };
  rd.readAsText(f); ev.target.value = '';
}
// AI 回覆：JSON 或一行一個名字都可以
function parseNames(text){
  var j = null;
  try{ j = TOOL_AI ? TOOL_AI.parseJson(text) : JSON.parse(text); }catch(e){ j = null; }
  if(j) return D.cleanAiNames(j);
  return D.cleanAiNames(String(text || '').split(/\n+/).map(function(l){ return l.replace(/^[\s\d.、)）\-*•]+/, '').split(/[：:—–\-（(]/)[0].trim(); }).filter(Boolean));
}
function setAiMsg(m){ var e = $('aiMsg'); if(e) e.textContent = m || ''; }

/* ---------- 事件 ---------- */
var ACT = {
  settings:openSettings, close:closeModal, warn:showWarn,
  print:function(){ window.print(); },
  foldall:function(){ var d = document.querySelectorAll('.set-sec'), any = Array.prototype.some.call(d, function(x){ return !x.open; }); d.forEach(function(x){ x.open = any; }); saveFold(); },
  gen:function(){
    var had = S.names.some(function(x){ return x.src === 'gen'; });
    if(had) S.round = (S.round || 0) + 1;
    var n = addNames(D.generate({style:S.style, industry:S.industry, keyword:S.keyword, avoid:S.avoid, lang:S.lang, round:S.round}), 'gen');
    goTab('names'); refresh(); toast(n ? '加了 ' + n + ' 個候選名，已經做好初篩' : '沒有新的名字（重複了），再按一次換一批');
  },
  mine:function(){ openModal('<h2>✍️ 加入我想的名字</h2><p class="small">一行一個，最多 80 個候選名。</p><textarea id="mineText" rows="8" style="width:100%" placeholder="禾日咖啡&#10;暖窩&#10;Lumi Labs"></textarea><div class="vstack"><button class="btn" data-act="mineYes">加入並初篩</button><button class="btn alt" data-act="close">取消</button></div>'); },
  mineYes:function(){ var n = addNames($('mineText').value.split(/\n+/), 'me'); closeModal(); goTab('names'); refresh(); toast(n ? '加入 ' + n + ' 個名字' : '沒有新的名字（空白或重複）'); },
  aiGenCopy:function(){ copyText(D.aiNamePrompt(S), '已複製提示詞，貼到任何 AI 後，再按「📥 貼上 AI 回覆」'); },
  aiPaste:function(){ openModal('<h2>📥 貼上 AI 回覆</h2><p class="small">整段貼上就好（JSON 或一行一個名字都可以），貼上的名字一樣會經過初篩。</p><textarea id="pasteText" rows="9" style="width:100%"></textarea><div class="vstack"><button class="btn" data-act="pasteYes">加入並初篩</button><button class="btn alt" data-act="close">取消</button></div>'); },
  pasteYes:function(){ var list = parseNames($('pasteText').value); var n = addNames(list, 'ai'); closeModal(); goTab('names'); refresh(); toast(n ? '加入 ' + n + ' 個 AI 想的名字' : '沒有讀到新的名字'); },
  aiGen:function(){
    if(!window.TOOL_AI || !TOOL_AI.ready()){ setAiMsg('還沒有設定 AI 金鑰：到 ⚙ 常用設定 →「🤖 AI 設定」填入，或按「📋 複製提示詞」貼到任何 AI。'); return; }
    setAiMsg('AI 想名字中…');
    TOOL_AI.callLLM(D.aiNamePrompt(S), null, true, setAiMsg).then(function(t){
      var n = addNames(parseNames(t), 'ai'); refresh(); setAiMsg(n ? 'AI 想了 ' + n + ' 個名字，已經做好初篩（AI 也可能想到撞名的，要看燈號）' : 'AI 沒有給新的名字');
    }, function(e){ setAiMsg('❌ ' + e.message); });
  },
  copyReport:function(){ var r = rows(), fav = r.filter(function(x){ return x.meta.fav; }); copyText(D.reportText(S, fav.length ? fav : r), '已複製初篩報告'); },
  clearNames:function(){ openModal('<h2>清空候選名？</h2><p>所有候選名、收藏與查證結果都會刪掉；品牌設定會保留。</p><div class="vstack"><button class="btn red" data-act="clearYes">清空</button><button class="btn alt" data-act="close">取消</button></div>'); },
  clearYes:function(){ S.names = []; S.checks = {}; S.round = 0; save(); closeModal(); render(); toast('已清空候選名'); },
  backup:function(){ download('品牌命名備份-' + today() + '.json', JSON.stringify({app:'brand-name-checker', v:1, saved:new Date().toISOString(), state:S}, null, 1), 'application/json'); },
  restore:function(){ $('restoreFile').click(); },
  wipe:function(){ openModal('<h2>清除全部資料？</h2><p>設定、候選名與查證結果都會刪掉，無法復原。建議先下載備份檔。</p><div class="vstack"><button class="btn red" data-act="wipeYes">確定清除</button><button class="btn alt" data-act="close">取消</button></div>'); },
  wipeYes:function(){ lsDel('state'); S = defaults(); closeModal(); render(); toast('已清除'); },
  install:function(){
    var m = ios ? '請按 Safari 下方的「分享」圖示，選「加入主畫面」。' : '請按瀏覽器網址列右側的安裝圖示，或右上角選單的「安裝應用程式／加到主畫面」。';
    if(window._dp){ window._dp.prompt(); window._dp.userChoice.then(function(){ window._dp = null; }); }
    else openModal('<h2>📲 加入主畫面</h2><p>' + m + '</p><div class="vstack"><button class="btn" data-act="close">知道了</button></div>');
  }
};
function goTab(t){ V.tab = t; lsSet('tab', t); document.querySelectorAll('.tabs button').forEach(function(b){ b.setAttribute('aria-selected', b.dataset.tab === t); }); document.querySelectorAll('.panel').forEach(function(s){ s.hidden = s.dataset.p !== t; }); }
function findName(n){ return S.names.find(function(x){ return D.norm(x.name) === n; }); }
document.addEventListener('click', function(ev){
  var el = ev.target.closest('[data-act],[data-tab],[data-fontsize],[data-set],[data-filter],[data-fav],[data-del],[data-goverify],[data-story],[data-storycopy],[data-open]');
  if(!el){ if(ev.target.id === 'modal') closeModal(); return; }
  var ds = el.dataset;
  if(ds.act){ if(el.tagName === 'A') ev.preventDefault(); if(ACT[ds.act]) ACT[ds.act](); return; }
  if(ds.tab){ goTab(ds.tab); return; }
  if(ds.fontsize){ lsSet('fsize', ds.fontsize); applyView(); openSettings(); return; }
  if(ds.set){ S[ds.set] = ds.val; save(); if(ds.set === 'industry' || ds.set === 'style' || ds.set === 'lang'){ el.parentNode.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', b === el); }); } refresh(); return; }
  if(ds.filter){ V.filter = ds.filter; refresh(); return; }
  if(ds.fav){ var x = findName(ds.fav); if(x){ x.fav = !x.fav; save(); refresh(); toast(x.fav ? '已收藏，到「③ 查證清單」查證' : '已取消收藏'); } return; }
  if(ds.del){ var i = S.names.findIndex(function(y){ return D.norm(y.name) === ds.del; }); if(i >= 0){ var nm = S.names[i].name; S.names.splice(i, 1); delete S.checks[ds.del]; save(); refresh(); toast('已刪除「' + nm + '」'); } return; }
  if(ds.goverify){ var y = findName(ds.goverify); if(y){ y.fav = true; save(); refresh(); goTab('verify'); var c = document.querySelector('.vcard[data-n="' + CSS.escape(ds.goverify) + '"]'); if(c) c.scrollIntoView({behavior:'smooth', block:'start'}); } return; }
  // 智慧局、商工登記沒辦法把名字帶進網址：點連結時順便複製名字，到那邊直接貼上
  if(ds.open){ copyText(ds.open, '已複製「' + ds.open + '」，到查詢頁面貼上'); return; }
  if(ds.storycopy){ var s1 = D.screen(findName(ds.storycopy).name, S.industry); copyText(D.aiStoryPrompt(S, s1), '已複製提示詞，可以貼到任何 AI'); return; }
  if(ds.story){
    var out = $('story-' + ds.story), s2 = D.screen(findName(ds.story).name, S.industry);
    if(!window.TOOL_AI || !TOOL_AI.ready()){ out.textContent = '還沒有設定 AI 金鑰：到 ⚙ 常用設定 →「🤖 AI 設定」填入，或按「📋 複製提示詞」貼到任何 AI。'; return; }
    out.textContent = 'AI 寫作中…';
    TOOL_AI.callLLM(D.aiStoryPrompt(S, s2), null, false, function(m){ out.textContent = m; }).then(function(t){ out.textContent = t; }, function(e){ out.textContent = '❌ ' + e.message; });
  }
});
document.addEventListener('input', function(ev){
  var t = ev.target, ds = t.dataset;
  if(ds.g){ S[ds.g] = t.value.slice(0, 30); save(); return; }
  if(ds.handle){ checksOf(ds.handle).handle = t.value.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30); save(); }
});
document.addEventListener('change', function(ev){
  var t = ev.target, ds = t.dataset;
  if(ds.handle){ t.value = checksOf(ds.handle).handle || ''; refresh(); return; }   // 帳號改完才重畫連結（打字中不重畫，焦點才不會跑掉）
  if(ds.check){ checksOf(ds.check)[ds.k] = t.value; save(); var card = t.closest('.vcard'), n = ds.check; refresh(); var c = document.querySelector('.vcard[data-n="' + CSS.escape(n) + '"] select[data-k="' + ds.k + '"]'); if(c) c.focus(); }
});
document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && $('modal').classList.contains('show')) closeModal(); });

/* ---------- 跑馬燈（工作區共用公告，不可關） ---------- */
function initMarquee(){
  var URL_ = "https://script.google.com/macros/s/AKfycbwKX0DNNbY8y4nf90BFTHtxgfqJcHHcZasRrgycl4QAe52_hkjMWSkYk4xOsqU-JPCROw/exec";
  var REFRESH = 20 * 60 * 1000, bar = $('marqueeBar'), track = $('marqueeTrack'), lastKey = null;
  function appendText(c, text){ var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, li = 0, m; while((m = re.exec(text))){ if(m.index > li) c.appendChild(document.createTextNode(text.slice(li, m.index))); var a = document.createElement('a'); a.href = m[2]; a.textContent = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.color = 'inherit'; a.style.textDecoration = 'underline'; c.appendChild(a); li = re.lastIndex; } if(li < text.length) c.appendChild(document.createTextNode(text.slice(li))); }
  function renderM(items){
    if(!items || !items.length) return;
    var k = JSON.stringify(items); if(k === lastKey) return; lastKey = k; track.innerHTML = '';
    var fr = document.createDocumentFragment();
    function pass(){ items.forEach(function(it, i){ if(i > 0) fr.appendChild(document.createTextNode('　★　')); appendText(fr, String(it)); }); }
    pass(); fr.appendChild(document.createTextNode('　★　')); pass(); track.appendChild(fr);
    bar.classList.add('show'); document.body.classList.add('has-marquee');
    track.style.animationDuration = Math.max(track.scrollWidth / 2 / 60, 12) + 's';
  }
  function fetchM(){ fetch(URL_, {method:'POST', body:JSON.stringify({serial:''})}).then(function(r){ return r.json(); }).then(function(d){ if(d && Array.isArray(d.marquee) && d.marquee.length){ lsSet('marquee', JSON.stringify(d.marquee)); renderM(d.marquee); } }).catch(function(){}); }
  renderM(lsJson('marquee', [])); fetchM(); setInterval(fetchM, REFRESH);
}

/* ---------- 啟動 ---------- */
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); window._dp = e; });
if('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(function(){});
(function(){ if(!window.TOOL_WATERMARK) return; var w = document.createElement('div'); w.id = 'pdfWatermark'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = '<img alt="" src="' + window.TOOL_WATERMARK + '">'; document.body.appendChild(w); })();
applyView(); render(); initMarquee();
if(!lsGet('warnSeen')){ lsSet('warnSeen', '1'); showWarn(); }
// 測試掛鉤
window._tool = {render:render, rows:rows, get S(){ return S; }, get V(){ return V; }};
})();
