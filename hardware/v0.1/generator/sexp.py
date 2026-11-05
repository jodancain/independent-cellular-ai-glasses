# 极简 S 表达式解析 / 输出，以及 KiCad 符号库读取（含 extends 展开）
import os, re
KICAD = os.path.expanduser('~/Applications/KiCad/KiCad.app/Contents/SharedSupport')

def parse(s):
    tok = re.findall(r'\(|\)|"(?:\\.|[^"\\])*"|[^\s()"]+', s)
    stack = [[]]
    for t in tok:
        if t == '(':
            stack.append([])
        elif t == ')':
            x = stack.pop(); stack[-1].append(x)
        else:
            stack[-1].append(t)
    return stack[0]

def dump(x, ind=0):
    if not isinstance(x, list):
        return x
    if all(not isinstance(i, list) for i in x):
        return '(' + ' '.join(x) + ')'
    sp = '  ' * (ind + 1)
    out = '(' + ' '.join(i for i in x if not isinstance(i, list) and x.index(i) < 1 or False)
    head = []
    rest = []
    for i in x:
        (rest if isinstance(i, list) or rest else head).append(i)
    s = '(' + ' '.join(head)
    for i in rest:
        s += '\n' + sp + (dump(i, ind + 1) if isinstance(i, list) else i)
    return s + ')'

def q(s):
    return '"' + str(s).replace('\\', '\\\\').replace('"', '\\"') + '"'

def unq(s):
    return s[1:-1].replace('\\"', '"').replace('\\\\', '\\') if s.startswith('"') else s

_cache = {}
def lib(name):
    if name not in _cache:
        txt = open(f'{KICAD}/symbols/{name}.kicad_sym', encoding='utf8').read()
        tree = parse(txt)[0]
        _cache[name] = {unq(s[1]): s for s in tree if isinstance(s, list) and s and s[0] == 'symbol'}
    return _cache[name]

def find(node, key):
    return [c for c in node if isinstance(c, list) and c and c[0] == key]

def flat_symbol(libname, sym):
    """返回展开 extends 后的符号节点（深拷贝），名称改为 lib:sym"""
    import copy
    L = lib(libname)
    s = copy.deepcopy(L[sym])
    ext = find(s, 'extends')
    if ext:
        base = copy.deepcopy(flat_symbol(libname, unq(ext[0][1])))
        bname = unq(base[1]).split(':')[-1]
        props = find(s, 'property')
        body = [c for c in base[2:] if not (isinstance(c, list) and c and c[0] == 'property')]
        # 子单元改名
        for c in body:
            if isinstance(c, list) and c and c[0] == 'symbol':
                c[1] = q(unq(c[1]).replace(bname, sym, 1))
        s = ['symbol', q(sym)] + [c for c in s[2:] if isinstance(c, list) and c[0] not in ('extends',) and c[0] != 'property'] + props + body
    s[1] = q(f'{libname}:{sym}')
    return s

def pins(symnode):
    """[(unit, number, name, x, y, angle, type)]"""
    out = []
    for sub in find(symnode, 'symbol'):
        m = re.match(r'.*_(\d+)_(\d+)$', unq(sub[1]))
        unit = int(m.group(1)) if m else 1
        for p in find(sub, 'pin'):
            at = find(p, 'at')[0]
            nm = unq(find(p, 'name')[0][1]); no = unq(find(p, 'number')[0][1])
            out.append((unit, no, nm, float(at[1]), float(at[2]), int(float(at[3])) if len(at) > 3 else 0, p[1]))
    return out
