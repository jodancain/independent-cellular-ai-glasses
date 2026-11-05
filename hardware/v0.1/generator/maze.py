# 网格迷宫布线（A*）：补 Freerouting 留下的断线。KiCad Python 运行：maze.py <项目目录> <drc.rpt>
# 可走层：F.Cu / In2 / In4 / B.Cu；In1（地）、In3（1.8 V）是整层平面，过孔可以穿过。
import heapq, math, os, re, sys
import numpy as np
import pcbnew

proj, rpt = sys.argv[1], sys.argv[2]
name = os.path.basename(proj.rstrip('/'))
pcb = os.path.join(proj, name + '.kicad_pcb')
b = pcbnew.LoadBoard(pcb)
MM, FM = pcbnew.ToMM, (lambda v: int(round(pcbnew.FromMM(v))))
G = 0.05                       # 网格 0.05 mm
TW, CLR, VD, VH = 0.1, 0.1, 0.3, 0.15
LAYERS = [pcbnew.F_Cu, pcbnew.In2_Cu, pcbnew.In4_Cu, pcbnew.B_Cu]
LNAME = {'F.Cu': 0, 'In2.Cu': 1, 'In4.Cu': 2, 'B.Cu': 3}
bb = b.GetBoardEdgesBoundingBox()
X0, Y0 = MM(bb.GetLeft()), MM(bb.GetTop())
NX, NY = int((MM(bb.GetRight()) - X0) / G) + 1, int((MM(bb.GetBottom()) - Y0) / G) + 1
xs = X0 + np.arange(NX) * G
ys = Y0 + np.arange(NY) * G
EDGE = 0.3


def items():
    """所有铜：(层索引集合或 None=全部, 类型, 几何, 半宽, 网络)"""
    out = []
    for t in b.GetTracks():
        n = t.GetNetname()
        if t.Type() == pcbnew.PCB_VIA_T:
            p = t.GetStart()
            out.append((None, 'c', (MM(p[0]), MM(p[1])), MM(t.GetWidth(pcbnew.F_Cu)) / 2, n))
        else:
            L = t.GetLayer()
            if L in LAYERS:
                s, e = t.GetStart(), t.GetEnd()
                out.append(({LAYERS.index(L)}, 's', (MM(s[0]), MM(s[1]), MM(e[0]), MM(e[1])), MM(t.GetWidth()) / 2, n))
    for fp in b.GetFootprints():
        for pad in fp.Pads():
            r = pad.GetBoundingBox()
            g = (MM(r.GetLeft()), MM(r.GetTop()), MM(r.GetRight()), MM(r.GetBottom()))
            if pad.GetAttribute() in (pcbnew.PAD_ATTRIB_PTH, pcbnew.PAD_ATTRIB_NPTH):
                lay = None
            else:
                lay = {3 if fp.IsFlipped() else 0}
            out.append((lay, 'r', g, 0.0, pad.GetNetname()))
    return out


def mask_for(net, its, extra):
    """每层的“不可走”格（对 net 而言），extra = 新线半宽 + 间距"""
    blk = np.zeros((4, NY, NX), bool)
    for lay, k, g, hw, n in its:
        if n == net and net:
            continue
        r = hw + extra
        if k == 'c':
            x0, x1, y0, y1 = g[0] - r, g[0] + r, g[1] - r, g[1] + r
        elif k == 's':
            x0, x1 = min(g[0], g[2]) - r, max(g[0], g[2]) + r
            y0, y1 = min(g[1], g[3]) - r, max(g[1], g[3]) + r
        else:
            x0, y0, x1, y1 = g[0] - r, g[1] - r, g[2] + r, g[3] + r
        i0, i1 = max(0, int((x0 - X0) / G)), min(NX - 1, int((x1 - X0) / G) + 1)
        j0, j1 = max(0, int((y0 - Y0) / G)), min(NY - 1, int((y1 - Y0) / G) + 1)
        if i0 > i1 or j0 > j1:
            continue
        X, Y = np.meshgrid(xs[i0:i1 + 1], ys[j0:j1 + 1])
        if k == 'c':
            m = (X - g[0]) ** 2 + (Y - g[1]) ** 2 < r * r
        elif k == 's':
            dx, dy = g[2] - g[0], g[3] - g[1]
            L2 = dx * dx + dy * dy
            t = np.clip(((X - g[0]) * dx + (Y - g[1]) * dy) / L2, 0, 1) if L2 > 0 else 0
            m = (X - g[0] - t * dx) ** 2 + (Y - g[1] - t * dy) ** 2 < r * r
        else:
            ddx = np.maximum(np.maximum(g[0] - X, 0), X - g[2])
            ddy = np.maximum(np.maximum(g[1] - Y, 0), Y - g[3])
            m = ddx * ddx + ddy * ddy < r * r
        targets = range(4) if lay is None else lay
        for L in targets:
            blk[L, j0:j1 + 1, i0:i1 + 1] |= m
    # 板边
    pts = []
    for d in b.GetDrawings():
        if d.GetLayer() == pcbnew.Edge_Cuts:
            s, e = d.GetStart(), d.GetEnd()
            pts.append((MM(s[0]), MM(s[1]), MM(e[0]), MM(e[1])))
    X, Y = np.meshgrid(xs, ys)
    for (ax, ay, bx, by) in pts:
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
        m = (X - ax - t * dx) ** 2 + (Y - ay - t * dy) ** 2 < (EDGE + extra) ** 2
        blk[:, m] = True
    return blk


