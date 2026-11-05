// 宣传片插画库：眼镜线框、侧视/俯视、视野街景、聊天看板、一天中的七幅小插画。
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C, FONT, MONO, ease } from "./kit";
import { Glyph, Icon } from "./icons";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Pt = { x: number; y: number };
export const quadAt = (p0: Pt, p1: Pt, p2: Pt, t: number): Pt => {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
};
export const cubicAt = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y,
  };
};

// 眼镜正视线框：可描线出现，镜片里可选脑图形 / 虚拟屏
const GLASSES = [
  "M 120 170 C 120 110 180 90 300 92 C 400 94 440 120 440 180 C 440 260 380 290 290 290 C 190 290 120 250 120 170 Z",
  "M 560 180 C 560 120 600 94 700 92 C 820 90 880 110 880 170 C 880 250 810 290 710 290 C 620 290 560 260 560 180 Z",
  "M 440 150 C 470 128 530 128 560 150",
  "M 120 150 L 30 130 L 0 160",
  "M 880 150 L 970 130 L 1000 160",
];
export const GlassesWire: React.FC<{
  start?: number;
  scale?: number;
  color?: string;
  glow?: number;
  brain?: boolean;
  screen?: boolean;
}> = ({ start = 0, scale = 1, color = C.cyan, glow = 0, brain = false, screen = false }) => {
  const f = useCurrentFrame();
  const brainP = interpolate(f, [start + 45, start + 72], [0, 1], { ...clamp, easing: ease });
  return (
    <svg
      width={1000 * scale}
      height={330 * scale}
      viewBox="0 0 1000 330"
      style={{ overflow: "visible", filter: `drop-shadow(0 0 ${3 + glow * 4}px rgba(232,226,212,.28))` }}
    >
      {GLASSES.map((d, i) => {
        const p = interpolate(f, [start + i * 6, start + i * 6 + 40], [0, 1], { ...clamp, easing: ease });
        const ev = evolvePath(p, d);
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={ev.strokeDasharray}
            strokeDashoffset={ev.strokeDashoffset}
          />
        );
      })}
      {brain && (
        <g opacity={brainP}>
          <Glyph name="brain" x={200} y={126} size={160} color={color} strokeWidth={2.2} opacity={0.9} />
        </g>
      )}
      {screen && (
        <>
          <rect x={200} y={150} width={160} height={90} rx={8} fill="none" stroke={C.cyan} strokeWidth={2} opacity={interpolate(f, [start + 50, start + 70], [0, 0.55], clamp)} />
          <rect x={640} y={150} width={160} height={90} rx={8} fill="none" stroke={C.cyan} strokeWidth={2} opacity={interpolate(f, [start + 50, start + 70], [0, 0.55], clamp)} />
        </>
      )}
    </svg>
  );
};

// 俯视/正视示意：两块电池分置两侧镜腿
export const GlassesTop: React.FC<{ color?: string }> = ({ color = C.cyan }) => {
  const f = useCurrentFrame();
  const pulse = 0.72 + 0.28 * Math.abs(Math.sin(f / 18));
  return (
    <svg width={1000} height={300} viewBox="0 0 1000 300" style={{ overflow: "visible" }}>
      <path d="M292 118 C400 92 600 92 708 118" fill="none" stroke={color} strokeWidth={4} opacity={0.85} />
      <rect x={300} y={112} width={150} height={92} rx={26} fill="none" stroke={color} strokeWidth={4} />
      <rect x={550} y={112} width={150} height={92} rx={26} fill="none" stroke={color} strokeWidth={4} />
      <path d="M450 142 Q500 124 550 142" fill="none" stroke={color} strokeWidth={4} />
      <path d="M300 145 L190 118 L118 118" fill="none" stroke={color} strokeWidth={4} />
      <path d="M700 145 L810 118 L882 118" fill="none" stroke={color} strokeWidth={4} />
      <path d="M118 118 C86 156 92 206 130 226" fill="none" stroke={color} strokeWidth={4} opacity={0.8} />
      <path d="M882 118 C914 156 908 206 870 226" fill="none" stroke={color} strokeWidth={4} opacity={0.8} />
      <g opacity={pulse}>
        <rect x={52} y={78} width={118} height={52} rx={14} fill="none" stroke={color} strokeWidth={4} />
        <rect x={830} y={78} width={118} height={52} rx={14} fill="none" stroke={color} strokeWidth={4} />
        <Glyph name="bolt" x={92} y={88} size={30} color={color} strokeWidth={3} opacity={0.8} />
        <Glyph name="bolt" x={870} y={88} size={30} color={color} strokeWidth={3} opacity={0.8} />
        <line x1={76} y1={104} x2={146} y2={104} stroke={color} strokeWidth={2} opacity={0.45} />
        <line x1={854} y1={104} x2={924} y2={104} stroke={color} strokeWidth={2} opacity={0.45} />
      </g>
      <text x={500} y={42} fill={C.cyan} fontFamily={MONO} fontSize={30} textAnchor="middle" letterSpacing={2}>5–7 Wh</text>
      <text x={500} y={286} fill={C.dim} fontFamily={FONT} fontSize={22} textAnchor="middle">两块分置耳后</text>
    </svg>
  );
};

