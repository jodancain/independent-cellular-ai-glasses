// 宣传片各场景：画面以 SVG 插画、图标、连线与光点为主，文字只保留短语。
// 数字只取自仓库文档与公开资料；本方案数值均为设计目标。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C, Card, Counter, FONT, Kicker, KineticTitle, MONO, ease, useIn } from "./kit";
import { FlowDiagram, DIAGRAMS, diagramSize } from "../diagram/FlowDiagram";
import { Glyph, GlyphName, Icon } from "./icons";
import { Say } from "./persona";
import { ChatPanel, DayArt, DayKind, GlassesSide, GlassesTop, GlassesWire, StreetScene, cubicAt, quadAt } from "./illus";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const Pad: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ padding: "130px 120px 110px", fontFamily: FONT, color: C.text, justifyContent: "center", ...style }}>{children}</AbsoluteFill>
);

const ARCH = diagramSize(DIAGRAMS.HardwareCompute, true);
const ARCH_SCALE = Math.min(1620 / ARCH.width, 660 / ARCH.height);

// ---------- 1 开场 ----------
export const SIntro: React.FC<{ pulse: number }> = ({ pulse }) => (
  <Pad style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      {[280, 390, 510, 640].map((r, i) => (
        <circle key={r} cx={960} cy={438} r={r} fill="none" stroke={C.cyan} strokeWidth={1.2} opacity={0.035 + i * 0.012} />
      ))}
      <line x1={960} y1={90} x2={960} y2={250} stroke={C.cyan} strokeWidth={1} opacity={0.14} />
      <line x1={960} y1={680} x2={960} y2={820} stroke={C.cyan} strokeWidth={1} opacity={0.08} />
    </svg>
    <div style={{ marginBottom: 48, marginTop: -18 }}>
      <GlassesWire start={0} scale={0.82} glow={pulse} brain />
    </div>
    <KineticTitle text="独立蜂窝 AI 眼镜" start={14} size={110} />
    <div style={{ height: 26 }} />
    <KineticTitle text="眼镜是脑，主机是手" start={34} size={44} color={C.cyan} weight={500} stagger={2} />
  </Pad>
);

// ---------- 2 愿景：脑 / 手 / 器官 ----------
const HANDS: { name: GlyphName; label: string; x: number; y: number; p0: { x: number; y: number }; c: { x: number; y: number }; p2: { x: number; y: number } }[] = [
  { name: "monitor", label: "电脑", x: 60, y: 116, p0: { x: 170, y: 165 }, c: { x: 390, y: 150 }, p2: { x: 600, y: 238 } },
  { name: "cloud", label: "云", x: 1524, y: 116, p0: { x: 1510, y: 165 }, c: { x: 1290, y: 150 }, p2: { x: 1080, y: 238 } },
  { name: "phone", label: "手机", x: 60, y: 366, p0: { x: 170, y: 415 }, c: { x: 390, y: 430 }, p2: { x: 600, y: 292 } },
  { name: "car", label: "汽车", x: 1524, y: 366, p0: { x: 1510, y: 415 }, c: { x: 1290, y: 430 }, p2: { x: 1080, y: 292 } },
];
const ORGANS: { a: GlyphName; b: GlyphName; label: string; x: number; start: number }[] = [
  { a: "camera", b: "eye", label: "眼睛", x: 280, start: 74 },
  { a: "mic", b: "mouth", label: "嘴巴", x: 720, start: 84 },
  { a: "speaker", b: "ear", label: "耳朵", x: 1160, start: 94 },
  { a: "lens", b: "retina", label: "视网膜", x: 1540, start: 104 },
];
export const SVision: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Pad>
      <Kicker text="VISION · 脑 · 手 · 器官" />
      <div style={{ height: 14 }} />
      <KineticTitle text="眼镜是脑，所有主机都是手" start={4} size={56} />
      <div style={{ position: "relative", height: 700, marginTop: 12 }}>
        <svg width={1680} height={700} viewBox="0 0 1680 700" style={{ position: "absolute", inset: 0 }}>
          {HANDS.map((h, i) => {
            const p = interpolate(f, [24 + i * 8, 42 + i * 8], [0, 1], { ...clamp, easing: ease });
            const d = `M ${h.p0.x} ${h.p0.y} Q ${h.c.x} ${h.c.y} ${h.p2.x} ${h.p2.y}`;
            return (
              <g key={h.label} opacity={p}>
                <path d={d} fill="none" stroke={C.cyan} strokeWidth={1.6} opacity={0.25} strokeDasharray="2 9" />
                {[0, 0.26, 0.52, 0.78].map((o, j) => {
                  const t = (f / 58 + o + i * 0.17) % 1;
                  const pt = quadAt(h.p0, h.c, h.p2, t);
                  return <circle key={j} cx={pt.x} cy={pt.y} r={4.2} fill={C.cyan} opacity={Math.sin(Math.PI * t) * 0.85} />;
                })}
                <circle cx={h.p2.x} cy={h.p2.y} r={4} fill={C.cyan} opacity={0.5} />
              </g>
            );
          })}
          <line x1={840} y1={145} x2={840} y2={182} stroke={C.cyan} strokeWidth={2} opacity={0.45} />
          {[0, 0.5].map((o) => {
            const t = (f / 46 + o) % 1;
            return <circle key={o} cx={840} cy={145 + t * 37} r={3.5} fill={C.cyan} opacity={Math.sin(Math.PI * t) * 0.9} />;
          })}
        </svg>
        <div style={{ position: "absolute", left: 840 - 65, top: 8 }}>
          <Icon name="brain" size={130} color={C.cyan} strokeWidth={3} opacity={0.9} />
        </div>
        <div style={{ position: "absolute", left: 840 - 260, top: 182 }}>
          <GlassesWire start={10} scale={0.52} brain={false} screen={false} />
        </div>
        {HANDS.map((h, i) => (
          <div key={h.label} style={{ position: "absolute", left: h.x, top: h.y, width: 100, textAlign: "center", opacity: interpolate(f, [18 + i * 8, 34 + i * 8], [0, 1], { ...clamp, easing: ease }) }}>
            <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={h.name} size={84} color={C.cyan} strokeWidth={3} opacity={0.85} />
            </div>
            <div style={{ marginTop: 8, fontFamily: FONT, fontSize: 21, color: C.dim, letterSpacing: 2 }}>{h.label}</div>
          </div>
        ))}
        {ORGANS.map((o) => {
          const p = interpolate(f, [o.start, o.start + 20], [0, 1], { ...clamp, easing: ease });
          return (
            <div key={o.label} style={{ position: "absolute", left: o.x - 145, top: 520, width: 290, opacity: p, transform: `translateY(${(1 - p) * 22}px)` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <Icon name={o.a} size={66} color={C.cyan} strokeWidth={3} opacity={0.66} />
                <svg width={44} height={20} viewBox="0 0 44 20">
                  <line x1={2} y1={10} x2={34} y2={10} stroke={C.cyan} strokeWidth={2} opacity={0.45} />
                  <path d="M30 3 L40 10 L30 17" fill="none" stroke={C.cyan} strokeWidth={2} opacity={0.6} />
                </svg>
                <Icon name={o.b} size={78} color={C.cyan} strokeWidth={3} opacity={0.9} />
              </div>
              <div style={{ marginTop: 14, textAlign: "center", fontSize: 22, letterSpacing: 3, color: C.text }}>{o.label}</div>
            </div>
          );
        })}
      </div>
    </Pad>
  );
};

