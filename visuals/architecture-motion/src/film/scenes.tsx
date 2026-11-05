// 宣传片各场景。数字只取自仓库文档与 sources.md 的公开资料；本方案数值均为设计目标。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C, Card, Counter, FONT, Kicker, KineticTitle, MONO, ease, useIn } from "./kit";
import { FlowDiagram, DIAGRAMS, diagramSize } from "../diagram/FlowDiagram";
const ARCH = diagramSize(DIAGRAMS.HardwareCompute);
const ARCH_SCALE = Math.min(1680 / ARCH.width, 720 / ARCH.height);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const Pad: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ padding: "130px 120px 110px", fontFamily: FONT, color: C.text, justifyContent: "center", ...style }}>{children}</AbsoluteFill>
);

// 眼镜正视线框（描线出现）
const GLASSES = [
  "M 120 170 C 120 110 180 90 300 92 C 400 94 440 120 440 180 C 440 260 380 290 290 290 C 190 290 120 250 120 170 Z",
  "M 560 180 C 560 120 600 94 700 92 C 820 90 880 110 880 170 C 880 250 810 290 710 290 C 620 290 560 260 560 180 Z",
  "M 440 150 C 470 128 530 128 560 150",
  "M 120 150 L 30 130 L 0 160",
  "M 880 150 L 970 130 L 1000 160",
];
export const GlassesWire: React.FC<{ start?: number; scale?: number; color?: string; glow?: number }> = ({ start = 0, scale = 1, color = C.cyan, glow = 0 }) => {
  const f = useCurrentFrame();
  return (
    <svg width={1000 * scale} height={330 * scale} viewBox="0 0 1000 330" style={{ overflow: "visible", filter: `drop-shadow(0 0 ${4 + glow * 6}px rgba(232,226,212,.35))` }}>
      {GLASSES.map((d, i) => {
        const p = interpolate(f, [start + i * 6, start + i * 6 + 40], [0, 1], { ...clamp, easing: ease });
        const ev = evolvePath(p, d);
        return <path key={i} d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />;
      })}
      {/* 镜片里的叠加内容：一块虚拟屏 */}
      <rect x={200} y={150} width={160} height={90} rx={8} fill="none" stroke={C.pink} strokeWidth={2} opacity={interpolate(f, [start + 50, start + 70], [0, 0.9], clamp)} />
      <rect x={640} y={150} width={160} height={90} rx={8} fill="none" stroke={C.pink} strokeWidth={2} opacity={interpolate(f, [start + 50, start + 70], [0, 0.9], clamp)} />
    </svg>
  );
};

// ---------- 1 开场 ----------
export const SIntro: React.FC<{ pulse: number }> = ({ pulse }) => (
  <Pad style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
    <div style={{ marginBottom: 40 }}>
      <GlassesWire start={6} scale={0.9} glow={pulse} />
    </div>
    <KineticTitle text="独立蜂窝 AI 眼镜" start={40} size={128} />
    <div style={{ height: 24 }} />
    <KineticTitle text="眼镜是脑，所有主机都是手" start={80} size={52} color={C.cyan} weight={500} stagger={3} />
    <div style={{ marginTop: 40, fontFamily: MONO, color: C.dim, fontSize: 22, letterSpacing: 4, opacity: interpolate(useCurrentFrame(), [140, 170], [0, 1], clamp) }}>
      全流程 · 全计划 · 从设计到使用体验
    </div>
  </Pad>
);

