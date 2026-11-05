# 地缝合过孔：在空位上按网格打 GND 过孔，把顶 / 底层铺地与内层地平面连起来（KiCad Python 运行）
import os, sys
import numpy as np
import pcbnew
sys.argv = [sys.argv[0], sys.argv[1], '-']  # 复用 maze.py 的掩膜函数
src = open(os.path.join(os.path.dirname(__file__), 'maze.py'), encoding='utf8').read()
src = src[:src.index('txt = open(rpt')]
exec(src)
its = items()
vb = mask_for('GND', its, VD / 2 + CLR).any(axis=0)
Xg, Yg = np.meshgrid(xs, ys)
holes = []
for t in b.GetTracks():
    if t.Type() == pcbnew.PCB_VIA_T:
        p = t.GetStart(); holes.append((MM(p[0]), MM(p[1])))
for fp in b.GetFootprints():
    for pd in fp.Pads():
        if pd.GetAttribute() in (pcbnew.PAD_ATTRIB_PTH, pcbnew.PAD_ATTRIB_NPTH):
            p = pd.GetPosition(); holes.append((MM(p[0]), MM(p[1])))
gnd = b.GetNetsByName()['GND']
n = 0
STEP = 1.2
for y in np.arange(Y0 + 0.8, Y0 + NY * G - 0.8, STEP):
    for x in np.arange(X0 + 0.8, X0 + NX * G - 0.8, STEP):
        x, y = float(x), float(y)
        j, i = int(round((y - Y0) / G)), int(round((x - X0) / G))
        if vb[j, i]:
            continue
        if any((x - hx) ** 2 + (y - hy) ** 2 < 0.55 ** 2 for hx, hy in holes):
            continue
        v = pcbnew.PCB_VIA(b)
        v.SetPosition(pcbnew.VECTOR2I(FM(x), FM(y))); v.SetViaType(pcbnew.VIATYPE_THROUGH)
        v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu); v.SetWidth(FM(VD)); v.SetDrill(FM(VH)); v.SetNet(gnd); b.Add(v)
        holes.append((x, y)); n += 1
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(pcb, b)
print('stitching vias', n)
