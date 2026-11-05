// 定稿框图（Remotion 版）：暗场、暖白单色信号、线型区分信号类型、直角走线、慢速光束、到达闪光。
// 全部动画由 useCurrentFrame() 驱动；光束周期 4 s，双向链路每周期换向，8 s 首尾无缝。
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { getLength } from "@remotion/paths";
import LAYOUTS from "../diagrams/layouts.json";

export type Pt = { x: number; y: number };
export type LNode = { id: string; lines: string[]; accent?: boolean; reserved?: boolean; x: number; y: number; w: number; h: number };
export type LEdge = { from: string; to: string; kind: string; label?: string; bidir?: boolean; dashed?: boolean; pts: Pt[]; lx: number | null; ly: number | null; knock?: number[][] };
export type Layout = { title: string; subtitle?: string; width: number; height: number; groups: { id: string; label: string; x: number; y: number; w: number; h: number }[]; nodes: LNode[]; edges: LEdge[] };

export const DIAGRAMS = LAYOUTS as unknown as Record<string, Layout>;
export const DIAGRAM_ORDER = ["Overview", "HardwareCompute", "HardwarePower", "DataPaths", "SoftwareStack", "Protocol", "PowerStates", "Calls", "Deploy", "DisplayModes", "CastMulti"];

const SIGNAL = "#e8e2d4";
const T = { bg: "#050608", grid: "rgba(242,244,248,.07)", groupFill: "rgba(242,244,248,.02)", groupStroke: "rgba(242,244,248,.1)", nodeFill: "#0b0e15", nodeStroke: "rgba(242,244,248,.18)", accentFill: "#12141a", text: "#f2f4f8", sub: "#9aa6bd", base: 0.6, knock: "#050608" };
const KIND_NAME: Record<string, string> = { video: "视频 / 画面", data: "数据", control: "控制 / 信令", pose: "姿态 / 传感", audio: "音频", rf: "无线 / 网络", power: "供电 / 电源" };
const DASH: Record<string, string> = { pose: "10 6", audio: "1.5 7", rf: "14 5 2 5", control: "6 4", power: "3 5" };
const WIDTH: Record<string, number> = { video: 4, data: 2.2 };
const PHASE: Record<string, number> = { video: 0, pose: 0.25, data: 0.5, rf: 0.5, audio: 0.75, control: 0.25, power: 0.75 };
export const CYCLE_MS = 4000;
const TRAVEL_MS = 2800;
const FONT_CN = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const FONT_EN = '"Barlow", "DIN Alternate", "Noto Sans SC", sans-serif';
const FONT_MONO = '"JetBrains Mono", Menlo, monospace';

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const cjk = (ch: string) => /[⺀-￿]/.test(ch);
const textW = (s: string, size: number) => [...s].reduce((w, ch) => w + (cjk(ch) ? size * 1.02 : size * 0.6), 0);
const roundPath = (pts: Pt[], r = 8) => {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const r1 = Math.min(r, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2);
    const ux = Math.sign(b.x - a.x), uy = Math.sign(b.y - a.y), vx = Math.sign(c.x - b.x), vy = Math.sign(c.y - b.y);
    d += ` L ${b.x - ux * r1} ${b.y - uy * r1} Q ${b.x} ${b.y} ${b.x + vx * r1} ${b.y + vy * r1}`;
  }
  const z = pts[pts.length - 1];
  return d + ` L ${z.x} ${z.y}`;
};

const PAD = 40;
export const diagramSize = (D: Layout, hideHeader = false) => {
  const top = hideHeader ? 24 : 84;
  return { width: Math.ceil((D.width + PAD * 2) / 2) * 2, height: Math.ceil((D.height + PAD + top) / 2) * 2, top };
};

