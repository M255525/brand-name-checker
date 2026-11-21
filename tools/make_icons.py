# 產生 PWA 圖示：深色磚牆＋粉紅霓虹「名」字（光暈用高斯模糊疊出來）
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(out, exist_ok=True)
FONT = None
for f in (r'C:\Windows\Fonts\msjhbd.ttc', r'C:\Windows\Fonts\msjh.ttc'):
    if os.path.exists(f): FONT = f; break


def draw(size, pad):
    s = 4 * size
    im = Image.new('RGB', (s, s), '#16121E')
    d = ImageDraw.Draw(im)
    bh = s // 12
    for row in range(13):                                   # 磚牆紋
        y = row * bh
        d.line([0, y, s, y], fill='#221C2C', width=max(2, s // 200))
        off = (bh if row % 2 else 0)
        for x in range(-bh, s, bh * 2):
            d.line([x + off, y, x + off, y + bh], fill='#221C2C', width=max(2, s // 200))
    w = (1 - 2 * pad) * s
    font = ImageFont.truetype(FONT, int(w * .78)) if FONT else ImageFont.load_default()
    glow = Image.new('RGB', (s, s), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.text((s / 2, s / 2), '名', fill='#FF2D84', font=font, anchor='mm', stroke_width=int(s * .02), stroke_fill='#FF2D84')
    for r in (s * .05, s * .025):                           # 兩層光暈：外圈大、內圈小
        im = ImageChops.lighter(im, glow.filter(ImageFilter.GaussianBlur(r)))
    d = ImageDraw.Draw(im)
    d.text((s / 2, s / 2), '名', fill='#FFE6F1', font=font, anchor='mm')
    return im.resize((size, size), Image.LANCZOS)


draw(192, .1).save(os.path.join(out, 'icon-192.png'))
draw(512, .1).save(os.path.join(out, 'icon-512.png'))
draw(512, .2).save(os.path.join(out, 'icon-maskable-512.png'))
print('ok')
