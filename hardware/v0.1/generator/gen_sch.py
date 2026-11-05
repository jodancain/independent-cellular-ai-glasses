# 生成 KiCad 原理图（.kicad_sch）、项目符号库与封装库。网络用标签连接，每个引脚一个标签。
import os, sys, uuid, json
from sexp import flat_symbol, pins as sym_pins, dump, q, unq, find
from design import BOARDS
from model import grid_footprint

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
U = lambda: str(uuid.uuid4())
GRID = 2.54


def snap(v):
    return round(v / 1.27) * 1.27


def symnode_for(part):
    if part.custom and part.custom.get('sym') is not None:
        import copy
        n = copy.deepcopy(part.custom['sym'])
        n[1] = q(f'glasses:{unq(n[1])}')
        return n
    return flat_symbol(part.lib, part.sym)


def unit_bbox(pl):
    xs = [p[3] for p in pl]; ys = [p[4] for p in pl]
    if not xs:
        return (-5, -5, 5, 5)
    return (min(xs) - 14, min(ys) - 6, max(xs) + 14, max(ys) + 6)


def build(board, projdir):
    os.makedirs(projdir, exist_ok=True)
    root = U()
    libsyms, seen = [], set()
    customs = []
    blocks = []  # (part, unit, pins, bbox)
    for p in board.parts:
        node = symnode_for(p)
        lid = unq(node[1])
        if lid not in seen:
            seen.add(lid); libsyms.append(node)
            if lid.startswith('glasses:'):
                customs.append(node)
        table = p.pin_table(node)
        p.pinlist = table
        units = sorted({t[0] for t in table})
        for u in units:
            pl = [t for t in table if t[0] == u or t[0] == 0]
            blocks.append((p, u, pl, unit_bbox(pl), lid))
    # 货架式排版
    blocks.sort(key=lambda b: -(b[3][3] - b[3][1]))
    W = 1100
    x, y, rowh = 20, 30, 0
    placed = []
    for blk in blocks:
        bx0, by0, bx1, by1 = blk[3]
        w, h = bx1 - bx0, by1 - by0
        if x + w > W:
            x, y, rowh = 20, y + rowh + 12, 0
        ox, oy = snap(x - bx0), snap(y + by1)  # 原理图 y 向下：符号 y 取反
        placed.append((blk, ox, oy))
        x += w + 10
        rowh = max(rowh, h)
    pageh = y + rowh + 60
    items = []
    netset = set()
    for (p, u, pl, bb, lid), ox, oy in placed:
        props = [['property', q('Reference'), q(p.ref), ['at', f'{ox:.2f}', f'{oy - (bb[3]) - 2:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']]]],
                 ['property', q('Value'), q(p.value), ['at', f'{ox:.2f}', f'{oy - bb[1] + 2:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']]]],
                 ['property', q('Footprint'), q(p.fp), ['at', f'{ox:.2f}', f'{oy:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]],
                 ['property', q('Datasheet'), q(''), ['at', f'{ox:.2f}', f'{oy:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]],
                 ['property', q('Note'), q(p.note), ['at', f'{ox:.2f}', f'{oy:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]]]
        inst = ['symbol', ['lib_id', q(lid)], ['at', f'{ox:.2f}', f'{oy:.2f}', '0'], ['unit', str(u)], ['exclude_from_sim', 'no'],
                ['in_bom', 'yes'], ['on_board', 'yes'], ['dnp', 'yes' if p.dnp else 'no'], ['uuid', q(U())]] + props
        for t in pl:
            inst.append(['pin', q(t[1]), ['uuid', q(U())]])
        inst.append(['instances', ['project', q(board.name), ['path', q('/' + root), ['reference', q(p.ref)], ['unit', str(u)]]]])
        items.append(inst)
        for (unit, num, name, px, py, ang, et, net) in pl:
            sx, sy = ox + px, oy - py
            if net:
                netset.add(net)
                la = (ang + 180) % 360
                just = 'left' if la in (0, 90) else 'right'
                items.append(['label', q(net), ['at', f'{sx:.2f}', f'{sy:.2f}', str(la)], ['fields_autoplaced', 'yes'],
                              ['effects', ['font', ['size', '1.0', '1.0']], ['justify', just]], ['uuid', q(U())]])
            elif et != 'no_connect':
                items.append(['no_connect', ['at', f'{sx:.2f}', f'{sy:.2f}'], ['uuid', q(U())]])
    # PWR_FLAG
    pf = flat_symbol('power', 'PWR_FLAG')
    libsyms.append(pf)
    fx = 30
    drv, need = set(), set()
    for p in board.parts:
        for t in p.pinlist:
            if t[7] and t[6] == 'power_out':
                drv.add(t[7])
            if t[7] and t[6] == 'power_in':
                need.add(t[7])
    board.flags = sorted(need - drv)
    for i, net in enumerate(board.flags):
        ox, oy = snap(fx + i * 25), snap(pageh - 30)
        items.append(['symbol', ['lib_id', q('power:PWR_FLAG')], ['at', f'{ox:.2f}', f'{oy:.2f}', '0'], ['unit', '1'], ['exclude_from_sim', 'no'], ['in_bom', 'no'], ['on_board', 'no'], ['dnp', 'no'], ['uuid', q(U())],
                      ['property', q('Reference'), q(f'#FLG{i + 1:02d}'), ['at', f'{ox:.2f}', f'{oy - 5:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]],
                      ['property', q('Value'), q('PWR_FLAG'), ['at', f'{ox:.2f}', f'{oy - 3:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']]]],
                      ['property', q('Footprint'), q(''), ['at', f'{ox:.2f}', f'{oy:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]],
                      ['property', q('Datasheet'), q(''), ['at', f'{ox:.2f}', f'{oy:.2f}', '0'], ['effects', ['font', ['size', '1.27', '1.27']], ['hide', 'yes']]],
                      ['pin', q('1'), ['uuid', q(U())]],
                      ['instances', ['project', q(board.name), ['path', q('/' + root), ['reference', q(f'#FLG{i + 1:02d}')], ['unit', '1']]]]])
        items.append(['label', q(net), ['at', f'{ox:.2f}', f'{oy:.2f}', '270'], ['fields_autoplaced', 'yes'], ['effects', ['font', ['size', '1.0', '1.0']], ['justify', 'right']], ['uuid', q(U())]])
    # 说明文字
    note = board.title + '\\n' + '\\n'.join('· ' + n for n in board.notes)
    items.append(['text', '"' + note.replace('"', "'") + '"', ['exclude_from_sim', 'no'], ['at', '20', f'{pageh - 12:.2f}', '0'], ['effects', ['font', ['size', '2.0', '2.0']], ['justify', 'left']], ['uuid', q(U())]])
    sch = ['kicad_sch', ['version', '20250114'], ['generator', q('glasses-gen')], ['generator_version', q('10.0')], ['uuid', q(root)],
           ['paper', q('User'), f'{W + 40:.0f}', f'{pageh:.0f}'],
           ['title_block', ['title', q(board.title)], ['date', q('2026-11-05')], ['rev', q('v0.1 初版')], ['company', q('独立蜂窝 AI 眼镜')],
            ['comment', '1', q(board.notes[0])], ['comment', '2', q('设计目标，未实测；占位器件引脚待供应商资料')]],
           ['lib_symbols'] + libsyms] + items + [['sheet_instances', ['path', q('/'), ['page', q('1')]]], ['embedded_fonts', 'no']]
    open(os.path.join(projdir, f'{board.name}.kicad_sch'), 'w', encoding='utf8').write(dump(sch) + '\n')
    # 项目文件与库
    open(os.path.join(projdir, f'{board.name}.kicad_pro'), 'w').write(json.dumps({'meta': {'filename': f'{board.name}.kicad_pro', 'version': 3}}, indent=2))
    lib = ['kicad_symbol_lib', ['version', '20241209'], ['generator', q('glasses-gen')]]
    for n in customs:
        import copy
        c = copy.deepcopy(n); c[1] = q(unq(c[1]).split(':', 1)[1]); lib.append(c)
    open(os.path.join(projdir, 'glasses.kicad_sym'), 'w', encoding='utf8').write(dump(lib) + '\n')
    open(os.path.join(projdir, 'sym-lib-table'), 'w').write('(sym_lib_table\n  (version 7)\n  (lib (name "glasses")(type "KiCad")(uri "${KIPRJMOD}/glasses.kicad_sym")(options "")(descr "眼镜项目自建符号"))\n)\n')
    open(os.path.join(projdir, 'fp-lib-table'), 'w').write('(fp_lib_table\n  (version 7)\n  (lib (name "glasses")(type "KiCad")(uri "${KIPRJMOD}/glasses.pretty")(options "")(descr "眼镜项目自建封装"))\n)\n')
    pretty = os.path.join(projdir, 'glasses.pretty'); os.makedirs(pretty, exist_ok=True)
    for p in board.parts:
        if not p.custom:
            continue
        if 'fpraw' in p.custom:
            nm, txt = p.custom['fpraw']
            open(os.path.join(pretty, nm + '.kicad_mod'), 'w').write(txt)
        elif 'fp' in p.custom:
            nm, n, (w, h) = p.custom['fp']
            open(os.path.join(pretty, nm + '.kicad_mod'), 'w').write(grid_footprint(nm, n, w, h, desc=p.note, text='PLACEHOLDER 引脚待资料'))
    # 网表（供 PCB 生成）
    from design import role_of
    net = {p.ref: {'role': role_of(board.name, p.group), 'fp': p.fp, 'value': p.value, 'side': p.side, 'pos': p.pos, 'rot': p.rot, 'group': p.group, 'dnp': p.dnp, 'note': p.note,
                   'pads': {t[1]: t[7] for t in p.pinlist if t[7]}} for p in board.parts}
    json.dump({'name': board.name, 'title': board.title, 'layers': board.layers, 'outline': board.outline, 'notes': board.notes, 'parts': net},
              open(os.path.join(projdir, f'{board.name}.netlist.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    return len(netset)


if __name__ == '__main__':
    for f in BOARDS:
        b = f()
        n = build(b, os.path.join(OUT, b.name))
        print(b.name, 'parts', len(b.parts), 'nets', n)
