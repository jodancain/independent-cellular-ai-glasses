// 宣传片的公共视觉组件：背景、HUD、节拍、标题、卡片。全部动画由 useCurrentFrame() 驱动。
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// 定稿配色：暗场 + 暖白单色；旧的彩色键名统一映射到暖白，保证全片只有一种强调色
export const C = {
  bg: "#050608",
  cyan: "#e8e2d4",
  blue: "#e8e2d4",
  pink: "#e8e2d4",
  lime: "#e8e2d4",
  amber: "#e8e2d4",
  text: "#f2f4f8",
  dim: "#8f9bb3",
};
export const FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const MONO = '"Barlow", "DIN Alternate", "Noto Sans SC", sans-serif';

export const FPS = 30;
export const BEAT = 15; // 120 BPM：一拍 15 帧
export const BAR = 60; // 一小节 2 秒
export const bars = (n: number) => n * BAR;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

// 0..1 进场进度（相对于当前 Sequence 的帧）
export const useIn = (start: number, dur = 18) => {
  const f = useCurrentFrame();
  return interpolate(f, [start, start + dur], [0, 1], { ...clamp, easing: ease });
};

// 节拍脉冲：每拍开头为 1，随后指数衰减。globalFrame 用于跨场景对齐音乐。
export const beatPulse = (globalFrame: number, strength = 1) => {
  const phase = (globalFrame % BEAT) / BEAT;
  return Math.exp(-phase * 6) * strength;
};

// 背景：暗场 + 极淡点阵 + 缓慢漂移的光点（不做透视地面和霓虹）
export const Backdrop: React.FC<{ hue?: string; pulse?: number; globalFrame: number }> = ({ pulse = 0, globalFrame }) => {
  const { width, height } = useVideoConfig();
  const t = globalFrame / FPS;
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 40; i++) {
    const s1 = Math.sin(i * 91.7) * 10000, fx = s1 - Math.floor(s1);
    const s2 = Math.sin(i * 47.3) * 10000, fy = s2 - Math.floor(s2);
    const y = (((fy * height - t * (4 + fx * 8)) % height) + height) % height;
    dots.push(<circle key={i} cx={fx * width} cy={y} r={0.8 + fx * 1.2} fill="#e8e2d4" opacity={0.06 + fx * 0.14} />);
  }
  return (
    <AbsoluteFill style={{ background: "#050608" }}>
      <svg width={width} height={height} style={{ position: "absolute" }}>
        <defs>
          <pattern id="bgdots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".9" fill="rgba(242,244,248,.06)" /></pattern>
        </defs>
        <rect width={width} height={height} fill="url(#bgdots)" />
        {dots}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 55%, rgba(232,226,212,.10) 0%, transparent 55%)", opacity: pulse * 0.5 }} />
    </AbsoluteFill>
  );
};

// HUD：四角标记 + 章节编号 + 时间码
export const Hud: React.FC<{ chapter: string; label: string; globalFrame: number }> = ({ chapter, label, globalFrame }) => {
  const { width, height } = useVideoConfig();
  const sec = globalFrame / FPS;
  const tc = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}:${String(Math.floor((globalFrame % FPS) * (100 / FPS))).padStart(2, "0")}`;
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M ${x} ${y + sy * 28} L ${x} ${y} L ${x + sx * 28} ${y}`} stroke="rgba(242,244,248,.35)" strokeWidth={1.5} fill="none" />
  );
  return (
    <AbsoluteFill style={{ fontFamily: MONO, color: C.dim, fontSize: 16, letterSpacing: 4, fontWeight: 500 }}>
      <svg width={width} height={height} style={{ position: "absolute" }}>
        {corner(36, 36, 1, 1)}
        {corner(width - 36, 36, -1, 1)}
        {corner(36, height - 36, 1, -1)}
        {corner(width - 36, height - 36, -1, -1)}
      </svg>
      <div style={{ position: "absolute", left: 80, top: 50 }}>
        <span style={{ color: C.text }}>{chapter}</span> / {label}
      </div>
      <div style={{ position: "absolute", right: 80, top: 50 }}>INDEPENDENT CELLULAR AI GLASSES</div>
      <div style={{ position: "absolute", left: 80, bottom: 48 }}>DESIGN TARGETS · NOT MEASURED</div>
      <div style={{ position: "absolute", right: 80, bottom: 48 }}>{tc}</div>
    </AbsoluteFill>
  );
};

// 逐字出现的大标题
export const KineticTitle: React.FC<{ text: string; start?: number; size?: number; color?: string; stagger?: number; weight?: number }> = ({
  text, start = 0, size = 120, color = C.text, stagger = 2, weight = 800,
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, color, letterSpacing: -1, lineHeight: 1.1, whiteSpace: "pre-wrap" }}>
      {[...text].map((ch, i) => {
        const p = interpolate(f, [start + i * stagger, start + i * stagger + 14], [0, 1], { ...clamp, easing: ease });
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + p * 0.1})`, filter: `blur(${(1 - p) * 8}px)` }}>
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </div>
  );
};

// 小标签（章节眉题）
export const Kicker: React.FC<{ text: string; start?: number; color?: string }> = ({ text, start = 0, color = C.cyan }) => {
  const p = useIn(start, 14);
  return (
    <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 6, color, opacity: p, transform: `translateX(${(1 - p) * -30}px)` }}>
      <span style={{ display: "inline-block", width: 40 * p, height: 2, background: color, verticalAlign: "middle", marginRight: 14 }} />
      {text}
    </div>
  );
};

// 卡片：编辑排版，只用顶部发丝线，不画框、不发光
export const Card: React.FC<{ start: number; color?: string; style?: React.CSSProperties; children: React.ReactNode; from?: "up" | "left" | "right" }> = ({
  start, style, children, from = "up",
}) => {
  const p = useIn(start, 18);
  const dx = from === "left" ? -40 : from === "right" ? 40 : 0;
  const dy = from === "up" ? 30 : 0;
  return (
    <div style={{ opacity: p, transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px)`, borderTop: "1px solid rgba(242,244,248,.16)", padding: "20px 4px 8px 0", fontFamily: FONT, color: C.text, ...style }}>
      {children}
    </div>
  );
};

// 段落冲击闪白
export const Flash: React.FC<{ at: number[]; globalFrame: number }> = ({ at, globalFrame }) => {
  let o = 0;
  for (const a of at) {
    const d = globalFrame - a;
    if (d >= 0 && d < 24) o = Math.max(o, 1 - d / 24);
  }
  return <AbsoluteFill style={{ background: "#e8e2d4", opacity: o * 0.08, mixBlendMode: "screen" }} />;
};

// 数字滚动
export const Counter: React.FC<{ to: number; start: number; dur?: number; decimals?: number; suffix?: string; style?: React.CSSProperties }> = ({
  to, start, dur = 30, decimals = 0, suffix = "", style,
}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [start, start + dur], [0, to], { ...clamp, easing: ease });
  return <span style={style}>{v.toFixed(decimals)}{suffix}</span>;
};
