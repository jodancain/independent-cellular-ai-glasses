# 设计数据模型：一份描述同时生成原理图与 PCB。
import json, re, os
from sexp import flat_symbol, pins as sym_pins, find, unq, q

HERE = os.path.dirname(os.path.abspath(__file__))
IDX = json.load(open(os.path.join(HERE, 'symidx.json')))


class Part:
    def __init__(self, ref, sym, fp, value, nets, lib=None, custom=None, dnp=False, note='', side='F', pos=None, rot=0, group=None):
        self.ref, self.sym, self.fp, self.value, self.dnp, self.note = ref, sym, fp, value, dnp, note
        self.lib = lib or (None if custom else IDX[sym])
        self.custom = custom  # 自定义符号: dict(units=[[(num,name,type,side),...],...], body)
        self.nets = nets      # {pin name 或 number: net}
        self.side, self.pos, self.rot, self.group = side, pos, rot, group
        self.pinlist = None

    def lib_id(self):
        return f'{self.lib}:{self.sym}' if self.lib else f'glasses:{self.sym}'

    def pin_table(self, symnode):
        """返回 [(unit, number, name, x, y, angle, type, net)]"""
        P = sym_pins(symnode)
        byname = {}
        for p in P:
            byname.setdefault(p[2], []).append(p)
        assigned = {}
        for k, net in self.nets.items():
            hits = [p for p in P if p[1] == str(k)] or byname.get(k, [])
            if not hits:
                raise KeyError(f'{self.ref} {self.sym}: 没有引脚 {k}')
            for p in hits:
                assigned[(p[0], p[1])] = net
        return [p + (assigned.get((p[0], p[1])),) for p in P]


class Board:
    def __init__(self, name, title, layers, outline, notes):
        self.name, self.title, self.layers, self.outline, self.notes = name, title, layers, outline, notes
        self.parts = []
        self.flags = []  # 需要 PWR_FLAG 的网络

    def add(self, *a, **k):
        p = Part(*a, **k)
        assert p.ref not in {x.ref for x in self.parts}, p.ref
        self.parts.append(p)
        return p

    # 常用无源件
    def R(self, ref, value, a, b, size='0201', **k):
        return self.add(ref, 'R', f'Resistor_SMD:R_{size}_{dict(m0201="0603",m0402="1005",m0603="1608")["m"+size]}Metric', value, {'1': a, '2': b}, **k)

    def C(self, ref, value, a, b, size='0201', **k):
        return self.add(ref, 'C', f'Capacitor_SMD:C_{size}_{dict(m0201="0603",m0402="1005",m0603="1608")["m"+size]}Metric', value, {'1': a, '2': b}, **k)

    def L(self, ref, value, a, b, fp='Inductor_SMD:L_0603_1608Metric', **k):
        return self.add(ref, 'L', fp, value, {'1': a, '2': b}, **k)


# ---------- 自定义符号与封装 ----------
def custom_symbol(name, units, ref='U', value=None, footprint='', desc=''):
    """units: [[(num, name, etype, side)]] side in L/R/T/B"""
    body = []
    for ui, pins in enumerate(units, start=1):
        left = [p for p in pins if p[3] == 'L']
        right = [p for p in pins if p[3] == 'R']
        n = max(len(left), len(right), 1)
        w = max(20.32, 2.54 * round((max([len(p[1]) for p in pins] + [4]) * 1.27 * 2 + 10) / 2.54))
        h = 2.54 * (n + 1)
        top = h / 2
        items = [['rectangle', ['start', f'{-w/2:.2f}', f'{top:.2f}'], ['end', f'{w/2:.2f}', f'{-top:.2f}'],
                  ['stroke', ['width', '0.254'], ['type', 'default']], ['fill', ['type', 'background']]]]
        for side, lst in (('L', left), ('R', right)):
            for i, (num, nm, et, _) in enumerate(lst):
                y = top - 2.54 * (i + 1)
                x = -w / 2 - 2.54 if side == 'L' else w / 2 + 2.54
                ang = 0 if side == 'L' else 180
                items.append(['pin', et, 'line', ['at', f'{x:.2f}', f'{y:.2f}', str(ang)], ['length', '2.54'],
                              ['name', q(nm), ['effects', ['font', ['size', '1.0', '1.0']]]],
                              ['number', q(num), ['effects', ['font', ['size', '1.0', '1.0']]]]])
        body.append(['symbol', q(f'{name}_{ui}_1')] + items)
    props = [
        ['property', q('Reference'), q(ref), ['at', '0', '0', '0'], ['effects', ['font', ['size', '1.27', '1.27']]]],
        ['property', q('Value'), q(value or name), ['at', '0', '-2', '0'], ['effects', ['font', ['size', '1.27', '1.27']]]],
        ['property', q('Footprint'), q(footprint), ['at', '0', '0', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]],
        ['property', q('Datasheet'), q(''), ['at', '0', '0', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]],
        ['property', q('Description'), q(desc), ['at', '0', '0', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]],
    ]
    return ['symbol', q(name), ['pin_names', ['offset', '1.016']], ['exclude_from_sim', 'no'], ['in_bom', 'yes'], ['on_board', 'yes']] + props + body