// ---------- 3 竞品：只留名字 + 重量，后半段定位图 ----------
const RIVALS = [
  { name: "Ray-Ban Meta（Gen 2）", w: "约 48–52 g", g: 50 },
  { name: "Meta Ray-Ban Display", w: "约 69 g", g: 69 },
  { name: "XREAL One", w: "约 84 g", g: 84 },
  { name: "XREAL Aura", w: "约 95 g", g: 95 },
];
export const SRivals: React.FC = () => {
  const f = useCurrentFrame();
  const showMap = f > 190;
  const mapIn = interpolate(f, [190, 216], [0, 1], { ...clamp, easing: ease });
  const listOut = interpolate(f, [178, 196], [1, 0], clamp);
  const dots = [
    { n: "Ray-Ban Meta", x: 0.2, y: 0.12, ours: false },
    { n: "Ray-Ban Display", x: 0.3, y: 0.38, ours: false },
    { n: "XREAL One", x: 0.12, y: 0.62, ours: false },
    { n: "XREAL Aura", x: 0.32, y: 0.86, ours: false },
    { n: "本方案", x: 0.88, y: 0.8, ours: true },
  ];
  return (
    <Pad style={{ justifyContent: "flex-start" }}>
      <Kicker text="COMPETITORS · 竞品" />
      <div style={{ height: 14 }} />
      <KineticTitle text={showMap ? "空位：独立联网 × 显示" : "主流眼镜各占一角"} start={showMap ? 188 : 4} size={62} />
      {!showMap && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 34, opacity: listOut }}>
          {RIVALS.map((r, i) => (
            <Card key={r.name} start={20 + i * 13} from={i % 2 ? "right" : "left"} style={{ padding: "20px 6px 8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="glasses" size={78} color={C.cyan} strokeWidth={3} opacity={0.45} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 28, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div style={{ position: "relative", height: 5, marginTop: 22, background: "rgba(232,226,212,.12)", borderRadius: 3 }}>
                    <div style={{ width: `${r.g}%`, height: 5, borderRadius: 3, background: C.cyan, opacity: 0.75 }} />
                    <div style={{ position: "absolute", left: `${r.g}%`, top: -3, width: 2, height: 11, background: C.cyan, opacity: 0.9 }} />
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 38, fontWeight: 600, color: C.cyan, whiteSpace: "nowrap", marginLeft: 8 }}>{r.w}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showMap && (
        <div style={{ position: "relative", marginTop: 20, height: 660, opacity: mapIn }}>
          <svg width={1680} height={660} viewBox="0 0 1680 660" style={{ position: "absolute", inset: 0 }}>
            <line x1={100} y1={570} x2={1640} y2={570} stroke={C.cyan} strokeWidth={1.5} opacity={0.4} />
            <line x1={100} y1={570} x2={100} y2={50} stroke={C.cyan} strokeWidth={1.5} opacity={0.4} />
            <text x={1632} y={610} fill={C.dim} fontSize={21} textAnchor="end" fontFamily={FONT}>独立性 →</text>
            <text x={114} y={30} fill={C.dim} fontSize={21} fontFamily={FONT}>↑ 空间显示</text>
            <rect x={1180} y={70} width={430} height={248} rx={18} fill="none" stroke={C.cyan} strokeWidth={1.5} strokeDasharray="7 8" opacity={0.4} />
            <text x={1210} y={108} fill={C.cyan} fontSize={20} opacity={0.8} fontFamily={FONT}>空位</text>
            {dots.map((d, i) => {
              const p = interpolate(f, [198 + i * 9, 216 + i * 9], [0, 1], { ...clamp, easing: ease });
              const x = 100 + d.x * 1500;
              const y = 570 - d.y * 500;
              const ring = d.ours ? 18 + 9 * Math.abs(Math.sin(f / 8)) : 0;
              return (
                <g key={d.n} opacity={p}>
                  {d.ours && <circle cx={x} cy={y} r={ring + 13} fill="none" stroke={C.cyan} strokeWidth={2.5} opacity={0.5} />}
                  <circle cx={x} cy={y} r={d.ours ? 17 : 12} fill={C.cyan} opacity={d.ours ? 0.95 : 0.7} />
                  <text x={x + 28} y={y + 9} fill={d.ours ? C.text : C.dim} fontSize={d.ours ? 33 : 25} fontWeight={d.ours ? 700 : 500} fontFamily={FONT}>{d.n}</text>
                </g>
              );
            })}
            <text x={1640} y={642} fill={C.dim} fontSize={16} textAnchor="end" fontFamily={MONO}>PROJECT JUDGEMENT · NOT MARKET DATA</text>
          </svg>
        </div>
      )}
    </Pad>
  );
};

// ---------- 4 架构：保留框图，标题缩短 ----------
export const SArchitecture: React.FC = () => {
  const p = useIn(8, 22);
  return (
    <Pad>
      <Kicker text="ARCHITECTURE" />
      <div style={{ height: 14 }} />
      <KineticTitle text="小脑在眼镜里" start={4} size={64} />
      <div style={{ marginTop: 26, height: 700, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(242,244,248,.12)", opacity: p, transform: `scale(${0.96 + p * 0.04})`, position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: 10, width: ARCH.width, height: ARCH.height, transform: `translateX(-50%) scale(${ARCH_SCALE})`, transformOrigin: "50% 0" }}>
          <FlowDiagram id="HardwareCompute" transparent hideHeader />
        </div>
      </div>
    </Pad>
  );
};

// ---------- 5 连接：四类主机 + 蓝本线型 + 流动光点 ----------
const LINKS = [
  { k: "A1", l: "有线", side: "电脑", y: 180, e: 258, dash: "0", w: 3.4, o: 0.85 },
  { k: "A2", l: "有线", side: "电脑", y: 290, e: 286, dash: "14 9", w: 2.4, o: 0.65 },
  { k: "B", l: "Wi-Fi", side: "手机", y: 400, e: 314, dash: "2 9", w: 2.4, o: 0.72 },
  { k: "C", l: "5G", side: "云", y: 510, e: 342, dash: "18 6 2 6", w: 2.4, o: 0.7 },
  { k: "BLE", l: "BLE", side: "汽车", y: 620, e: 370, dash: "5 7", w: 2.2, o: 0.6 },
];
const HOST_ICONS: { name: GlyphName; label: string; y: number; target: number }[] = [
  { name: "monitor", label: "电脑", y: 150, target: 180 },
  { name: "phone", label: "手机", y: 300, target: 290 },
  { name: "car", label: "汽车", y: 450, target: 400 },
  { name: "cloud", label: "云", y: 600, target: 510 },
];
export const SConnect: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Pad>
      <Kicker text="CONNECT" />
      <div style={{ height: 14 }} />
      <KineticTitle text="脑连上每一只手" start={4} size={60} />
      <div style={{ position: "relative", height: 650, marginTop: 16 }}>
        <svg width={1680} height={650} viewBox="0 0 1680 650" style={{ position: "absolute", inset: 0 }}>
          <line x1={270} y1={160} x2={270} y2={610} stroke={C.cyan} strokeWidth={1.2} opacity={0.16} />
          {HOST_ICONS.map((h) => (
            <line key={h.label} x1={190} y1={h.y + 20} x2={270} y2={h.y + 20} stroke={C.cyan} strokeWidth={1.2} opacity={0.18} />
          ))}
          {LINKS.map((l, i) => {
            const sx = 300, sy = l.y, ex = 1320, ey = l.e;
            const d = `M ${sx} ${sy} C 760 ${sy}, 1010 ${ey + 10}, ${ex} ${ey}`;
            const p = interpolate(f, [16 + i * 7, 46 + i * 7], [0, 1], { ...clamp, easing: ease });
            const ev = evolvePath(p, d);
            const lp = cubicAt({ x: sx, y: sy }, { x: 760, y: sy }, { x: 1010, y: ey + 10 }, { x: ex, y: ey }, 0.53);
            return (
              <g key={l.k}>
                <path d={d} fill="none" stroke={C.cyan} strokeWidth={l.w} opacity={l.o * 0.55} strokeDasharray={l.dash === "0" ? undefined : l.dash} strokeLinecap="round" />
                <path d={d} fill="none" stroke={C.cyan} strokeWidth={l.w} opacity={0.7} strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
                {p > 0.9 &&
                  [0, 0.28, 0.56, 0.84].map((o, j) => {
                    const t = (f / 46 + o + i * 0.13) % 1;
                    const pt = cubicAt({ x: sx, y: sy }, { x: 760, y: sy }, { x: 1010, y: ey + 10 }, { x: ex, y: ey }, t);
                    return <circle key={j} cx={pt.x} cy={pt.y} r={5} fill={C.cyan} opacity={Math.sin(Math.PI * t) * 0.95} />;
                  })}
                <text x={304} y={sy - 12} fill={C.cyan} fontFamily={MONO} fontSize={14} opacity={0.45}>{l.k}</text>
                <text x={lp.x} y={lp.y - 14} fill={C.text} fontFamily={FONT} fontSize={22} textAnchor="middle" opacity={0.85}>{l.l}</text>
              </g>
            );
          })}
        </svg>
        {HOST_ICONS.map((h, i) => (
          <div key={h.label} style={{ position: "absolute", left: 48, top: h.y - 22, width: 100, display: "flex", alignItems: "center", gap: 14, opacity: interpolate(f, [8 + i * 6, 24 + i * 6], [0, 1], { ...clamp, easing: ease }) }}>
            <Icon name={h.name} size={68} color={C.cyan} strokeWidth={3} opacity={0.85} />
            <span style={{ fontSize: 22, color: C.dim, letterSpacing: 2, whiteSpace: "nowrap" }}>{h.label}</span>
          </div>
        ))}
        <div style={{ position: "absolute", left: 1320, top: 240 }}>
          <GlassesWire start={24} scale={0.34} brain screen={false} glow={0.2} />
          <div style={{ marginTop: 8, textAlign: "center", fontFamily: FONT, fontSize: 20, color: C.dim, letterSpacing: 4 }}>眼镜</div>
        </div>
      </div>
    </Pad>
  );
};

// ---------- 6 显示模式：视野演示（气泡 → 看板 → 投屏 → 四种模式） ----------
const COMPAT_MODES: { icon: GlyphName; label: string }[] = [
  { icon: "play", label: "视频" },
  { icon: "viewfinder", label: "拍照" },
  { icon: "videoCall", label: "通话" },
  { icon: "image", label: "图片" },
];
export const SCompat: React.FC = () => {
  const f = useCurrentFrame();
  const bubble = { left: 1020, top: 250, w: 332, h: 76 };
  const board = { left: 920, top: 80, w: 560, h: 392 };
  const cast = { left: 500, top: 40, w: 1050, h: 500 };
  const a = interpolate(f, [48, 84], [0, 1], { ...clamp, easing: ease });
  const b = interpolate(f, [132, 172], [0, 1], { ...clamp, easing: ease });
  const left = bubble.left + (board.left - bubble.left) * a + (cast.left - board.left) * b;
  const top = bubble.top + (board.top - bubble.top) * a + (cast.top - board.top) * b;
  const w = bubble.w + (board.w - bubble.w) * a + (cast.w - board.w) * b;
  const h = bubble.h + (board.h - bubble.h) * a + (cast.h - board.h) * b;
  const radius = 20 + (14 - 20) * a + (18 - 14) * b;
  const bubbleIn = interpolate(f, [22, 34, 58, 70], [0, 1, 1, 0], clamp);
  const boardIn = interpolate(f, [64, 80, 146, 164], [0, 1, 1, 0], clamp);
  const castIn = interpolate(f, [148, 170], [0, 1], { ...clamp, easing: ease });
  const frameIn = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: ease });
  const beam = interpolate(f, [54, 140], [0, 1], { ...clamp, easing: ease });
  return (
    <Pad>
      <Kicker text="DISPLAY MODES" />
      <div style={{ height: 10 }} />
      <KineticTitle text="想看什么，就看到什么" start={2} size={54} />
      <div style={{ position: "relative", height: 690, marginTop: 16, borderRadius: 42, border: `2px solid rgba(232,226,212,${0.42 * frameIn})`, overflow: "hidden", background: "rgba(232,226,212,.015)" }}>
        <StreetScene />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 45%, transparent 45%, rgba(5,6,8,.55) 100%)" }} />
        {/* 说话声波 */}
        <div style={{ position: "absolute", left: 42, top: 420, display: "flex", alignItems: "center", gap: 5, height: 110, opacity: interpolate(f, [0, 10], [0, 1], clamp) }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const hh = 22 + 34 * Math.abs(Math.sin(f / 5 + i * 0.8));
            return <div key={i} style={{ width: 6, height: hh, borderRadius: 3, background: C.cyan, opacity: 0.55 + 0.35 * Math.sin(f / 5 + i) }} />;
          })}
          <div style={{ marginLeft: 8, fontFamily: FONT, fontSize: 20, color: C.dim, letterSpacing: 2 }}>说</div>
        </div>
        {/* 手机与手渲染光束 */}
        <div style={{ position: "absolute", left: 54, top: 562, textAlign: "center", opacity: 0.9 }}>
          <Icon name="phone" size={62} color={C.cyan} strokeWidth={3} opacity={0.8} />
          <div style={{ marginTop: 4, fontFamily: FONT, fontSize: 18, color: C.dim }}>手机</div>
        </div>
        <svg width={1640} height={690} viewBox="0 0 1640 690" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {beam > 0 &&
            Array.from({ length: 16 }).map((_, i) => {
              const t = ((f - 54) / 74 + i / 16) % 1;
              const pt = cubicAt({ x: 110, y: 590 }, { x: 360, y: 470 }, { x: 700, y: 620 }, { x: 920, y: 360 }, t);
              return <circle key={i} cx={pt.x} cy={pt.y} r={3.6 + (i % 2) * 1.2} fill={C.cyan} opacity={Math.sin(Math.PI * t) * 0.75 * beam} />;
            })}
        </svg>
        {/* 气泡 / 看板 / 投屏：同一个容器就地变形 */}
        <div style={{ position: "absolute", left, top, width: w, height: h, borderRadius: radius, background: "rgba(8,10,14,.93)", border: "1px solid rgba(232,226,212,.34)", boxShadow: "0 0 0 1px rgba(5,6,8,.4)", overflow: "hidden", opacity: f > 20 ? 1 : 0 }}>
          {bubbleIn > 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 18px", gap: 14, opacity: bubbleIn }}>
              <svg width={28} height={28} viewBox="0 0 28 28">
                <circle cx={14} cy={14} r={10} fill="none" stroke={C.cyan} strokeWidth={2.5} opacity={0.3} />
                <circle cx={14} cy={14} r={10} fill="none" stroke={C.cyan} strokeWidth={2.5} strokeDasharray="30 20" transform={`rotate(${f * 8} 14 14)`} />
              </svg>
              <span style={{ fontSize: 24, color: C.text, whiteSpace: "nowrap", letterSpacing: 1 }}>正在打开 QQ</span>
            </div>
          )}
          {boardIn > 0 && (
            <div style={{ position: "absolute", inset: 0, opacity: boardIn }}>
              <ChatPanel f={f} />
            </div>
          )}
          {castIn > 0 && (
            <div style={{ position: "absolute", inset: 0, opacity: castIn, display: "flex", flexDirection: "column" }}>
              <div style={{ height: 48, flexShrink: 0, borderBottom: "1px solid rgba(232,226,212,.16)", display: "flex", alignItems: "center", padding: "0 20px", gap: 9 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(232,226,212,.42)" }} />
                <span style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(232,226,212,.3)" }} />
                <span style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(232,226,212,.2)" }} />
                <span style={{ marginLeft: 12, fontFamily: FONT, fontSize: 20, color: C.dim, letterSpacing: 2 }}>投屏</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
                <ChatPanel f={f} wide />
              </div>
              <div style={{ position: "absolute", right: 24, top: 66, padding: "5px 14px", borderRadius: 999, border: "1px solid rgba(232,226,212,.55)", fontSize: 18, letterSpacing: 2, background: "rgba(5,6,8,.72)" }}>接管</div>
              <div style={{ position: "absolute", left: 610, top: 330 }}>
                <Icon name="cursor" size={38} color={C.cyan} strokeWidth={3} opacity={0.95} />
                {[0, 1].map((i) => {
                  const p = Math.max(0, Math.min(1, ((f - 160) / 40 + i * 0.5) % 1));
                  return <div key={i} style={{ position: "absolute", left: 10 - p * 22, top: 12 - p * 22, width: 44 * p, height: 44 * p, borderRadius: "50%", border: "1.5px solid rgba(232,226,212,.5)", opacity: f > 160 ? (1 - p) * 0.7 : 0 }} />;
                })}
              </div>
            </div>
          )}
        </div>
        {/* 四种模式图标卡 */}
        {COMPAT_MODES.map((m, i) => {
          const p = interpolate(f, [164 + i * 5, 178 + i * 5], [0, 1], { ...clamp, easing: ease });
          return (
            <div key={m.label} style={{ position: "absolute", left: 190 + i * 250, top: 562, width: 230, height: 88, borderRadius: 14, border: "1px solid rgba(232,226,212,.28)", background: "rgba(8,10,14,.86)", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
              <Icon name={m.icon} size={44} color={C.cyan} strokeWidth={3} opacity={0.9} />
              <span style={{ fontSize: 24, letterSpacing: 2 }}>{m.label}</span>
            </div>
          );
        })}
        {/* 1 主 + 2 气泡：始终显示 */}
        <div style={{ position: "absolute", left: 1210, top: 560, width: 386, height: 92, borderRadius: 14, border: "1px solid rgba(232,226,212,.2)", background: "rgba(8,10,14,.8)", display: "flex", alignItems: "center", padding: "0 18px", gap: 16 }}>
          <div style={{ position: "relative", width: 118, height: 62, border: "1.5px solid rgba(232,226,212,.65)", borderRadius: 8 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ width: 62, height: 18, border: "1.5px solid rgba(232,226,212,.4)", borderRadius: 5 }} />
            <div style={{ width: 62, height: 18, border: "1.5px solid rgba(232,226,212,.4)", borderRadius: 5 }} />
          </div>
          <div style={{ fontFamily: FONT, fontSize: 18, color: C.dim, whiteSpace: "nowrap" }}>1 主 + 2 气泡</div>
        </div>
      </div>
    </Pad>
  );
};

// ---------- 7 功耗：状态图标 + 电池剖面 + 两块电池 ----------
const PROFILE = [
  { t: "串流", wh: 2.0, icon: "play" as GlyphName },
  { t: "通话", wh: 1.5, icon: "phone" as GlyphName },
  { t: "6DoF", wh: 1.0, icon: "viewfinder" as GlyphName },
  { t: "联网", wh: 1.2, icon: "wifi" as GlyphName },
  { t: "手表", wh: 0.08, icon: "watch" as GlyphName },
  { t: "睡眠", wh: 0.16, icon: "moon" as GlyphName },
];
const STATES: { icon: GlyphName; label: string; sub?: string }[] = [
  { icon: "sun", label: "全功能" },
  { icon: "card", label: "看板" },
  { icon: "moon", label: "浅睡", sub: "待机" },
  { icon: "watch", label: "手表" },
  { icon: "switch", label: "深睡" },
];
export const SPower: React.FC = () => {
  const f = useCurrentFrame();
  const total = PROFILE.reduce((s, p) => s + p.wh, 0);
  const charge = interpolate(f, [30, 96], [0, 1], { ...clamp, easing: ease });
  const innerW = 918;
  let cursor = 0;
  const segs = PROFILE.map((p) => {
    const w = (p.wh / total) * innerW;
    const seg = { ...p, x: 44 + cursor, w, fill: Math.max(0, Math.min(1, (charge * innerW - cursor) / w)) };
    cursor += w;
    return seg;
  });
  return (
    <Pad>
      <Kicker text="POWER" />
      <div style={{ height: 14 }} />
      <KineticTitle text="常驻听音，按需唤醒" start={4} size={56} />
      <div style={{ display: "flex", marginTop: 34 }}>
        {STATES.map((s, i) => {
          const p = interpolate(f, [10 + i * 5, 24 + i * 5], [0, 1], { ...clamp, easing: ease });
          const active = Math.floor(f / 18) % STATES.length === i;
          return (
            <div key={s.label} style={{ flex: 1, textAlign: "center", opacity: 0.42 + p * 0.58, transform: `translateY(${(1 - p) * 14}px)` }}>
              <div style={{ height: 66, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={s.icon} size={54} color={C.cyan} strokeWidth={3} opacity={active ? 0.98 : 0.62} />
              </div>
              <div style={{ marginTop: 8, fontSize: 22, letterSpacing: 2, color: active ? C.text : C.dim }}>{s.label}</div>
              <div style={{ height: 18, fontSize: 15, color: C.dim, opacity: s.sub ? 1 : 0 }}>{s.sub ?? ""}</div>
              <div style={{ width: active ? 26 : 0, height: 2, background: C.cyan, margin: "6px auto 0", opacity: 0.7 }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", height: 270, marginTop: 14 }}>
        <svg width={1120} height={270} viewBox="0 0 1120 270" style={{ position: "absolute", left: 0, top: 0 }}>
          <rect x={20} y={46} width={980} height={150} rx={22} fill="none" stroke={C.cyan} strokeWidth={3.5} opacity={0.9} />
          <rect x={1004} y={90} width={18} height={62} rx={6} fill="none" stroke={C.cyan} strokeWidth={3.5} opacity={0.9} />
          <rect x={44} y={72} width={innerW} height={98} rx={10} fill="none" stroke={C.cyan} strokeWidth={1.2} opacity={0.2} />
          {segs.map((s) => {
            const filled = s.fill > 0;
            const iconColor = s.fill > 0.55 ? "#050608" : C.cyan;
            return (
              <g key={s.t}>
                <rect x={s.x} y={74} width={Math.max(0, s.w - 2)} height={94} fill="rgba(232,226,212,.05)" />
                {filled && <rect x={s.x} y={74} width={Math.max(0, (s.w - 2) * s.fill)} height={94} fill={C.cyan} opacity={0.82} />}
                {s.w > 60 && <Glyph name={s.icon} x={s.x + s.w / 2 - 15} y={106} size={30} color={iconColor} strokeWidth={3.5} opacity={filled ? 0.85 : 0.3} />}
              </g>
            );
          })}
          <line x1={44} y1={186} x2={44 + innerW} y2={186} stroke={C.cyan} strokeWidth={1} opacity={0.2} />
        </svg>
        <div style={{ position: "absolute", left: 1110, top: 54, width: 500 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <Counter to={5.9} start={30} dur={60} decimals={1} style={{ fontFamily: MONO, fontSize: 104, fontWeight: 600, color: C.cyan, letterSpacing: -2 }} />
            <span style={{ fontFamily: MONO, fontSize: 28, color: C.dim }}>Wh</span>
          </div>
          <div style={{ fontSize: 22, color: C.dim, letterSpacing: 3, marginTop: -4 }}>预算</div>
          <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 17, color: C.dim, opacity: 0.7 }}>8 h · MIXED USE</div>
        </div>
      </div>
      <div style={{ display: "flex", marginTop: -8, width: 900, marginLeft: 40 }}>
        {PROFILE.map((p) => (
          <div key={p.t} style={{ flex: 1, minWidth: 0, textAlign: "center", fontFamily: FONT, fontSize: 17, color: C.dim, letterSpacing: 1, whiteSpace: "nowrap", opacity: 0.8 }}>{p.t}</div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <div style={{ width: 750, height: 230, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, transform: "scale(.75)", transformOrigin: "top left" }}>
            <GlassesTop />
          </div>
        </div>
      </div>
    </Pad>
  );
};

// ---------- 8 重量：侧视 + 三个大数字 ----------
const WEIGHT_STATS = [
  { v: "≤ 3 g", l: "左右差", icon: "balance" as GlyphName },
  { v: "2 h", l: "佩戴", icon: "clock" as GlyphName },
  { v: "115–130 g", l: "整机", icon: "glasses" as GlyphName },
];
export const SWeight: React.FC = () => {
  const f = useCurrentFrame();
  const move = interpolate(f, [30, 100], [0, 1], { ...clamp, easing: ease });
  return (
    <Pad>
      <Kicker text="ERGONOMICS" />
      <div style={{ height: 14 }} />
      <KineticTitle text="重量后移，鼻梁减负" start={4} size={58} />
      <div style={{ marginTop: 10 }}>
        <GlassesSide move={move} />
      </div>
      <div style={{ display: "flex", gap: 26, marginTop: 6 }}>
        {WEIGHT_STATS.map((s, i) => (
          <Card key={s.l} start={52 + i * 8} style={{ flex: 1, padding: "18px 24px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Icon name={s.icon} size={58} color={C.cyan} strokeWidth={3} opacity={0.5} />
              <div>
                <div style={{ fontFamily: MONO, fontSize: s.v.length > 6 ? 62 : 78, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap" }}>{s.v}</div>
                <div style={{ marginTop: 8, fontSize: 22, color: C.dim, letterSpacing: 4 }}>{s.l}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Pad>
  );
};

// ---------- 9 一天：七幅小插画 ----------
const DAY: { t: string; s: string; kind: DayKind; say: string }[] = [
  { t: "08:00", s: "手表模式", kind: "watch", say: "早。我先安静地醒着。" },
  { t: "09:00", s: "打开 QQ", kind: "subway", say: "地铁上，我替你打开 QQ。" },
  { t: "10:00", s: "我来操作", kind: "office", say: "到公司，几块屏我来摆。" },
  { t: "14:00", s: "帮我看看", kind: "field", say: "看不懂的，我帮你看。" },
  { t: "18:30", s: "开车导航", kind: "drive", say: "开车时，路我来指。" },
  { t: "21:00", s: "视频通话", kind: "call", say: "晚上，陪你视频通话。" },
  { t: "23:00", s: "摘下睡眠", kind: "sleep", say: "晚安，我也睡了。" },
];
export const SDay: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const per = durationInFrames / DAY.length;
  const idx = Math.min(DAY.length - 1, Math.floor(f / per));
  const local = f - idx * per;
  const it = DAY[idx];
  const p = interpolate(local, [0, 9], [0.45, 1], { ...clamp, easing: ease });
  return (
    <Pad>
      <Say lines={DAY.map((d, i) => ({ from: i * per + 4, to: (i + 1) * per - 2, text: d.say }))} bottom={40} size={42} />
      <Kicker text="MY DAY · 我陪你的一天" />
      <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
        {DAY.map((d, i) => (
          <div key={d.t} style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(232,226,212,.12)", overflow: "hidden" }}>
            <div style={{ width: i < idx ? "100%" : i === idx ? `${(local / per) * 100}%` : "0%", height: 6, background: C.cyan, opacity: i < idx ? 0.35 : 0.9 }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 30, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
        <div style={{ width: 450, flexShrink: 0, paddingLeft: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 142, fontWeight: 600, color: C.cyan, lineHeight: 0.95, letterSpacing: -5 }}>{it.t}</div>
          <div style={{ fontSize: 56, fontWeight: 700, marginTop: 30, letterSpacing: 1 }}>{it.s}</div>
          <div style={{ width: 86, height: 3, background: C.cyan, opacity: 0.55, marginTop: 26 }} />
        </div>
        <div style={{ flex: 1, height: 620, minWidth: 0 }}>
          <DayArt kind={it.kind} f={local} />
        </div>
      </div>
    </Pad>
  );
};

// ---------- 10 路线图：节点 + 小图标 ----------
const STAGES: { k: string; t: string; d: string; icon: GlyphName; now?: boolean }[] = [
  { k: "M0", t: "现成硬件验证", d: "6 组验证", icon: "magnifier", now: true },
  { k: "M1", t: "桌面功能样机", d: "全链路跑通", icon: "board" },
  { k: "M2", t: "完全版样机 EVT", d: "进眼镜形态", icon: "glasses" },
  { k: "M3", t: "优化样机 DVT", d: "功耗 / 重量", icon: "wrench" },
  { k: "Gen 2", t: "第二代", d: "波导 + ASIC", icon: "chip" },
];
export const SRoadmap: React.FC = () => {
  const f = useCurrentFrame();
  const line = interpolate(f, [4, 70], [0, 1], { ...clamp, easing: ease });
  return (
    <Pad>
      <Kicker text="ROADMAP" />
      <div style={{ height: 14 }} />
      <KineticTitle text="先在桌面跑通，再画板" start={0} size={62} stagger={1} />
      <div style={{ position: "relative", marginTop: 90, height: 420 }}>
        <div style={{ position: "absolute", left: 65, width: 1380, top: 95, height: 3, background: "rgba(232,226,212,.12)" }} />
        <div style={{ position: "absolute", left: 65, width: `${line * 1380}px`, top: 95, height: 3, background: C.cyan, opacity: 0.8 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {STAGES.map((s, i) => {
            const p = interpolate(f, [6 + i * 12, 20 + i * 12], [0, 1], { ...clamp, easing: ease });
            return (
              <div key={s.k} style={{ width: 300, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
                <div style={{ height: 30, fontFamily: MONO, fontSize: 27, fontWeight: 600, color: C.cyan, letterSpacing: 2 }}>{s.k}</div>
                <div style={{ width: 130, height: 130, borderRadius: 65, background: C.bg, border: "2px solid rgba(232,226,212,.7)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <svg width={62} height={62} viewBox="0 0 100 100" style={{ overflow: "visible" }}><Glyph name={s.icon} size={100} color={C.cyan} strokeWidth={3} opacity={0.9} /></svg>
                  {s.now && <span style={{ position: "absolute", right: 2, bottom: 2, width: 10, height: 10, borderRadius: 5, background: C.cyan, opacity: 0.65 + 0.35 * Math.abs(Math.sin(f / 14)) }} />}
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, marginTop: 28, whiteSpace: "nowrap" }}>{s.t}</div>
                <div style={{ fontSize: 26, color: C.dim, marginTop: 10, letterSpacing: 2, whiteSpace: "nowrap" }}>{s.d}</div>
                {s.now && <div style={{ marginTop: 12, fontFamily: FONT, fontSize: 17, color: C.cyan, opacity: 0.65, letterSpacing: 1 }}>● 进行中</div>}
              </div>
            );
          })}
        </div>
      </div>
    </Pad>
  );
};

// ---------- 11 结尾 ----------
export const SOutro: React.FC<{ pulse: number }> = ({ pulse }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = interpolate(f, [durationInFrames - 60, durationInFrames - 10], [1, 0], clamp);
  return (
    <Pad style={{ alignItems: "center", justifyContent: "center", textAlign: "center", opacity: out }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        {[260, 380, 520].map((r, i) => (
          <circle key={r} cx={960} cy={420} r={r} fill="none" stroke={C.cyan} strokeWidth={1.2} opacity={0.04 + i * 0.015} />
        ))}
        {[-1, 1].map((d) => (
          <g key={d} opacity={0.2}>
            <line x1={960 + d * 520} y1={420} x2={960 + d * 700} y2={420} stroke={C.cyan} strokeWidth={1} />
            <circle cx={960 + d * 700} cy={420} r={4} fill={C.cyan} />
          </g>
        ))}
      </svg>
      <GlassesWire start={4} scale={0.76} glow={pulse} brain screen={false} />
      <div style={{ height: 38 }} />
      <KineticTitle text="眼镜是脑，主机是手" start={40} size={98} />
      <div style={{ height: 26 }} />
      <KineticTitle text="想看什么，就看到什么" start={78} size={40} color={C.cyan} weight={500} stagger={2} />
      <div style={{ marginTop: 52, fontFamily: MONO, fontSize: 31, color: C.text, opacity: interpolate(f, [110, 140], [0, 1], clamp) }}>
        glasses.youngtuo.win
      </div>
      <div style={{ marginTop: 12, fontFamily: FONT, fontSize: 19, color: C.dim, opacity: interpolate(f, [120, 150], [0, 1], clamp), letterSpacing: 1 }}>
        型号为候选 · 数值为设计目标
      </div>
    </Pad>
  );
};