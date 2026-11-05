# 生成 three.js 查看页用的 summary.json（含角色分组、检查结果）
import sys, json, re, collections
H, OUTF = sys.argv[1], sys.argv[2]
out = {}
for b in ['mcu_board', 'main_board']:
    nl = json.load(open(f'{H}/kicad/{b}/{b}.netlist.json', encoding='utf8'))
    erc = open(f'{H}/exports/{b}/erc.rpt', encoding='utf8').read(); drc = open(f'{H}/exports/{b}/drc.rpt', encoding='utf8').read()
    cnt = lambda t: collections.Counter(re.findall(r'^\[([a-z_]+)\]', t, re.M))
    parts = nl['parts']
    ph = [r for r, p in parts.items() if ':PH_' in p['fp']]
    nets = set(n for p in parts.values() for n in p['pads'].values())
    roles = collections.OrderedDict()
    for r, p in sorted(parts.items(), key=lambda kv: (kv[1]['role'], kv[0])):
        roles.setdefault(p['role'], []).append({'ref': r, 'value': p['value']})
    out[b] = {'title': nl['title'], 'notes': nl['notes'], 'layers': nl['layers'], 'parts': len(parts), 'nets': len(nets),
              'placeholders': [{'ref': r, 'value': parts[r]['value'], 'note': parts[r]['note']} for r in ph],
              'erc': cnt(erc), 'drc': cnt(drc), 'unconnected': int((re.search(r'Found (\d+) unconnected', drc) or [0, 0])[1]),
              'roles': roles,
              'ics': [{'ref': r, 'value': p['value'], 'note': p['note'], 'role': p['role']} for r, p in sorted(parts.items()) if r[0] in 'UJ' or r.startswith(('AE', 'MK'))]}
json.dump(out, open(OUTF, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print({k: (v['parts'], list(v['roles'])) for k, v in out.items()})