def bga_footprint(name, balls, pitch, body, pad=0.35, desc=''):
    """balls: [(ballname, col_index0, row_index0)]"""
    ncol = max(b[1] for b in balls) + 1
    nrow = max(b[2] for b in balls) + 1
    ox = -(ncol - 1) * pitch / 2
    oy = -(nrow - 1) * pitch / 2
    h = body / 2
    L = [f'(footprint "{name}"', '  (version 20240108) (generator "glasses-gen")', '  (layer "F.Cu")',
         f'  (descr "{desc}")', '  (attr smd)',
         '  (property "Reference" "REF**" (at 0 %.2f 0) (layer "F.SilkS") (effects (font (size 0.6 0.6) (thickness 0.1))))' % (-h - 1),
         f'  (property "Value" "{name}" (at 0 {h + 1:.2f} 0) (layer "F.Fab") (effects (font (size 0.6 0.6) (thickness 0.1))))',
         f'  (fp_rect (start {-h:.2f} {-h:.2f}) (end {h:.2f} {h:.2f}) (stroke (width 0.1) (type default)) (fill no) (layer "F.Fab"))',
         f'  (fp_rect (start {-h - 0.25:.2f} {-h - 0.25:.2f}) (end {h + 0.25:.2f} {h + 0.25:.2f}) (stroke (width 0.05) (type default)) (fill no) (layer "F.CrtYd"))',
         f'  (fp_line (start {-h - 0.15:.2f} {-h + 1:.2f}) (end {-h - 0.15:.2f} {-h - 0.15:.2f}) (stroke (width 0.12) (type default)) (layer "F.SilkS"))',
         f'  (fp_line (start {-h - 0.15:.2f} {-h - 0.15:.2f}) (end {-h + 1:.2f} {-h - 0.15:.2f}) (stroke (width 0.12) (type default)) (layer "F.SilkS"))']
    for bn, c, r in balls:
        L.append(f'  (pad "{bn}" smd circle (at {ox + c * pitch:.3f} {oy + r * pitch:.3f}) (size {pad} {pad}) (layers "F.Cu" "F.Paste" "F.Mask"))')
    L.append(')')
    return '\n'.join(L) + '\n'


def grid_footprint(name, n, body_w, body_h, pitch=0.5, pad=0.28, desc='', text='PLACEHOLDER'):
    """占位封装：在机身范围内按网格排 n 个焊盘，编号 1..n。"""
    cols = max(1, int((body_w - 1) / pitch))
    balls = []
    rowsneeded = (n + cols - 1) // cols
    for i in range(n):
        balls.append((str(i + 1), i % cols, i // cols))
    ox = -(cols - 1) * pitch / 2
    oy = -(rowsneeded - 1) * pitch / 2
    hw, hh = body_w / 2, body_h / 2
    L = [f'(footprint "{name}"', '  (version 20240108) (generator "glasses-gen")', '  (layer "F.Cu")', f'  (descr "{desc}")', '  (attr smd)',
         f'  (property "Reference" "REF**" (at 0 {-hh - 1:.2f} 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))',
         f'  (property "Value" "{name}" (at 0 {hh + 1:.2f} 0) (layer "F.Fab") (effects (font (size 0.8 0.8) (thickness 0.12))))',
         f'  (fp_rect (start {-hw:.2f} {-hh:.2f}) (end {hw:.2f} {hh:.2f}) (stroke (width 0.12) (type dash)) (fill no) (layer "F.SilkS"))',
         f'  (fp_rect (start {-hw:.2f} {-hh:.2f}) (end {hw:.2f} {hh:.2f}) (stroke (width 0.1) (type default)) (fill no) (layer "F.Fab"))',
         f'  (fp_rect (start {-hw - 0.25:.2f} {-hh - 0.25:.2f}) (end {hw + 0.25:.2f} {hh + 0.25:.2f}) (stroke (width 0.05) (type default)) (fill no) (layer "F.CrtYd"))',
         f'  (fp_text user "{text}" (at 0 {hh - 0.8:.2f} 0) (layer "F.Fab") (effects (font (size 0.6 0.6) (thickness 0.1))))']
    for bn, c, r in balls:
        L.append(f'  (pad "{bn}" smd roundrect (at {ox + c * pitch:.3f} {oy + r * pitch:.3f}) (size {pad} {pad}) (layers "F.Cu" "F.Paste" "F.Mask") (roundrect_rratio 0.25))')
    L.append(')')
    return '\n'.join(L) + '\n'


def placeholder(board, ref, name, value, body, pins, fpname=None, note='', **k):
    """pins: [(name, net, etype)]；自动分左右；生成占位符号与占位封装。"""
    n = len(pins)
    units, cur = [], []
    half = (n + 1) // 2
    plist = []
    for i, (nm, net, et) in enumerate(pins):
        plist.append((str(i + 1), nm, et, 'L' if i < half else 'R'))
    units = [plist]
    fpname = fpname or f'PH_{name}'
    sym = custom_symbol(name, units, ref=re.sub(r'\d+', '', ref), value=value, footprint=f'glasses:{fpname}', desc=note)
    nets = {str(i + 1): net for i, (nm, net, et) in enumerate(pins) if net}
    p = board.add(ref, name, f'glasses:{fpname}', value, nets, custom={'sym': sym, 'fp': (fpname, n, body)}, note=note, **k)
    return p
