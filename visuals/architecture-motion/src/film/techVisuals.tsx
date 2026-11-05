// 技术全解片的自绘示意图：每个组件画在 1120×720 的左侧画框内，动画由 useCurrentFrame() 驱动。
// 数字全部取自仓库文档（方案、技术路线、设计开发要求、验证计划），均为设计目标或公开资料。
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, Counter, FONT, MONO, ease } from "./kit";
import { Glyph, GlyphName, Icon } from "./icons";
import { GlassesSide } from "./illus";
import { Her } from "./persona";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inn = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });
export const BW = 1120, BH = 720;
const GREY = "#5c6270";
const line = "1.5px solid rgba(232,226,212,.45)";

const Box: React.FC<{ x: number; y: number; w: number; h: number; o?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, o = 1, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: o, boxSizing: "border-box", ...style }}>{children}</div>
);
const Tag: React.FC<{ children: React.ReactNode; strong?: boolean; style?: React.CSSProperties }> = ({ children, strong, style }) => (
  <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, border: `1px solid rgba(232,226,212,${strong ? 0.7 : 0.3})`, fontSize: 18, color: strong ? C.text : C.dim, whiteSpace: "nowrap", ...style }}>{children}</span>
);
const Dots: React.FC<{ f: number; x1: number; x2: number; y: number; n?: number; speed?: number; r?: number; o?: number }> = ({ f, x1, x2, y, n = 5, speed = 40, r = 4, o = 1 }) => (
  <>
    {Array.from({ length: n }).map((_, i) => {
      const t = (f / speed + i / n) % 1;
      return <circle key={i} cx={x1 + (x2 - x1) * t} cy={y} r={r} fill={C.cyan} opacity={Math.sin(Math.PI * t) * o} />;
    })}
  </>
);

// ---------- 一句话方案：联网全功能 / 断网手表模式 ----------
export const VOneLine: React.FC = () => {
  const f = useCurrentFrame();
  const on = Math.floor(f / 150) % 2 === 0; // 每 5 秒切换一次
  const k = on ? inn(f % 150, 0, 18) : 1 - inn(f % 150, 0, 18);
  return (
    <>
      <Box x={330} y={210} w={460} h={160}>
        <Her width={460} openAt={-10} glow={0.3 + k * 0.7} pupil={0.8 + k * 0.2} old={k < 0.5} />
      </Box>
      <svg width={BW} height={BH} style={{ position: "absolute", inset: 0 }}>
        {[
          { x: 120, y: 120, n: "monitor" as GlyphName },
          { x: 120, y: 470, n: "phone" as GlyphName },
          { x: 920, y: 120, n: "car" as GlyphName },
          { x: 920, y: 470, n: "cloud" as GlyphName },
        ].map((h, i) => (
          <g key={i} opacity={0.25 + k * 0.75}>
            <Glyph name={h.n} x={h.x} y={h.y} size={90} color={C.cyan} strokeWidth={3} />
            <line x1={h.x < 500 ? h.x + 100 : h.x - 10} y1={h.y + 45} x2={h.x < 500 ? 330 : 790} y2={290} stroke={C.cyan} strokeWidth={1.5} strokeDasharray="3 8" opacity={0.5 * k} />
          </g>
        ))}
        <Glyph name="signal" x={520} y={70} size={80} color={C.cyan} strokeWidth={4} opacity={0.2 + k * 0.8} />
      </svg>
      <Box x={0} y={420} w={BW} h={60} style={{ textAlign: "center", fontSize: 40, fontWeight: 800, color: k > 0.5 ? C.text : C.dim }}>
        {k > 0.5 ? "联网 · 全功能" : "断网 · 手表模式"}
      </Box>
      <Box x={0} y={500} w={BW} h={80} style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        {(k > 0.5 ? ["串流显示", "6DoF 叠加", "软件兼容", "云端 AI", "视频通话"] : ["时间", "拍照", "录像", "录音", "极小本地程序"]).map((t) => (
          <Tag key={t} strong={k > 0.5}>{t}</Tag>
        ))}
      </Box>
      <Box x={0} y={620} w={BW} h={60} style={{ display: "flex", justifyContent: "center", gap: 40, fontSize: 20, color: C.dim }}>
        <span>依赖网络，不依赖手机</span>
        <span>·</span>
        <span>默认无线，线控模块可选</span>
        <span>·</span>
        <span>不用时深睡、秒级唤醒</span>
      </Box>
    </>
  );
};

