// 宣传片 v3：以眼镜 Agent “她”为第一人称讲述“进化”——从戴在脸上的手表，到有脑、有手、有脚。
// 与传统 AI 眼镜做强对比：看（视频渲染投屏）、做（Agent 替你操作）、连（独立蜂窝）、手（指挥所有设备）。
// 数字只沿用仓库已有的设计目标；不画真实品牌 logo，不点名竞品。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, Kicker, KineticTitle, MONO, ease } from "./kit";
import { Glyph, GlyphName, Icon } from "./icons";
import { ChatPanel, GlassesTop, StreetScene, cubicAt, quadAt } from "./illus";
import { Her, Line, Say } from "./persona";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inn = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });
const GREY = "#5c6270";

const Stage: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ fontFamily: FONT, color: C.text, ...style }}>{children}</AbsoluteFill>
);
const Head: React.FC<{ kicker: string; title?: string; start?: number; size?: number }> = ({ kicker, title, start = 4, size = 58 }) => (
  <div style={{ position: "absolute", left: 120, top: 112 }}>
    <Kicker text={kicker} />
    {title && (
      <div style={{ marginTop: 12 }}>
        <KineticTitle text={title} start={start} size={size} />
      </div>
    )}
  </div>
);
const Abs: React.FC<{ x: number; y: number; w?: number; h?: number; o?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, o = 1, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: o, ...style }}>{children}</div>
);
const Check: React.FC<{ p: number; size?: number }> = ({ p, size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", opacity: p, transform: `scale(${0.6 + p * 0.4})` }}>
    <circle cx={50} cy={50} r={44} fill="rgba(5,6,8,.8)" stroke={C.cyan} strokeWidth={4} />
    <path d="M28 52 L44 67 L73 35" fill="none" stroke={C.cyan} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={80} strokeDashoffset={80 * (1 - p)} />
  </svg>
);
const Cross: React.FC<{ p: number; size?: number }> = ({ p, size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", opacity: p, transform: `scale(${1.4 - p * 0.4}) rotate(${(1 - p) * -20}deg)` }}>
    <circle cx={50} cy={50} r={44} fill="rgba(5,6,8,.8)" stroke={GREY} strokeWidth={4} />
    <path d="M32 32 L68 68 M68 32 L32 68" fill="none" stroke={GREY} strokeWidth={7} strokeLinecap="round" />
  </svg>
);
const Spinner: React.FC<{ f: number; size?: number }> = ({ f, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28">
    <circle cx={14} cy={14} r={10} fill="none" stroke={C.cyan} strokeWidth={2.5} opacity={0.3} />
    <circle cx={14} cy={14} r={10} fill="none" stroke={C.cyan} strokeWidth={2.5} strokeDasharray="30 20" transform={`rotate(${f * 8} 14 14)`} />
  </svg>
);
const Ripple: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  const p = interpolate(f, [at, at + 16], [0, 1], clamp);
  if (f < at || p >= 1) return null;
  return <div style={{ position: "absolute", left: x - 30 * p, top: y - 30 * p, width: 60 * p, height: 60 * p, borderRadius: "50%", border: "2px solid rgba(232,226,212,.8)", opacity: 1 - p }} />;
};
// 两点之间流动的光点
const Flow: React.FC<{ f: number; a: { x: number; y: number }; c: { x: number; y: number }; b: { x: number; y: number }; n?: number; speed?: number; o?: number; r?: number; dash?: boolean }> = ({ f, a, c, b, n = 6, speed = 50, o = 1, r = 4.5, dash = true }) => (
  <g opacity={o}>
    {dash && <path d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`} fill="none" stroke={C.cyan} strokeWidth={1.6} opacity={0.3} strokeDasharray="3 9" />}
    {Array.from({ length: n }).map((_, i) => {
      const t = (f / speed + i / n) % 1;
      const pt = quadAt(a, c, b, t);
      return <circle key={i} cx={pt.x} cy={pt.y} r={r} fill={C.cyan} opacity={Math.sin(Math.PI * t) * 0.95} />;
    })}
  </g>
);

// ============ 1 醒来 ============
export const SWake: React.FC = () => {
  const f = useCurrentFrame();
  const lx = interpolate(f, [66, 80, 98, 112, 126], [0, -1, -1, 1, 0], clamp);
  const up = inn(f, 150, 190);
  const lines: Line[] = [{ from: 58, to: 146, text: "嗨，我是你的眼镜。" }];
  return (
    <Stage>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[300, 420, 560].map((r, i) => (
          <circle key={r} cx={960} cy={430} r={r} fill="none" stroke={C.cyan} strokeWidth={1.2} opacity={(0.03 + i * 0.012) * inn(f, 40, 90)} />
        ))}
      </svg>
      <Abs x={960 - 450} y={290 - up * 60}>
        <Her width={900} start={0} openAt={46} look={{ x: lx, y: 0 }} glow={0.4 + up * 0.6} speaking={f > 58 && f < 140} blinkPeriod={140} />
      </Abs>
      <Abs x={0} y={660} w={1920} style={{ textAlign: "center" }} o={up}>
        <div style={{ display: "inline-block" }}>
          <KineticTitle text="我进化了。" start={150} size={140} />
        </div>
      </Abs>
      <Say lines={lines} />
    </Stage>
  );
};

// ============ 2 以前的我：戴在脸上的手表 ============
const OLD_CAPS: { icon: GlyphName; l: string }[] = [
  { icon: "camera", l: "拍照" },
  { icon: "mic", l: "问答" },
  { icon: "card", l: "通知" },
];
export const SBefore: React.FC = () => {
  const f = useCurrentFrame();
  const phoneIn = inn(f, 64, 84);
  const eq = inn(f, 130, 160);
  const shrink = interpolate(f, [130, 170], [1, 0.82], { ...clamp, easing: ease });
  const lines: Line[] = [
    { from: 8, to: 106, text: "以前，我只会拍照、回答、弹通知。" },
    { from: 112, to: 234, text: "离不开手机——就是一块戴在脸上的手表。" },
  ];
  return (
    <Stage>
      <Head kicker="BEFORE · 以前的我" />
      <Abs x={170} y={300} style={{ transform: `scale(${shrink})`, transformOrigin: "0 0" }}>
        <Her width={600} start={-40} openAt={0} old look={{ x: 0, y: 0.6 }} blinkPeriod={70} />
        <div style={{ display: "flex", gap: 34, marginTop: 40, marginLeft: 40 }}>
          {OLD_CAPS.map((c, i) => {
            const p = inn(f, 14 + i * 9, 30 + i * 9);
            return (
              <div key={c.l} style={{ textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 16}px)`, width: 130 }}>
                <Icon name={c.icon} size={70} color={GREY} strokeWidth={3.5} style={{ margin: "0 auto" }} />
                <div style={{ marginTop: 10, fontSize: 26, color: "#7d8390", letterSpacing: 3 }}>{c.l}</div>
              </div>
            );
          })}
        </div>
        {/* 蓝牙拴绳 + 手机 */}
        <div style={{ position: "absolute", left: 640, top: 40, opacity: phoneIn, width: 260 }}>
          <svg width={260} height={160} viewBox="0 0 260 160" style={{ overflow: "visible" }}>
            <path d="M0 70 C 60 120, 120 120, 170 70" fill="none" stroke={GREY} strokeWidth={3} strokeDasharray="8 7" />
            <Glyph name="bluetooth" x={66} y={92} size={46} color={GREY} strokeWidth={4} />
          </svg>
          <div style={{ position: "absolute", left: 170, top: 0 }}>
            <Icon name="phone" size={130} color="#7d8390" strokeWidth={3} />
          </div>
        </div>
      </Abs>
      <Abs x={1120} y={330} o={eq} style={{ display: "flex", alignItems: "center", gap: 60, transform: `translateX(${(1 - eq) * 60}px)` }}>
        <span style={{ fontFamily: MONO, fontSize: 120, color: C.dim, fontWeight: 300 }}>=</span>
        <div style={{ textAlign: "center" }}>
          <Icon name="watch" size={300} color={C.dim} strokeWidth={2.6} />
          <div style={{ marginTop: 18, fontSize: 34, color: C.dim, letterSpacing: 4 }}>脸上的手表</div>
        </div>
      </Abs>
      <Say lines={lines} />
    </Stage>
  );
};

