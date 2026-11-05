# 用 Freerouting 给板子自动布线（KiCad Python 运行）
# 步骤：设层类型与电源平面 → 导出 Specctra DSN → 加线宽规则 → Freerouting → 导入 SES → 补铺铜 → 保存
# 用法：<KiCad python3.9> route.py <项目目录> <java> <freerouting.jar> [passes]
import os, re, subprocess, sys, json
import pcbnew

proj, JAVA, JAR = sys.argv[1], sys.argv[2], sys.argv[3]
PASSES = sys.argv[4] if len(sys.argv) > 4 else '40'
name = os.path.basename(proj.rstrip('/'))
pcb = os.path.join(proj, name + '.kicad_pcb')
b = pcbnew.LoadBoard(pcb)
mm = pcbnew.FromMM

# 6 层：F.Cu 信号 / In1 地平面 / In2 信号 / In3 电源平面（+1V8）/ In4 信号 / B.Cu 信号
POWER_LAYERS = {pcbnew.In1_Cu: 'GND', pcbnew.In3_Cu: '+1V8'}
for lid in POWER_LAYERS:
    b.SetLayerType(lid, pcbnew.LT_POWER)

# 删掉旧的平面，按层重铺
for z in list(b.Zones()):
    b.Remove(z)
pts = json.load(open(os.path.join(proj, name + '.netlist.json'), encoding='utf8'))['outline']
cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
nets = b.GetNetsByName()
for lid, netname in POWER_LAYERS.items():
    z = pcbnew.ZONE(b)
    z.SetLayer(lid)
    z.SetNet(nets[netname])
    z.SetLocalClearance(mm(0.2))
    z.SetMinThickness(mm(0.15))
    ol = z.Outline()
    ol.NewOutline()
    for x, y in pts:
        ix, iy = x + (0.6 if cx > x else -0.6), y + (0.6 if cy > y else -0.6)
        ol.Append(mm(100 + ix), mm(100 + iy))
    b.Add(z)
pcbnew.ZONE_FILLER(b).Fill(b.Zones())

# ---- 先扇出：GND / +1V8 每个贴片焊盘打一个过孔到平面 ----
VIA_D, VIA_H, CLR = 0.3, 0.15, 0.1
def rect_of(pad):
    bb = pad.GetBoundingBox()
    return (pcbnew.ToMM(bb.GetLeft()), pcbnew.ToMM(bb.GetTop()), pcbnew.ToMM(bb.GetRight()), pcbnew.ToMM(bb.GetBottom()))
allpads = [(pad, rect_of(pad)) for fp in b.GetFootprints() for pad in fp.Pads()]
# 板框边距 0.6 mm 以内不打过孔
board_bb = b.GetBoardEdgesBoundingBox()
def inside_board(x, y, m=0.6):
    return pcbnew.ToMM(board_bb.GetLeft()) + m < x < pcbnew.ToMM(board_bb.GetRight()) - m and pcbnew.ToMM(board_bb.GetTop()) + m < y < pcbnew.ToMM(board_bb.GetBottom()) - m
placed_vias = []
def free(x, y, net):
    r = VIA_D / 2 + CLR
    for pad, (x0, y0, x1, y1) in allpads:
        if pad.GetNetname() == net:
            continue
        dx = max(x0 - x, 0, x - x1); dy = max(y0 - y, 0, y - y1)
        if dx * dx + dy * dy < r * r:
            return False
    return all((x - vx) ** 2 + (y - vy) ** 2 >= (VIA_D + CLR) ** 2 for vx, vy in placed_vias)
def seg_free(x0, y0, x1, y1, net):
    r = 0.075 + 0.09
    for k in range(1, 6):
        t = k / 6
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        for pad, (a0, b0, a1, b1) in allpads:
            if pad.GetNetname() == net:
                continue
            dx = max(a0 - x, 0, x - a1); dy = max(b0 - y, 0, y - b1)
            if dx * dx + dy * dy < r * r:
                return False
    return True
