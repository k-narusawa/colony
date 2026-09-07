// 留守にしていたぶんの計算を確かめる。`node offline-check.js` で走る。
// index.html のシミュレーション部分(俯瞰図とDOMより前)をそのまま切り出して回すので、
// 本体を直せばここも一緒に追随する。
// 読み込むのは同じリポジトリの index.html だけで外部入力は無いため、
// balance-check.js と同じく eval で足りる。
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');
const sim = src.slice(src.indexOf('const C = {'), src.indexOf('// ============ DOMを一度だけ組む'));

const store = new Map();
global.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
};

let bad = 0;
const A = (ok, m) => { console.log((ok ? 'OK ' : 'NG ') + m); if (!ok) bad++; };

// 起動時の load() は step() を回すので、step() が使う const より後ろに無いと
// TDZ で落ちる。落ちても catch がセーブを消して普通に始まるだけなので気づけない
A(src.indexOf('if(!load()) init()') > src.indexOf('const at     = k =>'),
  '起動の load() が step() の依存より後ろにある');

const check = `
init();
['gen','gen','gen','scrap','shop'].forEach(assign);
S.workers.forEach(w => { if (w.to) { w.at = w.to; w.to = null; w.eta = 0; } });  // 着任を待たない
brownSec = 123;                                  // 留守のぶんが混ざらないことを見るための目印
const was = { parts:S.parts, scrap:S.scrap, deposit:S.deposit, logs:S.log.length };
save();

// 保存した時刻を8時間前に書き換えて、まるごと留守にした状態を作る
const d = JSON.parse(localStorage.getItem(KEY)); d.t -= 8 * 3600 * 1000;
localStorage.setItem(KEY, JSON.stringify(d));

const t0 = Date.now();
A(load(), 'セーブを読み戻せる');
const ms = Date.now() - t0;

const nums = { pop:S.pop, food:S.food, scrap:S.scrap, parts:S.parts, deposit:S.deposit };
A(Object.values(nums).every(v => Number.isFinite(v) && v >= 0),
  '資源が有限で負にならない ' + JSON.stringify(nums, (k,v) => typeof v === 'number' ? +v.toFixed(1) : v));
A(S.parts > was.parts, '留守のあいだに部品が貯まる (' + was.parts + ' → ' + S.parts.toFixed(0) + ')');
A(S.deposit < was.deposit, '埋蔵量が減っている(勝手に湧かない)');
A(S.pop >= 1 && S.pop <= popCap(), '住民が1人以上、上限以下 (' + S.pop + '/' + popCap() + ')');
A(brownSec === 123, '留守のぶんがセッション統計に混ざらない');
A(S.log.length <= 60 && /留守/.test(S.log[0].msg), 'ログが溢れず、要約が1行だけ乗る');
A(ms < 3000, '8時間ぶんの計算が一瞬で終わる (' + ms + 'ms)');
A(catchUpTo(Date.now()) === undefined && S.parts === nums.parts, '離れていない時間では何も動かない');

wiped = true; localStorage.removeItem(KEY); save();   // wipe() がやることと同じ
A(localStorage.getItem(KEY) === null, '「最初からやり直す」の後、離脱時の保存で書き戻らない');
console.log('  ' + S.log[0].msg);
`;

eval(sim + check);
console.log(bad ? 'オフライン進行 NG' : 'オフライン進行 OK');
process.exitCode = bad ? 1 : 0;