// ---------- 2 愿景 ----------
const GOALS = [
  { n: "01", t: "脑 · 小脑 · 手", d: "眼镜 + 云端 LLM 是脑，眼镜算力是小脑\nPC / 手机 / 车机 / 云都是手，谁是手谁渲染", c: C.cyan },
  { n: "02", t: "想看什么就看到什么", d: "看板 · 气泡 · 图片 · 视频\n投屏 · 实时拍照 · 视频通话", c: C.pink },
  { n: "03", t: "强睡眠能力", d: "分级睡眠 · 戴上 ≤ 1 s 恢复\n断网退化为手表级设备", c: C.lime },
];
export const SVision: React.FC = () => (
  <Pad>
    <Kicker text="VISION · 眼睛 · 嘴巴 · 耳朵 · 视网膜" />
    <div style={{ height: 20 }} />
    <KineticTitle text="眼镜是脑，所有主机都是手" start={6} size={78} />
    <div style={{ display: "flex", gap: 36, marginTop: 70 }}>
      {GOALS.map((g, i) => (
        <Card key={g.n} start={40 + i * 15} color={g.c} style={{ flex: 1, minHeight: 300 }}>
          <div style={{ fontFamily: MONO, color: g.c, fontSize: 64, fontWeight: 700 }}>{g.n}</div>
          <div style={{ fontSize: 44, fontWeight: 700, margin: "10px 0 18px" }}>{g.t}</div>
          <div style={{ fontSize: 26, color: "#b8c4d9", whiteSpace: "pre-line", lineHeight: 1.6 }}>{g.d}</div>
        </Card>
      ))}
    </div>
  </Pad>
);

// ---------- 3 竞品分析 ----------
const RIVALS = [
  { name: "Ray-Ban Meta（Gen 2）", w: "约 48–52 g", k: "拍摄 / 音频 AI 眼镜", note: "无显示屏，轻量日常", c: "#94a3b8", src: "S35" },
  { name: "Meta Ray-Ban Display", w: "约 69 g", k: "单目显示 + 腕带", note: "镜框电池 960 mWh · 混合约 6 h", c: C.amber, src: "S34 S36" },
  { name: "XREAL One", w: "约 84 g", k: "USB-C DP 有线显示", note: "眼镜端 X1 芯片稳定画面 · 无内置电池", c: C.blue, src: "S20 S37" },
  { name: "XREAL Aura", w: "约 95 g", k: "眼镜 + 外接计算盒", note: "每眼 1920×1200 · 120 Hz · 约 70°", c: C.pink, src: "S44" },
];
export const SRivals: React.FC = () => {
  const f = useCurrentFrame();
  const showMap = f > 190;
  const mapIn = interpolate(f, [190, 220], [0, 1], { ...clamp, easing: ease });
  const listOut = interpolate(f, [180, 200], [1, 0], clamp);
  // 定位图：横轴 = 独立性，纵轴 = 显示与空间能力（项目判断）
  const dots = [
    { n: "Ray-Ban Meta", x: 0.2, y: 0.12, c: "#94a3b8" },
    { n: "Ray-Ban Display", x: 0.3, y: 0.38, c: C.amber },
    { n: "XREAL One", x: 0.12, y: 0.62, c: C.blue },
    { n: "XREAL Aura", x: 0.32, y: 0.86, c: C.pink },
    { n: "本方案", x: 0.88, y: 0.8, c: C.lime, ours: true },
  ];
  return (
    <Pad>
      <Kicker text="COMPETITORS · 竞品分析" color={C.pink} />
      <div style={{ height: 18 }} />
      <KineticTitle text={showMap ? "空位：独立联网 × 空间显示" : "主流眼镜各占一角"} start={showMap ? 190 : 4} size={70} />
      {!showMap && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginTop: 50, opacity: listOut }}>
          {RIVALS.map((r, i) => (
            <Card key={r.name} start={24 + i * 14} color={r.c} from={i % 2 ? "right" : "left"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 38, fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 36, color: r.c, fontWeight: 700 }}>{r.w}</div>
              </div>
              <div style={{ fontSize: 28, color: r.c, margin: "8px 0" }}>{r.k}</div>
              <div style={{ fontSize: 24, color: "#b8c4d9" }}>{r.note}</div>
              <div style={{ fontFamily: MONO, fontSize: 15, color: C.dim, marginTop: 10 }}>来源 {r.src} · 公开资料</div>
            </Card>
          ))}
        </div>
      )}
      {showMap && (
        <div style={{ position: "relative", marginTop: 40, height: 620, opacity: mapIn }}>
          <svg width={1680} height={620} style={{ position: "absolute" }}>
            <line x1={120} y1={580} x2={1640} y2={580} stroke={C.dim} strokeWidth={2} />
            <line x1={120} y1={580} x2={120} y2={20} stroke={C.dim} strokeWidth={2} />
            <text x={1640} y={612} fill={C.dim} fontSize={22} textAnchor="end">独立性 →（依赖手机 / 主机 … 机身蜂窝独立联网）</text>
            <text x={130} y={36} fill={C.dim} fontSize={22}>↑ 显示与空间能力</text>
            <rect x={1180} y={40} width={440} height={240} rx={20} fill={`${C.lime}10`} stroke={C.lime} strokeDasharray="8 8" opacity={interpolate(f, [230, 260], [0, 1], clamp)} />
            {dots.map((d, i) => {
              const p = interpolate(f, [200 + i * 10, 220 + i * 10], [0, 1], { ...clamp, easing: ease });
              const x = 120 + d.x * 1500;
              const y = 580 - d.y * 540;
              const ring = d.ours ? 18 + 10 * Math.abs(Math.sin(f / 8)) : 0;
              return (
                <g key={d.n} opacity={p}>
                  {d.ours && <circle cx={x} cy={y} r={ring + 14} fill="none" stroke={d.c} strokeOpacity={0.5} strokeWidth={3} />}
                  <circle cx={x} cy={y} r={d.ours ? 20 : 14} fill={d.c} />
                  <text x={x + 30} y={y + 10} fill={d.ours ? C.lime : C.text} fontSize={d.ours ? 36 : 28} fontWeight={d.ours ? 800 : 600}>{d.n}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ position: "absolute", right: 40, bottom: 70, fontFamily: MONO, fontSize: 16, color: C.dim }}>定位为项目判断，非市场数据</div>
        </div>
      )}
    </Pad>
  );
};

