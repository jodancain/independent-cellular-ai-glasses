// 9 张图的直角走线排版：ELK layered + ORTHOGONAL；硬件框图用手工排版（src/diagrams/hw-manual.json）
import ELK from "elkjs/lib/elk.bundled.js";
import { writeFileSync, readFileSync } from "node:fs";
import { ALL } from "../src/diagrams";

const tw = (s: string, size: number) => [...s].reduce((w, ch) => w + (/[⺀-￿]/.test(ch) ? size * 1.02 : size * 0.6), 0);
const TS = 21, SS = 16, LS = 15;

const run = async () => {
  const elk = new ELK();
  const out: any = {};
  for (const d of ALL) {
    if (d.id === "HardwareCompute") {
      const m = JSON.parse(readFileSync("src/diagrams/hw-manual.json", "utf8"));
      out[d.id] = { title: d.title, subtitle: d.subtitle, notes: d.notes ?? [], ...m, nodes: m.nodes.map((n: any) => ({ ...n, lines: [n.t, n.s, n.s2].filter(Boolean) })) };
      continue;
    }
    const groups = d.groups ?? [];
    const nodeOf = (n: any) => {
      const lines = n.label.split("\n");
      const w = Math.max(...lines.map((l: string, i: number) => tw(l, i ? SS : TS))) + 44;
      const h = 30 + lines.length * 25 + (lines.length > 1 ? 4 : 0);
      return { id: n.id, width: Math.max(150, Math.round(w)), height: h };
    };
    const graph: any = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered", "elk.direction": d.rankdir === "TB" ? "DOWN" : "RIGHT", "elk.edgeRouting": "ORTHOGONAL",
        "elk.hierarchyHandling": "INCLUDE_CHILDREN",
        "elk.layered.spacing.nodeNodeBetweenLayers": "64", "elk.spacing.nodeNode": "34", "elk.spacing.edgeEdge": "16", "elk.spacing.edgeNode": "20",
        "elk.layered.spacing.edgeNodeBetweenLayers": "24", "elk.edgeLabels.placement": "CENTER",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX", "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      },
      children: [
        ...groups.map((g) => ({ id: g.id, layoutOptions: { "elk.padding": "[top=52,left=22,bottom=22,right=22]" }, children: d.nodes.filter((n) => n.group === g.id).map(nodeOf) })),
        ...d.nodes.filter((n) => !n.group).map(nodeOf),
      ],
      edges: d.edges.map((e, i) => {
        const [a, b] = e.reverse ? [e.to, e.from] : [e.from, e.to];
        return { id: `e${i}`, sources: [a], targets: [b], labels: e.label ? e.label.split("\n").map((l) => ({ text: l, width: tw(l, LS) + 16, height: 22 })) : [] };
      }),
    };
    const r: any = await elk.layout(graph);
    const nodes: any[] = [], gout: any[] = [];
    const meta = (id: string) => d.nodes.find((n) => n.id === id)!;
    for (const c of r.children) {
      if (c.children && groups.find((g) => g.id === c.id)) {
        gout.push({ id: c.id, label: groups.find((g) => g.id === c.id)!.label, x: c.x, y: c.y, w: c.width, h: c.height });
        for (const n of c.children) { const m = meta(n.id); nodes.push({ id: n.id, lines: m.label.split("\n"), accent: !!m.accent, reserved: /预留/.test(m.label), x: c.x + n.x, y: c.y + n.y, w: n.width, h: n.height }); }
      } else { const m = meta(c.id); nodes.push({ id: c.id, lines: m.label.split("\n"), accent: !!m.accent, reserved: /预留/.test(m.label), x: c.x, y: c.y, w: c.width, h: c.height }); }
    }
    const edges = r.edges.map((e: any, i: number) => {
      const src = d.edges[i];
      // 边坐标相对于其所在容器：ELK 把跨层级的边放到公共祖先，这里统一换算到根坐标
      const cont = e.container && e.container !== "root" ? r.children.find((c: any) => c.id === e.container) : null;
      const ox = cont ? cont.x : 0, oy = cont ? cont.y : 0;
      const sec = e.sections[0];
      let pts = [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint].map((p: any) => ({ x: p.x + ox, y: p.y + oy }));
      if (src.reverse) pts = pts.reverse();
      const lb = e.labels && e.labels.length ? e.labels : null;
      const lx = lb ? lb[0].x + ox + lb[0].width / 2 : null;
      const ly = lb ? lb[0].y + oy + (lb.length * 22) / 2 : null;
      return { from: src.from, to: src.to, kind: src.kind, label: src.label ?? "", bidir: !!src.bidir, dashed: !!src.dashed, pts, lx, ly };
    });
    out[d.id] = { title: d.title, subtitle: d.subtitle, notes: d.notes ?? [], width: r.width, height: r.height, groups: gout, nodes, edges };
    console.log(d.id, Math.round(r.width), Math.round(r.height), nodes.length, edges.length);
  }
  writeFileSync("src/diagrams/layouts.json", JSON.stringify(out));
};
run();