def cell(x, y):
    return int(round((y - Y0) / G)), int(round((x - X0) / G))


def astar(blk, vblk, s, goals, box, plane=False, limit=400000):
    (j0, i0, j1, i1) = box
    sl, sj, si = s
    openh = [(0, 0, s)]
    came = {s: None}
    gsc = {s: 0}
    gset = set(goals)
    gj = np.mean([g[1] for g in goals]); gi = np.mean([g[2] for g in goals])
    moves = [(0, 1, 1), (0, -1, 1), (1, 0, 1), (-1, 0, 1), (1, 1, 1.42), (1, -1, 1.42), (-1, 1, 1.42), (-1, -1, 1.42)]
    n = 0
    while openh:
        f, gcost, cur = heapq.heappop(openh)
        if cur in gset or (plane and cur != s and not vblk[cur[1], cur[2]] and came[cur] is not None):
            if plane and cur not in gset:
                path = [];  c2 = cur
                while c2:
                    path.append(c2); c2 = came[c2]
                return path[::-1] + [('VIA', cur[1], cur[2])]
            path = []
            while cur:
                path.append(cur); cur = came[cur]
            return path[::-1]
        n += 1
        if n > limit:
            return None
        L, j, i = cur
        nbrs = []
        for dj, di, c in moves:
            jj, ii = j + dj, i + di
            if j0 <= jj <= j1 and i0 <= ii <= i1 and not blk[L, jj, ii]:
                nbrs.append(((L, jj, ii), c))
        if not vblk[j, i]:
            for L2 in range(4):
                if L2 != L:
                    nbrs.append(((L2, j, i), 30))
        for nx, c in nbrs:
            ng = gcost + c
            if ng < gsc.get(nx, 1e18):
                gsc[nx] = ng; came[nx] = cur
                h = math.hypot(nx[1] - gj, nx[2] - gi)
                heapq.heappush(openh, (ng + h, ng, nx))
    return None


txt = open(rpt, encoding='utf8').read()
pairs = []
for blk_txt in txt.split('[unconnected_items]')[1:]:
    locs = re.findall(r'@\(([\d.]+) mm, ([\d.]+) mm\): (\w+)(?: \S+)? \[([^\]]+)\][^\n]*? on ([A-Za-z0-9.]+)', blk_txt.split('\n[')[0])
    if len(locs) >= 2:
        pairs.append(locs[0] + locs[1])
