# 把 KiCad 导出的 BOM / 坐标转成嘉立创 SMT 格式（BOM: Comment,Designator,Footprint,LCSC；CPL: Designator,Mid X,Mid Y,Layer,Rotation）
import csv, sys, os
d = sys.argv[1]
rows = list(csv.DictReader(open(os.path.join(d, 'kicad-bom.csv'), encoding='utf8')))
with open(os.path.join(d, 'BOM_JLCPCB.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['Comment', 'Designator', 'Footprint', 'LCSC', 'Qty', 'DNP', '备注'])
    for r in rows:
        ph = 'PLACEHOLDER' in r['Footprint'] or r['Footprint'].startswith('glasses:PH_')
        w.writerow([r['Comment'], r['Designator'], r['Footprint'].split(':')[-1], '', r['Qty'], r['DNP'],
                    '占位器件，不能下单' if ph else '待填立创商城编号'])
pos = list(csv.DictReader(open(os.path.join(d, 'kicad-pos.csv'), encoding='utf8')))
with open(os.path.join(d, 'CPL_JLCPCB.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['Designator', 'Mid X', 'Mid Y', 'Layer', 'Rotation'])
    for r in pos:
        w.writerow([r['Ref'], r['PosX'] + 'mm', r['PosY'] + 'mm', 'Top' if r['Side'] == 'top' else 'Bottom', r['Rot']])
