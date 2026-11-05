# 把 KiCad 原理图 SVG 转成 three.js 可直接画的线段数据：<name>.json（颜色分组、偏移、文字索引）+ <name>.bin（float32 线段）
import re, sys, json, struct, math, html

src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf8').read()
m = re.search(r'viewBox="([\d.\s-]+)"', s)
vb = [float(x) for x in m.group(1).split()]

tok = re.compile(r'<g\s[^>]*style="([^"]*)"[^>]*>|</g>|<path\s+d="([^"]*)"|<rect\s([^>]*)/>|<circle\s([^>]*)/>|<text\s([^>]*)>([^<]*)</text>', re.S)
stack = [('none', 'none')]
segs = {}
fills = {}
texts = []


def style_of(st):
    sc = re.search(r'stroke:\s*(#[0-9A-Fa-f]{6})', st)
    fc = re.search(r'fill:\s*(#[0-9A-Fa-f]{6}|none)', st)
    return (sc.group(1) if sc else stack[-1][0], fc.group(1) if fc else stack[-1][1])


def add_poly(color, pts, closed):
    if color in (None, 'none') or len(pts) < 2:
        return
    L = segs.setdefault(color.upper(), [])
    seq = pts + ([pts[0]] if closed else [])
    for a, b in zip(seq, seq[1:]):
        L.extend((a[0], a[1], b[0], b[1]))


num = re.compile(r'[MLZAmlza]|-?\d*\.?\d+(?:e-?\d+)?')
for mt in tok.finditer(s):
    g, d, rect, circ, tattr, ttext = mt.groups()
    if mt.group(0) == '</g>':
        if len(stack) > 1:
            stack.pop()
        continue
    if g is not None:
        stack.append(style_of(g)); continue
    stroke, fill = stack[-1]
    if d is not None:
        t = num.findall(d)
        i, cur, polys, closed_flags = 0, [], [], []
        while i < len(t):
            c = t[i]
            if c in 'Mm':
                if cur:
                    polys.append(cur); closed_flags.append(False)
                cur = [(float(t[i + 1]), float(t[i + 2]))]; i += 3
                while i + 1 < len(t) and t[i] not in 'MLZAmlza':
                    cur.append((float(t[i]), float(t[i + 1]))); i += 2
            elif c in 'Ll':
                i += 1
                while i + 1 < len(t) and t[i] not in 'MLZAmlza':
                    cur.append((float(t[i]), float(t[i + 1]))); i += 2
            elif c in 'Aa':
                rx, ry, rot, la, sw, x, y = [float(v) for v in t[i + 1:i + 8]]
                x0, y0 = cur[-1]
                # 圆弧：按端点 + 半径近似成 16 段
                dx, dy = (x - x0) / 2, (y - y0) / 2
                dd = math.hypot(dx, dy)
                r = max(rx, dd)
                if dd < 1e-9:
                    cur.append((x, y)); i += 8; continue
                h = math.sqrt(max(r * r - dd * dd, 0))
                mx, my = (x0 + x) / 2, (y0 + y) / 2
                sgn = 1 if la != sw else -1
                cx, cy = mx - sgn * h * dy / dd, my + sgn * h * dx / dd
                a0, a1 = math.atan2(y0 - cy, x0 - cx), math.atan2(y - cy, x - cx)
                da = a1 - a0
                if sw and da < 0: da += 2 * math.pi
                if not sw and da > 0: da -= 2 * math.pi
                for k in range(1, 17):
                    a = a0 + da * k / 16
                    cur.append((cx + r * math.cos(a), cy + r * math.sin(a)))
                i += 8
            elif c in 'Zz':
                if cur:
                    polys.append(cur); closed_flags.append(True); cur = []
                i += 1
            else:
                i += 1
        if cur:
            polys.append(cur); closed_flags.append(False)
        for p, cl in zip(polys, closed_flags):
            if fill not in (None, 'none') and cl and fill.upper() not in ('#F5F4EF',):
                fills.setdefault(fill.upper(), []).append([v for xy in p for v in xy])
            add_poly(stroke, p, cl)
    elif rect is not None:
        a = dict(re.findall(r'(\w+)="([^"]*)"', rect))
        x, y, w, h = (float(a.get(k, 0)) for k in ('x', 'y', 'width', 'height'))
        if w < vb[2] * 0.9:
            if fill not in (None, 'none') and fill.upper() != '#F5F4EF':
                fills.setdefault(fill.upper(), []).append([x, y, x + w, y, x + w, y + h, x, y + h])
            add_poly(stroke, [(x, y), (x + w, y), (x + w, y + h), (x, y + h)], True)
    elif circ is not None:
        a = dict(re.findall(r'(\w+)="([^"]*)"', circ))
        cx, cy, r = (float(a.get(k, 0)) for k in ('cx', 'cy', 'r'))
        add_poly(stroke, [(cx + r * math.cos(2 * math.pi * k / 24), cy + r * math.sin(2 * math.pi * k / 24)) for k in range(24)], True)
    elif tattr is not None:
        a = dict(re.findall(r'(\w+)="([^"]*)"', tattr))
        txt = html.unescape(ttext).strip()
        if txt and 'x' in a:
            texts.append([round(float(a['x']), 2), round(float(a['y']), 2), txt])

bin_parts, layers, off = [], [], 0
for color, L in segs.items():
    layers.append({'color': color, 'offset': off, 'count': len(L)})
    bin_parts.append(struct.pack(f'<{len(L)}f', *L)); off += len(L)
fl = []
for color, polys in fills.items():
    for p in polys:
        fl.append({'color': color, 'offset': off, 'count': len(p)})
        bin_parts.append(struct.pack(f'<{len(p)}f', *p)); off += len(p)
open(out + '.bin', 'wb').write(b''.join(bin_parts))
json.dump({'viewBox': vb, 'layers': layers, 'fills': fl, 'texts': texts}, open(out + '.json', 'w', encoding='utf8'), ensure_ascii=False)
print(out, 'segments', sum(l['count'] for l in layers) // 4, 'fills', len(fl), 'texts', len(texts))