def add_via(x, y, net):
    v = pcbnew.PCB_VIA(b)
    v.SetPosition(pcbnew.VECTOR2I(mm(x), mm(y)))
    v.SetViaType(pcbnew.VIATYPE_THROUGH)
    v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
    v.SetWidth(mm(VIA_D)); v.SetDrill(mm(VIA_H))
    v.SetNet(net); b.Add(v); placed_vias.append((x, y))
def add_track(x0, y0, x1, y1, layer, net, w=0.2):
    t = pcbnew.PCB_TRACK(b)
    t.SetStart(pcbnew.VECTOR2I(mm(x0), mm(y0))); t.SetEnd(pcbnew.VECTOR2I(mm(x1), mm(y1)))
    t.SetWidth(mm(w)); t.SetLayer(layer); t.SetNet(net); b.Add(t)
fan_n = {'in_pad': 0, 'stub': 0, 'skip': 0}
for fp in b.GetFootprints():
    for pad in fp.Pads():
        net = pad.GetNetname()
        if net not in POWER_LAYERS.values() or pad.GetAttribute() != pcbnew.PAD_ATTRIB_SMD:
            continue
        x0, y0, x1, y1 = rect_of(pad)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        w, h = x1 - x0, y1 - y0
        layer = pcbnew.B_Cu if fp.IsFlipped() else pcbnew.F_Cu
        ni = pad.GetNet()
        big = min(w, h) >= 0.9 or fp.GetReference() == 'U1'
        if big and free(cx, cy, net):
            add_via(cx, cy, ni); fan_n['in_pad'] += 1; continue
        done = False
        for d in (0.35, 0.55, 0.8):
            for ux, uy in ((0, -1), (0, 1), (-1, 0), (1, 0), (-0.7, -0.7), (0.7, -0.7), (-0.7, 0.7), (0.7, 0.7)):
                vx, vy = cx + ux * (w / 2 + d), cy + uy * (h / 2 + d)
                if inside_board(vx, vy) and free(vx, vy, net) and seg_free(cx, cy, vx, vy, net):
                    add_via(vx, vy, ni); add_track(cx, cy, vx, vy, layer, ni, 0.15); fan_n['stub'] += 1; done = True; break
            if done:
                break
        if not done:
            fan_n['skip'] += 1
print('fanout', fan_n, flush=True)