// ---------- 脑 / 小脑 / 手 ----------
const ROLES: { icon: GlyphName; t: string; who: string; items: string[] }[] = [
  { icon: "brain", t: "脑", who: "眼镜 + 云端 LLM", items: ["理解意图", "派哪只手", "决定显示什么"] },
  { icon: "chip", t: "小脑", who: "主 SoC + 显示处理器 + MCU", items: ["追踪 · 解码 · 合成", "重投影 · 畸变校正", "轻卡片 · 条件反射", "手表模式 · 显示分配"] },
  { icon: "monitor", t: "手", who: "手机 · PC · 车机 · 云主机", items: ["运行应用", "按自己的界面渲染", "云端 GPU 也是手"] },
  { icon: "signal", t: "脚", who: "蜂窝 · Wi-Fi 7 · BLE · USB-C", items: ["把脑带到每只手", "有线 > 局域网 > 云", "BLE 细步 · Wi-Fi 大步", "四条腿都断 = 手表"] },
];
const ORGANS: { a: GlyphName; b: GlyphName; t: string }[] = [
  { a: "camera", b: "eye", t: "摄像头 = 眼睛" },
  { a: "mic", b: "mouth", t: "麦克风 = 嘴巴" },
  { a: "speaker", b: "ear", t: "扬声器 = 耳朵" },
  { a: "lens", b: "retina", t: "光波导 = 视网膜" },
];
export const VRoles: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 20, width: BW, display: "flex", gap: 16 }}>
        {ROLES.map((r, i) => {
          const p = inn(f, 6 + i * 10, 24 + i * 10);
          return (
            <div key={r.t} style={{ flex: 1, height: 420, border: line, borderRadius: 18, padding: "22px 18px", boxSizing: "border-box", opacity: p, transform: `translateY(${(1 - p) * 24}px)`, background: i === 1 ? "rgba(232,226,212,.05)" : "transparent" }}>
              <Icon name={r.icon} size={82} color={C.cyan} strokeWidth={3} />
              <div style={{ fontSize: 46, fontWeight: 800, marginTop: 14 }}>{r.t}</div>
              <div style={{ fontSize: 17, color: C.dim, marginTop: 6, minHeight: 44 }}>{r.who}</div>
              <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
                {r.items.map((t) => (
                  <div key={t} style={{ fontSize: 19, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: C.cyan, opacity: 0.7 }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, top: 480, width: BW, display: "flex", gap: 18 }}>
        {ORGANS.map((o, i) => {
          const p = inn(f, 50 + i * 8, 66 + i * 8);
          return (
            <div key={o.t} style={{ flex: 1, textAlign: "center", opacity: p }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Icon name={o.a} size={54} color={C.cyan} strokeWidth={3} opacity={0.6} />
                <span style={{ color: C.dim }}>→</span>
                <Icon name={o.b} size={62} color={C.cyan} strokeWidth={3} />
              </div>
              <div style={{ marginTop: 10, fontSize: 20, color: C.dim }}>{o.t}</div>
            </div>
          );
        })}
      </div>
      <Box x={0} y={650} w={BW} h={50} style={{ textAlign: "center", fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>谁是手谁渲染，重渲染不在眼镜上；脚让脑不靠手机走到每一只手</Box>
    </>
  );
};

// ---------- MCU A / B 案 ----------
export const VMcuAB: React.FC = () => {
  const f = useCurrentFrame();
  const cards = [
    { k: "A 案", chips: ["STM32N657", "PSRAM", "小 BLE 芯片"], plus: ["ISP + H.264 拍录像通路保留", "4.2 MB 片上 SRAM"], minus: ["多一颗芯片（BOM / 布板）"] },
    { k: "B 案", chips: ["BES2800BP"], plus: ["蓝牙、Wi-Fi、DSI 在片内", "双 M55 + 双 STAR-MC1，8.3 MB SRAM", "音频强"], minus: ["ISP / H.264 证据不完整", "拍录像要短时唤醒主 SoC"] },
  ];
  const t = (f % 120) / 120;
  const ms = Math.min(100, Math.round(t * 140));
  return (
    <>
      {cards.map((c, i) => {
        const p = inn(f, 8 + i * 12, 28 + i * 12);
        return (
          <Box key={c.k} x={i * 580} y={0} w={540} h={470} o={p} style={{ border: line, borderRadius: 18, padding: 26 }}>
            <div style={{ fontSize: 40, fontWeight: 800 }}>{c.k}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              {c.chips.map((ch) => (
                <div key={ch} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(232,226,212,.7)", fontFamily: MONO, fontSize: 22 }}>
                  <Icon name="chip" size={30} color={C.cyan} strokeWidth={4} />
                  {ch}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {c.plus.map((x) => (
                <div key={x} style={{ fontSize: 21 }}>＋ {x}</div>
              ))}
              {c.minus.map((x) => (
                <div key={x} style={{ fontSize: 21, color: C.dim }}>－ {x}</div>
              ))}
            </div>
          </Box>
        );
      })}
      <Box x={0} y={510} w={BW} h={190} o={inn(f, 40, 60)} style={{ border: "2px solid rgba(232,226,212,.75)", borderRadius: 18, padding: "22px 30px", display: "flex", alignItems: "center", gap: 36 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: C.dim }}>GATE · 闸门</div>
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>主 SoC 睡眠 → BLE 气泡上屏</div>
          <div style={{ fontSize: 20, color: C.dim, marginTop: 8 }}>两案都要过；达不到的方案不得定案（M1）</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: MONO, fontSize: 84, fontWeight: 600, lineHeight: 1 }}>≤ 0.1 s</div>
          <div style={{ width: 300, height: 8, borderRadius: 4, background: "rgba(232,226,212,.15)", marginTop: 14, marginLeft: "auto", overflow: "hidden" }}>
            <div style={{ width: `${ms}%`, height: 8, background: C.cyan }} />
          </div>
        </div>
      </Box>
    </>
  );
};

// ---------- 光学：光机 → 几何反射式光波导 → 眼睛 ----------
export const VOptics: React.FC = () => {
  const f = useCurrentFrame();
  const p = inn(f, 6, 40);
  const mirrors = [520, 620, 720, 820];
  return (
    <>
      <svg width={BW} height={BH} style={{ position: "absolute", inset: 0 }}>
        {/* 光机 */}
        <rect x={60} y={170} width={200} height={130} rx={14} fill="rgba(232,226,212,.06)" stroke={C.cyan} strokeWidth={3} />
        <text x={160} y={232} fill={C.text} fontFamily={FONT} fontSize={26} textAnchor="middle" fontWeight={700}>光机</text>
        <text x={160} y={266} fill={C.dim} fontFamily={FONT} fontSize={18} textAnchor="middle">LCoS / 全彩 microLED</text>
        {/* 波导片 */}
        <rect x={300} y={300} width={640} height={44} rx={6} fill="rgba(232,226,212,.05)" stroke={C.cyan} strokeWidth={3} />
        <line x1={340} y1={300} x2={300} y2={344} stroke={C.cyan} strokeWidth={3} />
        {mirrors.map((x) => (
          <line key={x} x1={x} y1={300} x2={x + 36} y2={344} stroke={C.cyan} strokeWidth={2} opacity={0.6} />
        ))}
        {/* 入射 */}
        <path d={`M 260 236 L 320 236 L 320 300`} fill="none" stroke={C.cyan} strokeWidth={2.5} strokeDasharray={260} strokeDashoffset={260 * (1 - p)} />
        {/* 全反射之字 */}
        <path d="M 320 300 L 380 344 L 440 300 L 500 344 L 560 300 L 620 344 L 680 300 L 740 344 L 800 300 L 860 344" fill="none" stroke={C.cyan} strokeWidth={2} opacity={0.75} strokeDasharray={900} strokeDashoffset={900 * (1 - inn(f, 20, 70))} />
        {/* 出射到眼睛 */}
        {mirrors.map((x, i) => (
          <line key={x} x1={x + 18} y1={344} x2={640 + (i - 1.5) * 30} y2={560} stroke={C.cyan} strokeWidth={2} opacity={0.65 * inn(f, 60 + i * 6, 80 + i * 6)} />
        ))}
        {/* 视场扇形 */}
        <path d="M 640 560 L 470 344 L 870 344 Z" fill="rgba(232,226,212,.05)" opacity={inn(f, 90, 110)} />
        <text x={980} y={330} fill={C.text} fontFamily={MONO} fontSize={34} opacity={inn(f, 90, 110)}>30–50°</text>
        <text x={980} y={364} fill={C.dim} fontFamily={FONT} fontSize={18} opacity={inn(f, 90, 110)}>视场目标</text>
        {/* 光点流 */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const t = (f / 40 + i / 6) % 1;
          const xs = [320, 380, 440, 500, 560, 620, 680, 740, 800, 860];
          const seg = Math.min(8, Math.floor(t * 9));
          const lt = t * 9 - seg;
          const x = xs[seg] + (xs[seg + 1] - xs[seg]) * lt;
          const y = (seg % 2 === 0 ? 300 : 344) + ((seg % 2 === 0 ? 44 : -44) * lt);
          return <circle key={i} cx={x} cy={y} r={4} fill={C.cyan} opacity={inn(f, 40, 70)} />;
        })}
        <text x={620} y={286} fill={C.dim} fontFamily={FONT} fontSize={20} textAnchor="middle">几何反射式（阵列）光波导 · 主选</text>
      </svg>
      <Box x={600} y={560} w={80} h={80}>
        <Icon name="eye" size={80} color={C.cyan} strokeWidth={3} />
      </Box>
      <Box x={0} y={660} w={BW} h={50} style={{ display: "flex", justifyContent: "center", gap: 14 }}>
        <Tag strong>入眼亮度约 4000 尼特</Tag>
        <Tag strong>60 Hz 起 · 补帧到 90 Hz 以上</Tag>
        <Tag>birdbath / 自由曲面已放弃</Tag>
      </Box>
    </>
  );
};

// ---------- 连接：五条链路 ----------
const LINKS = [
  { k: "A1", t: "有线原始画面", s: "USB-C · 4 路 DP · 不压缩", w: 7, speed: 16 },
  { k: "A2", t: "有线编码串流", s: "USB 3 · 主机硬编码", w: 5, speed: 20 },
  { k: "B", t: "Wi-Fi 7", s: "日常移动 · 5 / 6 GHz", w: 4, speed: 24 },
  { k: "C", t: "机身 RedCap", s: "离开主机 · 连云", w: 3, speed: 30 },
  { k: "BLE", t: "控制面", s: "意图 · 气泡 · 看板描述 · 常驻", w: 1.6, speed: 46 },
];
export const VLinks: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <svg width={BW} height={BH} style={{ position: "absolute", inset: 0 }}>
        {LINKS.map((l, i) => {
          const y = 70 + i * 130;
          const p = inn(f, 6 + i * 8, 26 + i * 8);
          return (
            <g key={l.k} opacity={p}>
              <line x1={330} y1={y} x2={860} y2={y} stroke={C.cyan} strokeWidth={l.w} opacity={0.25} strokeDasharray={l.k === "BLE" ? "4 8" : undefined} />
              <Dots f={f + i * 7} x1={330} x2={860} y={y} n={l.k === "BLE" ? 3 : 6} speed={l.speed} r={2 + l.w * 0.6} />
              <text x={0} y={y - 4} fill={C.cyan} fontFamily={MONO} fontSize={30} fontWeight={600}>{l.k}</text>
              <text x={80} y={y - 4} fill={C.text} fontFamily={FONT} fontSize={26} fontWeight={700}>{l.t}</text>
              <text x={80} y={y + 28} fill={C.dim} fontFamily={FONT} fontSize={18}>{l.s}</text>
            </g>
          );
        })}
      </svg>
      <Box x={890} y={180} w={230} h={300} style={{ textAlign: "center" }}>
        <Her width={230} openAt={-10} glow={0.5} />
        <div style={{ marginTop: 10, fontSize: 22, color: C.dim }}>眼镜</div>
      </Box>
      <Box x={330} y={660} w={530} h={40} style={{ textAlign: "center", fontSize: 20, color: C.dim }}>主机优先级：有线 &gt; 同局域网 &gt; 云</Box>
    </>
  );
};

// ---------- 网络最低要求 ----------
const NET = [
  { t: "云串流 1080p60", dl: 30, ul: 2, rtt: "≤ 50 ms" },
  { t: "视频通话 1080p30", dl: 5, ul: 5, rtt: "≤ 100 ms" },
  { t: "串流 + 通话并发", dl: 35, ul: 8, rtt: "≤ 50 ms" },
];
export const VNet: React.FC = () => {
  const f = useCurrentFrame();
  const max = 40;
  return (
    <>
      {NET.map((n, i) => {
        const p = inn(f, 10 + i * 14, 40 + i * 14);
        return (
          <Box key={n.t} x={0} y={i * 170} w={BW} h={150} o={inn(f, 4 + i * 14, 20 + i * 14)}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{n.t}</div>
            {[
              { k: "下行", v: n.dl },
              { k: "上行", v: n.ul },
            ].map((b, j) => (
              <div key={b.k} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                <span style={{ width: 50, fontSize: 19, color: C.dim }}>{b.k}</span>
                <div style={{ width: 680, height: 22, borderRadius: 4, background: "rgba(232,226,212,.08)" }}>
                  <div style={{ width: `${(b.v / max) * 100 * p}%`, height: 22, borderRadius: 4, background: C.cyan, opacity: j ? 0.5 : 0.85 }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 24, width: 130 }}>≥ {b.v} Mbps</span>
              </div>
            ))}
            <div style={{ position: "absolute", right: 0, top: 0, fontFamily: MONO, fontSize: 22, color: C.dim }}>RTT p95 {n.rtt}</div>
          </Box>
        );
      })}
      <Box x={0} y={540} w={BW} h={160} o={inn(f, 60, 80)} style={{ border: line, borderRadius: 16, padding: "20px 26px", display: "flex", alignItems: "center", gap: 30 }}>
        <Icon name="signal" size={80} color={C.cyan} strokeWidth={4} />
        <div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>机身最低按 5G RedCap 选型</div>
          <div style={{ fontSize: 20, color: C.dim, marginTop: 8 }}>公开峰值：下行约 220 Mbps · 上行约 120 Mbps；持续速率、上行和时延在强弱信号下实测</div>
        </div>
      </Box>
    </>
  );
};

// ---------- 延迟预算 ----------
const LAT = [
  { k: "A1 有线原始", seg: [0, 0, 0, 5] },
  { k: "A2 有线编码", seg: [5, 2, 5, 5] },
  { k: "B Wi-Fi 7", seg: [5, 5, 5, 5] },
  { k: "C 蜂窝", seg: [5, -1, 5, 5] },
];
const SEGN = ["编码", "传输", "解码", "重投影 + 显示"];
export const VLatency: React.FC = () => {
  const f = useCurrentFrame();
  const unit = 30;
  return (
    <>
      <div style={{ position: "absolute", left: 230, top: 0, display: "flex", gap: 22 }}>
        {SEGN.map((s, i) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 19, color: C.dim }}>
            <span style={{ width: 22, height: 12, borderRadius: 3, background: C.cyan, opacity: 0.25 + i * 0.2 }} />
            {s}
          </span>
        ))}
      </div>
      {LAT.map((l, i) => {
        let x = 0;
        return (
          <Box key={l.k} x={0} y={70 + i * 120} w={BW} h={90} o={inn(f, 6 + i * 10, 22 + i * 10)}>
            <div style={{ position: "absolute", left: 0, top: 22, fontSize: 24, fontWeight: 700 }}>{l.k}</div>
            {l.seg.map((v, j) => {
              const p = inn(f, 20 + i * 10 + j * 6, 40 + i * 10 + j * 6);
              const w = v < 0 ? 5 * unit : v * unit;
              const el = v === 0 ? null : (
                <div key={j} style={{ position: "absolute", left: 230 + x, top: 10, width: Math.max(0, w * p - 4), height: 58, borderRadius: 6, background: v < 0 ? "transparent" : C.cyan, opacity: v < 0 ? 1 : 0.25 + j * 0.2, border: v < 0 ? "2px dashed rgba(232,226,212,.5)" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 20, color: j >= 2 ? C.bg : C.text, overflow: "hidden" }}>
                  {p > 0.8 ? (v < 0 ? "待测" : `≤${v}`) : ""}
                </div>
              );
              x += v === 0 ? 0 : w;
              return el;
            })}
          </Box>
        );
      })}
      <Box x={0} y={570} w={BW} h={130} o={inn(f, 70, 90)} style={{ border: "2px solid rgba(232,226,212,.7)", borderRadius: 16, padding: "18px 26px" }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>头动感知延迟与网络解耦</div>
        <div style={{ fontSize: 20, color: C.dim, marginTop: 10 }}>头动由本地追踪 + 重投影承担，叠加内容不随网络抖动漂移；单位 ms，均为设计目标</div>
      </Box>
    </>
  );
};

// ---------- 串流纪律与兼容分层 ----------
const LAYERS = [
  { k: "L0", t: "系统级虚拟显示器", m: "投屏（接管）" },
  { k: "L1", t: "OpenXR / 空间应用", m: "空间内容" },
  { k: "L2", t: "标准投屏 / 车机协议", m: "接收端" },
  { k: "L3", t: "语义转化", m: "看板" },
  { k: "L4", t: "像素转化", m: "看板兜底" },
];
const STAGES = ["采集", "编码", "发送", "解码", "上屏"];
export const VCompat: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {LAYERS.map((l, i) => (
        <Box key={l.k} x={0} y={i * 78} w={BW} h={66} o={inn(f, 4 + i * 6, 18 + i * 6)} style={{ border: line, borderRadius: 12, display: "flex", alignItems: "center", padding: "0 22px", gap: 22, background: i === 0 || i >= 3 ? "rgba(232,226,212,.05)" : "transparent" }}>
          <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, width: 50 }}>{l.k}</span>
          <span style={{ fontSize: 24, flex: 1 }}>{l.t}</span>
          <span style={{ fontSize: 22, color: i === 0 || i >= 3 ? C.text : C.dim }}>→ {l.m}</span>
        </Box>
      ))}
      <Box x={0} y={430} w={BW} h={30} o={inn(f, 40, 56)} style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: C.dim }}>STREAM DISCIPLINE · 串流纪律</Box>
      <div style={{ position: "absolute", left: 0, top: 476, width: BW, display: "flex", gap: 14, opacity: inn(f, 44, 60) }}>
        {STAGES.map((s, i) => {
          const n = Math.floor(Math.max(0, f - 50) / 2) - i * 2 - (i >= 3 ? Math.floor(Math.max(0, f - 50) / 60) : 0);
          return (
            <div key={s} style={{ flex: 1, border: line, borderRadius: 12, padding: "14px 0", textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{s}</div>
              <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 600, marginTop: 6 }}>{Math.max(0, n)}</div>
            </div>
          );
        })}
      </div>
      <Box x={0} y={610} w={BW} h={90} o={inn(f, 60, 80)} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignContent: "flex-start" }}>
        {["只留最新一帧", "对端忙就丢帧", "关键帧恢复，不花屏", "“已发送”≠“已显示”", "ROI 先裁剪再缩放", "矢量与画面分开"].map((t) => (
          <Tag key={t} strong>{t}</Tag>
        ))}
      </Box>
    </>
  );
};

