# Generates demo/assets/livestock_shelter.svg: a passive-solar animal shelter drawn in the hero's block style.
from pathlib import Path
U, C, S = 40, 0.866, 0.5
OX, OY = 340, 268
def iso(x, y, z): return (round(OX + (x - y) * C * U, 1), round(OY + (x + y) * S * U - z * U, 1))
def poly(pts, fill, extra=''):
    return f'<polygon points="{" ".join(f"{a},{b}" for a, b in (iso(*p) for p in pts))}" fill="{fill}" {extra}/>'
def box(x0, x1, y0, y1, z0, z1, col):
    t, l, r = col
    return (poly([(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)], t) +
            poly([(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)], l) +
            poly([(x1,y0,z0),(x1,y1,z0),(x1,y1,z1),(x1,y0,z1)], r))
INK = ('#4A4E57', '#2E3138', '#22252A')
TERRA = ('#F6C3A8', '#EDA07E', '#D8805C')
out = []
# backdrop: warm winter sky disc, snowy peaks, sun
out.append('''<defs>
<radialGradient id="sky" cx="86%" cy="42%" r="95%"><stop offset="0" stop-color="#FFE3C4"/><stop offset=".5" stop-color="#FBEFE2"/><stop offset="1" stop-color="#EEF1F5"/></radialGradient>
<clipPath id="disc"><circle cx="400" cy="300" r="276"/></clipPath>
</defs>
<rect width="800" height="600" fill="#F3F1EC"/>
<circle cx="400" cy="300" r="276" fill="url(#sky)"/>
<g clip-path="url(#disc)">
  <path d="M60 330 L220 170 L300 245 L400 130 L560 290 L640 225 L780 340 L780 600 L60 600 Z" fill="#DCE3EC"/>
  <path d="M220 170 L258 208 L240 214 L226 202 L206 218 L196 194 Z M400 130 L452 182 L430 190 L412 176 L392 194 L376 172 L360 172 Z M640 225 L672 257 L654 262 L640 252 L626 262 L618 247 Z" fill="#FFFFFF"/>
  <path d="M60 380 L180 300 L300 360 L420 290 L560 370 L700 320 L780 360 L780 600 L60 600 Z" fill="#C9D3E0"/>
  <path d="M40 420 H780 V600 H40 Z" fill="#F4F1EA"/>
</g>
<circle cx="652" cy="276" r="44" fill="rgba(255,179,71,.25)"/><circle cx="652" cy="276" r="23" fill="#FFB347"/>''')
# plinth, shelter (mono-pitch roof rising to the sun-facing +x side), glazing
out.append(box(-0.3, 6.3, -0.3, 3.8, -0.3, 0, INK))
zl, zh = 1.8, 2.7
out.append(poly([(0,3.5,0),(6,3.5,0),(6,3.5,zh),(0,3.5,zl)], TERRA[1]))
out.append(poly([(6,0,0),(6,3.5,0),(6,3.5,zh),(6,0,zh)], TERRA[2]))
# south glazing on the +x face, with mullions
g0, g1, gz0, gz1 = 0.25, 3.25, 1.0, 2.4
out.append(poly([(6,g0,gz0),(6,g1,gz0),(6,g1,gz1),(6,g0,gz1)], '#2B3A55'))
for yy in (1.0, 1.75, 2.5):
    a, b = iso(6, yy, gz0), iso(6, yy, gz1)
    out.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="#F6C3A8" stroke-width="3"/>')