def run_pass(passes, tag):
    dsn = os.path.join(proj, name + '.dsn')
    ses = os.path.join(proj, name + '.ses')
    if not pcbnew.ExportSpecctraDSN(b, dsn):
        raise SystemExit('DSN 导出失败')

    # 电源网络加粗：在 network 段加一个 class
    txt = open(dsn, encoding='utf8').read()
    m = re.search(r'\(class kicad_default (.*?)\n(\s*)\(circuit', txt, re.S)
    names = m.group(1).split()
    present = [n for n in POWER if n in names]
    keep = [n for n in names if n not in present]
    txt = txt[:m.start(1)] + ' '.join(keep) + txt[m.end(1):]
    end = txt.index('\n', txt.index('(rule', m.start()))
    blk_end = txt.index('    )\n', end) + 6
    cls = '    (class pwr ' + ' '.join(present) + '\n      (circuit (use_via "Via[0-5]_300:150_um"))\n      (rule (width 250) (clearance 100))\n    )\n'
    txt = txt[:blk_end] + cls + txt[blk_end:]
    txt = txt.replace('    (via "Via[0-5]_300:150_um")\n', '    (via "Via[0-5]_300:150_um")\n    (control (via_at_smd on))\n', 1)
    txt = re.sub(r'\(clearance 90\)', '(clearance 100)', txt)
    open(dsn, 'w', encoding='utf8').write(txt)

    if os.environ.get('DRY'):
        raise SystemExit('dry')
    if os.path.exists(ses):
        os.remove(ses)
    cmd = [JAVA, '-jar', JAR, '-de', dsn, '-do', ses, '-mp', str(passes), '--gui.enabled=false']
    print(' '.join(cmd), flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    print(tag, [l for l in r.stdout.splitlines() if 'stage completed' in l][-1:], flush=True)
    if not os.path.exists(ses):
        raise SystemExit('没有生成 SES')

    if not pcbnew.ImportSpecctraSES(b, ses):
        raise SystemExit('SES 导入失败')
    # Freerouting 在细间距引脚处会把线收窄到 0.075 mm，低于嘉立创 0.09 mm，统一加宽到 0.09 mm
    widened = 0
    for t in b.GetTracks():
        if t.Type() != pcbnew.PCB_VIA_T and t.GetWidth() < mm(0.09):
            t.SetWidth(mm(0.09)); widened += 1
    print(tag, 'widened', widened)

POWER = ['VBUS', 'VBAT', 'VSYS', '+1V8', '+1V8_AON', '+3V3', 'VCORE_0V8', 'N6_SMPS_LX', 'BUCK_SW', 'SPK_P', 'SPK_N', 'GND']
run_pass(PASSES, '第一遍')
# 顶层、底层铺地：没地方打过孔的地焊盘经铺铜连到地
for lid in (pcbnew.F_Cu, pcbnew.B_Cu):
    z = pcbnew.ZONE(b)
    z.SetLayer(lid); z.SetNet(nets['GND'])
    z.SetLocalClearance(mm(0.15)); z.SetMinThickness(mm(0.12))
    z.SetAssignedPriority(0)
    z.SetIslandRemovalMode(pcbnew.ISLAND_REMOVAL_MODE_ALWAYS)
    ol = z.Outline(); ol.NewOutline()
    for x, y in pts:
        ix, iy = x + (0.4 if cx > x else -0.4), y + (0.4 if cy > y else -0.4)
        ol.Append(mm(100 + ix), mm(100 + iy))
    b.Add(z)
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
run_pass(30, '第二遍')
run_pass(30, '第三遍')
# 清掉没接上任何东西的过孔（失败尝试留下的）
ends = {}
for t in b.GetTracks():
    if t.Type() != pcbnew.PCB_VIA_T:
        for p in (t.GetStart(), t.GetEnd()):
            ends.setdefault(t.GetNetname(), set()).add((p.x, p.y))
removed = 0
for v in [t for t in b.GetTracks() if t.Type() == pcbnew.PCB_VIA_T]:
    n = v.GetNetname()
    if n in POWER_LAYERS.values():
        continue
    pos = v.GetPosition()
    if (pos.x, pos.y) not in ends.get(n, set()):
        on_pad = any(pad.GetNetname() == n and pad.HitTest(pos) for fp in b.GetFootprints() for pad in fp.Pads())
        if not on_pad:
            b.Remove(v); removed += 1
print('removed dangling vias', removed)
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(pcb, b)
# 规则写进项目文件（嘉立创多层板能力：线宽 / 间距 0.09–0.1 mm，过孔 0.3 / 0.15 mm）
pro = os.path.join(proj, name + '.kicad_pro')
d = json.load(open(pro, encoding='utf8'))
r = d['board']['design_settings']['rules']
r.update({'min_copper_edge_clearance': 0.25, 'min_clearance': 0.09, 'min_track_width': 0.09, 'min_via_diameter': 0.25, 'min_through_hole_diameter': 0.15,
          'min_via_annular_width': 0.05, 'min_hole_clearance': 0.15, 'min_hole_to_hole': 0.2})
cls = d['net_settings']['classes']
for c in cls:
    c['clearance'] = 0.09
if not any(c['name'] == 'Power' for c in cls):
    pw = dict(cls[0]); pw.update({'name': 'Power', 'track_width': 0.25, 'priority': 0}); cls.append(pw)
d['net_settings']['netclass_patterns'] = [{'netclass': 'Power', 'pattern': n} for n in POWER]
json.dump(d, open(pro, 'w', encoding='utf8'), indent=2, ensure_ascii=False)
tracks = [t for t in b.GetTracks()]
vias = [t for t in tracks if t.Type() == pcbnew.PCB_VIA_T]
print(json.dumps({'tracks': len(tracks) - len(vias), 'vias': len(vias)}))