nets = b.GetNetsByName()
ok, bad = 0, []
for ax, ay, ak, an, al, bx, by, bk, bn, bl in pairs:
    if ak == 'Zone' or bk == 'Zone' or an != bn:
        continue
    its = items()
    blk = mask_for(an, its, TW / 2 + CLR)
    vb = mask_for(an, its, VD / 2 + CLR)
    vblk = vb.any(axis=0)
    # 孔与孔之间（不分网络）至少 0.2 mm：中心距 ≥ 孔径 + 0.2
    Xg, Yg = np.meshgrid(xs, ys)
    for t in b.GetTracks():
        if t.Type() == pcbnew.PCB_VIA_T:
            p = t.GetStart(); hx, hy = MM(p[0]), MM(p[1]); rr = VH / 2 + MM(t.GetDrillValue()) / 2 + 0.2
            j0_, j1_ = max(0, int((hy - rr - Y0) / G)), min(NY - 1, int((hy + rr - Y0) / G) + 1)
            i0_, i1_ = max(0, int((hx - rr - X0) / G)), min(NX - 1, int((hx + rr - X0) / G) + 1)
            sub = (Xg[j0_:j1_ + 1, i0_:i1_ + 1] - hx) ** 2 + (Yg[j0_:j1_ + 1, i0_:i1_ + 1] - hy) ** 2 < rr * rr
            vblk[j0_:j1_ + 1, i0_:i1_ + 1] |= sub
    for fp in b.GetFootprints():
        for pd in fp.Pads():
            if pd.GetAttribute() in (pcbnew.PAD_ATTRIB_PTH, pcbnew.PAD_ATTRIB_NPTH):
                p = pd.GetPosition(); hx, hy = MM(p[0]), MM(p[1]); rr = VH / 2 + MM(max(pd.GetDrillSize()[0], pd.GetDrillSize()[1])) / 2 + 0.2
                sub = (Xg - hx) ** 2 + (Yg - hy) ** 2 < rr * rr
                vblk |= sub
    A, B = (float(ax), float(ay)), (float(bx), float(by))
    la = [LNAME[al]] if (ak != 'Via' and al in LNAME) else list(range(4))
    lb = [LNAME[bl]] if (bk != 'Via' and bl in LNAME) else list(range(4))
    ja, ia = cell(*A); jb, ib = cell(*B)
    for L in la:
        blk[L, max(0, ja - 2):ja + 3, max(0, ia - 2):ia + 3] = False
    for L in lb:
        blk[L, max(0, jb - 2):jb + 3, max(0, ib - 2):ib + 3] = False
    PLANE = an in ('GND', '+1V8')
    pad = 120 if PLANE else 400
    box = (max(0, min(ja, jb) - pad), max(0, min(ia, ib) - pad), min(NY - 1, max(ja, jb) + pad), min(NX - 1, max(ia, ib) + pad))
    best = None
    for L in la:
        path = astar(blk, vblk, (L, ja, ia), [(L2, jb, ib) for L2 in lb], box, plane=PLANE, limit=400000 if PLANE else 3000000)
        if path and (best is None or len(path) < len(best)):
            best = path
    if not best:
        bad.append(an); continue
    ni = nets[an]
    end_via = None
    if best and best[-1][0] == 'VIA':
        end_via = (best[-1][1], best[-1][2]); best = best[:-1]
    # 路径压成线段
    segs, vias = [], []
    start = best[0]
    for k in range(1, len(best)):
        p, q = best[k - 1], best[k]
        if q[0] != p[0]:
            vias.append((p[1], p[2]))
            if start != p:
                segs.append((start, p))
            start = q
            continue
        if k + 1 < len(best):
            r = best[k + 1]
            if r[0] == q[0] and (r[1] - q[1], r[2] - q[2]) == (q[1] - p[1], q[2] - p[2]):
                continue
        segs.append((start, q)); start = q
    toxy = lambda c: (X0 + c[2] * G, Y0 + c[1] * G)
    for s0, s1 in segs:
        if s0[1:] == s1[1:]:
            continue
        t = pcbnew.PCB_TRACK(b)
        x0, y0 = toxy(s0); x1, y1 = toxy(s1)
        t.SetStart(pcbnew.VECTOR2I(FM(x0), FM(y0))); t.SetEnd(pcbnew.VECTOR2I(FM(x1), FM(y1)))
        t.SetWidth(FM(TW)); t.SetLayer(LAYERS[s0[0]]); t.SetNet(ni); b.Add(t)
    if end_via:
        vias.append(end_via)
    for j, i in vias:
        v = pcbnew.PCB_VIA(b)
        x, y = X0 + i * G, Y0 + j * G
        v.SetPosition(pcbnew.VECTOR2I(FM(x), FM(y))); v.SetViaType(pcbnew.VIATYPE_THROUGH)
        v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu); v.SetWidth(FM(VD)); v.SetDrill(FM(VH)); v.SetNet(ni); b.Add(v)
    # 端点与目标点对齐：起点 / 终点各补一小段
    for P, c in (((A, best[0]),) if end_via else ((A, best[0]), (B, best[-1]))):
        x, y = toxy(c)
        if abs(x - P[0]) > 1e-4 or abs(y - P[1]) > 1e-4:
            t = pcbnew.PCB_TRACK(b)
            t.SetStart(pcbnew.VECTOR2I(FM(P[0]), FM(P[1]))); t.SetEnd(pcbnew.VECTOR2I(FM(x), FM(y)))
            t.SetWidth(FM(TW)); t.SetLayer(LAYERS[c[0]]); t.SetNet(ni); b.Add(t)
    ok += 1
    print('routed', an, len(segs), 'segs', len(vias), 'vias', flush=True)
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(pcb, b)
print('迷宫布线 成功', ok, '失败', bad)
