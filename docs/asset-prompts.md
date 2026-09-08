# アセット生成プロンプト(Gemini 画像生成)

`assets/tiles.png` を Kenney「Sci-Fi RTS」から自前の絵に差し替えるためのプロンプト集。
座標と盤面の決めごとは `docs/asset-plan.md`。作業前にそちらを読むこと。

## なぜ差し替えるか

| 今の問題 | 直したいこと |
|---|---|
| 素材が「稼働中のSF基地」。紫の木・青緑のトラックが混ざる | 世界観は荒廃したコロニー。赤茶の砂と錆びた廃材に寄せる |
| 素材の色とUIの `--ash / --rust / --ochre / --copper` が別系統 | 盤面とパネルを同じパレットで塗る |
| 住民の色が盤面とUIで食い違う(盤面 整備=青/解体=赤/工作=緑、UI `.who` は 整備=rust/解体=ochre/工作=copper) | **UI側の色に盤面を合わせる**。整備=オレンジ、解体=琥珀、工作=シアン |
| 廃墟が「灰色の岩」。掘り尽くしても見た目が変わらない | 瓦礫として読ませる。4枚に量の段階を付ける余地を残す |

## 生成の進め方

アトラスを1枚で出させないこと。18列×7行の格子を画素単位で守らせるのは無理で、
必ず桁がずれる。**1タイル1枚ずつ生成 → 縮小 → スクリプトで詰め直す**。

1. まず「A-1 地面」を出し、気に入った1枚を**スタイル基準画像**として確定する
2. 以降の生成では、その画像を参照画像として一緒に渡し、プロンプト冒頭に
   `Match the exact art style, outline weight, palette and lighting of the reference image.`
   を足す。これをやらないと枚数ぶんスタイルが割れる
3. 出力は 1024×1024。`Image.open(f).resize((128,128), Image.LANCZOS)` で 128px に落とす
4. 背景のマゼンタ `#FF00FF` を抜いて透過にする(地面タイルは抜かない)
5. 128px の個別PNGをアトラスに詰め、`index.html` の `SP` と `docs/asset-plan.md` の座標表を更新

生成物の権利は Kenney の CC0 とは条件が違う。差し替えたら
`assets/KENNEY-LICENSE.txt` と README の素材欄も直すこと。

## 共通スタイル(すべてのプロンプトの先頭に貼る)

```
Style: flat vector game asset, strict top-down orthographic view — camera pointed straight
down, no perspective, no horizon, no vanishing point. Bold simple silhouette that stays
readable when scaled to 64x64 pixels. Uniform dark outline #1A1410 around every object.
Flat fills, at most one darker shade per surface. No gradients, no noise texture, no glow,
no bloom, no ambient occlusion.

Lighting: one sun from the upper-left. A single hard shadow offset to the lower-right,
solid #241A16 at 25% opacity, no blur. Same shadow direction and length in every asset.

Palette — use only these colors:
  ground red   #6B3A2A    ground dark  #552E22    dust        #8A5A3C
  metal light  #A8B0B5    metal mid    #6E777C    metal dark  #3A4247
  deep shadow  #241A16    bone white   #E8E4DC
  accent orange #E05A3C   accent amber #D3A03C    accent cyan #46A5C8

World: a sun-bleached salvage colony on red dust after the collapse. Machines are patched
together from scavenged plate metal, welded seams, rust streaks. Worn and functional —
not cute, not chibi, not glossy, not neon cyberpunk.

Frame: one subject, centered, filling about 85% of a square frame, nothing touching or
cropped by the edges. Plain solid magenta #FF00FF background. No text, no letters, no
numbers, no logo, no UI, no frame border, no shadow falling outside the tile. 1:1 square.
```

---

## A. 地面(4枚) — マゼンタ背景にせず、正方形を塗りつぶす

地面だけは全面を塗る。末尾の指定を差し替えること:

```
Override the frame rule: fill the entire square edge to edge with terrain. No magenta
background, no outline around the tile itself. The tile must be seamlessly tileable —
the left edge continues into the right edge, the top edge into the bottom edge.
```

**A-1 地面(ベタ)** ← これを最初に作り、スタイル基準にする
```
Subject: bare dry ground of a red-dust wasteland. Almost featureless: flat #6B3A2A base
with three or four faint hairline cracks in #552E22 and two tiny pebbles. Very low
contrast — this tile is repeated dozens of times, so any strong feature will read as an
ugly grid pattern.
```

**A-2 地面(ベタ・別柄)**
```
Subject: the same red-dust ground as the reference, one variation only: the cracks run in
a different direction and a thin drift of lighter dust #8A5A3C sweeps across one corner.
Same base color, same low contrast.
```

**A-3 地面(岩肌)**
```
Subject: the same red-dust ground with exposed bedrock breaking through: flat angular
plates of #552E22 stone with #8A5A3C chipped edges, covering about half the tile. Still
low contrast, still seamlessly tileable.
```

**A-4 地面(踏み固め)**
```
Subject: the same red-dust ground, compacted into a worn path: faint parallel tread marks
and scuffed lighter dust #8A5A3C. No road markings, no asphalt, no curb.
```

## B. 小石(2枚)

```
Subject: two or three small loose stones and a scrap of bent metal plate lying on the
ground, seen from directly above. Tiny — they occupy only the center third of the frame,
the rest is empty magenta. Stones in #6E777C, metal scrap in #8A5A3C with a rust streak.
```
2枚目は `three stones of different sizes and a coil of rusted wire` に差し替える。