// 侧视：电池从前框滑到耳后，鼻托受力随之后移
export const GlassesSide: React.FC<{ move: number }> = ({ move }) => {
  const bx = 380 + move * 770;
  const boardX = 350 + move * 620;
  const cogX = 455 + move * 720;
  const force = 1 - move * 0.62;
  return (
    <svg width={1680} height={430} viewBox="0 0 1680 430" style={{ overflow: "visible" }}>
      <rect x={150} y={150} width={150} height={132} rx={30} fill="none" stroke={C.cyan} strokeWidth={5} />
      <path d="M300 182 C540 164 930 174 1280 168 C1358 166 1396 194 1412 248" fill="none" stroke={C.cyan} strokeWidth={7} strokeLinecap="round" />
      <path d="M150 178 C130 160 106 162 92 176" fill="none" stroke={C.cyan} strokeWidth={4} opacity={0.7} />
      <circle cx={1300} cy={168} r={10} fill={C.cyan} opacity={0.8} />
      <text x={1300} y={140} fill={C.dim} fontFamily={FONT} fontSize={22} textAnchor="middle">耳朵支点</text>
      <g opacity={0.92}>
        <rect x={bx} y={156} width={154} height={58} rx={16} fill="none" stroke={C.cyan} strokeWidth={4} />
        <Glyph name="bolt" x={bx + 18} y={166} size={34} color={C.cyan} strokeWidth={3} />
        <line x1={bx + 58} y1={186} x2={bx + 134} y2={186} stroke={C.cyan} strokeWidth={2} opacity={0.45} />
      </g>
      <g opacity={0.28 + move * 0.5}>
        <rect x={boardX} y={232} width={104} height={44} rx={10} fill="none" stroke={C.cyan} strokeWidth={3} />
        <line x1={boardX + 14} y1={254} x2={boardX + 88} y2={254} stroke={C.cyan} strokeWidth={2} opacity={0.55} />
      </g>
      <g>
        <circle cx={cogX} cy={126} r={16} fill="none" stroke={C.cyan} strokeWidth={2.5} opacity={0.8} />
        <line x1={cogX - 24} y1={126} x2={cogX + 24} y2={126} stroke={C.cyan} strokeWidth={1.5} opacity={0.5} />
        <line x1={cogX} y1={102} x2={cogX} y2={150} stroke={C.cyan} strokeWidth={1.5} opacity={0.5} />
        <text x={cogX} y={94} fill={C.dim} fontFamily={FONT} fontSize={20} textAnchor="middle">重心</text>
      </g>
      <g>
        <path d="M206 290 C218 282 232 282 244 290" fill="none" stroke={C.cyan} strokeWidth={4} />
        <line x1={225} y1={292} x2={225} y2={292 + 62 * force} stroke={C.cyan} strokeWidth={4} />
        <path d={`M 213 ${352 + 62 * force} L 225 ${368 + 62 * force} L 237 ${352 + 62 * force}`} fill="none" stroke={C.cyan} strokeWidth={4} />
        <text x={252} y={330} fill={C.dim} fontFamily={FONT} fontSize={22}>鼻托</text>
        <text x={252} y={362} fill={C.cyan} fontFamily={FONT} fontSize={20} opacity={0.7}>≤ 对标</text>
      </g>
      <text x={1460} y={340} fill={C.dim} fontFamily={FONT} fontSize={22} textAnchor="end">耳后</text>
    </svg>
  );
};

