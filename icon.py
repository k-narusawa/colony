from PIL import Image, ImageDraw

INK=(35,38,42); PAPER=(230,227,219); OCHRE=(140,106,34); COPPER=(47,101,96)
SOFT=(97,102,108); RUST=(166,70,42)

def draw(size, maskable=False):
    im=Image.new('RGB',(size,size),INK); d=ImageDraw.Draw(im)
    # maskable はアイコンの外周が丸く切られるので内側に余白をとる
    pad = size*0.22 if maskable else size*0.14
    w = size-pad*2
    # 配電盤のバー(基礎/農場/工房)を3段に積む
    bar_h = w*0.155; gap = w*0.075
    top = size/2 - (bar_h*3 + gap*2)/2
    widths=[0.62,0.86,0.44]; cols=[SOFT,OCHRE,COPPER]
    for i,(fr,c) in enumerate(zip(widths,cols)):
        y=top+i*(bar_h+gap)
        d.rectangle([pad, y, pad+w, y+bar_h], fill=(58,62,67))       # 枠(未使用ぶん)
        d.rectangle([pad, y, pad+w*fr, y+bar_h], fill=c)             # 使用ぶん
    # 供給上限のマーカー
    x=pad+w*0.74
    d.rectangle([x-size*0.012, top-gap, x+size*0.012, top+bar_h*3+gap*2+gap], fill=PAPER)
    return im

for s in (192,512):
    draw(s).save(f'icon-{s}.png')
    draw(s, maskable=True).save(f'icon-{s}-maskable.png')
draw(180).save('apple-touch-icon.png')
print('icons written')