export const FlowDiagram: React.FC<{ id: string; hideHeader?: boolean; transparent?: boolean }> = ({ id, hideHeader = false, transparent = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const D = DIAGRAMS[id];
  const { width: W, height: H, top } = diagramSize(D, hideHeader);
  const t = (frame / fps) * 1000;
  const geo = useMemo(() => D.edges.map((e) => { const d = roundPath(e.pts); return { d, len: getLength(d) }; }), [D]);

  // 节点最近一次被信号“抵达”的时间差（无状态计算，任意帧可直接渲染）
  const sinceArrive = (nodeId: string) => {
    let best = Infinity;
    D.edges.forEach((e) => {
      if (e.dashed) return;
      const ph = (PHASE[e.kind] || 0) * CYCLE_MS;
      const cyc = Math.floor((t + ph) / CYCLE_MS);
      for (const c of [cyc, cyc - 1]) {
        const back = !!e.bidir && ((c % 2) + 2) % 2 === 1;
        const target = back ? e.from : e.to;
        if (target !== nodeId) continue;
        const arrive = c * CYCLE_MS - ph + TRAVEL_MS;
        const dt = t - arrive;
        if (dt >= 0 && dt < best) best = dt;
      }
    });
    return best;
  };
  const used = [...new Set(D.edges.map((e) => e.kind))];
  let lx = W - PAD;
  const legend = [...used].reverse().map((k) => {
    const label = KIND_NAME[k] || k;
    lx -= textW(label, 16) + 44 + 14;
    return { k, label, x: lx };
  });

  return (
    <AbsoluteFill style={{ background: transparent ? "transparent" : T.bg }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill={T.grid} /></pattern>
          <marker id="ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0 .5 L7.5 4 L0 7.5 z" fill={SIGNAL} /></marker>
          <filter id="bm" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        {!transparent && <rect width={W} height={H} fill="url(#grid)" />}
        {!hideHeader && (
          <g>
            <text x={PAD} y={50} fill={T.text} fontSize={22} fontWeight={500} letterSpacing={2} fontFamily={FONT_EN}>{D.title}</text>
            {legend.map((l) => (
              <g key={l.k}>
                <line x1={l.x - 6} y1={44} x2={l.x + 26} y2={44} stroke={SIGNAL} strokeWidth={WIDTH[l.k] || 3} strokeLinecap="round" strokeDasharray={DASH[l.k]} />
                <text x={l.x + 32} y={50} fill={T.sub} fontSize={16} fontFamily={FONT_CN}>{l.label}</text>
              </g>
            ))}
          </g>
        )}
        <g transform={`translate(${PAD} ${top})`}>
          {D.groups.map((g, i) => (
            <g key={g.id}>
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={12} fill={T.groupFill} stroke={T.groupStroke} />
              <text x={g.x + 18} y={g.y + 30} fill={T.sub} fontSize={15} letterSpacing={1.5} fontFamily={FONT_EN} fontWeight={500}>{String(i + 1).padStart(2, "0")}</text>
              <text x={g.x + 48} y={g.y + 30} fill={T.sub} fontSize={16} letterSpacing={1} fontFamily={FONT_CN}>{g.label}</text>
            </g>
          ))}
          {D.edges.map((e, i) => (
            <g key={`e${i}`}>
              {(e.knock || []).map(([x1, y1, x2, y2], j) => <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke={T.knock} strokeWidth={10} />)}
              <path d={geo[i].d} fill="none" stroke={SIGNAL} strokeOpacity={e.dashed ? 0.5 : T.base} strokeWidth={WIDTH[e.kind] || 3} strokeLinejoin="round" strokeLinecap="round"
                markerEnd="url(#ar)" markerStart={e.bidir ? "url(#ar)" : undefined} strokeDasharray={e.dashed ? "6 7" : DASH[e.kind]} />
            </g>
          ))}
          {D.edges.map((e, i) => {
            if (e.dashed) return null;
            const { d, len: L } = geo[i];
            const ph = (PHASE[e.kind] || 0) * CYCLE_MS;
            const local = (((t + ph) % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
            const run = local / TRAVEL_MS;
            if (run > 1) return null;
            const back = !!e.bidir && Math.floor((t + ph) / CYCLE_MS) % 2 === 1;
            const bl = Math.min(240, Math.max(80, L * 0.45));
            const head = ease(run) * (L + bl);
            return (
              <g key={`b${i}`}>
                {([["glow", bl, 0.55, 12], ["body", bl * 0.8, 0.85, 5], ["core", bl * 0.4, 0.95, 2.4]] as [string, number, number, number][]).map(([k, seg, op, sw]) => {
                  const start = back ? L - head : head - seg;
                  return <path key={k} d={d} fill="none" stroke={k === "core" ? "#ffffff" : SIGNAL} strokeWidth={sw} strokeLinecap="round" opacity={op}
                    strokeDasharray={`${seg} ${L * 4 + seg}`} strokeDashoffset={-start} filter={k === "glow" ? "url(#bm)" : undefined} />;
                })}
              </g>
            );
          })}
          {D.nodes.map((n) => {
            const dt = sinceArrive(n.id);
            const k = dt === Infinity ? 0 : dt < 300 ? dt / 300 : Math.exp(-(dt - 300) / 650);
            return (
              <g key={n.id} opacity={n.reserved ? 0.6 : 1}>
                {k > 0.02 && <rect x={n.x - 3} y={n.y - 3} width={n.w + 6} height={n.h + 6} rx={11} fill="none" stroke={SIGNAL} strokeOpacity={0.5 * k} strokeWidth={6} filter="url(#bm)" />}
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={n.accent ? T.accentFill : T.nodeFill} stroke={n.accent ? SIGNAL : T.nodeStroke} strokeWidth={n.accent ? 1.4 : 1} strokeDasharray={n.reserved ? "4 4" : undefined} />
                {n.accent && <rect x={n.x + 12} y={n.y} width={30} height={2} fill={SIGNAL} />}
                {n.lines.map((txt, i) => (
                  <text key={i} x={n.x + 20} y={n.y + 34 + i * 24 + (i ? 3 : 0)} fill={i ? T.sub : T.text} fontSize={i ? 16 : 21} fontWeight={i ? 400 : 500} fontFamily={FONT_CN}>{txt}</text>
                ))}
              </g>
            );
          })}
          {D.edges.map((e, i) => {
            if (!e.label || e.lx == null || e.ly == null) return null;
            const lines = e.label.split("\n");
            const lw = Math.max(...lines.map((l) => [...l].reduce((w, ch) => w + (cjk(ch) ? 15.5 : 9.2), 0))) + 16;
            const lh = lines.length * 20 + 6;
            return (
              <g key={`l${i}`}>
                <rect x={e.lx - lw / 2} y={e.ly - lh / 2} width={lw} height={lh} rx={5} fill={T.knock} />
                {lines.map((l, j) => <text key={j} x={e.lx!} y={e.ly! - lh / 2 + 18 + j * 20} fill={SIGNAL} fontSize={15} textAnchor="middle" fontFamily={FONT_MONO}>{l}</text>)}
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
