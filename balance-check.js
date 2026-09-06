// バランス確認用のヘッドレスシム。`node balance-check.js` で走る。
// index.html の C をそのまま読むので、数字をいじったら再実行するだけでよい。
// 想定する遊び方は「発電機を3人まで埋め、残りを解体場と工房に半々」。
// C はキーが無引用符でコメント入りの JS リテラルなので JSON.parse では読めない。
// 読み込むのは同じリポジトリの index.html だけで外部入力は無いため eval で足りる。
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');
const C = eval('(' + src.match(/const C = (\{[\s\S]*?\n\});/)[1] + ')');
const DEPOSIT = +src.match(/deposit:\s*(\d+)/)[1];

function run(seed) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const S = { t:0, pop:5, workers:[], food:C.foodCap, scrap:0, parts:0, deposit:DEPOSIT,
              growth:0, lv:{gen:1,house:1,scrap:1,shop:1}, broken:false, repairT:0,
              cold:0, coldLeft:0, nextEv:70, starveT:0, brownT:0 };
  for (let i = 0; i < 5; i++) S.workers.push({ at:'idle', eta:0, to:null });
  const UPS = [{k:'gen',cost:100},{k:'scrap',cost:80},{k:'shop',cost:200}];
  const cnt = k => S.workers.filter(w => w.at === k && w.eta <= 0).length;
  const moving = k => S.workers.filter(w => w.to === k).length;
  const idle = () => S.workers.filter(w => w.at === 'idle' && w.eta <= 0).length;
  const slots = { gen:() => 3,
                  scrap:() => C.scrapSlots + (S.lv.scrap - 1) * C.scrapPerLv,
                  shop:() => C.shopSlots + (S.lv.shop - 1) * C.shopPerLv };
  const genOut = () => {
    const o = C.genBase[Math.min(cnt('gen'), C.genBase.length - 1)] + (S.lv.gen - 1) * C.genPerLv;
    return S.broken ? o * C.brokenMult : o;
  };
  const r = { parts:0, ups:0, firstUp:null, brown:0, farmDead:0, shopDead:0, starve:0,
              deaths:0, burnt:0 };
  const dt = .1;

  for (let t = 0; t < C.sessionSec * 2; t += dt) {
    for (let n = 0; idle() > 0 && n < 20; n++) {
      const at = k => cnt(k) + moving(k);
      const want = at('gen') < 3 ? 'gen'
        : at('scrap') <= at('shop') && at('scrap') < slots.scrap() ? 'scrap'
        : at('shop') < slots.shop() ? 'shop' : null;
      if (!want) break;
      Object.assign(S.workers.find(w => w.at === 'idle' && w.eta <= 0),
                    { at:'moving', to:want, eta:C.moveTime });
    }
    if (S.broken && S.repairT <= 0 && S.parts >= 30) { S.parts -= 30; S.repairT = 20; }
    for (const u of UPS) if (S.parts >= u.cost) {
      S.parts -= u.cost; S.lv[u.k]++; u.cost = Math.round(u.cost * 1.8);
      if (r.firstUp === null) r.firstUp = t;
      r.ups++;
    }

    S.t += dt;
    if (S.coldLeft > 0 && (S.coldLeft -= dt) <= 0) S.cold = 0;
    S.workers.forEach(w => { if (w.eta > 0 && (w.eta -= dt) <= 0) { w.at = w.to; w.to = null; } });
    if (S.repairT > 0 && cnt('gen') > 0 && (S.repairT -= dt) <= 0) S.broken = false;

    // index.html の baseDraw() と同じ式。夜の分を忘れると確認が空振りする
    const night = (S.t % (C.dayLen + C.nightLen)) >= C.dayLen;
    const sup = genOut(),
          base = C.houseDraw + S.cold + S.pop * C.residentKW + (night ? C.nightDraw : 0);
    let avail = sup - base, farmLive = false, shopLive = false;
    const brown = avail < 0;
    if (!brown) {
      if (avail >= C.farmDraw) { farmLive = true; avail -= C.farmDraw; }
      if (cnt('shop') > 0 && avail >= C.shopDraw) { shopLive = true; avail -= C.shopDraw; }
    }
    if (brown) {
      r.brown += dt; S.brownT += dt;
      if (S.brownT >= C.brownBreak && !S.broken) { S.broken = true; S.repairT = 0; S.brownT = 0; r.burnt++; }
    } else S.brownT = 0;
    if (!farmLive) r.farmDead += dt;
    if (cnt('shop') > 0 && !shopLive) r.shopDead += dt;

    const m = S.food <= 0 ? C.starveMult : 1;
    if (S.food <= 0) r.starve += dt;
    if (!brown) {
      const got = Math.min(S.deposit, cnt('scrap') * C.scrapPerMan * m * dt);
      S.deposit -= got; S.scrap += got;
    }
    if (shopLive) {
      let want = cnt('shop') * C.partsPerMan * m * dt, need = want * C.scrapPerPart;
      if (S.scrap < need) { want = S.scrap / C.scrapPerPart; need = S.scrap; }
      S.scrap -= need; S.parts += want; r.parts += want;
    }
    S.food = Math.max(0, Math.min(C.foodCap,
      S.food + ((farmLive ? C.foodOut : 0) - S.pop * C.foodPerPop) * dt));

    if (S.food <= 0) {
      S.starveT += dt;
      if (S.starveT >= C.starveKill && S.pop > 1) {
        S.starveT = 0; S.pop--; S.growth = 0; r.deaths++;
        const i = S.workers.findIndex(w => w.at === 'idle' && w.eta <= 0);
        S.workers.splice(i >= 0 ? i : 0, 1);
      }
    } else S.starveT = 0;

    if (S.food >= C.growthMin && (S.growth += dt) >= C.growthNeed
        && S.pop < C.popCapBase + (S.lv.house - 1) * C.popCapPerLv) {
      S.growth = 0; S.pop++; S.workers.push({ at:'idle', eta:0, to:null });
    }
    if (S.t > S.nextEv) {
      S.nextEv = S.t + C.evMin + rnd() * C.evVar;
      const pool = ['cold', 'ruin'];
      if (!S.broken) pool.push('break', 'break');
      if (S.pop < C.popCapBase + (S.lv.house - 1) * C.popCapPerLv) pool.push('migrant');
      const e = pool[Math.floor(rnd() * pool.length)];
      if (e === 'break') { S.broken = true; S.repairT = 0; }
      else if (e === 'cold') { S.cold = 3; S.coldLeft = 120; }
      else if (e === 'ruin') S.deposit += 1200;
      else { S.pop += 2; S.workers.push({ at:'idle', eta:0, to:null }, { at:'idle', eta:0, to:null }); }
    }
  }
  return r;
}