// ---------- 4 架构：复用动态架构图 ----------
export const SArchitecture: React.FC = () => {
  const p = useIn(10, 24);
  return (
    <Pad>
      <Kicker text="ARCHITECTURE · 小脑在眼镜里" />
      <div style={{ height: 14 }} />
      <KineticTitle text="主 SoC · 显示重投影 · RedCap · MCU 常驻 BLE 与听音" start={4} size={52} />
      <div style={{ marginTop: 30, height: 720, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(242,244,248,.12)", opacity: p, transform: `scale(${0.94 + p * 0.06})`, position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, width: ARCH.width, height: ARCH.height, transform: `translateX(-50%) scale(${ARCH_SCALE})`, transformOrigin: "50% 0" }}>
          <FlowDiagram id="HardwareCompute" transparent />
        </div>
      </div>
    </Pad>
  );
};

// ---------- 5 连接方式与四类主机 ----------
const LINKS = [
  { k: "A1", t: "有线原始画面", d: "USB-C DP Alt · 最低延迟", c: C.cyan },
  { k: "A2", t: "有线编码串流", d: "USB 3 · 兼容面最广", c: C.blue },
  { k: "B", t: "Wi-Fi 7", d: "日常移动使用", c: C.lime },
  { k: "C", t: "5G RedCap 蜂窝", d: "离开主机直连脑和云", c: C.pink },
  { k: "BLE", t: "常驻控制面", d: "意图 · 气泡 · 看板描述", c: C.amber },
];
const HOSTS = ["PC / 笔记本", "手机（Mika）", "车机", "云主机", "云端 LLM（脑）"];
export const SConnect: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Pad>
      <Kicker text="CONNECT · 脑连上每一只手" color={C.lime} />
      <div style={{ height: 14 }} />
      <KineticTitle text="有线 > 局域网 > 云，BLE 常连" start={4} size={64} />
      <div style={{ position: "relative", marginTop: 40, height: 600 }}>
        <svg width={1680} height={600} style={{ position: "absolute" }}>
          {LINKS.map((l, i) => {
            const y = 60 + i * 118;
            const d = `M 330 ${y} C 800 ${y}, 900 300, 1330 300`;
            const p = interpolate(f, [20 + i * 8, 50 + i * 8], [0, 1], clamp);
            const ev = evolvePath(p, d);
            const dots = [0, 0.33, 0.66].map((o, j) => {
              const t = ((f / 40 + o + i * 0.1) % 1);
              // 贝塞尔取点
              const x0 = 330, y0 = y, x1 = 800, y1 = y, x2 = 900, y2 = 300, x3 = 1330, y3 = 300;
              const u = 1 - t;
              const x = u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3;
              const yy = u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3;
              return <circle key={j} cx={x} cy={yy} r={7} fill="#fff" stroke={l.c} strokeWidth={3} opacity={p}  />;
            });
            return (
              <g key={l.k}>
                <path d={d} fill="none" stroke={l.c} strokeWidth={4} strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} opacity={0.6} />
                {p > 0.95 && dots}
              </g>
            );
          })}
        </svg>
        {LINKS.map((l, i) => (
          <Card key={l.k} start={10 + i * 8} color={l.c} from="left" style={{ position: "absolute", left: 0, top: 14 + i * 118, width: 320, padding: "12px 20px" }}>
            <span style={{ fontFamily: MONO, color: l.c, fontSize: 30, fontWeight: 700, marginRight: 12 }}>{l.k}</span>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{l.t}</span>
            <div style={{ fontSize: 20, color: "#b8c4d9" }}>{l.d}</div>
          </Card>
        ))}
        <Card start={50} color={C.cyan} style={{ position: "absolute", left: 1330, top: 200, width: 340, textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 700 }}>眼镜本体</div>
          <div style={{ fontSize: 22, color: C.cyan, marginTop: 6 }}>脑 + 小脑 · 默认无线</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
            {HOSTS.map((h, i) => (
              <span key={h} style={{ fontSize: 18, padding: "4px 10px", borderRadius: 999, border: `1px solid ${C.cyan}66`, opacity: interpolate(f, [70 + i * 6, 84 + i * 6], [0, 1], clamp) }}>{h}</span>
            ))}
          </div>
        </Card>
      </div>
    </Pad>
  );
};

