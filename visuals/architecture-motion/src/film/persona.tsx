// 拟人化的眼镜 Agent：镜框 + 会眨眼、会看方向的瞳孔 + 说话声波；以及第一人称字幕。
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C, FONT, ease } from "./kit";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const FRAME = [
  "M 120 170 C 120 110 180 90 300 92 C 400 94 440 120 440 180 C 440 260 380 290 290 290 C 190 290 120 250 120 170 Z",
  "M 560 180 C 560 120 600 94 700 92 C 820 90 880 110 880 170 C 880 250 810 290 710 290 C 620 290 560 260 560 180 Z",
  "M 440 150 C 470 128 530 128 560 150",
  "M 120 150 L 30 130 L 0 160",
  "M 880 150 L 970 130 L 1000 160",
];
const EYES = [
  { x: 282, y: 190 },
  { x: 718, y: 190 },
];

// 眨眼：每 period 帧眨一次，持续 8 帧
const blinkAmount = (f: number, period: number, offset: number) => {
  const t = (((f + offset) % period) + period) % period;
  if (t > 8) return 1;
  return Math.abs(t - 4) / 4;
};

export const Her: React.FC<{
  width: number;
  start?: number; // 镜框描线开始帧
  openAt?: number; // 睁眼帧
  look?: { x: number; y: number }; // -1..1
  old?: boolean; // 旧时代：灰暗、眯眼、虚线
  speaking?: boolean;
  glow?: number;
  blinkPeriod?: number;
  pupil?: number; // 瞳孔缩放
}> = ({ width, start = -60, openAt = -30, look = { x: 0, y: 0 }, old = false, speaking = false, glow = 0.4, blinkPeriod = 96, pupil = 1 }) => {
  const f = useCurrentFrame();
  const color = old ? "#5c6270" : C.cyan;
  const open = interpolate(f, [openAt, openAt + 14], [0, old ? 0.42 : 1], { ...clamp, easing: ease }) * blinkAmount(f, blinkPeriod, 37);
  const h = (width * 330) / 1000;
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 1000 330"
      style={{ overflow: "visible", filter: old ? "none" : `drop-shadow(0 0 ${6 + glow * 14}px rgba(232,226,212,${0.18 + glow * 0.25}))` }}
    >
      {FRAME.map((d, i) => {
        const p = interpolate(f, [start + i * 5, start + i * 5 + 36], [0, 1], { ...clamp, easing: ease });
        const ev = evolvePath(p, d);
        return (
          <path
            key={i}
            d={d}
            fill={i < 2 && !old ? "rgba(232,226,212,.035)" : "none"}
            stroke={color}
            strokeWidth={old ? 3 : 5}
            strokeLinecap="round"
            strokeDasharray={old ? "10 9" : ev.strokeDasharray}
            strokeDashoffset={old ? 0 : ev.strokeDashoffset}
            opacity={old ? p * 0.9 : 1}
          />
        );
      })}
      {EYES.map((e, i) => {
        const cx = e.x + look.x * 46;
        const cy = e.y + look.y * 26;
        const r = (old ? 26 : 44) * pupil;
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(1 ${Math.max(0.04, open)}) translate(${-cx} ${-cy})`} opacity={open > 0.02 ? 1 : 0}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={old ? 2.5 : 3.5} opacity={0.75} />
            <circle cx={cx} cy={cy} r={r * 0.56} fill={color} opacity={old ? 0.5 : 0.95} />
            {!old && <circle cx={cx - r * 0.2} cy={cy - r * 0.22} r={r * 0.15} fill={C.bg} />}
          </g>
        );
      })}
      {speaking && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const hh = 6 + 20 * Math.abs(Math.sin(f / 4 + i * 0.9));
            return <rect key={i} x={470 + i * 13} y={262 - hh / 2} width={6} height={hh} rx={3} fill={color} opacity={0.8} />;
          })}
        </g>
      )}
    </svg>
  );
};

// 第一人称字幕：who=me 是“她”在说，who=you 是用户在说
export type Line = { from: number; to: number; text: string; who?: "me" | "you" };
export const Say: React.FC<{ lines: Line[]; bottom?: number; size?: number }> = ({ lines, bottom = 128, size = 46 }) => {
  const f = useCurrentFrame();
  const cur = lines.find((l) => f >= l.from && f < l.to);
  if (!cur) return null;
  const local = f - cur.from;
  const out = interpolate(f, [cur.to - 8, cur.to], [1, 0], clamp);
  const you = cur.who === "you";
  const chars = [...cur.text];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center", opacity: out, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 30px", borderRadius: 999, background: you ? "rgba(5,6,8,.6)" : "rgba(5,6,8,.72)", border: `1px solid rgba(232,226,212,${you ? 0.18 : 0.3})` }}>
        {you ? (
          <span style={{ fontFamily: FONT, fontSize: size * 0.56, color: C.dim, letterSpacing: 2 }}>你</span>
        ) : (
          <svg width={size * 1.1} height={size * 0.5} viewBox="0 0 44 20">
            <circle cx={11} cy={10} r={7.5} fill="none" stroke={C.cyan} strokeWidth={2} />
            <circle cx={33} cy={10} r={7.5} fill="none" stroke={C.cyan} strokeWidth={2} />
            <circle cx={11} cy={10} r={3.4} fill={C.cyan} />
            <circle cx={33} cy={10} r={3.4} fill={C.cyan} />
          </svg>
        )}
        <span style={{ fontFamily: FONT, fontSize: size, fontWeight: you ? 500 : 650, color: you ? "#c9ccd4" : C.text, letterSpacing: 1, whiteSpace: "nowrap" }}>
          {chars.map((ch, i) => {
            const p = interpolate(local, [i * 1.3, i * 1.3 + 6], [0, 1], clamp);
            return (
              <span key={i} style={{ opacity: p }}>
                {ch}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
};