// ============ 3 对比：传统 AI 眼镜 vs 我 ============
const ROUNDS: { k: string; en: string; say: string }[] = [
  { k: "看", en: "SEE", say: "他们给你一行小字，我给你一整块屏。" },
  { k: "做", en: "DO", say: "他们说「请在手机上操作」，我直接替你做完。" },
  { k: "连", en: "GO", say: "他们离不开手机，我自己就能上网。" },
  { k: "手", en: "HANDS", say: "他们只连一部手机，我能指挥所有设备。" },
];
const PW = 760, PH = 500;
const OldPanel: React.FC<{ r: number; f: number }> = ({ r, f }) => {
  if (r === 0)
    return (
      <div style={{ position: "absolute", inset: 30, borderRadius: 36, border: `2px dashed ${GREY}`, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
          <StreetScene />
        </div>
        <div style={{ position: "absolute", right: 30, top: 34, fontSize: 20, color: "#8a8f9a", letterSpacing: 1, padding: "4px 10px", border: `1px solid ${GREY}`, borderRadius: 6 }}>新消息 1 条</div>
      </div>
    );
  if (r === 1) {
    const shake = f > 20 && f < 70 ? Math.sin(f * 1.7) * 6 : 0;
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 50 }}>
        <div style={{ transform: `translateX(${shake}px) rotate(${shake * 0.6}deg)`, position: "relative" }}>
          <Icon name="phone" size={260} color={GREY} strokeWidth={2.6} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 112, textAlign: "center", fontSize: 19, color: "#8a8f9a", lineHeight: 1.4 }}>请在手机上<br />操作</div>
        </div>
        <div style={{ fontSize: 30, color: "#8a8f9a", letterSpacing: 3, lineHeight: 1.6 }}>掏手机<br />解锁<br />自己点</div>
      </div>
    );
  }
  if (r === 2) {
    const brk = inn(f, 44, 60);
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <Abs x={40} y={170}>
          <Her width={330} old openAt={-20} look={{ x: 0.4, y: 0.3 }} />
        </Abs>
        <svg width={PW} height={PH} style={{ position: "absolute", inset: 0 }}>
          <path d="M370 230 C 430 300, 480 300, 540 240" fill="none" stroke={GREY} strokeWidth={3} strokeDasharray="8 7" opacity={1 - brk * 0.7} transform={`translate(${brk * -10} ${brk * 18})`} />
          <Glyph name="bluetooth" x={432} y={262} size={40} color={GREY} strokeWidth={4} opacity={1 - brk * 0.6} />
        </svg>
        <Abs x={540} y={150}>
          <Icon name="phone" size={170} color={GREY} strokeWidth={3} />
        </Abs>
        <Abs x={300} y={360} w={200} o={brk} style={{ textAlign: "center", fontSize: 30, color: "#8a8f9a", letterSpacing: 4 }}>断连</Abs>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Abs x={210} y={70}>
        <Her width={340} old openAt={-20} />
      </Abs>
      <svg width={PW} height={PH} style={{ position: "absolute", inset: 0 }}>
        <line x1={380} y1={200} x2={380} y2={300} stroke={GREY} strokeWidth={3} strokeDasharray="8 7" />
      </svg>
      <Abs x={320} y={300}>
        <Icon name="phone" size={120} color={GREY} strokeWidth={3} />
      </Abs>
      <Abs x={120} y={430} w={520} style={{ textAlign: "center", fontSize: 26, color: "#8a8f9a", letterSpacing: 3 }}>只有一部手机</Abs>
    </div>
  );
};
const NewPanel: React.FC<{ r: number; f: number }> = ({ r, f }) => {
  if (r === 0) {
    const p = inn(f, 6, 30);
    return (
      <div style={{ position: "absolute", inset: 30, borderRadius: 36, border: "2px solid rgba(232,226,212,.6)", overflow: "hidden", background: "rgba(232,226,212,.02)" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
          <StreetScene />
        </div>
        <Abs x={40} y={36} w={400 * (0.6 + 0.4 * p)} h={330 * (0.6 + 0.4 * p)} o={p}>
          <ChatPanel f={f + 50} />
        </Abs>
        <Abs x={460} y={60} w={210} h={150} o={inn(f, 18, 36)} style={{ borderRadius: 14, border: "1px solid rgba(232,226,212,.5)", background: "rgba(8,10,14,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="play" size={64} color={C.cyan} strokeWidth={3.5} />
        </Abs>
        <Abs x={460} y={230} w={210} h={130} o={inn(f, 26, 44)} style={{ borderRadius: 14, border: "1px solid rgba(232,226,212,.5)", background: "rgba(8,10,14,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="image" size={60} color={C.cyan} strokeWidth={3.5} />
        </Abs>
      </div>
    );
  }
  if (r === 1) {
    const done = inn(f, 64, 80);
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <Abs x={40} y={150}>
          <Her width={300} openAt={-20} look={{ x: 1, y: 0.2 }} speaking={f < 60} />
        </Abs>
        <svg width={PW} height={PH} style={{ position: "absolute", inset: 0 }}>
          <Flow f={f} a={{ x: 340, y: 200 }} c={{ x: 420, y: 120 }} b={{ x: 500, y: 200 }} n={7} speed={30} />
        </svg>
        <Abs x={480} y={70} w={220} h={380} style={{ borderRadius: 34, border: "3px solid rgba(232,226,212,.85)", background: "rgba(8,10,14,.9)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: "34px 22px", opacity: 1 - done }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ height: 46, borderRadius: 12, border: "1.5px solid rgba(232,226,212,.45)", background: i === 4 && f > 24 ? "rgba(232,226,212,.35)" : "transparent" }} />
            ))}
          </div>
          <Ripple f={f} at={24} x={110} y={150} />
          <Ripple f={f} at={44} x={110} y={300} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: done }}>
            <Check p={done} size={110} />
          </div>
        </Abs>
        <Abs x={420} y={462} w={220} o={done} style={{ textAlign: "center", fontSize: 26, letterSpacing: 3 }}>已替你完成</Abs>
      </div>
    );
  }
  if (r === 2) {
    const bob = Math.sin(f / 7) * 8;
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <Abs x={190} y={190 + bob}>
          <Her width={380} openAt={-20} look={{ x: 0.3, y: -0.2 }} glow={0.8} />
        </Abs>
        <svg width={PW} height={PH} style={{ position: "absolute", inset: 0 }}>
          {[0, 1, 2].map((i) => {
            const t = ((f / 40 + i / 3) % 1);
            return <path key={i} d={`M ${380 - 60 - t * 120} ${150 - t * 60} A ${80 + t * 160} ${80 + t * 160} 0 0 1 ${380 + 60 + t * 120} ${150 - t * 60}`} fill="none" stroke={C.cyan} strokeWidth={3} opacity={(1 - t) * 0.8} />;
          })}
        </svg>
        <Abs x={340} y={70}>
          <Icon name="signal" size={80} color={C.cyan} strokeWidth={4} />
        </Abs>
        <Abs x={180} y={360 + bob} w={400} style={{ textAlign: "center", fontSize: 30, letterSpacing: 4 }}>独立 5G · 走到哪都在线</Abs>
      </div>
    );
  }
  const hosts: { n: GlyphName; x: number; y: number }[] = [
    { n: "phone", x: 70, y: 60 },
    { n: "monitor", x: 70, y: 330 },
    { n: "car", x: 570, y: 60 },
    { n: "cloud", x: 570, y: 330 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={PW} height={PH} style={{ position: "absolute", inset: 0 }}>
        {hosts.map((h, i) => (
          <Flow key={i} f={f + i * 9} a={{ x: 380, y: 250 }} c={{ x: (380 + h.x + 60) / 2, y: (250 + h.y + 50) / 2 - 40 }} b={{ x: h.x + 60, y: h.y + 50 }} n={5} speed={36} o={inn(f, 6 + i * 6, 20 + i * 6)} />
        ))}
      </svg>
      {hosts.map((h, i) => (
        <Abs key={h.n} x={h.x} y={h.y} o={inn(f, 4 + i * 6, 18 + i * 6)}>
          <Icon name={h.n} size={120} color={C.cyan} strokeWidth={3} />
        </Abs>
      ))}
      <Abs x={230} y={200}>
        <Her width={300} openAt={-20} glow={0.8} look={{ x: Math.sin(f / 16), y: 0 }} />
      </Abs>
    </div>
  );
};
export const SVersus: React.FC = () => {
  const f = useCurrentFrame();
  const R = 120;
  const r = Math.min(ROUNDS.length - 1, Math.floor(f / R));
  const lf = f - r * R;
  const cut = interpolate(lf, [0, 10], [1, 0], clamp);
  const jitter = lf < 14 ? Math.sin(lf * 3.1) * 10 * (1 - lf / 14) : 0;
  const rightIn = inn(lf, 2, 22);
  const lines: Line[] = ROUNDS.map((x, i) => ({ from: i * R + 8, to: i * R + R - 4, text: x.say }));
  return (
    <Stage>
      {/* 顶部两侧标题 */}
      <Abs x={120} y={150} w={PW + 40} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: "#7d8390" }}>传统 AI 眼镜</span>
        <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: GREY }}>BEFORE</span>
      </Abs>
      <Abs x={1040} y={150} w={PW + 40} style={{ display: "flex", alignItems: "baseline", gap: 16, justifyContent: "flex-end" }}>
        <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: C.dim }}>AFTER</span>
        <span style={{ fontSize: 48, fontWeight: 800 }}>我</span>
      </Abs>
      {/* 中线 + 回合徽章 */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={985} y1={240} x2={935} y2={860} stroke={C.cyan} strokeWidth={2} opacity={0.35} />
        <line x1={985} y1={240} x2={935} y2={860} stroke={C.cyan} strokeWidth={8} opacity={cut * 0.8} />
      </svg>
      <Abs x={880} y={150} w={160} h={160} style={{ borderRadius: 80, background: C.bg, border: "2px solid rgba(232,226,212,.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${1 + cut * 0.25})` }}>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1 }}>{ROUNDS[r].k}</div>
        <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: 4, color: C.dim, marginTop: 6 }}>{ROUNDS[r].en}</div>
      </Abs>
      {/* 回合计数 */}
      <Abs x={0} y={330} w={1920} style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        {ROUNDS.map((_, i) => (
          <div key={i} style={{ width: 22, height: 4, borderRadius: 2, background: C.cyan, opacity: i === r ? 0.9 : i < r ? 0.4 : 0.12 }} />
        ))}
      </Abs>
      {/* 左：灰暗、扫描线、抖动 */}
      <Abs x={110 + jitter} y={350} w={PW} h={PH} style={{ filter: "grayscale(1)", opacity: 0.85 }}>
        <OldPanel r={r} f={lf} />
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(5,6,8,.0) 0px, rgba(5,6,8,.0) 3px, rgba(5,6,8,.35) 4px)" }} />
        <Abs x={PW - 110} y={PH - 100}>
          <Cross p={inn(lf, 70, 82)} />
        </Abs>
      </Abs>
      {/* 右：明亮、放大 */}
      <Abs x={1050} y={350} w={PW} h={PH} style={{ transform: `scale(${0.9 + rightIn * 0.1})`, transformOrigin: "50% 50%", opacity: rightIn }}>
        <NewPanel r={r} f={lf} />
        <Abs x={PW - 100} y={PH - 100}>
          <Check p={inn(lf, 76, 90)} />
        </Abs>
      </Abs>
      <Say lines={lines} bottom={110} />
    </Stage>
  );
};