// ---------- 6 兼容分层 ----------
const LAYERS = [
  { k: "01", t: "视频通话", d: "小脑排布画面 · 虚拟形象由有 GPU 的手渲染", c: C.cyan },
  { k: "02", t: "投屏（接管才出现）", d: "手的虚拟显示 · 可直接操作 · 安全页黑屏（L0）", c: C.blue },
  { k: "03", t: "视频", d: "手编码，小脑解码", c: C.lime },
  { k: "04", t: "实时拍照", d: "本地取景不联网 · 帧交给脑识别", c: C.amber },
  { k: "05", t: "看板 · 气泡", d: "手发描述，小脑画 · 图片兜底（L3 / L4）", c: C.pink },
  { k: "06", t: "图片", d: "手或摄像头 · 本地解码", c: C.cyan },
];
export const SCompat: React.FC = () => (
  <Pad>
    <Kicker text="DISPLAY MODES · 小脑分配显示" color={C.amber} />
    <div style={{ height: 14 }} />
    <KineticTitle text="六种显示模式，1 主 + 2 气泡" start={4} size={62} />
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 34 }}>
      {LAYERS.map((l, i) => (
        <Card key={l.k} start={24 + i * 9} color={l.c} from="right" style={{ display: "flex", alignItems: "center", gap: 30, padding: "12px 28px", marginLeft: i * 32 }}>
          <span style={{ fontFamily: MONO, fontSize: 40, color: l.c, fontWeight: 700, width: 70 }}>{l.k}</span>
          <span style={{ fontSize: 34, fontWeight: 700, width: 560 }}>{l.t}</span>
          <span style={{ fontSize: 24, color: "#b8c4d9" }}>{l.d}</span>
        </Card>
      ))}
    </div>
    <div style={{ marginTop: 26, fontFamily: MONO, fontSize: 18, color: C.dim, opacity: useIn(80) }}>
      按优先级从高到低 · 气泡就地变成看板，看板就地变成投屏 · 走路时缩到边缘 · 焦点跟着语音走
    </div>
  </Pad>
);