// 眼镜视野里的极简街景：楼、窗、路面透视线
export const StreetScene: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 1640 680" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
    <g stroke={C.cyan} fill="none" strokeWidth={2.4}>
      <line x1={0} y1={414} x2={1640} y2={414} opacity={0.18} />
      <g opacity={0.3}>
        <path d="M0 414 V188 H222 V414" />
        <path d="M222 414 V268 H356 V414" />
        <path d="M1148 414 V286 H1268 V414" />
        <path d="M1268 414 V154 H1640 V414" />
        {[0, 1, 2, 3].map((r) => (
          <g key={r} opacity={0.6}>
            {[0, 1, 2, 3].map((c) => (
              <rect key={c} x={38 + c * 44} y={218 + r * 42} width={24} height={24} rx={3} />
            ))}
            {[0, 1, 2, 3, 4].map((c) => (
              <rect key={`r${c}`} x={1304 + c * 56} y={186 + r * 46} width={30} height={28} rx={3} />
            ))}
          </g>
        ))}
      </g>
      <g opacity={0.25}>
        <path d="M760 414 L170 680 M880 414 L1470 680" />
        <path d="M820 414 V680" strokeDasharray="20 18" />
        <path d="M120 680 H1520" />
        <path d="M660 510 H980 M590 570 H1050 M520 630 H1120" opacity={0.7} />
      </g>
      <g opacity={0.22}>
        <path d="M404 414 V300 M404 300 H430" />
        <circle cx={430} cy={300} r={5} />
        <path d="M1184 414 V304 M1184 304 H1210" />
        <circle cx={1210} cy={304} r={5} />
      </g>
    </g>
  </svg>
);