// ---------- 手的接入：Mika 改造版执行链 ----------
const PIPE = ["目标", "守卫", "锁屏检查", "不可逆检查", "眼镜确认", "执行"];
export const VHand: React.FC = () => {
  const f = useCurrentFrame();
  const cur = Math.floor(f / 24) % (PIPE.length + 2);
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: BW, display: "flex", alignItems: "center", gap: 8 }}>
        {PIPE.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ flex: 1, height: 110, borderRadius: 14, border: `1.5px solid rgba(232,226,212,${i <= cur ? 0.85 : 0.3})`, background: i === cur ? "rgba(232,226,212,.14)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: i === 4 ? 800 : 500, textAlign: "center", opacity: inn(f, i * 5, 14 + i * 5) }}>{s}</div>
            {i < PIPE.length - 1 && <span style={{ color: C.dim, fontSize: 22 }}>→</span>}
          </React.Fragment>
        ))}
      </div>
      <Box x={0} y={150} w={BW} h={40} style={{ fontSize: 20, color: C.dim }}>发消息、发文件、删除等不可逆动作都在眼镜上确认；付款、密码页只在手机上完成</Box>
      {[
        { k: "BLE", t: "控制面 · 低功耗常连", s: "意图、气泡、看板描述；主 SoC 睡着由 MCU 收", w: 2 },
        { k: "PAN / LAN", t: "Mika 局域网接口", s: "任务下发、状态查询、较大的看板描述；只接受私网地址", w: 3 },
        { k: "Wi-Fi", t: "视频面", s: "视频、投屏；不把视频塞进 BLE", w: 6 },
      ].map((c, i) => (
        <Box key={c.k} x={0} y={230 + i * 110} w={BW} h={92} o={inn(f, 30 + i * 10, 46 + i * 10)}>
          <svg width={BW} height={92} style={{ position: "absolute", inset: 0 }}>
            <line x1={240} y1={46} x2={560} y2={46} stroke={C.cyan} strokeWidth={c.w} opacity={0.25} />
            <Dots f={f + i * 9} x1={240} x2={560} y={46} n={4} speed={30 + i * 8} r={3 + c.w * 0.5} />
          </svg>
          <div style={{ position: "absolute", left: 0, top: 26, fontFamily: MONO, fontSize: 28, fontWeight: 600 }}>{c.k}</div>
          <div style={{ position: "absolute", left: 590, top: 10, fontSize: 24, fontWeight: 700 }}>{c.t}</div>
          <div style={{ position: "absolute", left: 590, top: 46, fontSize: 18, color: C.dim, width: 530 }}>{c.s}</div>
        </Box>
      ))}
      <Box x={0} y={590} w={BW} h={110} o={inn(f, 70, 90)} style={{ display: "flex", gap: 20 }}>
        {[
          { t: "Mika", s: "Apache-2.0 · Kotlin · 主选参考" },
          { t: "dsh-Go", s: "AGPL-3.0 · 只作参考" },
        ].map((x) => (
          <div key={x.t} style={{ flex: 1, border: line, borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 18 }}>
            <Icon name="phone" size={60} color={C.cyan} strokeWidth={3} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{x.t}</div>
              <div style={{ fontSize: 18, color: C.dim, marginTop: 4 }}>{x.s}</div>
            </div>
          </div>
        ))}
      </Box>
    </>
  );
};

