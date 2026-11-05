# 按 网络 + 层 + 长度 删掉指定走线（KiCad Python 运行）：drop_tracks.py <pcb> NET:LAYER:LEN ...
import sys
import pcbnew
b = pcbnew.LoadBoard(sys.argv[1])
want = [a.split(':') for a in sys.argv[2:]]
n = 0
for t in list(b.GetTracks()):
    if t.Type() == pcbnew.PCB_VIA_T:
        continue
    for net, lay, ln in want:
        if t.GetNetname() == net and t.GetLayerName() == lay and abs(pcbnew.ToMM(t.GetLength()) - float(ln)) < 0.002:
            b.Remove(t); n += 1; break
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(sys.argv[1], b)
print('dropped', n)