// ---------- 7 睡眠与续航 ----------
const PROFILE = [
  { t: "串流 1 h", wh: 2.0, c: "#e8e2d4" },
  { t: "通话 0.5 h", wh: 1.5, c: "#c9c4b8" },
  { t: "6DoF 0.5 h", wh: 1.0, c: "#aaa69c" },
  { t: "轻度联网 3 h", wh: 1.2, c: "#8b8880" },
  { t: "手表 1 h", wh: 0.08, c: "#6f6c66" },
  { t: "睡眠 2 h", wh: 0.16, c: "#55534e" },
];
const STATES = ["S0 全功能", "S0'' 看板态", "S1 浅睡", "S2 待机", "S3 深睡", "S0' 手表模式"];
export const SPower: React.FC = () => {
  const f = useCurrentFrame();
  const total = PROFILE.reduce((s, p) => s + p.wh, 0);
  let acc = 0;
  return (
    <Pad>
      <Kicker text="POWER · 强睡眠 + 8 小时" color={C.lime} />
      <div style={{ height: 14 }} />
      <KineticTitle text="MCU 常驻听音与 BLE，主处理器按需唤醒" start={4} size={58} />
      <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
        {STATES.map((s, i) => {
          const p = interpolate(f, [16 + i * 6, 30 + i * 6], [0, 1], { ...clamp, easing: ease });
          const active = Math.floor(f / 18) % STATES.length === i;
          return (
            <div key={s} style={{ flex: 1, textAlign: "center", padding: "18px 0", borderRadius: 14, fontSize: 28, fontWeight: 700, opacity: p,
              border: `2px solid ${active ? C.lime : "#33415588"}`, background: active ? `${C.lime}22` : "rgba(15,23,42,0.6)", boxShadow: "none" }}>
              {s}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 50, fontSize: 28, color: "#b8c4d9" }}>8 小时机身混合使用剖面 · 功耗预算（设计目标 · 以看板为主的新剖面待 M1 定案）</div>
      <div style={{ display: "flex", height: 90, marginTop: 18, borderRadius: 14, overflow: "hidden", border: "1px solid #334155" }}>
        {PROFILE.map((p, i) => {
          const g = interpolate(f, [50 + i * 8, 70 + i * 8], [0, 1], { ...clamp, easing: ease });
          acc += p.wh;
          return (
            <div key={p.t} style={{ width: `${(p.wh / total) * 100 * g}%`, minWidth: g > 0.5 ? 70 : 0, background: `linear-gradient(180deg, ${p.c}, ${p.c}88)`, color: "#050608", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
              {p.t}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 80, marginTop: 40, alignItems: "baseline" }}>
        <div><Counter to={5.9} start={60} dur={60} decimals={1} style={{ fontFamily: MONO, fontSize: 96, fontWeight: 700, color: C.lime }} /><span style={{ fontSize: 30, marginLeft: 10 }}>Wh 预算</span></div>
        <div><span style={{ fontFamily: MONO, fontSize: 96, fontWeight: 700, color: C.cyan }}>5–7</span><span style={{ fontSize: 30, marginLeft: 10 }}>Wh 电池 · 两块分置耳后</span></div>
      </div>
    </Pad>
  );
};

// ---------- 8 重量与佩戴 ----------
export const SWeight: React.FC = () => {
  const f = useCurrentFrame();
  const move = interpolate(f, [40, 100], [0, 1], { ...clamp, easing: ease });
  // 侧视：镜框在左，耳朵支点在右；电池块从前框移到耳后
  const bx = 260 + move * 900;
  return (
    <Pad>
      <Kicker text="ERGONOMICS · 续航为主，佩戴无感" color={C.pink} />
      <div style={{ height: 14 }} />
      <KineticTitle text="重量后移到耳后，鼻梁不吃力" start={4} size={62} />
      <svg width={1680} height={420} style={{ marginTop: 40 }}>
        <path d="M 160 250 C 160 160 220 130 300 130 L 1300 150 C 1380 152 1420 200 1440 260" fill="none" stroke={C.cyan} strokeWidth={10} strokeLinecap="round" />
        <rect x={140} y={140} width={150} height={150} rx={30} fill="none" stroke={C.cyan} strokeWidth={6} />
        <text x={215} y={340} fill={C.dim} fontSize={24} textAnchor="middle">前框：只放光学与相机</text>
        <circle cx={1300} cy={150} r={16} fill={C.lime} />
        <text x={1300} y={110} fill={C.lime} fontSize={24} textAnchor="middle">耳朵支点</text>
        <g>
          <rect x={bx - 70} y={160} width={140} height={60} rx={14} fill={C.pink} />
          <text x={bx} y={200} fill="#04060c" fontSize={26} fontWeight={800} textAnchor="middle">电池</text>
        </g>
        <rect x={bx - 240 * move} y={160} width={110} height={50} rx={12} fill={C.blue} opacity={move} />
        <text x={bx - 240 * move + 55} y={193} fill="#04060c" fontSize={20} fontWeight={800} textAnchor="middle" opacity={move}>主板</text>
        <path d={`M 215 300 L 215 ${300 + 80 * (1 - move * 0.6)}`} stroke={C.amber} strokeWidth={8} markerEnd="" />
        <text x={250} y={390} fill={C.amber} fontSize={24}>鼻托受力 ↓</text>
      </svg>
      <div style={{ display: "flex", gap: 30, marginTop: 10 }}>
        {[
          ["鼻托受力", "≤ 对标产品实测"],
          ["左右重量差", "≤ 3 g"],
          ["2 小时佩戴", "主观评分不低于对标"],
          ["整机估算", "约 115–130 g"],
        ].map(([k, v], i) => (
          <Card key={k} start={70 + i * 8} color={i === 3 ? C.amber : C.pink} style={{ flex: 1, padding: "16px 22px" }}>
            <div style={{ fontSize: 22, color: "#b8c4d9" }}>{k}</div>
            <div style={{ fontSize: 34, fontWeight: 700 }}>{v}</div>
          </Card>
        ))}
      </div>
    </Pad>
  );
};

// ---------- 9 使用体验：一天 ----------
const DAY = [
  { t: "08:00", s: "起床 · 手表模式", d: "看时间、拍照、录音；主处理器不醒", c: C.amber, m: "S0'" },
  { t: "09:00", s: "地铁 · “打开 QQ”", d: "气泡“正在打开”→ 手机渲染的 QQ 看板就地出现", c: C.pink, m: "BLE · 看板" },
  { t: "10:00", s: "办公 · “我来操作”", d: "PC 虚拟显示器接管，投屏锚定在桌面上方", c: C.cyan, m: "B · 投屏" },
  { t: "14:00", s: "现场 · “帮我看看这个”", d: "实时拍照取景，脑识别后把标注贴在实物上", c: C.blue, m: "实时拍照 · 6DoF" },
  { t: "18:30", s: "开车 · 导航看板", d: "车机这只手发描述，小脑本地画", c: C.lime, m: "车机 · 看板" },
  { t: "21:00", s: "家里 · 视频通话", d: "机身 5G 直连；对方看到云这只手渲染的虚拟形象", c: C.pink, m: "C · 视频通话" },
  { t: "23:00", s: "摘下 · 深度睡眠", d: "戴上秒级恢复到原来的画面", c: "#94a3b8", m: "S1→S3" },
];
export const SDay: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const per = durationInFrames / DAY.length;
  const idx = Math.min(DAY.length - 1, Math.floor(f / per));
  const local = f - idx * per;
  const it = DAY[idx];
  const p = interpolate(local, [0, 14], [0, 1], { ...clamp, easing: ease });
  return (
    <Pad>
      <Kicker text="EXPERIENCE · 戴上它的一天" color={it.c} />
      <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
        {DAY.map((d, i) => (
          <div key={d.t} style={{ flex: 1, height: 8, borderRadius: 4, background: i < idx ? d.c : i === idx ? `linear-gradient(90deg, ${d.c} ${(local / per) * 100}%, #1e293b 0)` : "#1e293b" }} />
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 70, gap: 70, alignItems: "center" }}>
        <div style={{ width: 560, opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
          <div style={{ fontFamily: MONO, fontSize: 150, fontWeight: 700, color: it.c, lineHeight: 1 }}>{it.t}</div>
          <div style={{ fontFamily: MONO, fontSize: 28, color: C.dim, marginTop: 20, letterSpacing: 4 }}>MODE · {it.m}</div>
        </div>
        <div style={{ flex: 1, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
          <div style={{ fontSize: 76, fontWeight: 700 }}>{it.s}</div>
          <div style={{ fontSize: 36, color: "#c4cee0", marginTop: 20, lineHeight: 1.5 }}>{it.d}</div>
          <div style={{ marginTop: 40 }}>
            <GlassesWire start={idx * per} scale={0.5} color={it.c} />
          </div>
        </div>
      </div>
    </Pad>
  );
};

// ---------- 10 路线图 ----------
const STAGES = [
  { k: "M0", t: "现成硬件验证", d: "6 组验证 · 闸门 G1–G6", c: C.cyan, now: true },
  { k: "M1", t: "桌面功能样机", d: "全链路 · 协议 v0 含看板描述 · 主 SoC 与 MCU A/B 定案", c: C.blue },
  { k: "M2", t: "完全版样机 EVT", d: "全部功能进眼镜形态 · 8 小时整机实测", c: C.pink },
  { k: "M3", t: "优化样机 DVT", d: "功耗 / 重量 / 散热 · 认证预测试", c: C.lime },
  { k: "Gen 2", t: "第二代", d: "波导减重 · 蜂窝芯片级设计 · ASIC", c: C.amber },
];
export const SRoadmap: React.FC = () => {
  const f = useCurrentFrame();
  const line = interpolate(f, [16, 120], [0, 1], { ...clamp, easing: ease });
  return (
    <Pad>
      <Kicker text="ROADMAP · 从验证到量产前" color={C.cyan} />
      <div style={{ height: 14 }} />
      <KineticTitle text="先在桌面跑通，再画板" start={4} size={66} />
      <div style={{ position: "relative", marginTop: 90, height: 460 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 46, height: 4, background: "#1e293b" }} />
        <div style={{ position: "absolute", left: 0, width: `${line * 100}%`, top: 46, height: 4, background: C.cyan }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {STAGES.map((s, i) => {
            const p = interpolate(f, [24 + i * 18, 40 + i * 18], [0, 1], { ...clamp, easing: ease });
            return (
              <div key={s.k} style={{ width: 300, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
                <div style={{ width: 96, height: 96, borderRadius: 48, background: C.bg, border: `4px solid ${s.c}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: s.k.length > 2 ? 26 : 34, fontWeight: 700, color: s.c, boxShadow: s.now ? `0 0 ${8 + 6 * Math.abs(Math.sin(f / 20))}px rgba(232,226,212,.35)` : "none" }}>
                  {s.k}
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, marginTop: 24 }}>{s.t}</div>
                <div style={{ fontSize: 23, color: "#b8c4d9", marginTop: 10, lineHeight: 1.5 }}>{s.d}</div>
                {s.now && <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 18, color: C.cyan }}>● 进行中：第 1、3、6 组先做</div>}
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
      <GlassesWire start={0} scale={0.7} glow={pulse} />
      <div style={{ height: 40 }} />
      <KineticTitle text="眼镜是脑，主机是手" start={20} size={104} />
      <div style={{ height: 30 }} />
      <KineticTitle text="想看什么就看到什么 · 断网手表 · 秒级唤醒" start={60} size={44} color={C.cyan} weight={500} stagger={2} />
      <div style={{ marginTop: 60, fontFamily: MONO, fontSize: 34, color: C.text, opacity: interpolate(f, [100, 130], [0, 1], clamp) }}>
        glasses.youngtuo.win
      </div>
      <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 22, color: C.dim, opacity: interpolate(f, [110, 140], [0, 1], clamp) }}>
        github.com/jodancain/independent-cellular-ai-glasses · 型号为候选 · 数值为设计目标
      </div>
    </Pad>
  );
};