// ---------- 续航预算 ----------
const BUDGET = [
  { t: "串流 1 h", w: "≤ 2.0 W", wh: 2.0, icon: "play" as GlyphName },
  { t: "通话 0.5 h", w: "≤ 3.0 W", wh: 1.5, icon: "videoCall" as GlyphName },
  { t: "6DoF 0.5 h", w: "≤ 2.0 W", wh: 1.0, icon: "viewfinder" as GlyphName },
  { t: "轻度联网 3 h", w: "≤ 0.4 W", wh: 1.2, icon: "wifi" as GlyphName },
  { t: "手表 1 h", w: "≤ 0.08 W", wh: 0.08, icon: "watch" as GlyphName },
  { t: "S1 / S2 2 h", w: "≤ 0.08 W", wh: 0.16, icon: "moon" as GlyphName },
];
export const VBudget: React.FC = () => {
  const f = useCurrentFrame();
  const scale = 140; // px / Wh
  let acc = 0;
  return (
    <>
      {BUDGET.map((b, i) => {
        const p = inn(f, 8 + i * 8, 30 + i * 8);
        const x0 = acc * scale;
        acc += b.wh;
        return (
          <Box key={b.t} x={0} y={i * 62} w={BW} h={54} o={inn(f, 4 + i * 8, 16 + i * 8)}>
            <div style={{ position: "absolute", left: 0, top: 10, display: "flex", alignItems: "center", gap: 10, width: 230 }}>
              <Icon name={b.icon} size={30} color={C.cyan} strokeWidth={4} />
              <span style={{ fontSize: 21 }}>{b.t}</span>
            </div>
            <span style={{ position: "absolute", left: 230, top: 14, fontFamily: MONO, fontSize: 19, color: C.dim }}>{b.w}</span>
            <div style={{ position: "absolute", left: 330 + x0 * 0.62, top: 8, width: Math.max(3, b.wh * scale * 0.62 * p), height: 34, borderRadius: 4, background: C.cyan, opacity: 0.75 }} />
            <span style={{ position: "absolute", right: 0, top: 12, fontFamily: MONO, fontSize: 21 }}>{b.wh} Wh</span>
          </Box>
        );
      })}
      {/* 电池 */}
      <Box x={0} y={420} w={BW} h={280} o={inn(f, 60, 80)}>
        <svg width={BW} height={200} style={{ position: "absolute", left: 0, top: 0 }}>
          <rect x={4} y={30} width={980} height={120} rx={20} fill="none" stroke={C.cyan} strokeWidth={3.5} />
          <rect x={988} y={68} width={18} height={44} rx={5} fill="none" stroke={C.cyan} strokeWidth={3.5} />
          <rect x={22} y={48} width={(5.9 / 7) * 944 * inn(f, 70, 130)} height={84} rx={8} fill={C.cyan} opacity={0.8} />
          <line x1={22 + 944} y1={40} x2={22 + 944} y2={140} stroke={C.cyan} strokeWidth={1.5} strokeDasharray="4 6" opacity={0.6} />
          <text x={22 + (5.9 / 7) * 944 + 12} y={100} fill={C.text} fontFamily={FONT} fontSize={20} opacity={inn(f, 120, 140)}>余量约 15%</text>
          <text x={4} y={190} fill={C.dim} fontFamily={FONT} fontSize={19}>电池按 5–7 Wh 设计（满格为 7 Wh）；实测超预算：先压功耗，再加到 8–10 Wh</text>
        </svg>
        <div style={{ position: "absolute", right: 120, top: 210, display: "flex", alignItems: "baseline", gap: 10 }}>
          <Counter to={5.9} start={70} dur={60} decimals={1} style={{ fontFamily: MONO, fontSize: 64, fontWeight: 600 }} />
          <span style={{ fontFamily: MONO, fontSize: 22, color: C.dim }}>Wh · 8 h 剖面预算</span>
        </div>
      </Box>
    </>
  );
};