a, b = iso(6, g0 + .2, gz0 + .5), iso(6, g0 + .6, gz1 - .25)
out.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="rgba(255,255,255,.45)" stroke-width="2.5" stroke-linecap="round"/>')
# stable door and a small vent on the +y face
out.append(poly([(1.0,3.5,0),(2.3,3.5,0),(2.3,3.5,1.45),(1.0,3.5,1.45)], '#8F2F10'))
out.append(poly([(1.0,3.5,0.72),(2.3,3.5,0.72),(2.3,3.5,0.78),(1.0,3.5,0.78)], '#6E230C'))
out.append(poly([(3.6,3.5,1.35),(4.8,3.5,1.35),(4.8,3.5,1.7),(3.6,3.5,1.7)], '#2B3A55'))
# insulated roof slab with overhang
rl, rh, t = zl - 0.05, zh + 0.05, 0.22
out.append(poly([(-0.25,-0.25,rl),(6.35,-0.25,rh),(6.35,3.75,rh),(-0.25,3.75,rl)], '#E4572E'))
out.append(poly([(-0.25,3.75,rl-t),(6.35,3.75,rh-t),(6.35,3.75,rh),(-0.25,3.75,rl)], '#9E3818'))
out.append(poly([(6.35,-0.25,rh-t),(6.35,3.75,rh-t),(6.35,3.75,rh),(6.35,-0.25,rh)], '#B8431E'))
# studs along the roof, a nod to the blocks
for x in (0.6, 1.8, 3.0, 4.2, 5.4):
    for y in (0.6, 1.75, 2.9):
        z = rl + (rh - rl) * (x + 0.25) / 6.6
        cx, cy = iso(x, y, z); rx, ry = 0.19 * U * 1.2247, 0.19 * U * 0.7071; h = 0.12 * U
        out.append(f'<path d="M{cx-rx} {cy-h} L{cx-rx} {cy} A{rx} {ry} 0 0 0 {cx+rx} {cy} L{cx+rx} {cy-h} Z" fill="#C94A22"/><ellipse cx="{cx}" cy="{cy-h}" rx="{rx}" ry="{ry}" fill="#F07B55"/>')
# sun rays into the glazing
sx, sy = 652, 276
for yy, zz in ((0.9, 1.9), (1.8, 1.5), (2.7, 2.1)):
    a = iso(6, yy, zz)
    out.append(f'<line x1="{sx-24}" y1="{sy+4}" x2="{a[0]}" y2="{a[1]}" stroke="#FFB347" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 10"/>')
# hay bale
out.append(box(5.6, 6.7, 4.4, 5.05, 0, 0.55, ('#F3D48A', '#E6BE62', '#D4A845')))
for f in (0.33, 0.66):
    a, b = iso(5.6 + 1.1 * f, 5.05, 0), iso(5.6 + 1.1 * f, 5.05, 0.55)
    out.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="#B88C2E" stroke-width="2"/>')
# a yak (dark, shaggy) and a goat (cream), built from blocks
def animal(x, y, L, W, H, leg, col, head, hz, horn=None):
    o = ''
    for lx in (x + 0.12, x + L - 0.3):
        for ly in (y + 0.05, y + W - 0.2):
            o += box(lx, lx + 0.16, ly, ly + 0.15, 0, leg, col)
    o += box(x, x + L, y, y + W, leg, leg + H, col)
    hx0, hw = x + L - 0.05, head
    o += box(hx0, hx0 + hw, y + W / 2 - hw / 2, y + W / 2 + hw / 2, hz, hz + hw * 0.9, col)
    if horn:
        for hy in (y + W / 2 - hw / 2 + 0.03, y + W / 2 + hw / 2 - 0.1):
            o += box(hx0 + 0.05, hx0 + 0.13, hy, hy + 0.07, hz + hw * 0.9, hz + hw * 0.9 + horn, ('#F4EBD6', '#E2D6B8', '#CFC19E'))
    return o
out.append(animal(1.4, 4.6, 1.9, 0.75, 0.75, 0.5, ('#6A5646', '#4E3F33', '#3E3229'), 0.5, 1.0, horn=0.22))
out.append(animal(4.0, 5.25, 1.1, 0.45, 0.45, 0.45, ('#FFFFFF', '#EDE8DD', '#D9D2C2'), 0.34, 0.8, horn=0.18))
# snow on the ground
out.append('<g clip-path="url(#disc)">')
for cx, cy, rx in ((190, 470, 60), (640, 450, 44), (500, 540, 70)):
    out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{rx*0.22:.0f}" fill="#FFFFFF" opacity=".9"/>')
out.append('</g>')
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="158 112 552 414" width="800" height="600" preserveAspectRatio="xMidYMid slice" stroke-linejoin="round">' + ''.join(out) + '</svg>'
# outline every face lightly, like the hero blocks
svg = svg.replace('<polygon ', '<polygon stroke="rgba(21,23,27,.5)" stroke-width="1" ')
(Path(__file__).resolve().parents[1] / 'demo' / 'assets' / 'livestock_shelter.svg').write_text(svg)
