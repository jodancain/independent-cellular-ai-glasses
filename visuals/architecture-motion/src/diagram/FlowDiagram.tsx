import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { getLength, getPointAtLength } from "@remotion/paths";
import { Diagram, SIGNAL_STYLE, SignalKind } from "./types";
import { canvasSize, FONT, LINE_H, layoutDiagram, LEGEND_H, MARGIN, TITLE_H } from "./layout";

const FONT_FAMILY = '-apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const SPEED = 170; // 光点速度，像素 / 秒（按整圈取整，保证循环无缝）
const DASH = 26; // 虚线周期

export const FlowDiagram: React.FC<{ diagram: Diagram }> = ({ diagram }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const layout = useMemo(() => layoutDiagram(diagram), [diagram]);
  const { width, height } = canvasSize(layout);
  const loopT = frame / durationInFrames; // 0..1，循环一周
  const loopSec = durationInFrames / fps;

  const edgeGeo = useMemo(
    () =>
      layout.edges.map((le) => {
        const len = Math.max(1, getLength(le.d));
        const cycles = Math.max(1, Math.round((SPEED * loopSec) / len));
        const count = Math.max(1, Math.min(4, Math.round(len / 260)));
        // 预采样路径点，逐帧只做查表插值
        const step = 3;
        const samples: { x: number; y: number }[] = [];
        for (let s = 0; s <= len; s += step) {
          const p = getPointAtLength(le.d, s);
          samples.push({ x: p?.x ?? 0, y: p?.y ?? 0 });
        }
        const at = (dist: number) => {
          const f = Math.min(samples.length - 1, Math.max(0, dist / step));
          const i = Math.floor(f);
          const j = Math.min(samples.length - 1, i + 1);
          const r = f - i;
          return { x: samples[i].x + (samples[j].x - samples[i].x) * r, y: samples[i].y + (samples[j].y - samples[i].y) * r };
        };
        return { len, cycles, count, at };
      }),
    [layout, loopSec],
  );

  const usedKinds = Array.from(new Set(diagram.edges.map((e) => e.kind))) as SignalKind[];
  const ox = MARGIN;
  const oy = MARGIN + TITLE_H;
  // 关键芯片的呼吸光（整周期正弦，循环无缝）
  const breathe = 0.55 + 0.45 * Math.sin(loopT * Math.PI * 2 * 2);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 30% 0%, #16213e 0%, #0a0f1f 55%, #070b16 100%)", fontFamily: FONT_FAMILY }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1e293b" strokeWidth="0.6" opacity="0.5" />
          </pattern>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {Object.entries(SIGNAL_STYLE).map(([k, s]) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={s.color} />
            </marker>
          ))}
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* 标题 */}
        <text x={MARGIN} y={MARGIN + 34} fill="#e2e8f0" fontSize={30} fontWeight={700}>
          {diagram.title}
        </text>
        <text x={MARGIN} y={MARGIN + 66} fill="#94a3b8" fontSize={15}>
          {diagram.subtitle}
        </text>

        <g transform={`translate(${ox} ${oy})`}>
          {/* 分组 */}
          {[...layout.groups]
            .sort((a, b) => a.depth - b.depth)
            .map((g) => (
              <g key={g.id}>
                <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={14} fill={g.depth ? "rgba(56,189,248,0.04)" : "rgba(148,163,184,0.05)"} stroke="#475569" strokeDasharray="6 6" strokeWidth={1.2} />
                <text x={g.x + 14} y={g.y + 22} fill="#cbd5e1" fontSize={14} fontWeight={600}>
                  {g.label}
                </text>
              </g>
            ))}

          {/* 连线：底线 + 流动虚线 */}
          {layout.edges.map((le) => {
            const e = diagram.edges[le.index];
            const c = SIGNAL_STYLE[e.kind].color;
            const offset = -loopT * DASH * Math.round((SPEED * 0.6 * loopSec) / DASH);
            return (
              <g key={`l${le.index}`}>
                <path d={le.d} fill="none" stroke={c} strokeOpacity={0.22} strokeWidth={e.dashed ? 2 : 3} strokeDasharray={e.dashed ? "4 6" : undefined}
                  markerEnd={`url(#arrow-${e.kind})`} markerStart={e.bidir ? `url(#arrow-${e.kind})` : undefined} />
                {!e.bidir && (
                  <path d={le.d} fill="none" stroke={c} strokeOpacity={e.dashed ? 0.5 : 0.85} strokeWidth={e.dashed ? 1.5 : 2.2} strokeDasharray={`8 ${DASH - 8}`} strokeDashoffset={offset} strokeLinecap="round" />
                )}
                {e.bidir && (
                  <path d={le.d} fill="none" stroke={c} strokeOpacity={0.45} strokeWidth={1.6} strokeDasharray={`3 ${DASH / 2 - 3}`} strokeDashoffset={offset / 2} strokeLinecap="round" />
                )}
              </g>
            );
          })}

          {/* 信号光点 */}
          {layout.edges.map((le) => {
            const e = diagram.edges[le.index];
            const c = SIGNAL_STYLE[e.kind].color;
            const { len, cycles, count, at } = edgeGeo[le.index];
            const dots: React.ReactNode[] = [];
            const dirs = e.bidir ? [1, -1] : [1];
            dirs.forEach((dir) => {
              for (let k = 0; k < count; k++) {
                const base = (loopT * cycles + k / count + (dir < 0 ? 0.5 / count : 0)) % 1;
                for (let tail = 0; tail < 4; tail++) {
                  let t = base - (tail * 9) / len;
                  if (t < 0) continue;
                  if (dir < 0) t = 1 - t;
                  const p = at(t * len);
                  dots.push(
                    <circle key={`${dir}-${k}-${tail}`} cx={p.x} cy={p.y} r={tail === 0 ? (e.dashed ? 3 : 4.2) : 3.4 - tail * 0.6}
                      fill={tail === 0 ? "#ffffff" : c} opacity={tail === 0 ? 0.95 : 0.7 - tail * 0.15}
                      filter={tail === 0 ? "url(#glow)" : undefined} stroke={tail === 0 ? c : undefined} strokeWidth={tail === 0 ? 2 : 0} />,
                  );
                }
              }
            });
            return <g key={`d${le.index}`}>{dots}</g>;
          })}

          {/* 连线标签 */}
          {layout.edges.map((le) => {
            const e = diagram.edges[le.index];
            if (!e.label || le.labelX === undefined || le.labelY === undefined) return null;
            const lx = le.labelX;
            const ly = le.labelY;
            const lines = e.label.split("\n");
            const w = Math.max(...lines.map((l) => [...l].reduce((s, ch) => s + (/[⺀-￿]/.test(ch) ? 12.5 : 7), 0))) + 12;
            const h = lines.length * 16 + 6;
            return (
              <g key={`t${le.index}`}>
                <rect x={lx - w / 2} y={ly - h / 2} width={w} height={h} rx={6} fill="#0b1222" stroke={SIGNAL_STYLE[e.kind].color} strokeOpacity={0.5} />
                {lines.map((l, i) => (
                  <text key={i} x={lx} y={ly - h / 2 + 15 + i * 16} fill={SIGNAL_STYLE[e.kind].color} fontSize={12} textAnchor="middle">
                    {l}
                  </text>
                ))}
              </g>
            );
          })}

          {/* 节点 */}
          {layout.nodes.map((n) => (
            <g key={n.id}>
              {n.accent && (
                <rect x={n.x - 4} y={n.y - 4} width={n.w + 8} height={n.h + 8} rx={14} fill="none" stroke="#38bdf8" strokeOpacity={0.35 * breathe} strokeWidth={6} filter="url(#glow)" />
              )}
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={10} fill={n.accent ? "#0f2236" : "#111a2e"} stroke={n.accent ? "#38bdf8" : "#3b4a63"} strokeWidth={n.accent ? 1.8 : 1.2} />
              {n.lines.map((l, i) => (
                <text key={i} x={n.x + n.w / 2} y={n.y + 12 + LINE_H * (i + 0.75)} fill={i === 0 ? "#f1f5f9" : "#94a3b8"}
                  fontSize={i === 0 ? FONT + 1 : FONT - 2} fontWeight={i === 0 ? 650 : 400} textAnchor="middle">
                  {l}
                </text>
              ))}
            </g>
          ))}
        </g>

        {/* 图例与注释 */}
        <g transform={`translate(${MARGIN} ${height - MARGIN - LEGEND_H + 22})`}>
          {usedKinds.map((k, i) => (
            <g key={k} transform={`translate(${i * 150} 0)`}>
              <line x1={0} y1={0} x2={34} y2={0} stroke={SIGNAL_STYLE[k].color} strokeWidth={3} strokeDasharray="8 6" strokeDashoffset={-loopT * 14 * 12} />
              <circle cx={(loopT * 4 % 1) * 34} cy={0} r={3.5} fill="#fff" stroke={SIGNAL_STYLE[k].color} strokeWidth={2} />
              <text x={42} y={5} fill="#cbd5e1" fontSize={13}>
                {SIGNAL_STYLE[k].name}
              </text>
            </g>
          ))}
          {diagram.notes && (
            <text x={0} y={30} fill="#64748b" fontSize={12.5}>
              {diagram.notes.join("　·　")}
            </text>
          )}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const diagramSize = (d: Diagram) => canvasSize(layoutDiagram(d));