// ---------- 重量与佩戴 ----------
export const VWeight: React.FC = () => {
  const f = useCurrentFrame();
  const move = interpolate(f, [20, 90], [0, 1], { ...clamp, easing: ease });
  return (
    <>
      <Box x={-20} y={0} w={BW} h={330} style={{ transform: "scale(.68)", transformOrigin: "0 0" }}>
        <GlassesSide move={move} />
      </Box>
      <div style={{ position: "absolute", left: 0, top: 360, width: BW, display: "flex", gap: 22 }}>
        {[
          { v: "115–130 g", l: "整机（估算）", icon: "glasses" as GlyphName },
          { v: "≤ 3 g", l: "左右重量差", icon: "balance" as GlyphName },
          { v: "2 h", l: "连续佩戴评分", icon: "clock" as GlyphName },
        ].map((s, i) => {
          const p = inn(f, 40 + i * 10, 60 + i * 10);
          return (
            <div key={s.l} style={{ flex: 1, border: line, borderRadius: 16, padding: "22px 24px", opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
              <Icon name={s.icon} size={48} color={C.cyan} strokeWidth={3} opacity={0.7} />
              <div style={{ fontFamily: MONO, fontSize: s.v.length > 6 ? 46 : 58, fontWeight: 600, marginTop: 12, whiteSpace: "nowrap" }}>{s.v}</div>
              <div style={{ fontSize: 20, color: C.dim, marginTop: 6 }}>{s.l}</div>
            </div>
          );
        })}
      </div>
      <Box x={0} y={640} w={BW} h={60} o={inn(f, 80, 100)} style={{ textAlign: "center", fontSize: 24, fontWeight: 700 }}>前框尽量轻，新增重量全部放耳后，重心落在耳朵支点附近</Box>
    </>
  );
};

// ---------- 验证闸门 ----------
const GATES: { g: string; t: string; icon: GlyphName; first?: boolean }[] = [
  { g: "G1", t: "串流体验", icon: "play", first: true },
  { g: "G2", t: "空间交互", icon: "viewfinder" },
  { g: "G3", t: "独立联网", icon: "signal", first: true },
  { g: "G4", t: "续航（暂定）", icon: "battery" },
  { g: "G5", t: "通话", icon: "videoCall" },
  { g: "G6", t: "佩戴", icon: "balance", first: true },
];
export const VGates: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: BW, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
        {GATES.map((g, i) => {
          const p = inn(f, 6 + i * 8, 24 + i * 8);
          return (
            <div key={g.g} style={{ height: 250, border: `1.5px solid rgba(232,226,212,${g.first ? 0.8 : 0.35})`, borderRadius: 18, padding: 24, boxSizing: "border-box", opacity: p, transform: `scale(${0.94 + p * 0.06})`, position: "relative", background: g.first ? "rgba(232,226,212,.05)" : "transparent" }}>
              <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 600 }}>{g.g}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{g.t}</div>
              <div style={{ position: "absolute", right: 22, bottom: 22 }}>
                <Icon name={g.icon} size={74} color={C.cyan} strokeWidth={3} opacity={0.8} />
              </div>
              {g.first && <div style={{ position: "absolute", left: 24, bottom: 24 }}><Tag strong>先做</Tag></div>}
            </div>
          );
        })}
      </div>
      <Box x={0} y={570} w={BW} h={130} o={inn(f, 60, 80)} style={{ border: line, borderRadius: 16, padding: "20px 26px" }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>M0 现成硬件验证 · 第 1、3、6 组同时开始</div>
        <div style={{ fontSize: 19, color: C.dim, marginTop: 10 }}>延迟类指标至少 30 个样本，报告 p50 / p95；原始数据不进公开仓库；结果标注【实测】</div>
      </Box>
    </>
  );
};

