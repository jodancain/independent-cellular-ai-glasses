# 补布剩下的断线：两端打过孔，内层（In2 / In4）走直线或 L 形，逐条做几何间距检查（KiCad Python 运行）
# 用法：fixgaps.py <项目目录> <drc.rpt>
import math, os, re, sys
import pcbnew

proj, rpt = sys.argv[1], sys.argv[2]
name = os.path.basename(proj.rstrip('/'))
pcb = os.path.join(proj, name + '.kicad_pcb')
b = pcbnew.LoadBoard(pcb)
MM = pcbnew.ToMM
FM = lambda v: int(round(pcbnew.FromMM(v)))
CLR, TW, VD, VH = 0.1, 0.1, 0.3, 0.15
SIG = [pcbnew.In2_Cu, pcbnew.In4_Cu]
LN = {'F.Cu': pcbnew.F_Cu, 'B.Cu': pcbnew.B_Cu, 'In2.Cu': pcbnew.In2_Cu, 'In4.Cu': pcbnew.In4_Cu}


def seg_dist(p, q, a, c):
    """线段 pq 与线段 ac 的最短距离"""
    def pt_seg(x, y, s0, s1):
        dx, dy = s1[0] - s0[0], s1[1] - s0[1]
        L = dx * dx + dy * dy
        t = 0 if L == 0 else max(0, min(1, ((x - s0[0]) * dx + (y - s0[1]) * dy) / L))
        return math.hypot(x - s0[0] - t * dx, y - s0[1] - t * dy)
    def inter(p1, p2, p3, p4):
        d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0])
        if d == 0:
            return False
        t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d
        u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d
        return 0 <= t <= 1 and 0 <= u <= 1
    if inter(p, q, a, c):
        return 0.0
    return min(pt_seg(p[0], p[1], a, c), pt_seg(q[0], q[1], a, c), pt_seg(a[0], a[1], p, q), pt_seg(c[0], c[1], p, q))


def obstacles():
    obs = []  # (layers set or None=all, kind, geom, half_width, net)
    for t in b.GetTracks():
        n = t.GetNetname()
        if t.Type() == pcbnew.PCB_VIA_T:
            p = t.GetPosition()
            obs.append((None, 'pt', (MM(p.x), MM(p.y)), MM(t.GetWidth(pcbnew.F_Cu)) / 2, n))
        else:
            s, e = t.GetStart(), t.GetEnd()
            obs.append(({t.GetLayer()}, 'seg', ((MM(s.x), MM(s.y)), (MM(e.x), MM(e.y))), MM(t.GetWidth()) / 2, n))
    for fp in b.GetFootprints():
        for pad in fp.Pads():
            bb = pad.GetBoundingBox()
            x0, y0, x1, y1 = MM(bb.GetLeft()), MM(bb.GetTop()), MM(bb.GetRight()), MM(bb.GetBottom())
            lay = None if pad.GetAttribute() in (pcbnew.PAD_ATTRIB_PTH, pcbnew.PAD_ATTRIB_NPTH) else {pcbnew.B_Cu if fp.IsFlipped() else pcbnew.F_Cu}
            obs.append((lay, 'rect', (x0, y0, x1, y1), 0, pad.GetNetname()))
    return obs


def rect_seg_dist(r, a, c):
    x0, y0, x1, y1 = r
    cx, cy = min(max(a[0], x0), x1), min(max(a[1], y0), y1)
    if x0 <= a[0] <= x1 and y0 <= a[1] <= y1:
        return 0.0
    edges = [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]
    return min(seg_dist(a, c, e0, e1) for e0, e1 in edges)


def clear(geom_layers, kind, g, hw, net, obs):
    for lay, k, og, ohw, onet in obs:
        if onet == net and net:
            continue
        if lay is not None and geom_layers is not None and not (lay & geom_layers):
            continue
        need = hw + ohw + CLR
        if kind == 'pt':
            a = c = g
        else:
            a, c = g
        if k == 'rect':
            d = rect_seg_dist(og, a, c)
        elif k == 'pt':
            d = seg_dist(a, c, og, og)
        else:
            d = seg_dist(a, c, og[0], og[1])
        if d < need - 1e-6:
            return False
    return True


txt = open(rpt, encoding='utf8').read()
pairs = re.findall(r'\[unconnected_items\][^\n]*\n[^\n]*\n\s*@\(([\d.]+) mm, ([\d.]+) mm\): (\w+) \[([^\]]+)\][^\n]*?on (\S+)[^\n]*\n\s*@\(([\d.]+) mm, ([\d.]+) mm\): (\w+) \[([^\]]+)\][^\n]*?on (\S+)', txt)
nets = b.GetNetsByName()
done, fail = 0, []
for ax, ay, ak, an, al, bx, by, bk, bnet, bl in pairs:
    if ak == 'Zone' or bk == 'Zone' or an != bnet:
        continue
    A, B = (float(ax), float(ay)), (float(bx), float(by))
    obs = obstacles()
    ok = False
    for L in SIG:
        for path in ([A, B], [A, (B[0], A[1]), B], [A, (A[0], B[1]), B]):
            needs_va = ak != 'Via' and LN.get(al.rstrip(','), -1) != L
            needs_vb = bk != 'Via' and LN.get(bl.rstrip(','), -1) != L
            if needs_va and not clear(None, 'pt', A, VD / 2, an, obs):
                continue
            if needs_vb and not clear(None, 'pt', B, VD / 2, an, obs):
                continue
            if not all(clear({L}, 'seg', (path[i], path[i + 1]), TW / 2, an, obs) for i in range(len(path) - 1)):
                continue
            ni = nets[an]
            for need, P in ((needs_va, A), (needs_vb, B)):
                if need:
                    v = pcbnew.PCB_VIA(b); v.SetPosition(pcbnew.VECTOR2I(FM(P[0]), FM(P[1])))
                    v.SetViaType(pcbnew.VIATYPE_THROUGH); v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
                    v.SetWidth(FM(VD)); v.SetDrill(FM(VH)); v.SetNet(ni); b.Add(v)
            for i in range(len(path) - 1):
                t = pcbnew.PCB_TRACK(b)
                t.SetStart(pcbnew.VECTOR2I(FM(path[i][0]), FM(path[i][1]))); t.SetEnd(pcbnew.VECTOR2I(FM(path[i + 1][0]), FM(path[i + 1][1])))
                t.SetWidth(FM(TW)); t.SetLayer(L); t.SetNet(ni); b.Add(t)
            ok = True
            break
        if ok:
            break
    if ok:
        done += 1
    else:
        fail.append(an)
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(pcb, b)
print('补线', done, '失败', fail)