## C. 廃墟(4枚) — 掘るほど消えていく資源

4枚は「同じ廃墟の崩れ具合の段階」として作る。将来コード側で
埋蔵量に応じて段階を出し分けられるように、量の多い順で並べる。

**C-1 大**
```
Subject: a collapsed concrete building seen from directly above — broken slabs stacked at
angles, twisted rebar sticking out, half-buried in red dust. Concrete in #A8B0B5 and
#6E777C, rebar in #3A4247 with #E05A3C rust. Fills most of the frame.
```

**C-2 中**
```
Subject: the wreck of a large machine seen from directly above — a torn hull plate, a
snapped strut, a bent panel with faded amber #D3A03C stripe. Smaller than the reference
pile, about two thirds of the frame, more dust showing around it.
```

**C-3 小**
```
Subject: a low heap of salvage seen from directly above — a few broken concrete chunks and
scrap plates, about one third of the frame, the rest bare magenta.
```

**C-4 かけら**
```
Subject: the last remains of a salvage pile seen from directly above — two flat slabs and
scattered rubble, nearly picked clean, only the center quarter of the frame is occupied.
```

## D. 建物(4枚) — **形だけで見分けられること**

4棟は 64px でシルエットが混ざったら失敗。各プロンプトの
`Silhouette rule` を必ず残すこと。

**D-1 発電機** `SP.gen`
```
Subject: a salvaged power generator seen from directly above. A squat rectangular block of
dark plate metal #3A4247 with a row of tall vertical cooling fins along its length, and a
glowing amber #D3A03C strip running between the fins. Two thick cables leave the lower
edge. Silhouette rule: a ribbed rectangle, unmistakably striped — the only building with
repeating parallel fins.
```

**D-2 解体場** `SP.scrap`
```
Subject: a scrapyard shed seen from directly above. A half-cylinder quonset hangar of
corrugated #A8B0B5 metal with a rounded ridge running down its middle, an open mouth at
one end, and a small heap of cut plate beside it. Silhouette rule: the only round-topped
building — a smooth capsule shape, no corners, no fins.
```

**D-3 工房** `SP.shop`
```
Subject: a fabrication workshop seen from directly above. A long low rectangular hall of
#6E777C plate with a flat roof, three skylight panes glowing cyan #46A5C8, and two exhaust
stacks at one corner. Silhouette rule: the only wide flat-roofed rectangle — twice as long
as it is deep, no curve, no fins.
```

**D-4 水耕農場** `SP.farm`
```
Subject: a hydroponic farm seen from directly above. Two tall cylindrical water tanks of
pale #E8E4DC metal with cyan #46A5C8 fluid windows, joined by a low glass growing tray
showing dull green rows. Silhouette rule: the only building built from two circles — the
round tank tops must read clearly from above.
```

## E. 住民(3枚) — **色はUIの `.who` に合わせる**

現状の盤面は 整備=青 / 解体=赤 / 工作=緑 で、UIのタグと食い違っている。
新しい絵ではUI側に揃える。

```
Subject: a single colony worker seen from directly above — the top of a hard hat, shoulders
and boots visible, arms slightly out. Small figure occupying about half the frame height.
Dusty grey #6E777C coveralls, bone white #E8E4DC hard hat brim, and one strong accent color
on the hat and shoulder pads: <ACCENT>. Carrying <TOOL>. No face detail, no eyes — at 64px
the head is only a few pixels.
```

| 差し替え | `<ACCENT>` | `<TOOL>` | 対応 |
|---|---|---|---|
| 整備 | orange `#E05A3C` | a wrench | `SP.man.gen` / `.who.gen` |
| 解体 | amber `#D3A03C` | a cutting torch | `SP.man.scrap` / `.who.scrap` |
| 工作 | cyan `#46A5C8` | a parts crate | `SP.man.shop` / `.who.shop` |

3枚は**同じポーズ・同じ大きさ**で出すこと。盤面では並んで立つので、
背丈が違うと別種の生き物に見える。

## F. アイコン(任意)

`icon.py` の配電盤バーは計器らしくて悪くないので、置き換えは必須ではない。
作るなら:

```
Subject: an app icon for a colony management game. A dark #241A16 square. Centered: three
stacked horizontal power bars filled to different levels in #A8B0B5, #D3A03C and #46A5C8,
with a single bone white #E8E4DC vertical marker line crossing all three near the right.
Flat, geometric, no bevel, no gloss, no text, no letters. Generous margin — the outer 20%
of the square must stay empty so the icon survives a circular mask.
```

## 差し替え後にやること

- [ ] 128px に縮小したとき、建物4棟のシルエットが判別できるか(64px 表示でも確認)
- [ ] 地面タイルを 8×5 に並べて、繰り返しの目玉模様が出ていないか
- [ ] 夜の暗幕(`rgba(14,20,45,.52)`)を被せても建物と地面が分離して見えるか
- [ ] 停電の赤幕(`rgba(150,36,18,.2)`)で、赤茶の地面と建物が同化しないか
- [ ] 住民3色が `.who` タグと一致しているか
- [ ] `index.html` の `SP` と `docs/asset-plan.md` の座標表を更新
- [ ] README の素材欄と `assets/KENNEY-LICENSE.txt` を、実際に使った素材の条件に直す