// ---------- 路线图 ----------
const ROAD: { k: string; t: string; d: string; icon: GlyphName }[] = [
  { k: "M0", t: "现成硬件验证", d: "G1–G6 结论", icon: "magnifier" },
  { k: "M1", t: "桌面功能样机", d: "全链路 · 定案", icon: "board" },
  { k: "M2", t: "完全版 EVT", d: "眼镜形态 + 光波导", icon: "glasses" },
  { k: "M3", t: "优化 DVT", d: "8 h · 佩戴 · 认证", icon: "wrench" },
  { k: "Gen 2", t: "第二代", d: "大视场 · ASIC", icon: "chip" },
];
export const VRoad: React.FC = () => {
  const f = useCurrentFrame();
  const l = inn(f, 6, 120);
  return (
    <>
      <div style={{ position: "absolute", left: 60, top: 190, width: 1000, height: 3, background: "rgba(232,226,212,.12)" }} />
      <div style={{ position: "absolute", left: 60, top: 190, width: 1000 * l, height: 3, background: C.cyan, opacity: 0.85 }} />
      {ROAD.map((r, i) => {
        const p = inn(f, 10 + i * 22, 30 + i * 22);
        return (
          <Box key={r.k} x={i * 240} y={60} w={200} h={420} o={p} style={{ textAlign: "center", transform: `translateY(${(1 - p) * 20}px)` }}>
            <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600 }}>{r.k}</div>
            <div style={{ width: 120, height: 120, borderRadius: 60, margin: "14px auto 0", border: "2px solid rgba(232,226,212,.75)", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={r.icon} size={60} color={C.cyan} strokeWidth={3} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 22, whiteSpace: "nowrap" }}>{r.t}</div>
            <div style={{ fontSize: 19, color: C.dim, marginTop: 8, whiteSpace: "nowrap" }}>{r.d}</div>
            {i === 0 && <div style={{ marginTop: 10 }}><Tag strong>进行中</Tag></div>}
          </Box>
        );
      })}
      <Box x={0} y={540} w={BW} h={160} o={inn(f, 100, 120)} style={{ border: line, borderRadius: 16, padding: "20px 26px" }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>为什么加 M1</div>
        <div style={{ fontSize: 20, color: C.dim, marginTop: 10, lineHeight: 1.6 }}>四颗主芯片、三种连接、四类主机，直接画板风险太大。先在桌面跑通软件、协议和芯片间接口，M2 只剩硬件集成；改架构的项目一律归第二代。</div>
      </Box>
    </>
  );
};