const runs = [1, 7, 42, 99, 123].map(run);
for (const [i, r] of runs.entries())
  console.log(`seed${[1,7,42,99,123][i]}: 部品 ${r.parts.toFixed(0)} / 強化 ${r.ups}回`
    + ` (初回 ${r.firstUp === null ? 'なし' : r.firstUp.toFixed(0) + '秒'})`
    + ` / 停電 ${r.brown.toFixed(0)}秒 / 農場停止 ${r.farmDead.toFixed(0)}秒`
    + ` / 工房停止 ${r.shopDead.toFixed(0)}秒 / 飢餓 ${r.starve.toFixed(0)}秒`
    + ` / 餓死 ${r.deaths}人 / 焼損 ${r.burnt}回`);

// 狙い: 毎回3回以上は強化でき、農場は基本動いていて、それでも工房は時々止まる。
const ok = (name, cond) => { console.log(`${cond ? '  OK' : '  NG'} ${name}`); return cond; };
const all = [
  ok('どのseedでも強化3回以上(部品が手に入らない状態を作らない)', runs.every(r => r.ups >= 3)),
  ok('農場の停止は1割未満(電力不足で止まりっぱなしにしない)',
     runs.every(r => r.farmDead < C.sessionSec * 2 * .1)),
  ok('飢餓なし(食料の破綻はデススパイラルになる)', runs.every(r => r.starve === 0)),
  ok('工房はどこかで止まる(緊張が残っているか)', runs.some(r => r.shopDead > 60)),
  // 破綻の帰結は「避けられる」ことが条件。まともに配置していれば踏まない
  ok('餓死なし(帰結は避けられる範囲に置く)', runs.every(r => r.deaths === 0)),
  ok('停電での焼損なし(同上)', runs.every(r => r.burnt === 0)),
].every(Boolean);
console.log(all ? 'バランス OK' : 'バランス NG');
process.exit(all ? 0 : 1);
