import dagre from "dagre";
import { Diagram } from "./types";

export const FONT = 15;
export const LINE_H = 21;
const PAD_X = 18;
const PAD_Y = 12;

const textWidth = (s: string, size = FONT) => {
  let w = 0;
  for (const ch of s) w += /[⺀-￿]/.test(ch) ? size * 1.02 : size * 0.58;
  return w;
};

export type LaidNode = { id: string; x: number; y: number; w: number; h: number; lines: string[]; accent?: boolean };
export type LaidGroup = { id: string; label: string; x: number; y: number; w: number; h: number; depth: number };
export type LaidEdge = { index: number; d: string; labelX?: number; labelY?: number };
export type Layout = { width: number; height: number; nodes: LaidNode[]; groups: LaidGroup[]; edges: LaidEdge[] };

const smoothPath = (pts: { x: number; y: number }[]) => {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return d + ` L ${pts[1].x} ${pts[1].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${i === pts.length - 2 ? pts[i + 1].x : mx} ${i === pts.length - 2 ? pts[i + 1].y : my}`;
  }
  return d;
};

const shiftPath = (d: string, dy: number) => {
  // 只有 M/L/Q 命令，坐标成对出现：奇数位为 y
  let idx = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (m) => String(idx++ % 2 === 1 ? Number(m) + dy : Number(m)));
};

export const TITLE_H = 110;
export const LEGEND_H = 56;
export const MARGIN = 40;

export const layoutDiagram = (dg: Diagram): Layout => {
  const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  g.setGraph({
    rankdir: dg.rankdir,
    nodesep: dg.nodesep ?? 36,
    ranksep: dg.ranksep ?? 70,
    edgesep: 18,
    marginx: 10,
    marginy: 10,
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const gr of dg.groups ?? []) g.setNode(gr.id, { label: gr.label, paddingTop: 34, paddingLeft: 16, paddingRight: 16, paddingBottom: 16 });
  for (const gr of dg.groups ?? []) if (gr.parent) g.setParent(gr.id, gr.parent);
  for (const n of dg.nodes) {
    const lines = n.label.split("\n");
    const w = Math.max(...lines.map((l, i) => textWidth(l, i === 0 ? FONT + 1 : FONT - 2))) + PAD_X * 2;
    const h = lines.length * LINE_H + PAD_Y * 2;
    g.setNode(n.id, { width: Math.max(90, w), height: h });
    if (n.group) g.setParent(n.id, n.group);
  }
  dg.edges.forEach((e, i) => {
    const lw = e.label ? Math.max(...e.label.split("\n").map((l) => textWidth(l, 12))) + 12 : 0;
    const lh = e.label ? e.label.split("\n").length * 16 + 4 : 0;
    g.setEdge(e.from, e.to, { width: lw, height: lh, labelpos: "c", minlen: 1 }, `e${i}`);
  });
  dagre.layout(g);

  const nodes: LaidNode[] = dg.nodes.map((n) => {
    const v = g.node(n.id);
    return { id: n.id, x: v.x - v.width / 2, y: v.y - v.height / 2, w: v.width, h: v.height, lines: n.label.split("\n"), accent: n.accent };
  });
  const depthOf = (id: string): number => {
    const p = (dg.groups ?? []).find((x) => x.id === id)?.parent;
    return p ? 1 + depthOf(p) : 0;
  };
  const groups: LaidGroup[] = (dg.groups ?? []).map((gr) => {
    const v = g.node(gr.id);
    // dagre 不给分组标题留位置：整体上扩 30 px 放标题
    return { id: gr.id, label: gr.label, x: v.x - v.width / 2, y: v.y - v.height / 2 - 30, w: Math.max(v.width, textWidth(gr.label, 14) + 40), h: v.height + 30, depth: depthOf(gr.id) };
  });
  const edges: LaidEdge[] = dg.edges.map((e, i) => {
    const v = g.edge({ v: e.from, w: e.to, name: `e${i}` });
    return { index: i, d: smoothPath(e.reverse ? [...v.points].reverse() : v.points), labelX: e.label ? v.x : undefined, labelY: e.label ? v.y : undefined };
  });
  const gi = g.graph();
  const top = Math.min(0, ...groups.map((x) => x.y));
  const shift = -top;
  if (shift) {
    nodes.forEach((n) => (n.y += shift));
    groups.forEach((x) => (x.y += shift));
  }
  const width = Math.max(gi.width ?? 800, 900, ...groups.map((x) => x.x + x.w));
  const height = (gi.height ?? 600) + shift;
  return { width, height, nodes, groups, edges: edges.map((e) => ({ ...e, d: shift ? shiftPath(e.d, shift) : e.d, labelY: e.labelY === undefined ? undefined : e.labelY + shift })) };
};

export const canvasSize = (l: Layout) => {
  const w = Math.ceil((l.width + MARGIN * 2) / 2) * 2;
  const h = Math.ceil((l.height + TITLE_H + LEGEND_H + MARGIN * 2) / 2) * 2;
  return { width: w, height: h };
};