// QQ 看板内容：只画头像和灰色文本条，不写真实聊天内容
export const ChatRows: React.FC<{ f: number; rows?: number; wide?: boolean }> = ({ f, rows = 4, wide = false }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: wide ? 16 : 12, padding: wide ? "18px 24px" : "14px 18px", flex: 1, overflow: "hidden" }}>
    {Array.from({ length: rows }).map((_, i) => {
      const p = interpolate(f, [58 + i * 5, 70 + i * 5], [0, 1], { ...clamp, easing: ease });
      const bar = [0.58, 0.78, 0.42, 0.66][i % 4];
      return (
        <div key={i} style={{ display: "flex", gap: wide ? 16 : 12, alignItems: "center", opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
          <div style={{ width: wide ? 42 : 32, height: wide ? 42 : 32, borderRadius: "50%", border: "1px solid rgba(232,226,212,.4)", background: "rgba(232,226,212,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="person" size={wide ? 30 : 20} color={C.cyan} strokeWidth={4} opacity={0.75} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: wide ? 8 : 6 }}>
            <div style={{ width: `${bar * 100}%`, height: wide ? 10 : 8, borderRadius: 5, background: "rgba(232,226,212,.34)" }} />
            <div style={{ width: `${bar * 62}%`, height: wide ? 8 : 6, borderRadius: 4, background: "rgba(232,226,212,.16)" }} />
          </div>
          <div style={{ width: wide ? 44 : 32, height: wide ? 12 : 8, borderRadius: 5, background: "rgba(232,226,212,.14)" }} />
        </div>
      );
    })}
  </div>
);

export const ChatPanel: React.FC<{ f: number; wide?: boolean }> = ({ f, wide = false }) => (
  <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "rgba(8,10,14,.92)", border: "1px solid rgba(232,226,212,.32)", borderRadius: wide ? 18 : 14, overflow: "hidden" }}>
    <div style={{ height: wide ? 48 : 40, borderBottom: "1px solid rgba(232,226,212,.16)", display: "flex", alignItems: "center", padding: "0 18px", gap: 10, flexShrink: 0 }}>
      <span style={{ fontFamily: FONT, color: C.cyan, fontSize: wide ? 22 : 18, fontWeight: 700, letterSpacing: 1 }}>QQ</span>
      <span style={{ flex: 1 }} />
      <span style={{ width: 6, height: 6, borderRadius: 3, background: "rgba(232,226,212,.4)" }} />
      <span style={{ width: 6, height: 6, borderRadius: 3, background: "rgba(232,226,212,.28)" }} />
      <span style={{ width: 6, height: 6, borderRadius: 3, background: "rgba(232,226,212,.18)" }} />
    </div>
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      {wide && (
        <div style={{ width: 172, borderRight: "1px solid rgba(232,226,212,.12)", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[0.85, 0.62, 0.74, 0.5, 0.68].map((w, i) => (
            <div key={i} style={{ width: `${w * 100}%`, height: 8, borderRadius: 4, background: "rgba(232,226,212,.17)" }} />
          ))}
        </div>
      )}
      <ChatRows f={f} rows={wide ? 5 : 4} wide={wide} />
    </div>
  </div>
);

// 一天中的七幅小插画
export type DayKind = "watch" | "subway" | "office" | "field" | "drive" | "call" | "sleep";
export const DayArt: React.FC<{ kind: DayKind; f: number }> = ({ kind, f }) => {
  const common = { fill: "none", stroke: C.cyan, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "watch") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 1000 620">
        <g {...common} strokeWidth={5}>
          <rect x={300} y={80} width={120} height={70} rx={18} opacity={0.75} />
          <rect x={300} y={460} width={120} height={70} rx={18} opacity={0.75} />
          <circle cx={360} cy={305} r={142} />
          <circle cx={360} cy={305} r={116} opacity={0.3} />
          <line x1={360} y1={305} x2={360} y2={198} transform={`rotate(${240 + f * 0.08} 360 305)`} strokeWidth={6} />
          <line x1={360} y1={305} x2={360} y2={208} />
          <circle cx={360} cy={305} r={7} fill={C.cyan} stroke="none" />
          <line x1={470} y1={305} x2={578} y2={305} strokeDasharray="3 14" opacity={0.55} />
          <circle cx={360} cy={305} r={160 + Math.sin(f / 14) * 5} opacity={0.12} />
        </g>
        <Glyph name="glasses" x={590} y={190} size={310} color={C.cyan} strokeWidth={3} opacity={0.92} />
        <circle cx={760} cy={330} r={26} fill="none" stroke={C.cyan} strokeWidth={2} opacity={0.2} />
      </svg>
    );
  }
  if (kind === "subway") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 1000 620">
        <g {...common} strokeWidth={4}>
          <line x1={40} y1={44} x2={960} y2={44} opacity={0.5} />
          {[180, 360, 560].map((x) => (
            <g key={x} opacity={0.55}>
              <line x1={x} y1={44} x2={x} y2={88} />
              <circle cx={x} cy={88} r={18} />
            </g>
          ))}
          <rect x={48} y={110} width={600} height={380} rx={22} opacity={0.55} />
          <line x1={248} y1={110} x2={248} y2={490} opacity={0.5} />
          <line x1={448} y1={110} x2={448} y2={490} opacity={0.5} />
          <line x1={48} y1={300} x2={648} y2={300} opacity={0.5} />
          <line x1={48} y1={548} x2={960} y2={548} opacity={0.4} />
          <path d="M690 240 L664 274 H700 L674 312" strokeDasharray="4 10" opacity={0.55} />
          <line x1={674} y1={312} x2={748} y2={312} strokeDasharray="4 10" opacity={0.55} />
        </g>
        <Glyph name="glasses" x={744} y={164} size={240} color={C.cyan} strokeWidth={3} opacity={0.9} />
        <g>
          <rect x={792} y={230} width={210} height={158} rx={12} fill="rgba(8,10,14,.94)" stroke={C.cyan} strokeWidth={2.5} opacity={0.95} />
          <text x={806} y={254} fill={C.cyan} fontFamily={FONT} fontSize={18} fontWeight={700}>QQ</text>
          {[0, 1, 2].map((i) => (
            <g key={i} opacity={0.7 - i * 0.16}>
              <circle cx={812} cy={278 + i * 34} r={9} fill="none" stroke={C.cyan} strokeWidth={2} />
              <rect x={830} y={271 + i * 34} width={120 - i * 20} height={7} rx={3.5} fill={C.cyan} opacity={0.5} />
              <rect x={830} y={283 + i * 34} width={78} height={5} rx={2.5} fill={C.cyan} opacity={0.2} />
            </g>
          ))}
        </g>
      </svg>
    );
  }
  if (kind === "office") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 1000 620">
        <g {...common} strokeWidth={4}>
          <line x1={50} y1={492} x2={960} y2={492} opacity={0.7} />
          <line x1={100} y1={492} x2={100} y2={580} opacity={0.5} />
          <line x1={910} y1={492} x2={910} y2={580} opacity={0.5} />
          <rect x={92} y={286} width={294} height={176} rx={8} opacity={0.85} />
          <line x1={228} y1={462} x2={228} y2={500} opacity={0.7} />
          <line x1={178} y1={500} x2={278} y2={500} opacity={0.7} />
          <rect x={118} y={506} width={244} height={28} rx={5} opacity={0.45} />
          <rect x={330} y={512} width={28} height={22} rx={3} opacity={0.35} />
          <rect x={470} y={140} width={236} height={158} rx={10} opacity={0.8} />
          <line x1={470} y1={170} x2={706} y2={170} opacity={0.5} />
          <rect x={492} y={196} width={150} height={9} rx={4.5} fill={C.cyan} opacity={0.28} />
          <rect x={492} y={218} width={108} height={7} rx={3.5} fill={C.cyan} opacity={0.16} />
          <rect x={492} y={244} width={168} height={7} rx={3.5} fill={C.cyan} opacity={0.16} />
          <rect x={724} y={250} width={214} height={154} rx={10} opacity={0.65} />
          <line x1={724} y1={280} x2={938} y2={280} opacity={0.45} />
          <rect x={746} y={306} width={136} height={8} rx={4} fill={C.cyan} opacity={0.24} />
          <rect x={746} y={328} width={92} height={7} rx={3.5} fill={C.cyan} opacity={0.15} />
          <rect x={746} y={352} width={120} height={7} rx={3.5} fill={C.cyan} opacity={0.15} />
          <path d="M826 404 L860 434 L842 437 L850 456 L841 460 L833 441 L821 452 Z" fill={C.cyan} opacity={0.8} />
          <line x1={470} y1={310} x2={420} y2={310} strokeDasharray="3 10" opacity={0.4} />
        </g>
      </svg>
    );
  }
  if (kind === "field") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 1000 620">
        <g {...common} strokeWidth={4}>
          <rect x={120} y={266} width={342} height={246} rx={14} opacity={0.85} />
          <line x1={120} y1={330} x2={462} y2={330} opacity={0.5} />
          <rect x={164} y={354} width={118} height={76} rx={6} opacity={0.5} />
          <circle cx={386} cy={394} r={38} opacity={0.65} />
          <line x1={386} y1={394} x2={410} y2={368} />
          <circle cx={386} cy={394} r={5} fill={C.cyan} stroke="none" />
          <path d="M120 470 H62 V420" opacity={0.55} />
          <path d="M462 470 H520 V430" opacity={0.55} />
          <line x1={90} y1={230} x2={90} y2={286} opacity={0.6} />
          <line x1={90} y1={230} x2={132} y2={230} opacity={0.6} />
          <line x1={540} y1={230} x2={540} y2={286} opacity={0.6} />
          <line x1={498} y1={230} x2={540} y2={230} opacity={0.6} />
          <line x1={90} y1={540} x2={90} y2={584} opacity={0.6} />
          <line x1={90} y1={584} x2={132} y2={584} opacity={0.6} />
          <line x1={540} y1={540} x2={540} y2={584} opacity={0.6} />
          <line x1={498} y1={584} x2={540} y2={584} opacity={0.6} />
          <line x1={478} y1={326} x2={612} y2={244} strokeDasharray="4 9" opacity={0.55} />
          <rect x={612} y={176} width={286} height={112} rx={12} opacity={0.8} />
          <rect x={636} y={204} width={164} height={9} rx={4.5} fill={C.cyan} opacity={0.32} />
          <rect x={636} y={228} width={210} height={7} rx={3.5} fill={C.cyan} opacity={0.17} />
          <circle cx={858} cy={210} r={12} opacity={0.55} />
          <line x1={700} y1={420} x2={780} y2={420} strokeDasharray="2 10" opacity={0.4} />
        </g>
        <Glyph name="camera" x={792} y={380} size={120} color={C.cyan} strokeWidth={3} opacity={0.75} />
      </svg>
    );
  }
  if (kind === "drive") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 1000 620">
        <g {...common} strokeWidth={4}>
          <line x1={0} y1={214} x2={1000} y2={214} opacity={0.18} />
          <path d="M500 214 L150 620 M500 214 L850 620" opacity={0.55} />
          <path d="M500 214 V620" strokeDasharray="30 26" opacity={0.4} />
          <path d="M396 214 L230 620 M604 214 L770 620" opacity={0.16} />
          <path d="M500 300 L436 620 M500 300 L564 620" opacity={0.12} />
          <circle cx={196} cy={516} r={112} opacity={0.65} />
          <circle cx={196} cy={516} r={54} opacity={0.5} />
          <line x1={196} y1={404} x2={196} y2={462} opacity={0.5} />
          <line x1={86} y1={560} x2={160} y2={548} opacity={0.5} />
          <line x1={306} y1={560} x2={232} y2={548} opacity={0.5} />
          <rect x={598} y={130} width={316} height={204} rx={18} opacity={0.8} />
          <line x1={598} y1={172} x2={914} y2={172} opacity={0.4} />
          <path d="M652 298 V246 Q652 230 668 230 H726" strokeWidth={7} />
          <path d="M710 208 L748 230 L710 252" strokeWidth={5} />
          <path d="M680 280 H754" strokeDasharray="10 9" opacity={0.55} />
          <circle cx={876} cy={152} r={7} fill={C.cyan} stroke="none" opacity={0.7} />
        </g>
      </svg>
    );
  }
  if (kind === "call") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 1000 620">
        <g {...common} strokeWidth={4}>
          <rect x={62} y={92} width={408} height={430} rx={20} opacity={0.85} />
          <rect x={530} y={92} width={408} height={430} rx={20} opacity={0.6} />
          <line x1={470} y1={306} x2={530} y2={306} strokeDasharray="4 10" opacity={0.45} />
          <circle cx={737} cy={246} r={62} opacity={0.8} />
          <path d="M646 438 C646 362 686 330 737 330 C788 330 828 362 828 438" opacity={0.8} />
          <path d="M675 246 H799 M737 184 V308 M690 206 L784 286 M784 206 L690 286" opacity={0.18} />
          <circle cx={737} cy={246} r={40} opacity={0.25} />
          <circle cx={266} cy={246} r={62} opacity={0.8} />
          <path d="M175 438 C175 362 215 330 266 330 C317 330 357 362 357 438" opacity={0.8} />
          <circle cx={500} cy={572} r={24} opacity={0.55} />
          <circle cx={566} cy={572} r={24} opacity={0.55} />
          <circle cx={632} cy={572} r={24} opacity={0.55} />
          <rect x={490} y={564} width={20} height={16} rx={4} opacity={0.6} />
          <path d="M556 564 L580 572 L556 580 Z" opacity={0.6} />
          <path d="M624 564 H640 V580 H624 Z" opacity={0.6} />
        </g>
      </svg>
    );
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 620">
      <g {...common} strokeWidth={4}>
        <line x1={60} y1={512} x2={940} y2={512} opacity={0.45} />
        <ellipse cx={492} cy={512} rx={258} ry={18} opacity={0.16} />
        <g transform="translate(360 286) rotate(-14)">
          <rect x={0} y={0} width={150} height={130} rx={28} opacity={0.85} />
          <rect x={176} y={0} width={150} height={130} rx={28} opacity={0.85} />
          <path d="M150 32 Q163 16 176 32" opacity={0.8} />
          <path d="M0 52 L-42 44" opacity={0.7} />
          <path d="M326 52 L368 44" opacity={0.7} />
        </g>
        <path d="M558 356 L638 410 M742 356 L650 410" opacity={0.7} />
        <path d="M612 356 L612 430" opacity={0.45} />
        <path d="M756 132 C716 142 692 180 704 220 C716 260 756 276 792 260 C760 246 744 218 746 192 C748 166 752 146 756 132 Z" opacity={0.9} />
        <circle cx={840} cy={110} r={4} fill={C.cyan} stroke="none" opacity={0.7} />
        <circle cx={890} cy={168} r={3} fill={C.cyan} stroke="none" opacity={0.5} />
        <circle cx={812} cy={78} r={2.5} fill={C.cyan} stroke="none" opacity={0.5} />
        <path d="M650 170 H682 L650 202 H682 M704 132 H728 L704 158 H728 M738 96 H758 L738 118 H758" opacity={0.55} />
      </g>
    </svg>
  );
};

// 路线图节点小图标
export const STAGE_ICONS = ["magnifier", "board", "glasses", "wrench", "chip"] as const;
