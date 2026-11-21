/* 品牌命名與商標初篩：規則引擎（瀏覽器 window.BNC，node 可 require）
   純函式、不碰 DOM。改了這支檔案跑 node tools/test_engine.mjs
   初篩規則依商標法第 29 條（識別性）、第 30 條（不得註冊事由）整理（2026-11，條文以全國法規資料庫為準）；
   知名品牌只是內建的一小份常見清單，用來提醒，不代表官方的著名商標認定。 */
(function(root){
'use strict';

var LAW_URL = 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=J0070001';
var LINKS = {
  tipo:{label:'智慧局商標檢索系統', url:'https://twtmsearch.tipo.gov.tw/', how:'貼上名稱，用「商標名稱」檢索，類別選下面建議的類別，看有沒有相同或近似的已註冊商標'},
  findbiz:{label:'商工登記公示資料查詢', url:'https://findbiz.nat.gov.tw/', how:'查公司與商業（行號）名稱有沒有人登記'},
  google:{label:'Google 搜尋', url:'https://www.google.com/search?q=', how:'看有沒有同名的店或商品已經在用'}
};

/* ---------- 產業：通用名稱與建議的商標類別（尼斯分類） ---------- */
var INDUSTRIES = {
  cafe:{label:'咖啡店／茶飲', generic:['咖啡', '咖啡館', '咖啡店', '珈琲', '茶飲', '茶', '手搖', '飲料', '飲品', '拿鐵', 'coffee', 'cafe', 'café', 'tea', 'drink'],
    classes:[[43, '餐廳、咖啡店、飲料店服務'], [30, '咖啡、茶、茶飲料、糕點'], [32, '果汁、汽水等飲料（有賣瓶裝飲料時）']], suffix:['咖啡', '珈琲', '茶室', 'Coffee']},
  bakery:{label:'烘焙甜點', generic:['麵包', '麵包店', '烘焙', '烘焙坊', '蛋糕', '甜點', '餅乾', '餅舖', 'bakery', 'cake', 'dessert', 'bread'],
    classes:[[30, '麵包、蛋糕、餅乾、甜點'], [43, '咖啡廳、內用服務（有座位時）'], [35, '網路商店、零售服務（有網購時）']], suffix:['烘焙', '餅舖', '甜點', 'Bakery']},
  restaurant:{label:'餐廳小吃', generic:['餐廳', '小吃', '食堂', '小館', '麵', '麵店', '飯', '便當', '火鍋', '燒肉', '早餐', 'restaurant', 'kitchen', 'diner', 'bistro'],
    classes:[[43, '餐廳、小吃店、外燴服務'], [29, '冷凍調理食品、肉品（有賣包裝食品時）'], [30, '醬料、麵條等加工食品（有賣包裝食品時）']], suffix:['食堂', '小館', '廚房', 'Kitchen']},
  apparel:{label:'服飾配件', generic:['服飾', '服裝', '衣', '衣櫥', '女裝', '男裝', '童裝', '包包', 'apparel', 'wear', 'clothing', 'closet'],
    classes:[[25, '服裝、鞋、帽'], [18, '皮包、背包'], [35, '服飾零售、網路商店']], suffix:['衣舍', '服飾', 'Studio']},
  beauty:{label:'美妝保養', generic:['保養', '保養品', '美妝', '化妝品', '面膜', '乳液', '精華', '香氛', 'cosmetics', 'skincare', 'skin', 'beauty'],
    classes:[[3, '化妝品、保養品、香水、清潔用品'], [35, '美妝零售、網路商店'], [44, '美容、護膚服務（有門市服務時）']], suffix:['肌研所', '保養', 'Skin']},
  salon:{label:'美髮美甲', generic:['美髮', '髮廊', '剪髮', '髮型', '美甲', '美睫', 'hair', 'nail', 'salon', 'lash'],
    classes:[[44, '美髮、美甲、美容服務'], [3, '洗髮精、指甲油等商品（有自有商品時）']], suffix:['髮藝', '沙龍', 'Salon']},
  edu:{label:'補教課程', generic:['補習班', '教育', '學苑', '學院', '課程', '學習', '教室', 'academy', 'school', 'education', 'class', 'learning'],
    classes:[[41, '教育、補習、課程、講座服務'], [9, '可下載的課程影片、電子書'], [16, '書籍、講義等印刷品']], suffix:['學苑', '教室', 'Academy']},
  ecom:{label:'網路商店／選物', generic:['商店', '選物', '選物店', '購物', '市集', '雜貨', '百貨', 'shop', 'store', 'mall', 'market', 'select'],
    classes:[[35, '網路商店、零售、批發服務'], [0, '另外加上你實際賣的商品類別（例如服飾 25、保養品 3）']], suffix:['選物', '雜貨', 'Shop']},
  pet:{label:'寵物', generic:['寵物', '毛孩', '貓', '狗', '犬', '喵', '汪', 'pet', 'dog', 'cat', 'paw'],
    classes:[[31, '寵物食品'], [44, '寵物美容、寵物醫療服務'], [35, '寵物用品零售']], suffix:['毛孩', '寵物', 'Pet']},
  tech:{label:'科技／軟體', generic:['科技', '軟體', '數位', '雲端', '資訊', '網路', 'app', 'tech', 'soft', 'software', 'digital', 'cloud', 'data'],
    classes:[[9, '軟體、App、電子產品'], [42, '軟體設計、雲端服務、資訊技術服務'], [35, '數位行銷、廣告服務（有提供時）']], suffix:['科技', '數位', 'Labs']},
  agri:{label:'農產食品', generic:['農場', '果園', '農產', '食品', '蔬果', '米', '茶園', '蜂蜜', 'farm', 'food', 'orchard', 'honey'],
    classes:[[31, '新鮮蔬果、生鮮農產品'], [29, '果乾、果醬、加工蔬果'], [30, '米、蜂蜜、茶葉'], [35, '農產品零售、網路商店']], suffix:['農場', '果園', 'Farm']},
  other:{label:'其他', generic:[], classes:[[35, '零售、網路商店服務（有賣東西時）'], [0, '依實際商品或服務查尼斯分類']], suffix:['工作室', '所', 'Studio']}
};

/* ---------- 規則字詞 ---------- */
// 第 29 條第 1 項第 1 款：僅由品質、用途、原料、產地等說明構成 → 不能單獨主張
var DESCRIPTIVE = ['好吃', '美味', '新鮮', '頂級', '優質', '第一', '第一名', '最好', '最棒', '極品', '精選', '專業', '健康', '天然', '特級', '高級', '便宜', '平價', '超值', '好喝', '香濃', '手作', '手工', '現做', '現烤', '正宗', '道地', '老牌', '百年', '養生', '有效', '安心',
  'best', 'premium', 'fresh', 'quality', 'top', 'super', 'delicious', 'healthy', 'natural', 'original', 'handmade', 'deluxe', 'tasty', 'cheap'];
// 第 30 條第 1 項第 8 款：使公眾誤認誤信商品性質、品質（食品、保養品最常踩）
var MISLEADING = [['醫療', 'red'], ['醫學', 'red'], ['藥局', 'red'], ['療效', 'red'], ['治療', 'red'], ['抗癌', 'red'], ['減肥', 'red'], ['瘦身', 'yellow'], ['消脂', 'red'], ['有機', 'yellow'], ['無毒', 'yellow'], ['零添加', 'yellow'], ['認證', 'yellow'], ['官方', 'yellow'], ['衛福部', 'red'], ['FDA', 'red'], ['organic', 'yellow']];
// 第 30 條第 1 項第 2～4 款：國旗國徽、國家名號、政府機關、國際組織
var NATIONAL = ['中華民國', '國旗', '國徽', '總統府', '國父', '行政院', '政府', '聯合國', '奧運', '奧林匹克', '紅十字', 'olympic', 'red cross', 'united nations'];
// 地名：當成產地說明不能單獨主張；和實際產地不符可能誤認誤信（第 29、30 條）
var PLACES = ['台灣', '臺灣', '台北', '臺北', '新北', '桃園', '台中', '臺中', '台南', '臺南', '高雄', '基隆', '新竹', '苗栗', '彰化', '南投', '雲林', '嘉義', '屏東', '宜蘭', '花蓮', '台東', '臺東', '澎湖', '金門', '馬祖',
  '日本', '東京', '京都', '大阪', '北海道', '沖繩', '法國', '巴黎', '義大利', '米蘭', '韓國', '首爾', '美國', '紐約', '英國', '倫敦', '泰國', '曼谷', '瑞士', '德國',
  'taiwan', 'taipei', 'tokyo', 'kyoto', 'paris', 'milan', 'seoul', 'new york', 'london', 'swiss'];
// 第 30 條第 1 項第 7 款：妨害公共秩序或善良風俗
var OFFENSIVE = ['幹你', '靠北', '靠腰', '屌', '賭場', '毒品', '色情', '援交', '去死', 'fuck', 'shit', 'bitch', 'porn'];
// 常見知名品牌（只用來比對提醒；不是官方的著名商標名錄）。[中文, 英文]
var FAMOUS = [['星巴克', 'Starbucks'], ['麥當勞', "McDonald's"], ['肯德基', 'KFC'], ['摩斯漢堡', 'MOS Burger'], ['85度C', ''], ['路易莎', 'Louisa'], ['50嵐', ''], ['清心福全', ''], ['迷客夏', 'Milksha'], ['春水堂', ''], ['鼎泰豐', 'Din Tai Fung'],
  ['王品', ''], ['瓦城', ''], ['統一', 'Uni-President'], ['全家', 'FamilyMart'], ['', '7-ELEVEN'], ['萊爾富', 'Hi-Life'], ['全聯', 'PX Mart'], ['家樂福', 'Carrefour'], ['好市多', 'Costco'], ['屈臣氏', 'Watsons'], ['康是美', 'Cosmed'], ['寶雅', 'POYA'],
  ['無印良品', 'MUJI'], ['優衣庫', 'UNIQLO'], ['', 'ZARA'], ['耐吉', 'Nike'], ['愛迪達', 'Adidas'], ['蘋果', 'Apple'], ['三星', 'Samsung'], ['華碩', 'ASUS'], ['宏碁', 'Acer'], ['台積電', 'TSMC'], ['中華電信', 'Chunghwa Telecom'],
  ['誠品', 'Eslite'], ['博客來', ''], ['蝦皮', 'Shopee'], ['', 'momo'], ['', 'PChome'], ['迪士尼', 'Disney'], ['三麗鷗', 'Sanrio'], ['凱蒂貓', 'Hello Kitty'], ['寶可夢', 'Pokemon'], ['可口可樂', 'Coca-Cola'], ['百事', 'Pepsi'],
  ['義美', ''], ['乖乖', ''], ['黑松', ''], ['維力', ''], ['味全', ''], ['光泉', ''], ['林鳳營', ''], ['桂格', 'Quaker'], ['雀巢', 'Nestle'], ['香奈兒', 'Chanel'], ['路易威登', 'Louis Vuitton'], ['愛馬仕', 'Hermes'], ['古馳', 'Gucci'],
  ['谷歌', 'Google'], ['臉書', 'Facebook'], ['', 'Instagram'], ['', 'YouTube'], ['', 'Netflix'], ['豐田', 'Toyota'], ['本田', 'Honda'], ['', 'Gogoro'], ['捷安特', 'Giant'], ['美利達', 'Merida'], ['大同', 'Tatung'], ['新光三越', ''], ['遠東', ''], ['麥味登', ''], ['拉亞漢堡', '']];
// 英文常見字：單獨當品牌識別性較弱（字典字），只給提醒
var COMMON_EN = ['the', 'good', 'happy', 'love', 'home', 'life', 'daily', 'day', 'sun', 'star', 'king', 'queen', 'gold', 'golden', 'green', 'blue', 'red', 'black', 'white', 'smile', 'dream', 'magic', 'time', 'world', 'city', 'house', 'one', 'my', 'your', 'our', 'little', 'big', 'sweet', 'nice', 'new'];

/* ---------- 品牌個性字庫（產生候選名用） ---------- */
var STYLES = {
  warm:{label:'溫暖親切', zh:['日', '暖', '禾', '小', '家', '好', '光', '木', '栗', '橘', '麥', '窩', '厝', '陽', '初', '安'], en:['Sunny', 'Hearth', 'Mellow', 'Cozy', 'Honey', 'Toasty']},
  pro:{label:'專業可靠', zh:['信', '誠', '正', '恆', '匠', '研', '衡', '卓', '睿', '承', '謙', '實', '達', '鼎', '穩', '銘'], en:['Atlas', 'Keystone', 'Anchor', 'Meridian', 'Summit', 'Ledger']},
  fun:{label:'活潑有趣', zh:['跳', '泡', '咕', '嘟', '啾', '蹦', '喵', '叮', '咚', '樂', '皮', '豆', '球', '糖', '啵', '嘻'], en:['Bubbly', 'Pop', 'Wiggle', 'Doodle', 'Jolly', 'Zippy']},
  lux:{label:'高級質感', zh:['璽', '蘊', '雅', '臻', '曜', '岫', '瀾', '韻', '璞', '玥', '珀', '霽', '琢', '檀', '蒔', '澄'], en:['Aurum', 'Velour', 'Maison', 'Lumiere', 'Opaline', 'Solene']},
  nature:{label:'自然療癒', zh:['森', '葉', '禾', '穀', '泉', '花', '芽', '田', '野', '嶺', '溪', '苗', '青', '蔬', '果', '露'], en:['Grove', 'Meadow', 'Fern', 'Willow', 'Sprout', 'Brook']},
  tech:{label:'科技創新', zh:['智', '光', '量', '極', '速', '雲', '創', '序', '映', '訊', '元', '矩', '點', '鏈', '碼', '航'], en:['Nova', 'Pixel', 'Quanta', 'Vector', 'Lumi', 'Orbit']}
};
var ZH_SUFFIX = ['所', '屋', '舖', '坊', '日常', '研究室', '小舍', '與'];
var EN_PRE = ['Lu', 'No', 'Ve', 'Ka', 'Mi', 'Zo', 'Ri', 'Ta', 'Ya', 'Ko', 'Sa', 'Ele'];
var EN_SUF = ['ra', 'va', 'lo', 'mi', 'na', 'ko', 'ri', 'zen', 'lia', 'tto', 'via', 'no'];

/* ---------- 工具函式 ---------- */
// 全形轉半形、臺→台、小寫、去空白與標點，用來比對
function norm(s){ return String(s || '').normalize('NFKC').replace(/臺/g, '台').toLowerCase().replace(/[\s\-_.·・'’"!！?？,，、。:：;；()（）\[\]【】「」『』~～&＆+＋@#*]/g, ''); }
function hasCJK(s){ return /[㐀-鿿豈-﫿]/.test(s); }
function hasLatin(s){ return /[a-z]/i.test(s); }
function zhLen(s){ return (String(s).match(/[㐀-鿿豈-﫿]/g) || []).length; }
function lev(a, b){
  var m = a.length, n = b.length, d = [], i, j;
  for(i = 0; i <= m; i++){ d[i] = [i]; }
  for(j = 0; j <= n; j++) d[0][j] = j;
  for(i = 1; i <= m; i++) for(j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function lcs(a, b){   // 最長共同子序列長度（中文字依序相同）
  var m = a.length, n = b.length, d = [], i, j;
  for(i = 0; i <= m; i++){ d[i] = new Array(n + 1).fill(0); }
  for(i = 1; i <= m; i++) for(j = 1; j <= n; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[m][n];
}
// 英文短字只比對完整單字（LINE 不能抓到 Online）
function wordIn(hay, w){ return new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'i').test(hay); }

/* ---------- 初篩一個名字 ---------- */
function screen(name, industry){
  var raw = String(name || '').trim().slice(0, 40), n = norm(raw), ind = INDUSTRIES[industry] || INDUSTRIES.other, issues = [];
  var lower = raw.normalize('NFKC').toLowerCase().replace(/臺/g, '台');
  function add(lv, key, msg, law){ issues.push({lv:lv, key:key, msg:msg, law:law || ''}); }
  if(!n) return {name:raw, n:n, light:'red', score:0, issues:[{lv:'red', key:'empty', msg:'名稱是空的', law:''}], kind:'', zh:0, en:0};
  var zh = zhLen(raw), en = (raw.match(/[a-z]/gi) || []).length, kind = zh && en ? 'mix' : zh ? 'zh' : 'en';
  var score = 90;

  // 1. 拆出說明性、通用、地名的部分，看剩下的「自己的部分」還有沒有
  var rest = n, desc = [], gen = [], geo = [];
  function take(list, bucket){
    list.slice().sort(function(a, b){ return b.length - a.length; }).forEach(function(w){
      var k = norm(w); if(!k) return;
      var hit = hasLatin(k) && !hasCJK(k) ? wordIn(lower, w.toLowerCase()) : rest.indexOf(k) >= 0;
      if(hit && bucket.indexOf(w) < 0){ bucket.push(w); rest = rest.split(k).join(''); }
    });
  }
  take(ind.generic, gen); take(DESCRIPTIVE, desc); take(PLACES, geo);
  // 誤認字詞（有機、瘦身…）也是在說明商品性質，算識別性時一起拿掉（燈號在下面另外判斷）
  var mis = []; take(MISLEADING.map(function(m){ return m[0]; }), mis);
  rest = rest.replace(/[0-9]/g, '');
  var restEn = rest.replace(/[^a-z]/g, ''), restOk = zhLen(rest) >= 1 || restEn.length >= 3;
  if(!restOk && (gen.length || desc.length || geo.length || mis.length)){
    add('red', 'noDistinct', '整個名字都是商品說明、通用名稱或地名（' + gen.concat(desc, geo, mis).join('、') + '），缺乏識別性，很難註冊', '商標法第 29 條第 1 項');
    score = 20;
  } else {
    if(gen.length){ add('yellow', 'generic', '「' + gen.join('、') + '」是這個產業的通用名稱，不能單獨主張專用，識別性要靠其他部分', '商標法第 29 條第 1 項第 2 款、第 3 項'); score -= 15; }
    if(desc.length){ add('yellow', 'descriptive', '「' + desc.join('、') + '」是品質或特性的說明，不能單獨主張專用', '商標法第 29 條第 1 項第 1 款'); score -= 10 + 5 * Math.min(desc.length - 1, 2); }
    if(geo.length){ add('yellow', 'place', '含地名「' + geo.join('、') + '」：地名不能單獨主張；若和商品實際產地不符，可能被認為使人誤認產地', '商標法第 29 條、第 30 條第 1 項第 8 款'); score -= 10; }
  }
  // 2. 誤認誤信、國家名號、公序良俗
  MISLEADING.forEach(function(m){ var k = norm(m[0]); if(hasLatin(k) && !hasCJK(k) ? wordIn(lower, m[0].toLowerCase()) : n.indexOf(k) >= 0){ add(m[1], 'misleading', '含「' + m[0] + '」：容易讓人誤認商品的性質、品質或效果' + (m[0] === '有機' || m[0] === 'organic' ? '（農產品要有有機驗證才能標示有機）' : ''), '商標法第 30 條第 1 項第 8 款'); score -= m[1] === 'red' ? 40 : 15; } });
  NATIONAL.forEach(function(w){ var k = norm(w); if(hasLatin(k) && !hasCJK(k) ? wordIn(lower, w) : n.indexOf(k) >= 0){ add('red', 'national', '含「' + w + '」：國家名號、政府機關或國際組織的名稱不得註冊', '商標法第 30 條第 1 項第 2～4 款'); score -= 50; } });
  OFFENSIVE.forEach(function(w){ var k = norm(w); if(hasLatin(k) && !hasCJK(k) ? wordIn(lower, w) : n.indexOf(k) >= 0){ add('red', 'offensive', '含「' + w + '」：可能被認為妨害公共秩序或善良風俗', '商標法第 30 條第 1 項第 7 款'); score -= 50; } });
  // 3. 和常見知名品牌比對
  var famous = [];
  FAMOUS.forEach(function(f){
    var zhm = norm(f[0]), enm = norm(f[1]), hit = null;
    if(zhm && zhm.length >= 2){
      if(n.indexOf(zhm) >= 0) hit = ['red', '包含知名品牌「' + f[0] + '」'];
      // 三個字的品牌有兩個字依序相同（星巴客、麥當當）就提醒
      else if(zhm.length >= 3 && zh >= 2 && lcs(n.replace(/[^㐀-鿿]/g, ''), zhm) >= Math.max(2, Math.round(zhm.length * .67))) hit = ['yellow', '和知名品牌「' + f[0] + '」用字很像'];
    }
    if(!hit && enm && enm.length >= 3){
      // 4 個字母以下只比對完整單字（Online 不算 LINE）；5 個以上，單字以品牌開頭也算（Applestore 算 Apple，Pineapple 不算）
      var toks = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      var inName = enm.length <= 4 ? toks.indexOf(enm) >= 0 || norm(lower) === enm : toks.some(function(t){ return t.indexOf(enm) === 0; }) || n.indexOf(enm) === 0;
      if(inName) hit = ['red', '包含知名品牌「' + f[1] + '」'];
      else {
        // 拼法相似只比 5 個字母以上的品牌（4 個字母差一個字太常見：Kara、Tara 不算像 ZARA）
        // 整個名字或其中任一個英文單字（Starbuck Tea 的 Starbuck）拼法接近都算
        var lim = enm.length >= 7 ? 2 : 1, cands = [n.replace(/[^a-z0-9]/g, '')].concat(toks);
        if(enm.length >= 5 && cands.some(function(ne){ return ne.length >= 4 && Math.abs(ne.length - enm.length) <= lim && lev(ne, enm) <= lim; })) hit = ['yellow', '和知名品牌「' + f[1] + '」拼法很像'];
      }
    }
    if(hit){ famous.push(f[0] || f[1]); add(hit[0], 'famous', hit[1] + '，可能被認為使人混淆誤認或減損著名商標', '商標法第 30 條第 1 項第 11 款'); score -= hit[0] === 'red' ? 60 : 25; }
  });
  // 4. 好不好記
  if(kind === 'zh' || kind === 'mix'){
    if(zh === 1 && en === 0){ add('yellow', 'short', '只有一個字，難以和別人區分，也不好查'); score -= 10; }
    else if(zh > 8){ add('yellow', 'long', '中文 ' + zh + ' 個字，偏長不好記，招牌和社群頭貼也放不下'); score -= 10; }
    else if(zh > 5){ add('yellow', 'long', '中文 ' + zh + ' 個字，稍長；2～4 個字最好記'); score -= 5; }
  }
  if(kind === 'en' || kind === 'mix'){
    var words = lower.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
    if(kind === 'en' && en > 14){ add('yellow', 'long', '英文 ' + en + ' 個字母，偏長，網址與帳號不好打'); score -= 8; }
    if(kind === 'en' && words.length && words.every(function(w){ return COMMON_EN.indexOf(w) >= 0; })){ add('yellow', 'commonEn', '全部是常見英文單字，同名的品牌通常很多，識別性較弱'); score -= 15; }
  }
  if(/(.)\1\1/.test(n)) { add('yellow', 'repeat', '同一個字連續三次以上，不好念也不好記'); score -= 5; }
  score = Math.max(0, Math.min(100, Math.round(score)));
  var light = issues.some(function(i){ return i.lv === 'red'; }) ? 'red' : issues.some(function(i){ return i.lv === 'yellow'; }) ? 'yellow' : 'green';
  var order = {red:0, yellow:1};
  issues.sort(function(a, b){ return order[a.lv] - order[b.lv]; });
  return {name:raw, n:n, kind:kind, zh:zh, en:en, light:light, score:score, issues:issues, generic:gen, descriptive:desc, places:geo, famous:famous};
}
function screenAll(names, industry){
  var seen = {}, out = [];
  (names || []).forEach(function(x){ var s = screen(x, industry); if(!s.n || seen[s.n]) return; seen[s.n] = 1; out.push(s); });
  var lv = {green:0, yellow:1, red:2};
  return out.sort(function(a, b){ return lv[a.light] - lv[b.light] || b.score - a.score; });
}

/* ---------- 產生候選名（規則式、決定性） ---------- */
function hash(s){ var h = 2166136261; for(var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ var x = seed || 1; return function(){ x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function generate(o){
  o = o || {};
  var st = STYLES[o.style] || STYLES.warm, ind = INDUSTRIES[o.industry] || INDUSTRIES.other;
  var avoid = String(o.avoid || '').split(/[\s,，、]+/).filter(Boolean);
  var key = String(o.keyword || '').replace(/[^㐀-鿿]/g, '').slice(0, 4).split('');
  var lang = o.lang || 'both', want = o.count || 12;
  var R = rng(hash([o.style, o.industry, o.keyword, o.avoid, o.lang, o.round || 0].join('|')));
  function pick(a){ return a[Math.floor(R() * a.length)]; }
  var pool = key.concat(st.zh), out = [], tries = 0;
  // 產生器自己不提初篩紅燈的名字（撞知名品牌、整個是通用名稱，例如農產業的 Honey）
  function ok(nm){
    if(!nm || out.indexOf(nm) >= 0 || avoid.some(function(a){ return nm.toLowerCase().indexOf(a.toLowerCase()) >= 0; })) return false;
    var s = screen(nm, o.industry);
    return s.light !== 'red' && !s.issues.some(function(i){ return i.key === 'famous'; });
  }
  var nZh = lang === 'en' ? 0 : lang === 'zh' ? want : Math.ceil(want * 2 / 3), nEn = want - nZh;
  while(out.length < nZh && tries++ < 400){
    var a = key.length && R() < .4 ? pick(key) : pick(pool), b = pick(st.zh), nm;
    if(a === b) continue;
    var p = R();
    if(p < .3) nm = a + b;
    else if(p < .5) nm = a + b + pick(ZH_SUFFIX.slice(0, 7));
    else if(p < .62) nm = '小' + a + b;
    else if(p < .72) nm = a + a + b;
    else if(p < .82) nm = a + '與' + b;
    else nm = a + b + pick(ind.suffix.filter(function(x){ return /[㐀-鿿]/.test(x); }).concat(ZH_SUFFIX[0]));
    if(ok(nm)) out.push(nm);
  }
  while(out.length < nZh + nEn && tries++ < 800){
    var q = R(), e;
    if(q < .35) e = pick(st.en);
    else if(q < .75) e = pick(EN_PRE) + pick(EN_SUF);
    else e = pick(st.en) + ' ' + pick(ind.suffix.filter(function(x){ return /^[A-Z]/.test(x); }).concat('Studio'));
    if(ok(e)) out.push(e);
  }
  return out;
}

/* ---------- 查證連結 ---------- */
function handleOf(name){ var h = String(name || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ''); return h.length >= 3 ? h.slice(0, 30) : ''; }
function checkLinks(name, handle){
  var h = handle || handleOf(name), q = encodeURIComponent('"' + name + '"');
  var out = [{key:'tipo', label:LINKS.tipo.label, url:LINKS.tipo.url, how:LINKS.tipo.how, copy:true},
    {key:'findbiz', label:LINKS.findbiz.label, url:LINKS.findbiz.url, how:LINKS.findbiz.how, copy:true},
    {key:'google', label:LINKS.google.label, url:LINKS.google.url + q, how:LINKS.google.how}];
  if(h){
    out.push({key:'ig', label:'Instagram @' + h, url:'https://www.instagram.com/' + h + '/', how:'打開後如果是別人的帳號，代表這個帳號名稱已被用'});
    out.push({key:'fb', label:'Facebook /' + h, url:'https://www.facebook.com/' + h, how:'同上，看粉專網址有沒有被用'});
    out.push({key:'domain', label:'網域 ' + h + '.com.tw／' + h + '.com', url:'https://www.whois.com/whois/' + h + '.com', how:'查 .com 有沒有人註冊；.com.tw／.tw 請到台灣的網域註冊商查詢'});
  }
  return out;
}
var STATUS = {todo:'還沒查', clear:'沒找到相同的', similar:'有近似的', taken:'已被使用'};
// 查證後的總結：任一項「已被使用」→ 不建議；有「近似」→ 要小心；全部查完沒問題 → 可以進一步找代理人或自己申請
function verdict(screenRes, checks){
  checks = checks || {};
  var vals = Object.keys(checks).map(function(k){ return checks[k]; }).filter(function(v){ return v && v !== 'todo'; });
  if(screenRes.light === 'red') return {lv:'red', text:'初篩有紅燈，建議換名字或修改'};
  if(checks.tipo === 'taken' || checks.findbiz === 'taken') return {lv:'red', text:'已經有人註冊或登記，建議換名字'};
  if(vals.indexOf('taken') >= 0) return {lv:'yellow', text:'社群帳號或網域被用了，可以換帳號寫法，或考慮換名字'};
  if(vals.indexOf('similar') >= 0) return {lv:'yellow', text:'有近似的名稱，建議請商標代理人評估'};
  if(checks.tipo === 'clear' && checks.findbiz === 'clear') return {lv:'green', text:'主要查證都沒找到相同的，可以準備申請（正式結果以智慧局審查為準）'};
  return {lv:'', text:'還沒查完：至少要查智慧局商標檢索與商工登記'};
}

/* ---------- AI 提示詞與回覆整理 ---------- */
var AI_RULES = '請用繁體中文（台灣用語）。不要判斷能不能註冊、不要保證任何法律結果；不要使用知名品牌的名稱或諧音；不要用「最、第一、頂級、有機、醫、療」等誇大或誤導字詞。';
function aiNamePrompt(o){
  var ind = INDUSTRIES[o.industry] || INDUSTRIES.other, st = STYLES[o.style] || STYLES.warm;
  return '我要幫一個「' + ind.label + '」的品牌取名字。品牌個性：' + st.label + '。' + (o.keyword ? '想傳達：' + o.keyword + '。' : '') + (o.audience ? '主要客群：' + o.audience + '。' : '') + (o.avoid ? '不要用這些字：' + o.avoid + '。' : '') +
    '\n請想 15 個名字，' + ({zh:'全部用中文', en:'全部用英文', both:'中文 10 個、英文 5 個'}[o.lang || 'both']) + '，中文 2～4 個字為主。名字本身要有自己的特色，不要只是「' + (ind.generic.slice(0, 3).join('、') || '商品名稱') + '」這種通用字。' + AI_RULES +
    '\n只輸出 JSON：{"names":[{"name":"名字","idea":"一句命名想法（20 字內）"}]}';
}
function cleanAiNames(j){
  var arr = j && Array.isArray(j.names) ? j.names : Array.isArray(j) ? j : [], out = [], seen = {};
  arr.forEach(function(x){
    var nm = typeof x === 'string' ? x : x && x.name, idea = x && typeof x === 'object' ? String(x.idea || '').slice(0, 40) : '';
    nm = String(nm || '').replace(/<[^>]*>/g, '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    var k = norm(nm); if(!k || seen[k]) return; seen[k] = 1; out.push({name:nm, idea:idea});
  });
  return out.slice(0, 20);
}
function aiStoryPrompt(o, s){
  var ind = INDUSTRIES[o.industry] || INDUSTRIES.other;
  return '我的「' + ind.label + '」品牌想叫「' + s.name + '」。' + (o.keyword ? '想傳達：' + o.keyword + '。' : '') + '\n請幫我寫：1. 80 字內的品牌故事（說明名字的由來）；2. 3 句 12 字內的標語；3. 2 個可以搭配的英文名或社群帳號寫法。' + AI_RULES + '\n不要改名字本身。';
}
function reportText(o, rows){
  var ind = INDUSTRIES[o.industry] || INDUSTRIES.other, L = {red:'🔴', yellow:'🟡', green:'🟢'};
  var t = ['【品牌命名初篩】' + ind.label + '（' + (STYLES[o.style] || STYLES.warm).label + '）', '建議申請類別：' + ind.classes.filter(function(c){ return c[0]; }).map(function(c){ return '第 ' + c[0] + ' 類 ' + c[1]; }).join('；'), ''];
  rows.forEach(function(r){ t.push(L[r.light] + ' ' + r.name + '（識別性自估 ' + r.score + '）'); r.issues.forEach(function(i){ t.push('　・' + i.msg + (i.law ? '（' + i.law + '）' : '')); }); });
  t.push('', '※ 初篩只依商標法條文整理的規則與內建品牌清單比對，不能保證可以註冊；正式申請前請到智慧局商標檢索系統查詢。');
  return t.join('\n');
}

var API = {LAW_URL:LAW_URL, LINKS:LINKS, INDUSTRIES:INDUSTRIES, STYLES:STYLES, DESCRIPTIVE:DESCRIPTIVE, FAMOUS:FAMOUS, PLACES:PLACES, STATUS:STATUS,
  norm:norm, lev:lev, lcs:lcs, screen:screen, screenAll:screenAll, generate:generate, handleOf:handleOf, checkLinks:checkLinks, verdict:verdict,
  aiNamePrompt:aiNamePrompt, cleanAiNames:cleanAiNames, aiStoryPrompt:aiStoryPrompt, reportText:reportText};
if(typeof module !== 'undefined' && module.exports) module.exports = API; else root.BNC = API;
})(this);
