# 用 KiCad 自带 Python（pcbnew）生成初版 PCB：板框、器件布局、网络分配、地平面。未布线。
# 用法：<KiCad python3.9> gen_pcb.py <项目目录>
import json, math, os, sys
import pcbnew

proj = sys.argv[1]
name = os.path.basename(proj.rstrip('/'))
D = json.load(open(os.path.join(proj, name + '.netlist.json'), encoding='utf8'))
FPDIR = os.path.expanduser('~/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints')
OX, OY = 100.0, 100.0  # 板在图纸上的偏移
mm = pcbnew.FromMM
V = lambda x, y: pcbnew.VECTOR2I(mm(OX + x), mm(OY + y))

board = pcbnew.NewBoard(os.path.join(proj, name + '.kicad_pcb'))
board.SetCopperLayerCount(D['layers'])
ds = board.GetDesignSettings()
try:
    nc = ds.m_NetSettings.GetDefaultNetclass()
    nc.SetClearance(mm(0.1)); nc.SetTrackWidth(mm(0.1)); nc.SetViaDiameter(mm(0.3)); nc.SetViaDrill(mm(0.15))
except Exception as e:
    print('netclass', e)
ds.m_MinClearance = mm(0.09)
ds.m_TrackMinWidth = mm(0.09)
ds.m_HoleClearance = mm(0.15)

# 板框
pts = D['outline']
for i in range(len(pts)):
    a, b = pts[i], pts[(i + 1) % len(pts)]
    s = pcbnew.PCB_SHAPE(board)
    s.SetShape(pcbnew.SHAPE_T_SEGMENT)
    s.SetStart(V(*a)); s.SetEnd(V(*b))
    s.SetLayer(pcbnew.Edge_Cuts); s.SetWidth(mm(0.1))
    board.Add(s)

xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
BX0, BY0, BX1, BY1 = min(xs), min(ys), max(xs), max(ys)


def inside(x, y):
    c = False
    n = len(pts)
    for i in range(n):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


# 网络
nets = {}
for ref, p in D['parts'].items():
    for pad, net in p['pads'].items():
        if net not in nets:
            ni = pcbnew.NETINFO_ITEM(board, net)
            board.Add(ni)
            nets[net] = ni

placed = {'F': [], 'B': []}  # 已占用矩形 (x0,y0,x1,y1)，板坐标 mm
missing = []


def load(fpref):
    lib, fname = fpref.split(':', 1)
    path = os.path.join(proj, 'glasses.pretty') if lib == 'glasses' else os.path.join(FPDIR, lib + '.pretty')
    fp = pcbnew.FootprintLoad(path, fname)
    if fp is None:
        raise RuntimeError('找不到封装 ' + fpref)
    fp.SetFPID(pcbnew.LIB_ID(lib, fname))
    return fp


def bbox_mm(fp):
    bb = fp.GetCourtyard(pcbnew.F_CrtYd if not fp.IsFlipped() else pcbnew.B_CrtYd).BBox() if fp.GetCourtyard(pcbnew.F_CrtYd if not fp.IsFlipped() else pcbnew.B_CrtYd).OutlineCount() else fp.GetBoundingBox(False)
    return (pcbnew.ToMM(bb.GetLeft()) - OX, pcbnew.ToMM(bb.GetTop()) - OY, pcbnew.ToMM(bb.GetRight()) - OX, pcbnew.ToMM(bb.GetBottom()) - OY)


def overlaps(r, side):
    for o in placed[side]:
        if r[0] < o[2] and r[2] > o[0] and r[1] < o[3] and r[3] > o[1]:
            return True
    return False


def fits(r):
    m = 0.25
    return all(inside(x, y) for x, y in [(r[0] - m, r[1] - m), (r[2] + m, r[1] - m), (r[0] - m, r[3] + m), (r[2] + m, r[3] + m)])


def put(fp, x, y, rot, side):
    fp.SetPosition(V(x, y))
    fp.SetOrientationDegrees(rot)
    if side == 'B' and not fp.IsFlipped():
        fp.Flip(V(x, y), pcbnew.FLIP_DIRECTION_LEFT_RIGHT)


# 组锚点：组内固定位置器件的中心
anchors = {}
for ref, p in D['parts'].items():
    if p['pos']:
        anchors.setdefault(p['group'], []).append(p['pos'])
anchors = {g: (sum(a[0] for a in v) / len(v), sum(a[1] for a in v) / len(v)) for g, v in anchors.items()}
center = ((BX0 + BX1) / 2, (BY0 + BY1) / 2)

order = sorted(D['parts'].items(), key=lambda kv: (kv[1]['pos'] is None, kv[0]))
for ref, p in order:
    fp = load(p['fp'])
    fp.SetReference(ref)
    fp.SetValue(p['value'])
    try:
        fp.SetDNP(bool(p['dnp']))
    except Exception:
        pass
    board.Add(fp)
    for pad in fp.Pads():
        n = p['pads'].get(pad.GetNumber())
        if n:
            pad.SetNet(nets[n])
    used = {pad.GetNumber() for pad in fp.Pads()}
    for k in p['pads']:
        if k not in used:
            missing.append(f'{ref}:{k}')
    side = p['side']
    if p['pos']:
        put(fp, p['pos'][0], p['pos'][1], p['rot'], side)
        placed[side].append(bbox_mm(fp))
        continue
    ax, ay = anchors.get(p['group'], center)
    done = False
    for r in range(0, 400):
        rad = r * 0.35
        steps = max(1, int(2 * math.pi * rad / 0.6))
        for k in range(steps):
            t = 2 * math.pi * k / steps
            x, y = round(ax + rad * math.cos(t), 2), round(ay + rad * math.sin(t), 2)
            for rot in (0, 90):
                put(fp, x, y, rot, side)
                bb = bbox_mm(fp)
                bb = (bb[0] - 0.1, bb[1] - 0.1, bb[2] + 0.1, bb[3] + 0.1)
                if fits(bb) and not overlaps(bb, side):
                    placed[side].append(bb)
                    done = True
                    break
            if done:
                break
        if done:
            break
    if not done:
        missing.append(f'{ref}:未能放下')

# 地平面（内层 1）与板名
zone = pcbnew.ZONE(board)
zone.SetLayer(pcbnew.In1_Cu)
zone.SetNet(nets['GND'])
ol = zone.Outline()
ol.NewOutline()
cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
for x, y in pts:
    dx, dy = cx - x, cy - y
    d = math.hypot(dx, dy) or 1
    ix, iy = x + (0.6 if dx > 0 else -0.6), y + (0.6 if dy > 0 else -0.6)
    ol.Append(mm(OX + ix), mm(OY + iy))
zone.SetIsRuleArea(False)
zone.SetLocalClearance(mm(0.3))
zone.SetMinThickness(mm(0.15))
board.Add(zone)
pcbnew.ZONE_FILLER(board).Fill(board.Zones())

txt = pcbnew.PCB_TEXT(board)
txt.SetText(f"{D['title']}  v0.1 初版 · 未布线")
txt.SetPosition(V((BX0 + BX1) / 2, BY1 + 3))
txt.SetLayer(pcbnew.F_Fab)
txt.SetTextSize(pcbnew.VECTOR2I(mm(1.2), mm(1.2)))
board.Add(txt)

pcbnew.SaveBoard(os.path.join(proj, name + '.kicad_pcb'), board)
print(name, 'footprints', len(D['parts']), 'nets', len(nets), 'missing', missing)