// ---------- 风险 ----------
const RISKS: { t: string; s: string; icon: GlyphName }[] = [
  { t: "机身蜂窝休眠电流", s: "eDRX / PSM 是否生效，待机功耗最大风险", icon: "signal" },
  { t: "主 SoC 能否独立运行", s: "AR2 设计前提是与主机分担，最先确认", icon: "chip" },
  { t: "8 小时续航", s: "5–7 Wh 只在功耗落在假设中下段时够", icon: "battery" },
  { t: "射频共存与 SAR", s: "蜂窝 + Wi-Fi 7 + 蓝牙三套天线", icon: "wifi" },
  { t: "6DoF 功耗与精度", s: "轻量眼镜上的追踪、手势、锚定", icon: "viewfinder" },
  { t: "虚拟摄像头识别", s: "各通话软件是否接受 V1 虚拟设备", icon: "videoCall" },
];
export const VRisks: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: BW, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
      {RISKS.map((r, i) => {
        const p = inn(f, 6 + i * 8, 24 + i * 8);
        return (
          <div key={r.t} style={{ height: 210, border: line, borderRadius: 16, padding: "22px 24px", boxSizing: "border-box", opacity: p, display: "flex", gap: 20, alignItems: "flex-start" }}>
            <Icon name={r.icon} size={64} color={C.cyan} strokeWidth={3} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{r.t}</div>
              <div style={{ fontSize: 20, color: C.dim, marginTop: 10, lineHeight: 1.5 }}>{r.s}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

void GREY;