// ============ 4 进化：有脑、有手、有脚 ============
export const SEvolve: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 960, gy = 420; // 眼镜中心
  const brain = inn(f, 16, 36);
  const hands = inn(f, 40, 64);
  const feet = inn(f, 70, 92);
  const organs = inn(f, 100, 124);
  const title = inn(f, 128, 150);
  const lines: Line[] = [
    { from: 6, to: 120, text: "现在，我有脑、有手、有脚。" },
    { from: 126, to: 236, text: "不再只是一块手表。" },
  ];
  const HANDS2: { n: GlyphName; l: string; x: number; y: number; side: -1 | 1 }[] = [
    { n: "phone", l: "手机", x: 250, y: 300, side: -1 },
    { n: "monitor", l: "电脑", x: 250, y: 560, side: -1 },
    { n: "car", l: "汽车", x: 1550, y: 300, side: 1 },
    { n: "cloud", l: "云", x: 1550, y: 560, side: 1 },
  ];
  return (
    <Stage>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* 脑连线 */}
        <line x1={cx} y1={248} x2={cx} y2={gy - 90} stroke={C.cyan} strokeWidth={2.5} opacity={brain * 0.6} />
        {brain > 0.5 && <Flow f={f} a={{ x: cx, y: 250 }} c={{ x: cx, y: 290 }} b={{ x: cx, y: gy - 92 }} n={3} speed={30} dash={false} />}
        {/* 手臂 */}
        {HANDS2.map((h, i) => {
          const a = { x: cx + h.side * 330, y: gy - 20 };
          const b = { x: h.x + 60, y: h.y + 60 };
          const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - (i % 2 ? -60 : 60) };
          return (
            <g key={h.l} opacity={hands}>
              <path d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`} fill="none" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" opacity={0.75} strokeDasharray={900} strokeDashoffset={900 * (1 - hands)} />
              {hands > 0.9 && <Flow f={f + i * 11} a={a} c={c} b={b} n={5} speed={40} dash={false} />}
            </g>
          );
        })}
        {/* 腿 */}
        <g opacity={feet} stroke={C.cyan} strokeWidth={5} fill="none" strokeLinecap="round">
          <path d={`M ${cx - 110} ${gy + 90} Q ${cx - 130} ${gy + 200} ${cx - 90} ${gy + 300 * feet}`} />
          <path d={`M ${cx + 110} ${gy + 90} Q ${cx + 130} ${gy + 200} ${cx + 90} ${gy + 300 * feet}`} />
          <path d={`M ${cx - 90} ${gy + 300} h -46`} opacity={feet > 0.95 ? 1 : 0} />
          <path d={`M ${cx + 90} ${gy + 300} h 46`} opacity={feet > 0.95 ? 1 : 0} />
        </g>
      </svg>
      <Abs x={cx - 75} y={100} o={brain} style={{ transform: `scale(${0.7 + brain * 0.3})`, textAlign: "center", width: 150 }}>
        <Icon name="brain" size={150} color={C.cyan} strokeWidth={3} />
      </Abs>
      <Abs x={cx + 100} y={150} o={brain} style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>
        脑 <span style={{ fontSize: 22, fontWeight: 400, color: C.dim }}>· 云端大模型</span>
      </Abs>
      <Abs x={cx - 330} y={gy - 110}>
        <Her width={660} openAt={-20} glow={0.6 + title * 0.6} look={{ x: interpolate(f, [40, 60, 80, 100], [-1, -1, 1, 0], clamp), y: interpolate(f, [70, 90], [0, 0.6], clamp) * (1 - organs) }} />
      </Abs>
      {HANDS2.map((h) => (
        <Abs key={h.l} x={h.x} y={h.y} o={hands} style={{ textAlign: "center", width: 120 }}>
          <Icon name={h.n} size={120} color={C.cyan} strokeWidth={3} />
          <div style={{ marginTop: 8, fontSize: 24, color: C.dim, letterSpacing: 3 }}>{h.l}</div>
        </Abs>
      ))}
      <Abs x={130} y={460} o={hands} style={{ fontSize: 34, fontWeight: 700, letterSpacing: 3 }}>手</Abs>
      <Abs x={1755} y={460} o={hands} style={{ fontSize: 34, fontWeight: 700, letterSpacing: 3 }}>手</Abs>
      <Abs x={cx - 40} y={gy + 220} o={feet} style={{ width: 80, textAlign: "center" }}>
        <Icon name="signal" size={80} color={C.cyan} strokeWidth={4} />
      </Abs>
      <Abs x={cx + 160} y={gy + 270} o={feet} style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3, whiteSpace: "nowrap" }}>
        脚 <span style={{ fontSize: 22, fontWeight: 400, color: C.dim }}>· 独立蜂窝</span>
      </Abs>
      {/* 器官小标签 */}
      {[
        { t: "眼睛", x: cx - 230, y: gy - 150 },
        { t: "耳朵", x: cx + 330, y: gy - 100 },
        { t: "嘴巴", x: cx - 30, y: gy + 100 },
      ].map((o) => (
        <Abs key={o.t} x={o.x} y={o.y} o={organs * 0.85} style={{ fontSize: 20, color: C.dim, letterSpacing: 3, padding: "2px 10px", border: "1px solid rgba(232,226,212,.3)", borderRadius: 999 }}>{o.t}</Abs>
      ))}
      <Say lines={lines} />
    </Stage>
  );
};

// ============ 5 手：Agent 替你操作手机，再指挥电脑、汽车、云 ============
const TYPED = "我晚点到";
export const SHands: React.FC = () => {
  const f = useCurrentFrame();
  const partA = interpolate(f, [316, 336], [1, 0], clamp);
  const partB = inn(f, 330, 352);
  const lines: Line[] = [
    { from: 0, to: 56, text: "帮我跟张三说，我晚点到。", who: "you" },
    { from: 60, to: 190, text: "手机放兜里就好，我替你点。" },
    { from: 196, to: 252, text: "发之前，我先问你一声。" },
    { from: 256, to: 296, text: "确认。", who: "you" },
    { from: 336, to: 476, text: "电脑、汽车、云——都是我的手。" },
  ];
  // 手机屏幕阶段
  const grid = f < 110;
  const typedN = Math.floor(interpolate(f, [128, 168], [0, TYPED.length], clamp));
  const sent = f > 284;
  const bubble = interpolate(f, [26, 36, 92, 104], [0, 1, 1, 0], clamp);
  const confirm = interpolate(f, [200, 214, 290, 300], [0, 1, 1, 0], clamp);
  const sentBubble = interpolate(f, [296, 304, 330, 336], [0, 1, 1, 0], clamp);
  const beam = interpolate(f, [40, 60, 280, 300], [0, 1, 1, 0.3], clamp);
  return (
    <Stage>
      <Head kicker="HANDS · 我替你动手" title={f < 330 ? "手机不用掏出来" : ""} />
      {/* A：视野 + 手机 */}
      <div style={{ position: "absolute", inset: 0, opacity: partA }}>
        <Abs x={120} y={290} w={1000} h={560} style={{ borderRadius: 44, border: "2px solid rgba(232,226,212,.45)", overflow: "hidden", background: "rgba(232,226,212,.015)" }}>
          <StreetScene />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 45%, transparent 45%, rgba(5,6,8,.55) 100%)" }} />
          <Abs x={600} y={40} w={360} h={76} o={bubble} style={{ borderRadius: 20, background: "rgba(8,10,14,.93)", border: "1px solid rgba(232,226,212,.4)", display: "flex", alignItems: "center", gap: 14, padding: "0 20px" }}>
            <Spinner f={f} />
            <span style={{ fontSize: 26, whiteSpace: "nowrap" }}>交给手机去办</span>
          </Abs>
          <Abs x={250} y={130} w={500} h={300} o={confirm} style={{ transform: `scale(${0.9 + confirm * 0.1})`, borderRadius: 20, background: "rgba(8,10,14,.95)", border: "1px solid rgba(232,226,212,.55)", padding: "26px 32px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, border: "1.5px solid rgba(232,226,212,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="person" size={34} color={C.cyan} strokeWidth={4} />
              </div>
              <span style={{ fontSize: 30, fontWeight: 700 }}>发给 张三？</span>
            </div>
            <div style={{ marginTop: 26, fontSize: 34, padding: "12px 18px", borderRadius: 12, background: "rgba(232,226,212,.08)" }}>“我晚点到”</div>
            <div style={{ display: "flex", gap: 18, marginTop: 26 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, fontSize: 26, fontWeight: 700, background: f > 262 ? C.cyan : "transparent", color: f > 262 ? C.bg : C.text, border: "1.5px solid rgba(232,226,212,.7)" }}>确认</div>
              <div style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, fontSize: 26, color: C.dim, border: "1.5px solid rgba(232,226,212,.25)" }}>取消</div>
            </div>
          </Abs>
          <Abs x={640} y={40} w={300} h={76} o={sentBubble} style={{ borderRadius: 20, background: "rgba(8,10,14,.93)", border: "1px solid rgba(232,226,212,.4)", display: "flex", alignItems: "center", gap: 14, padding: "0 20px" }}>
            <Check p={1} size={36} />
            <span style={{ fontSize: 26 }}>已发送</span>
          </Abs>
          <Abs x={36} y={490} style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 4, color: C.dim }}>MY VIEW · 我的视野</Abs>
        </Abs>
        {/* 光束 */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <Flow f={f} a={{ x: 1120, y: 560 }} c={{ x: 1250, y: 470 }} b={{ x: 1380, y: 540 }} n={8} speed={28} o={beam} />
        </svg>
        {/* 手机 */}
        <Abs x={1390} y={250} w={330} h={560} style={{ borderRadius: 44, border: "3px solid rgba(232,226,212,.85)", background: "rgba(8,10,14,.92)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 125, top: 16, width: 80, height: 10, borderRadius: 5, background: "rgba(232,226,212,.25)" }} />
          {grid ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, padding: "60px 30px" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ height: 70, borderRadius: 18, border: "1.5px solid rgba(232,226,212,.45)", background: i === 4 && f > 92 ? "rgba(232,226,212,.4)" : "rgba(232,226,212,.04)" }} />
              ))}
            </div>
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingTop: 40 }}>
              <div style={{ height: 60, borderBottom: "1px solid rgba(232,226,212,.2)", display: "flex", alignItems: "center", padding: "0 24px", fontSize: 26, fontWeight: 700 }}>张三</div>
              <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ width: 180, height: 44, borderRadius: 14, background: "rgba(232,226,212,.12)" }} />
                <div style={{ width: 130, height: 44, borderRadius: 14, background: "rgba(232,226,212,.12)" }} />
                {sent && <div style={{ alignSelf: "flex-end", padding: "10px 16px", borderRadius: 14, background: C.cyan, color: C.bg, fontSize: 24, fontWeight: 700 }}>{TYPED}</div>}
              </div>
              <div style={{ margin: "0 18px 26px", height: 58, borderRadius: 29, border: "1.5px solid rgba(232,226,212,.55)", display: "flex", alignItems: "center", padding: "0 10px 0 20px", gap: 10 }}>
                <span style={{ flex: 1, fontSize: 24 }}>{sent ? "" : TYPED.slice(0, typedN)}{!sent && f % 20 < 10 ? "|" : ""}</span>
                <div style={{ width: 42, height: 42, borderRadius: 21, background: f > 276 ? C.cyan : "rgba(232,226,212,.25)" }} />
              </div>
            </div>
          )}
          <Ripple f={f} at={92} x={165} y={185} />
          <Ripple f={f} at={276} x={287} y={503} />
        </Abs>
        <Abs x={1350} y={826} w={410} style={{ textAlign: "center", fontSize: 22, color: C.dim, letterSpacing: 3 }}>手机 Agent · 后台虚拟屏操作</Abs>
      </div>
      {/* B：其他手 */}
      <div style={{ position: "absolute", inset: 0, opacity: partB }}>
        <Abs x={0} y={140} w={1920} style={{ textAlign: "center" }}>
          {f >= 330 && (
            <div style={{ display: "inline-block" }}>
              <KineticTitle text="所有设备，都是我的手" start={336} size={64} />
            </div>
          )}
        </Abs>
        <Abs x={960 - 220} y={280}>
          <Her width={440} openAt={-20} glow={0.9} look={{ x: interpolate(f, [360, 390, 420, 450], [-1, 0, 1, 0], clamp), y: 0.5 }} />
        </Abs>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {[400, 960, 1520].map((x, i) => (
            <Flow key={x} f={f + i * 13} a={{ x: 960, y: 440 }} c={{ x: (960 + x) / 2, y: 470 }} b={{ x, y: 580 }} n={6} speed={34} o={inn(f, 350 + i * 10, 370 + i * 10)} />
          ))}
        </svg>
        {[
          { n: "monitor" as GlyphName, t: "电脑", s: "文档投到眼前", x: 400 },
          { n: "car" as GlyphName, t: "汽车", s: "导航回家", x: 960 },
          { n: "cloud" as GlyphName, t: "云", s: "渲染虚拟形象", x: 1520 },
        ].map((h, i) => {
          const p = inn(f, 352 + i * 10, 372 + i * 10);
          return (
            <Abs key={h.t} x={h.x - 190} y={590} w={380} h={240} o={p} style={{ transform: `translateY(${(1 - p) * 30}px)`, borderTop: "1px solid rgba(232,226,212,.3)", textAlign: "center", paddingTop: 22 }}>
              <Icon name={h.n} size={110} color={C.cyan} strokeWidth={3} style={{ margin: "0 auto" }} />
              <div style={{ marginTop: 10, fontSize: 32, fontWeight: 700 }}>{h.t}</div>
              <div style={{ marginTop: 4, fontSize: 24, color: C.dim, letterSpacing: 2 }}>{h.s}</div>
            </Abs>
          );
        })}
      </div>
      <Say lines={lines} bottom={f < 330 ? 70 : 110} />
    </Stage>
  );
};

// ============ 6 视频渲染投屏：手来渲染，我来显示 ============
export const SRender: React.FC = () => {
  const f = useCurrentFrame();
  const lines: Line[] = [
    { from: 14, to: 122, text: "显卡在电脑上，画面直接送到你眼前。" },
    { from: 128, to: 236, text: "重活交给手，我只管清清楚楚地显示。" },
  ];
  const screens = [
    { x: 40, y: 120, w: 220, h: 200, ry: 28, o: inn(f, 70, 92) },
    { x: 250, y: 80, w: 310, h: 240, ry: 0, o: inn(f, 56, 80) },
    { x: 550, y: 120, w: 220, h: 200, ry: -28, o: inn(f, 84, 106) },
  ];
  return (
    <Stage>
      <Head kicker="RENDER · CAST" title="手来渲染，我来显示" />
      {/* 电脑 + 显卡 */}
      <Abs x={110} y={360} w={520} h={340} o={inn(f, 4, 24)} style={{ borderRadius: 16, border: "3px solid rgba(232,226,212,.8)", background: "rgba(8,10,14,.9)", overflow: "hidden" }}>
        <Abs x={24} y={24} w={290} h={180} style={{ borderRadius: 10, border: "1.5px solid rgba(232,226,212,.5)" }}>
          <div style={{ height: 26, borderBottom: "1px solid rgba(232,226,212,.25)" }} />
          {[0.8, 0.6, 0.7].map((w, i) => (
            <div key={i} style={{ margin: "14px 16px 0", width: `${w * 100}%`, height: 9, borderRadius: 5, background: "rgba(232,226,212,.3)" }} />
          ))}
        </Abs>
        <Abs x={330} y={60} w={166} h={240} style={{ borderRadius: 10, border: "1.5px solid rgba(232,226,212,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="play" size={64} color={C.cyan} strokeWidth={3.5} />
        </Abs>
        <Abs x={24} y={220} w={290} h={96} style={{ borderRadius: 10, border: "1.5px solid rgba(232,226,212,.3)" }} />
      </Abs>
      <Abs x={110} y={720} w={520} o={inn(f, 10, 30)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Icon name="chip" size={54} color={C.cyan} strokeWidth={3.5} />
        <span style={{ fontSize: 28, letterSpacing: 3 }}>电脑显卡渲染</span>
      </Abs>
      {/* 视频流：胶片帧 */}
      <Abs x={650} y={470} w={420} h={130} o={inn(f, 24, 40)} style={{ overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 18, height: 2, background: "rgba(232,226,212,.25)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 110, height: 2, background: "rgba(232,226,212,.25)" }} />
        {Array.from({ length: 6 }).map((_, i) => {
          const x = ((f * 4 + i * 90) % 540) - 100;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: 30, width: 72, height: 68, borderRadius: 6, border: "1.5px solid rgba(232,226,212,.75)", background: "rgba(232,226,212,.08)", opacity: Math.sin((Math.PI * (x + 100)) / 540) }}>
              <div style={{ margin: "12px 10px 0", height: 6, borderRadius: 3, background: "rgba(232,226,212,.5)" }} />
              <div style={{ margin: "8px 10px 0", width: 30, height: 6, borderRadius: 3, background: "rgba(232,226,212,.3)" }} />
            </div>
          );
        })}
      </Abs>
      <Abs x={650} y={610} w={420} o={inn(f, 30, 46)} style={{ textAlign: "center", fontSize: 26, color: C.dim, letterSpacing: 4 }}>视频流 →</Abs>
      {/* 我的视野：三块虚拟屏 */}
      <Abs x={1090} y={300} w={720} h={520} o={inn(f, 40, 60)} style={{ borderRadius: 44, border: "2px solid rgba(232,226,212,.55)", overflow: "hidden", perspective: 900 }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
          <StreetScene />
        </div>
        {screens.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: s.x - 30 + (i === 1 ? 0 : 0), top: s.y, width: s.w, height: s.h, opacity: s.o, transform: `rotateY(${s.ry}deg) scale(${0.85 + s.o * 0.15})`, borderRadius: 12, border: "1.5px solid rgba(232,226,212,.75)", background: "rgba(8,10,14,.93)", overflow: "hidden", boxShadow: "0 0 30px rgba(232,226,212,.12)" }}>
            {i === 1 ? (
              <ChatPanel f={f} />
            ) : i === 0 ? (
              <div style={{ padding: 18 }}>
                {[0.9, 0.7, 0.8, 0.5, 0.65].map((w, j) => (
                  <div key={j} style={{ width: `${w * 100}%`, height: 9, borderRadius: 5, background: "rgba(232,226,212,.3)", marginBottom: 14 }} />
                ))}
              </div>
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" size={70} color={C.cyan} strokeWidth={3.5} />
              </div>
            )}
          </div>
        ))}
        <Abs x={0} y={400} w={720} o={inn(f, 110, 130)} style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          {["清晰", "大屏", "多窗口"].map((t) => (
            <span key={t} style={{ fontSize: 24, padding: "6px 18px", borderRadius: 999, border: "1px solid rgba(232,226,212,.5)", background: "rgba(5,6,8,.7)", letterSpacing: 2 }}>{t}</span>
          ))}
        </Abs>
      </Abs>
      <Abs x={1090} y={835} w={720} o={inn(f, 50, 70)} style={{ textAlign: "center", fontFamily: MONO, fontSize: 16, letterSpacing: 4, color: C.dim }}>MY VIEW · 我的视野</Abs>
      <Say lines={lines} bottom={70} />
    </Stage>
  );
};

// ============ 9 我的身体 ============
const CHIPS = [
  { t: "主 SoC", s: "合成 · 通话" },
  { t: "显示处理器", s: "上屏" },
  { t: "RedCap", s: "联网" },
  { t: "MCU", s: "常醒" },
];
export const SBody: React.FC = () => {
  const f = useCurrentFrame();
  const a = interpolate(f, [110, 124], [1, 0], clamp);
  const b = inn(f, 120, 140);
  const lines: Line[] = [
    { from: 8, to: 116, text: "我的小脑在眼镜里，重活交给手。" },
    { from: 124, to: 236, text: "电池放在耳后，戴着更稳。" },
  ];
  return (
    <Stage>
      <Head kicker="BODY · 我的身体" />
      <div style={{ position: "absolute", inset: 0, opacity: a }}>
        <Abs x={960 - 340} y={210}>
          <Her width={680} openAt={-20} glow={0.6} />
        </Abs>
        <Abs x={0} y={500} w={1920} style={{ display: "flex", justifyContent: "center", gap: 40 }}>
          {CHIPS.map((c, i) => {
            const p = inn(f, 14 + i * 8, 30 + i * 8);
            return (
              <div key={c.t} style={{ width: 300, height: 230, borderRadius: 18, border: "1.5px solid rgba(232,226,212,.45)", background: "rgba(8,10,14,.8)", textAlign: "center", paddingTop: 26, boxSizing: "border-box", opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
                <Icon name="chip" size={80} color={C.cyan} strokeWidth={3} style={{ margin: "0 auto" }} />
                <div style={{ marginTop: 12, fontSize: 32, fontWeight: 700, whiteSpace: "nowrap" }}>{c.t}</div>
                <div style={{ marginTop: 6, fontSize: 22, color: C.dim, letterSpacing: 2 }}>{c.s}</div>
              </div>
            );
          })}
        </Abs>
        <Abs x={0} y={770} w={1920} style={{ textAlign: "center", fontSize: 28, color: C.dim, letterSpacing: 6 }}>四颗芯片 = 小脑</Abs>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: b }}>
        <Abs x={960 - 500} y={250}>
          <GlassesTop />
        </Abs>
        <Abs x={0} y={600} w={1920} style={{ display: "flex", justifyContent: "center", gap: 140 }}>
          {[
            { v: "115–130 g", l: "整机" },
            { v: "≤ 3 g", l: "左右差" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: MONO, fontSize: 96, fontWeight: 600, lineHeight: 1 }}>{s.v}</div>
              <div style={{ marginTop: 10, fontSize: 26, color: C.dim, letterSpacing: 6 }}>{s.l}</div>
            </div>
          ))}
        </Abs>
      </div>
      <Say lines={lines} />
    </Stage>
  );
};

// ============ 11 结尾：AI 手机？Say No. 直接进入 AI 眼镜 ============
const PILLARS: { icon: GlyphName; t: string; s: string }[] = [
  { icon: "image", t: "看得清", s: "手渲染 · 投到眼前" },
  { icon: "cursor", t: "做得到", s: "Agent 替你操作" },
  { icon: "signal", t: "走得远", s: "独立蜂窝" },
];
export const SFinale: React.FC<{ pulse: number }> = ({ pulse }) => {
  const f = useCurrentFrame();
  const A = interpolate(f, [104, 116], [1, 0], clamp);
  const B = interpolate(f, [110, 126, 210, 222], [0, 1, 1, 0], clamp);
  const Cc = inn(f, 222, 244);
  const out = interpolate(f, [320, 352], [1, 0], clamp);
  const stamp = inn(f, 30, 40);
  const arrow = inn(f, 54, 76);
  const lines: Line[] = [
    { from: 6, to: 104, text: "还在等 AI 手机？不用了。" },
    { from: 114, to: 216, text: "看得清，做得到，走得远。" },
  ];
  return (
    <Stage style={{ opacity: out }}>
      {/* A：AI 手机 SAY NO → AI 眼镜 */}
      <div style={{ position: "absolute", inset: 0, opacity: A }}>
        <Abs x={330} y={250} w={340} style={{ textAlign: "center", opacity: 1 - stamp * 0.55 }}>
          <Icon name="phone" size={340} color={stamp > 0.5 ? GREY : C.cyan} strokeWidth={2.6} />
          <div style={{ marginTop: 10, fontSize: 36, color: C.dim, letterSpacing: 4 }}>AI 手机</div>
        </Abs>
        <Abs x={270} y={360} o={stamp} style={{ transform: `rotate(-12deg) scale(${1.8 - stamp * 0.8})`, padding: "10px 34px", border: "6px solid #e8e2d4", borderRadius: 14, fontFamily: MONO, fontSize: 92, fontWeight: 800, letterSpacing: 6, color: C.text, background: "rgba(5,6,8,.75)", whiteSpace: "nowrap" }}>SAY NO</Abs>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <line x1={760} y1={460} x2={760 + 260 * arrow} y2={460} stroke={C.cyan} strokeWidth={5} strokeLinecap="round" />
          {arrow > 0.95 && <path d="M1000 436 L1030 460 L1000 484" fill="none" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <Abs x={1080} y={340} o={arrow}>
          <Her width={620} openAt={56} glow={0.6 + pulse} look={{ x: -0.6, y: 0 }} />
          <div style={{ marginTop: 26, textAlign: "center", fontSize: 44, fontWeight: 800, letterSpacing: 2 }}>直接进入 AI 眼镜</div>
        </Abs>
      </div>
      {/* B：三根支柱 */}
      <div style={{ position: "absolute", inset: 0, opacity: B }}>
        <Abs x={0} y={300} w={1920} style={{ display: "flex", justifyContent: "center", gap: 90 }}>
          {PILLARS.map((p, i) => {
            const q = inn(f, 116 + i * 12, 136 + i * 12);
            return (
              <div key={p.t} style={{ width: 420, textAlign: "center", opacity: q, transform: `translateY(${(1 - q) * 40}px) scale(${0.9 + q * 0.1})` }}>
                <div style={{ width: 200, height: 200, borderRadius: 100, border: "2px solid rgba(232,226,212,.7)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${20 + pulse * 30}px rgba(232,226,212,.15)` }}>
                  <Icon name={p.icon} size={110} color={C.cyan} strokeWidth={3} />
                </div>
                <div style={{ marginTop: 34, fontSize: 64, fontWeight: 800 }}>{p.t}</div>
                <div style={{ marginTop: 10, fontSize: 28, color: C.dim, letterSpacing: 2 }}>{p.s}</div>
              </div>
            );
          })}
        </Abs>
      </div>
      {/* C：落版 */}
      <div style={{ position: "absolute", inset: 0, opacity: Cc }}>
        <Abs x={960 - 400} y={170}>
          <Her width={800} openAt={226} glow={0.6 + pulse} blinkPeriod={80} />
        </Abs>
        <Abs x={0} y={490} w={1920} style={{ textAlign: "center" }}>
          {f >= 220 && (
            <div style={{ display: "inline-block" }}>
              <KineticTitle text="独立蜂窝 AI 眼镜" start={232} size={110} />
            </div>
          )}
          <div style={{ height: 34 }} />
          <div>
            {f >= 220 && (
              <div style={{ display: "inline-block" }}>
                <KineticTitle text="有脑 · 有手 · 有脚" start={252} size={46} color={C.cyan} weight={500} />
              </div>
            )}
          </div>
          <div style={{ marginTop: 44, fontFamily: MONO, fontSize: 31, opacity: inn(f, 276, 296) }}>glasses.youngtuo.win</div>
          <div style={{ marginTop: 10, fontSize: 19, color: C.dim, opacity: inn(f, 284, 304), letterSpacing: 1 }}>型号为候选 · 数值为设计目标</div>
        </Abs>
      </div>
      <Say lines={lines} />
    </Stage>
  );
};

void cubicAt;
