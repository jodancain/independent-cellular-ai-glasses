# 按 DRC 报告删掉悬空过孔，再补铺铜（KiCad Python 运行）：drc_cleanup.py <项目目录> <drc.rpt>
import re, sys, os
import pcbnew
proj, rpt = sys.argv[1], sys.argv[2]
name = os.path.basename(proj.rstrip('/'))
pcb = os.path.join(proj, name + '.kicad_pcb')
b = pcbnew.LoadBoard(pcb)
txt = open(rpt, encoding='utf8').read()
pos = [(float(x), float(y)) for x, y in re.findall(r'\[via_dangling\][^\n]*\n[^\n]*\n\s*@\(([\d.]+) mm, ([\d.]+) mm\): Via', txt)]
vias = [(t, pcbnew.ToMM(t.GetStart()[0]), pcbnew.ToMM(t.GetStart()[1])) for t in b.GetTracks() if t.Type() == pcbnew.PCB_VIA_T]
kill = [v for v, x, y in vias if any(abs(x - px) < 0.002 and abs(y - py) < 0.002 for px, py in pos)]
for v in kill:
    b.Remove(v)
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(pcb, b)
print('removed', len(kill), 'of', len(pos))
