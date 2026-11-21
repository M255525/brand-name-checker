// node tools/test_engine.mjs
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../data.js');
let n = 0, bad = 0;
function eq(name, got, want){ n++; const ok = JSON.stringify(got) === JSON.stringify(want); if(!ok){ bad++; console.log('✗', name, '\n  得到', got, '\n  應為', want); } }
function ok(name, cond, extra){ n++; if(!cond){ bad++; console.log('✗', name, extra === undefined ? '' : extra); } }
const S = (nm, ind) => B.screen(nm, ind || 'cafe');
const keys = r => r.issues.map(i => i.key);

// ---------- 正規化與比對工具 ----------
eq('全形、臺、大小寫、空白', B.norm('ＡＢＣ 臺北-咖啡'), 'abc台北咖啡');
eq('編輯距離', B.lev('starbuck', 'starbucks'), 1);
eq('共同子序列', B.lcs('星巴客', '星巴克'), 2);

// ---------- 識別性（第 29 條） ----------
let r = S('好喝咖啡');
ok('品質說明＋通用名稱＝缺乏識別性（紅）', r.light === 'red' && keys(r).includes('noDistinct'), r);
r = S('台北咖啡');
ok('地名＋通用名稱＝缺乏識別性（紅）', r.light === 'red' && keys(r).includes('noDistinct'));
r = S('頂級新鮮蛋糕', 'bakery');
ok('全部是說明字＝紅', r.light === 'red');
r = S('有機農場', 'agri');
ok('有機＋農場＝紅（誤認字也算說明）', r.light === 'red' && keys(r).includes('noDistinct') && keys(r).includes('misleading'));
r = S('暖日咖啡');
ok('有自己的部分＋通用名稱＝黃（通用部分不能單獨主張）', r.light === 'yellow' && keys(r).includes('generic') && !keys(r).includes('noDistinct'));
ok('通用名稱依產業判斷：咖啡在服飾業不算通用', !keys(S('暖日咖啡', 'apparel')).includes('generic'));
r = S('禾日');
ok('自創名字＝綠', r.light === 'green' && r.issues.length === 0 && r.score === 90, r);
ok('英文通用字整字比對：Online Shop 抓到 shop', keys(S('Online Shop', 'ecom')).includes('generic'));
ok('英文說明字：Premium Coffee 紅', S('Premium Coffee').light === 'red');
ok('含數字的名字照樣判斷', S('85咖啡').light === 'red');

// ---------- 不得註冊（第 30 條） ----------
ok('國家名號紅', S('中華民國咖啡').issues.some(i => i.key === 'national' && i.lv === 'red'));
ok('療效字紅', S('抗癌小舖', 'agri').issues.some(i => i.key === 'misleading' && i.lv === 'red'));
ok('有機黃＋說明驗證', S('禾日有機', 'agri').issues.some(i => i.key === 'misleading' && i.lv === 'yellow' && /驗證/.test(i.msg)));
ok('不雅字紅', S('靠北小館', 'restaurant').issues.some(i => i.key === 'offensive'));
ok('地名提醒產地', keys(S('京都禾日')).includes('place'));

// ---------- 知名品牌 ----------
ok('包含星巴克＝紅', S('星巴克小館', 'restaurant').issues.some(i => i.key === 'famous' && i.lv === 'red'));
ok('星巴客（兩字相同）＝黃', S('星巴客').issues.some(i => i.key === 'famous' && i.lv === 'yellow'));
ok('麥當當＝黃', S('麥當當', 'restaurant').issues.some(i => i.key === 'famous'));
ok('全家福＝紅（包含「全家」）', S('全家福小館', 'restaurant').issues.some(i => i.key === 'famous' && i.lv === 'red'));
ok('Starbuck Tea 單字拼法像＝黃', S('Starbuck Tea').issues.some(i => i.key === 'famous' && i.lv === 'yellow'));
ok('Starbuck 拼法像＝黃', S('Starbuck').issues.some(i => i.key === 'famous' && i.lv === 'yellow'));
ok('Applestore 以 Apple 開頭＝紅', S('Applestore', 'tech').issues.some(i => i.key === 'famous' && i.lv === 'red'));
ok('Pineapple 不算 Apple', !keys(S('Pineapple Bakery', 'bakery')).includes('famous'));
ok('Online 不算 momo／LINE 類短字', !keys(S('Online Shop', 'ecom')).includes('famous'));
ok('Kara 不算 ZARA（4 字母不比拼法）', !keys(S('Kara', 'apparel')).includes('famous'));
ok('ZARA 本身＝紅', S('zara', 'apparel').issues.some(i => i.key === 'famous' && i.lv === 'red'));
ok('85度C＝紅', S('85度C').issues.some(i => i.key === 'famous'));
ok('春日咖啡不誤判春水堂', !keys(S('春日咖啡')).includes('famous'));

// ---------- 好不好記 ----------
ok('一個字提醒', keys(S('禾')).includes('short'));
ok('六個字提醒稍長', keys(S('禾日暖光小屋舍', 'other')).includes('long'));
ok('常見英文字組合提醒', keys(S('Happy Day')).includes('commonEn'));
ok('三連字提醒', keys(S('嘟嘟嘟屋', 'other')).includes('repeat'));
ok('空白名字', S('   ').light === 'red');

// ---------- 排序與去重 ----------
let all = B.screenAll(['好喝咖啡', '禾日', '暖日咖啡', '禾日', '　禾日 '], 'cafe');
eq('去重（含全形空白）', all.map(x => x.name), ['禾日', '暖日咖啡', '好喝咖啡']);

