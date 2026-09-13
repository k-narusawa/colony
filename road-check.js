// 道の接続と建物の移設を確かめる。`node road-check.js` で走る。
// offline-check.js と同じく index.html のシミュレーション部分を切り出して回すので、
// 本体を直せばここも一緒に追随する。
// 読み込むのは同じリポジトリの index.html だけで外部入力は無いため eval で足りる
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');
const sim = src.slice(src.indexOf('const C = {'), src.indexOf('// ============ DOMを一度だけ組む'));

let bad = 0;
const A = (ok, m) => { console.log((ok ? 'OK ' : 'NG ') + m); if (!ok) bad++; };

const check = `
init();
S.ores = [{ x:2, y:7, amt:500 }];   // 鉱床を1つ、コロニー(x8-15)の左に固定で置く
S.scrap = 1000;

A(depOpen(), '初期配置ではキャンプの廃墟が掘れる');
A(!oreOpen(S.ores[0]), '道が無い鉱床は掘れない');

// コロニー左端(x=8)から鉱床の隣(x=3)まで道を直に敷く
for (let x = 3; x <= 7; x++) S.roads.push([x, 7]);
A(oreOpen(S.ores[0]), '解体場が区画内なら、区画に接した道が届けば掘れる');

// 解体場をコロニーから遠く離すと、その道は解体場行きでなくなる
S.site.scrap = [20, 2];
A(!depOpen() && !oreOpen(S.ores[0]), '解体場を孤立させると廃墟も鉱床も掘れない');

// 鉱床の真横に解体場を置けば道なしで掘れる
S.site.scrap = [2, 6];
A(oreOpen(S.ores[0]), '解体場を鉱床の隣に移せば道なしで掘れる');
S.site.scrap = [9, 7];   // 戻す

// 移設の予約 → 歩き → 組み立て → 完成
const scrap0 = S.scrap;
mvSel = 'farm';
moveTap(20, 12);
A(S.jobs.some(j => j.k === 'farm') && S.scrap === scrap0 - C.bldMoveCost,
  '移設を予約するとスクラップが減って予約が入る');
A(!S.farmLive || (step(1), !S.farmLive), '移設中の農場は動かない');
for (let i = 0; i < C.moveTime + C.bldMoveT + 2; i++) step(1);
A(S.site.farm[0] === 20 && S.site.farm[1] === 12, '移設が完成すると建物の位置が変わる');
A(!S.jobs.length, '予約が片づいている');

// 取り消しで返金される
mvSel = 'shop';
moveTap(20, 14);
moveTap(20, 14);
A(!S.jobs.length && S.scrap === scrap0 - C.bldMoveCost, '予定地をもう一度タップすると取り消して返金');
`;

eval(sim + check);
console.log(bad ? '道と移設 NG' : '道と移設 OK');
process.exitCode = bad ? 1 : 0;
