# 给没有过孔的铺地孤岛各补一个地过孔（KiCad Python 运行）：island_vias.py <项目目录>
import os, sys
import numpy as np
import pcbnew
sys.argv = [sys.argv[0], sys.argv[1], '-']
src = open(os.path.join(os.path.dirname(__file__), 'maze.py'), encoding='utf8').read()
exec(src[:src.index('txt = open(rpt')])
gnd = b.GetNetsByName()['GND']
vias = [(MM(t.GetStart()[0]), MM(t.GetStart()[1])) for t in b.GetTracks() if t.Type() == pcbnew.PCB_VIA_T and t.GetNetname() == 'GND']
its = items()
vb = mask_for('GND', its, VD / 2 + CLR).any(axis=0)
holes = [(MM(t.GetStart()[0]), MM(t.GetStart()[1])) for t in b.GetTracks() if t.Type() == pcbnew.PCB_VIA_T]
added = 0
for z in b.Zones():
    if z.GetNetname() != 'GND' or z.GetLayer() not in (pcbnew.F_Cu, pcbnew.B_Cu):
        continue
    polys = z.GetFilledPolysList(z.GetLayer())
    for k in range(polys.OutlineCount()):
        ol = polys.Outline(k)
        has = any(polys.Contains(pcbnew.VECTOR2I(FM(x), FM(y)), k) for x, y in vias)
        if has:
            continue
        bbx = ol.BBox()
        cand = None
        for y in np.arange(MM(bbx.GetTop()), MM(bbx.GetBottom()), G * 2):
            for x in np.arange(MM(bbx.GetLeft()), MM(bbx.GetRight()), G * 2):
                x, y = float(x), float(y)
                j, i = int(round((y - Y0) / G)), int(round((x - X0) / G))
                if not (0 <= j < NY and 0 <= i < NX) or vb[j, i]:
                    continue
                if not polys.Contains(pcbnew.VECTOR2I(FM(x), FM(y)), k):
                    continue
                if any((x - hx) ** 2 + (y - hy) ** 2 < 0.55 ** 2 for hx, hy in holes):
                    continue
                cand = (x, y); break
            if cand:
                break
        if cand:
            v = pcbnew.PCB_VIA(b)
            v.SetPosition(pcbnew.VECTOR2I(FM(cand[0]), FM(cand[1]))); v.SetViaType(pcbnew.VIATYPE_THROUGH)
            v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu); v.SetWidth(FM(VD)); v.SetDrill(FM(VH)); v.SetNet(gnd); b.Add(v)
            holes.append(cand); vias.append(cand); added += 1
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(pcb, b)
print('island vias', added)