// ---------- 產生器 ----------
const g1 = B.generate({style:'warm', industry:'cafe', keyword:'暖', lang:'both'});
eq('同樣條件產生同樣結果', B.generate({style:'warm', industry:'cafe', keyword:'暖', lang:'both'}), g1);
ok('換一批會不同', JSON.stringify(B.generate({style:'warm', industry:'cafe', keyword:'暖', lang:'both', round:1})) !== JSON.stringify(g1));
eq('預設 12 個', g1.length, 12);
ok('中英比例 8：4', g1.filter(x => /[a-z]/i.test(x)).length === 4);
ok('只要中文', B.generate({style:'nature', industry:'agri', lang:'zh'}).every(x => !/[a-z]/i.test(x)));
ok('只要英文', B.generate({style:'tech', industry:'tech', lang:'en'}).every(x => !/[㐀-鿿]/.test(x)));
ok('避開的字', B.generate({style:'warm', industry:'cafe', avoid:'日 小', lang:'zh', round:3}).every(x => !/[日小]/.test(x)));
let red = [], dup = 0, cnt = 0;
for(const s of Object.keys(B.STYLES)) for(const i of Object.keys(B.INDUSTRIES)) for(const l of ['zh', 'en', 'both']) for(let rd = 0; rd < 6; rd++){
  const g = B.generate({style:s, industry:i, lang:l, round:rd}); cnt++;
  if(new Set(g).size !== g.length) dup++;
  if(g.length !== 12) red.push('數量 ' + g.length);
  g.forEach(x => { const q = B.screen(x, i); if(q.light === 'red' || q.issues.some(y => y.key === 'famous')) red.push(x + '/' + i); });
}
ok('產生器 ' + cnt + ' 次：不產生紅燈或撞知名品牌、每次 12 個', red.length === 0, red.slice(0, 5));
ok('產生器不重複', dup === 0);

// ---------- 查證 ----------
eq('帳號建議', B.handleOf('Lumi Labs'), 'lumilabs');
eq('中文名沒有帳號建議', B.handleOf('禾日'), '');
let L = B.checkLinks('Lumi Labs');
ok('英文名有 IG、FB、網域', ['tipo', 'findbiz', 'google', 'ig', 'fb', 'domain'].every(k => L.some(x => x.key === k)));
ok('Google 搜尋帶引號', L.find(x => x.key === 'google').url.includes(encodeURIComponent('"Lumi Labs"')));
ok('中文名可以自己填帳號', B.checkLinks('禾日', 'heri').some(x => x.url === 'https://www.instagram.com/heri/'));
ok('中文名沒填帳號就不列社群', !B.checkLinks('禾日').some(x => x.key === 'ig'));
const g = S('禾日');
eq('沒查就提醒先查', B.verdict(g, {}).lv, '');
eq('智慧局有人註冊＝紅', B.verdict(g, {tipo:'taken'}).lv, 'red');
eq('IG 被用＝黃', B.verdict(g, {tipo:'clear', findbiz:'clear', ig:'taken'}).lv, 'yellow');
eq('有近似＝黃', B.verdict(g, {tipo:'similar'}).lv, 'yellow');
eq('兩項主要查證都沒找到＝綠', B.verdict(g, {tipo:'clear', findbiz:'clear'}).lv, 'green');
eq('初篩紅燈優先', B.verdict(S('好喝咖啡'), {tipo:'clear', findbiz:'clear'}).lv, 'red');

// ---------- AI ----------
const p = B.aiNamePrompt({industry:'cafe', style:'warm', keyword:'溫暖', avoid:'日', lang:'both'});
ok('AI 提示詞帶條件與規則', /咖啡店/.test(p) && /溫暖/.test(p) && /不要用這些字：日/.test(p) && /JSON/.test(p) && /知名品牌/.test(p));
eq('AI 回覆整理：去重、去危險字元、截長', B.cleanAiNames({names:[{name:'禾日', idea:'x'}, {name:'禾日'}, '<b>暖窩</b>', {name:'一二三四五六七八九十一二三四五六七八九十一二三', idea:''}, {name:''}]}).map(x => x.name),
  ['禾日', '暖窩', '一二三四五六七八九十一二三四五六七八九十']);
ok('AI 回覆格式錯也不會壞', B.cleanAiNames(null).length === 0 && B.cleanAiNames({names:'x'}).length === 0);
ok('故事提示詞不改名字', /不要改名字本身/.test(B.aiStoryPrompt({industry:'cafe'}, S('禾日'))));

// ---------- 報告 ----------
const t = B.reportText({industry:'cafe', style:'warm'}, all);
ok('報告含類別、燈號、法條、警語', /第 43 類/.test(t) && /🔴 好喝咖啡/.test(t) && /商標法第 29 條/.test(t) && /不能保證/.test(t));
ok('每個產業都有建議類別', Object.values(B.INDUSTRIES).every(x => x.classes.length >= 1 && x.suffix.length >= 2));

// ---------- 亂數：任何字串都不會出錯 ----------
const chars = '禾日暖星巴克咖啡有機台北好喝ABCxyz 0123-_.！？中華民國Apple全家';
for(let i = 0; i < 2000; i++){
  let s = ''; const L2 = 1 + Math.floor(Math.random() * 14);
  for(let j = 0; j < L2; j++) s += chars[Math.floor(Math.random() * chars.length)];
  const ind = Object.keys(B.INDUSTRIES)[i % 12];
  try{ const q = B.screen(s, ind); ok('亂數 #' + i, ['red', 'yellow', 'green'].includes(q.light) && q.score >= 0 && q.score <= 100, s); }
  catch(e){ ok('亂數 #' + i + ' 不丟錯', false, s + ' ' + e.message); }
}

console.log((bad ? '✗ ' : '✓ ') + (n - bad) + '/' + n + ' 通過');
process.exit(bad ? 1 : 0);
