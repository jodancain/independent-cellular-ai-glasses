// 技术全解片：把方案的设计、架构、链路、功耗、协议、验证与路线逐章讲透。
// 左侧是动态架构图或自绘示意，右侧逐条出现要点。章节时长按要点数自动计算，并对齐 2 秒小节。
// 数字全部来自仓库文档；方案数值均为设计目标，未实测。
import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Backdrop, C, FONT, KineticTitle, MONO, ease } from "./kit";
import { FlowDiagram, DIAGRAMS, diagramSize } from "../diagram/FlowDiagram";
import { Her } from "./persona";
import { BH, BW, VBudget, VCompat, VGates, VHand, VLatency, VLinks, VMcuAB, VNet, VOneLine, VOptics, VRisks, VRoad, VRoles, VWeight } from "./techVisuals";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inn = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

type P = [string, string];
type Chapter = { en: string; t: string; diagram?: string; V?: React.FC; points: P[] };

export const CHAPTERS: Chapter[] = [
  {
    en: "ONE LINE", t: "一句话方案", V: VOneLine, points: [
      ["依赖网络，不依赖手机", "机身自带 RedCap 蜂窝 + Wi-Fi 7，不带手机也是全功能"],
      ["联网 = 全功能", "串流显示、6DoF 叠加、软件兼容、云端 AI、视频通话"],
      ["断网 = 手表模式", "只留时间、拍照、录像、录音和极小本地程序"],
      ["判据是“连不连得上服务”", "网络在、但主机和云都不可达，也按断网处理"],
      ["默认无线", "线控模块（大电池 + 全功能 5G）只是可选配件"],
    ],
  },
  {
    en: "BRAIN · CEREBELLUM · HANDS", t: "脑、小脑、手", V: VRoles, points: [
      ["① 手渲染自己的内容", "QQ 看板由手机渲染，PC 应用由 PC 渲染"],
      ["② 轻内容由小脑本地画", "气泡、状态、简单卡片，不等网络"],
      ["③ 合成、锚定、重投影在小脑", "多图层合成目标 ≤5 ms"],
      ["④ 无主的重内容找最近的 GPU 手", "虚拟形象、3D 标注：PC 优先，其次云"],
      ["⑤ 看板默认发“描述”", "KB 级文字、头像、按钮、布局，小脑光栅化；图片兜底"],
    ],
  },
  {
    en: "SYSTEM", t: "系统全景", diagram: "Overview", points: [
      ["四类手", "PC、手机、车机、云主机，用同一套串流协议"],
      ["五种连接", "A1 有线 DP、A2 有线 USB 3、Wi-Fi 7、蜂窝、BLE 控制面"],
      ["主机优先级", "有线 > 同局域网 > 云；断线自动回到上次主机"],
      ["会话握手带能力位", "分辨率、刷新率、编码、追踪模式；控制面与视频面分离"],
      ["可选线控模块", "大电池 + 全功能 5G；可选算力版"],
    ],
  },
  {
    en: "FOUR CHIPS", t: "四颗主芯片", diagram: "HardwareCompute", points: [
      ["① 显示与重投影处理器", "原型用 FPGA：扭曲、畸变与色差校正、缩放、补帧"],
      ["② 主 SoC", "主选 AR2 Gen 1；AR1+ Gen 1 为有条件备选"],
      ["③ RedCap 蜂窝", "原型主选 RG255C-GL（X35）+ eSIM"],
      ["④ 低功耗 MCU", "手表模式、睡眠、电源管理；常驻 BLE 与听音"],
      ["为什么不是一颗大 SoC", "A1 不被主 SoC 卡住；睡眠和手表模式不唤醒主 SoC"],
      ["主 SoC 三条门禁", "独立运行 · H.265 硬解 · 1080p 级 60 Hz 以上送显"],
    ],
  },
  {
    en: "MCU A / B", t: "MCU 两案并行", V: VMcuAB, points: [
      ["A 案", "STM32N657 + 外挂 PSRAM + 小 BLE 芯片，保留拍录像通路"],
      ["B 案", "BES2800BP：蓝牙在片内、音频强；ISP / H.264 证据不完整"],
      ["闸门", "主 SoC 睡眠时，BLE 气泡 ≤0.1 s 上屏"],
      ["内存账", "1080p YUV420 一帧约 3.1 MB，录像缓冲必须放 PSRAM"],
      ["M1 定案", "Zephyr 支持是选型门禁，不满足退回 FreeRTOS"],
    ],
  },
  {
    en: "POWER RAILS", t: "电源与低功耗硬件", diagram: "HardwarePower", points: [
      ["两块电芯", "分置左右镜腿耳后，左右重量差 ≤3 g"],
      ["电源域分别可断", "显示、主 SoC、Wi-Fi、蜂窝、各相机，由 MCU 控制"],
      ["显示开关", "手表模式切到 MCU 低速显示，主 SoC 与显示处理器断电"],
      ["主摄 MIPI 二选一", "同一时刻只给 MCU 或主 SoC 一方，由 MCU 仲裁"],
      ["存储分开", "MCU 挂小容量 NAND，联网后经 SPI 交给主 SoC 同步"],
      ["麦克风直连 MCU", "PDM / I2S；唤醒词与人声检测常驻"],
    ],
  },
  {
    en: "OPTICS", t: "光学：只用光波导", V: VOptics, points: [
      ["只用光波导", "birdbath、自由曲面棱镜已放弃，不再考虑"],
      ["主选几何反射式（阵列）", "候选 Lumus Z-30 系列；衍射式为备选，待调研"],
      ["光机 M1 定案", "LCoS 或全彩 microLED，按亮度、分辨率、功耗、重量切换"],
      ["显示目标", "双目，视场 30–50°，入眼亮度约 4000 尼特"],
      ["刷新率", "60 Hz 起，显示处理器补帧到 90 Hz 以上"],
      ["代价", "视场小于 birdbath，换来前框更轻、更透"],
    ],
  },
  {
    en: "LINKS", t: "连接与 USB-C", V: VLinks, points: [
      ["A1 有线原始画面", "USB-C 4 路 DP + USB 2.0（UVC / UAC）+ 受电"],
      ["A2 有线编码串流", "USB 3，兼容没有 DP 输出的主机"],
      ["B Wi-Fi 7", "6 GHz 国内可用性待核实，否则 5 GHz 160 MHz"],
      ["C 机身蜂窝", "最低按 5G RedCap 选型，持续速率要实测"],
      ["BLE 控制面", "意图、气泡、看板描述；主 SoC 睡着也能收"],
      ["射频共存", "三套天线在 M2 画板前出方案，整机实测"],
    ],
  },
  {
    en: "NETWORK", t: "串流最低网络要求", V: VNet, points: [
      ["云串流 1080p60", "下行 ≥30 Mbps、上行 ≥2 Mbps、RTT p95 ≤50 ms"],
      ["视频通话 1080p30", "双向 ≥5 Mbps、RTT p95 ≤100 ms"],
      ["串流 + 通话并发", "≥35 / 8 Mbps、RTT p95 ≤50 ms，最重负载"],
      ["RedCap 有余量", "公开峰值下行约 220 Mbps、上行约 120 Mbps"],
      ["先测休眠电流", "有 eDRX 不生效的用户反馈，模组选型前必须实测"],
    ],
  },
  {
    en: "DATA PATHS", t: "显示数据通路", diagram: "DataPaths", points: [
      ["A1-3DoF 省电", "主 SoC 休眠，显示处理器直读 IMU 只做旋转稳定"],
      ["A1-6DoF", "主 SoC 跑 VIO，把 6DoF 姿态交给显示处理器"],
      ["编码串流 A2 / B / C", "主 SoC 解码 → MIPI → 显示处理器扭曲上屏"],
      ["扭曲放在离屏最近一级", "头动感知延迟不受网络影响"],
      ["看板态 / 气泡", "只看板时主 SoC 低功耗画卡；只有气泡由 MCU 上屏"],
    ],
  },
  {
    en: "LATENCY", t: "延迟预算", V: VLatency, points: [
      ["编码 ≤5 ms", "无 B 帧、切片编码、帧内刷新"],
      ["传输", "A2 ≤2 ms，Wi-Fi 7 ≤5 ms（p95），蜂窝待测"],
      ["解码 ≤5 ms", "视芯片硬解能力；H.265 必选、AV1 优先"],
      ["重投影 + 显示 ≤5 ms", "头动延迟由本地追踪 + 重投影决定"],
      ["测法", "运动到光子；每组 ≥30 样本报 p50 / p95；30 分钟看漂移"],
    ],
  },
  {
    en: "SOFTWARE", t: "软件栈", diagram: "SoftwareStack", points: [
      ["主机侧", "虚拟显示驱动、统一串流服务、OpenXR、虚拟摄像头"],
      ["手的接入", "手机跑 Mika 改造版；PC / 车机 / 云各有 agent"],
      ["眼镜主 SoC", "AOSP + 自研空间合成器 + 小脑调度器 + 看板描述渲染"],
      ["显示处理器固件", "扭曲、畸变、缩放、补帧；直读 IMU，上报帧计数"],
      ["MCU", "Zephyr；WAMR + Lua 小程序；BLE 控制面；电源状态机"],
      ["云 / 自建", "容器参考服务端：云串流、LiveKit 通话、形象、同步"],
    ],
  },
  {
    en: "PROTOCOL", t: "开放协议 v0", diagram: "Protocol", points: [
      ["控制面", "QUIC 可靠流或 TCP + TLS；能力位握手、主机切换"],
      ["视频面必须不可靠", "QUIC DATAGRAM 或 RTP / UDP，不做整帧重传"],
      ["姿态上行", "6DoF + 时间戳的高频小包，供主机预测渲染"],
      ["看板描述 v0", "文本、图片、按钮、列表、状态 + 布局；增量更新"],
      ["手协议 v0", "排队 → 执行 → 等待确认 → 完成；审计不记画面"],
      ["两路分开拥塞控制", "视频突发不拖慢按键和模式切换"],
    ],
  },
  {
    en: "COMPATIBILITY", t: "串流纪律与兼容分层", V: VCompat, points: [
      ["只留最新一帧", "对端忙就丢帧，不排队；断流等关键帧，不花屏"],
      ["逐环节计数", "采集、编码、发送、解码、上屏分别计数"],
      ["ROI 局部放大", "在原始分辨率上先裁剪再缩放"],
      ["L0 虚拟显示器 = 投屏", "系统显示层接入，只在用户要求接管时出现"],
      ["L3 = 看板，L4 = 兜底", "读得到界面结构就重排；读不到才发画面"],
      ["已知边界", "DRM、反作弊、安全窗口不承诺，也不绕过"],
    ],
  },
  {
    en: "DISPLAY MODES", t: "显示模式与小脑调度", diagram: "DisplayModes", points: [
      ["六种模式", "看板（含气泡）、图片、视频、投屏、实时拍照、视频通话"],
      ["同屏 1 主 + 2 气泡", "30–50° 视场下的上限"],
      ["优先级", "通话 > 投屏 > 视频 > 拍照 > 看板 > 气泡"],
      ["就地变形", "气泡 → 看板 → 投屏，不关一个再开一个"],
      ["行走缩边 · 焦点跟语音", "走路时主显示移到边缘；说到哪张，哪张到前面"],
      ["安全页黑屏", "付款、密码页只发标记，提示到手机上处理"],
    ],
  },
  {
    en: "HANDS · AGENT", t: "手的接入：手机 Agent", V: VHand, points: [
      ["参考 Mika（Apache-2.0）", "虚拟显示后台操作、无障碍读屏、目标化输入注入"],
      ["统一执行入口", "守卫 → 锁屏检查 → 不可逆检查 → 确认"],
      ["任务接口", "MCP / REST：发目标、查状态、等待、回答、引导、取消"],
      ["眼镜通道", "Mika 没有蓝牙，用 Channel 接口挂一个 BLE 眼镜通道"],
      ["安全加强", "发消息也要眼镜确认；远程任务不能批准付款"],
      ["边界", "自建中转 TLS 在网关终止，不是端到端加密"],
    ],
  },
  {
    en: "CALLS", t: "视频通话与虚拟形象", diagram: "Calls", points: [
      ["V1 主机通话", "眼镜注册为主机摄像头和麦克风，兼容 PC 上任何通话软件"],
      ["V2 眼镜独立通话", "本地 WebRTC，经蜂窝或 Wi-Fi"],
      ["V3 云端通话", "通话软件跑在云主机，串流到眼镜"],
      ["虚拟形象", "语音驱动口型 + 头部姿态；GPU 手渲染，角标注明"],
      ["上行 1080p30 起", "弱网降到 720p / 480p，音频优先"],
      ["整机最重负载", "串流 + 通话 + 6DoF + 蜂窝上行并发，是验收主场景"],
    ],
  },
  {
    en: "POWER STATES", t: "功耗状态机", diagram: "PowerStates", points: [
      ["S0 全功能", "功耗由串流负载决定"],
      ["S0' 手表模式", "主 SoC 关闭，拍录像时按需唤醒"],
      ["S0'' 看板态（新增）", "只画卡片 + 重投影；只有气泡时主 SoC 可睡"],
      ["S1 浅睡", "摘下熄屏、会话保持；戴上恢复 ≤1 s"],
      ["S2 待机 / S3 深睡", "蜂窝 eDRX / PSM；深睡只留实时时钟"],
      ["MCU 统一调度", "佩戴检测、抬头、唤醒词、时钟都在 MCU 上"],
    ],
  },
  {
    en: "BATTERY", t: "8 小时续航预算", V: VBudget, points: [
      ["P1 机身混合剖面", "需求方认可，冻结为续航验收条件"],
      ["逐行预算合计约 5.9 Wh", "串流 ≤2.0 W、通话 ≤3.0 W、6DoF ≤2.0 W……"],
      ["电池 5–7 Wh", "按 7 Wh 计约有 15% 余量"],
      ["超预算怎么办", "先压功耗，再加到 8–10 Wh（重约多 10–15 g）"],
      ["新剖面待 M1", "看板预计时长最多，看板态是功耗关键"],
    ],
  },
  {
    en: "ERGONOMICS", t: "重量与佩戴无感", V: VWeight, points: [
      ["整机约 115–130 g（估算）", "高于主流，续航优先"],
      ["前框只留光学", "主板、射频、电池全部后移到耳后"],
      ["左右差 ≤3 g", "处理器、射频、电池两侧对称"],
      ["鼻托受力 ≤ 对标实测", "同一测量台对比主流产品"],
      ["连续佩戴 2 小时", "多人主观评分不低于对标"],
    ],
  },
  {
    en: "CLOUD", t: "云：全开放，可自建", diagram: "Deploy", points: [
      ["协议全部公开", "串流、同步、通话信令、设备管理、小程序分发"],
      ["参考服务端", "容器镜像，功能与官方云同构"],
      ["组件可替换", "通话 LiveKit、同步 WebDAV / S3、任意 GPU 主机"],
      ["官方云不是前提", "设置里填服务器地址即可切换"],
    ],
  },
  {
    en: "VALIDATION", t: "验证与六道闸门", V: VGates, points: [
      ["G1 串流体验", "有线与 Wi-Fi 延迟、画质；L0 兼容清单通过率"],
      ["G2 空间交互", "锚定漂移与手势成功率"],
      ["G3 独立联网", "RedCap 持续速率、RTT、模组休眠电流"],
      ["G4 续航（暂定）", "实测功耗代入 8 h 剖面不超出 5.9 Wh 预算"],
      ["G5 通话", "主流通话软件 V1 通过，虚拟形象跑通"],
      ["G6 佩戴", "后重样架鼻托受力与主观评分不低于对标"],
    ],
  },
  {
    en: "ROADMAP", t: "阶段路线", V: VRoad, points: [
      ["M0 现成硬件验证（进行中）", "第 1、3、6 组先做"],
      ["M1 桌面功能样机", "开发板拼全链路；MCU A/B、光机、协议 v0 定案"],
      ["M2 完全版样机 EVT", "自研主板 + 眼镜结构 + 光波导"],
      ["M3 优化样机 DVT", "功耗、重量、散热；认证预测试"],
      ["第二代", "更大视场波导、蜂窝芯片级、ASIC 替代 FPGA"],
    ],
  },
  {
    en: "RISKS · OPEN", t: "风险与仍待确认", V: VRisks, points: [
      ["待确认 ①", "“Muse 那样的交互逻辑”具体指什么"],
      ["待确认 ②", "手机代理模式：眼镜离线但手机 BLE 可达时，是否代为联网"],
      ["待确认 ③", "MCU A / B 案，M1 并行评估后定案"],
      ["会改变决定的情形", "主 SoC 门禁不过、RedCap 不达标、Wi-Fi 延迟不达标"],
    ],
  },
];

const FPS = 30;
const COVER = 8, OUTRO = 10; // 秒
export const chapterSecs = (c: Chapter) => {
  const s = 4 + c.points.length * 3;
  return s % 2 === 0 ? s : s + 1;
};
export const TIMELINE = (() => {
  let t = COVER;
  const list = CHAPTERS.map((c) => {
    const from = t;
    const len = chapterSecs(c);
    t += len;
    return { from, len };
  });
  return { list, total: t + OUTRO };
})();
export const TECH_FRAMES = TIMELINE.total * FPS;

// ---------- 左侧：动态框图（过大时平移） ----------
const DiagramBox: React.FC<{ id: string; len: number }> = ({ id, len }) => {
  const f = useCurrentFrame();
  const D = DIAGRAMS[id];
  const { width, height } = diagramSize(D, true);
  const fit = Math.min(BW / width, BH / height);
  const s = Math.max(fit, 0.8);
  const sw = width * s, sh = height * s;
  const pan = interpolate(f, [len * 0.25, len * 0.85], [0, 1], { ...clamp, easing: ease });
  const dx = sw > BW ? -(sw - BW) * pan : (BW - sw) / 2;
  const dy = sh > BH ? -(sh - BH) * pan : (BH - sh) / 2;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 14 }}>
      <div style={{ position: "absolute", left: dx, top: dy, width, height, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <FlowDiagram id={id} transparent hideHeader />
      </div>
    </div>
  );
};

// ---------- 一章 ----------
const ChapterScene: React.FC<{ c: Chapter; idx: number; len: number }> = ({ c, idx, len }) => {
  const f = useCurrentFrame();
  const n = c.points.length;
  const step = (len - 70) / n;
  const cur = Math.min(n - 1, Math.floor(Math.max(0, f - 30) / step));
  const boxIn = inn(f, 0, 20);
  const V = c.V;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      {/* 左：画框 */}
      <div style={{ position: "absolute", left: 90, top: 210, width: BW, height: BH, opacity: boxIn, transform: `translateY(${(1 - boxIn) * 20}px)` }}>
        {c.diagram ? <DiagramBox id={c.diagram} len={len} /> : V ? <V /> : null}
      </div>
      {/* 顶部章节号 + 标题 */}
      <div style={{ position: "absolute", left: 90, top: 104, display: "flex", alignItems: "baseline", gap: 24 }}>
        <span style={{ fontFamily: MONO, fontSize: 60, fontWeight: 600, color: C.cyan, letterSpacing: -1 }}>{String(idx + 1).padStart(2, "0")}</span>
        <KineticTitle text={c.t} start={2} size={56} stagger={1} />
        <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 5, color: C.dim, opacity: inn(f, 10, 24) }}>{c.en}</span>
      </div>
      {/* 右：要点 */}
      <div style={{ position: "absolute", left: 1270, top: 220, width: 570, display: "flex", flexDirection: "column", gap: 16 }}>
        {c.points.map(([h, d], i) => {
          const at = 30 + i * step;
          const p = inn(f, at, at + 14);
          const active = i === cur;
          return (
            <div key={h} style={{ opacity: p * (active ? 1 : 0.5), transform: `translateX(${(1 - p) * 30}px)`, borderLeft: `3px solid rgba(232,226,212,${active ? 0.9 : 0.15})`, paddingLeft: 18 }}>
              <div style={{ fontSize: 27, fontWeight: 750, lineHeight: 1.25 }}>{h}</div>
              <div style={{ fontSize: 20, color: active ? "#c9ccd4" : C.dim, marginTop: 5, lineHeight: 1.45 }}>{d}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 封面与结尾 ----------
const Cover: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ marginTop: -80 }}>
        <Her width={620} start={0} openAt={30} glow={0.6} />
      </div>
      <div style={{ marginTop: 40 }}>
        <KineticTitle text="独立蜂窝 AI 眼镜 · 技术全解" start={20} size={84} stagger={1.5} />
      </div>
      <div style={{ marginTop: 22, fontSize: 30, color: C.dim, letterSpacing: 6, opacity: inn(f, 60, 90) }}>设计 · 架构 · 链路 · 功耗 · 协议 · 验证 · 路线</div>
      <div style={{ marginTop: 30, fontFamily: MONO, fontSize: 20, color: C.dim, letterSpacing: 4, opacity: inn(f, 90, 120) }}>PLAN v0.7.5 · {CHAPTERS.length} CHAPTERS · DESIGN TARGETS, NOT MEASURED</div>
    </AbsoluteFill>
  );
};
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const out = interpolate(f, [OUTRO * FPS - 50, OUTRO * FPS - 8], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text, alignItems: "center", justifyContent: "center", textAlign: "center", opacity: out }}>
      <Her width={560} openAt={10} glow={0.8} />
      <div style={{ marginTop: 40 }}>
        <KineticTitle text="眼镜 + 云端 LLM 是脑，小脑在眼镜里，所有主机都是手" start={10} size={56} stagger={1} />
      </div>
      <div style={{ marginTop: 40, fontFamily: MONO, fontSize: 30, opacity: inn(f, 60, 90) }}>glasses.youngtuo.win</div>
      <div style={{ marginTop: 12, fontSize: 20, color: C.dim, opacity: inn(f, 70, 100) }}>完整文档与 10 张动态架构图见网站 · 型号为候选，数值为设计目标</div>
    </AbsoluteFill>
  );
};

// ---------- 底部章节进度 ----------
const Progress: React.FC = () => {
  const f = useCurrentFrame();
  const sec = f / FPS;
  const idx = TIMELINE.list.findIndex((c) => sec >= c.from && sec < c.from + c.len);
  const time = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 1000, display: "flex", gap: 6 }}>
        {TIMELINE.list.map((c, i) => {
          const p = Math.max(0, Math.min(1, (sec - c.from) / c.len));
          return (
            <div key={i} style={{ flex: c.len, height: 4, borderRadius: 2, background: "rgba(232,226,212,.12)", overflow: "hidden" }}>
              <div style={{ width: `${p * 100}%`, height: 4, background: C.cyan, opacity: i === idx ? 0.95 : 0.4 }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 90, top: 1018, fontFamily: MONO, fontSize: 16, letterSpacing: 4, color: C.dim }}>
        {idx >= 0 ? `${String(idx + 1).padStart(2, "0")} / ${CHAPTERS.length} · ${CHAPTERS[idx].en}` : "INDEPENDENT CELLULAR AI GLASSES · TECHNICAL"}
      </div>
      <div style={{ position: "absolute", right: 90, top: 1018, fontFamily: MONO, fontSize: 16, letterSpacing: 4, color: C.dim }}>DESIGN TARGETS · NOT MEASURED · {time}</div>
      <div style={{ position: "absolute", right: 90, top: 50, fontFamily: MONO, fontSize: 16, letterSpacing: 4, color: C.dim }}>INDEPENDENT CELLULAR AI GLASSES · TECH</div>
    </AbsoluteFill>
  );
};

export const TechFilm: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop globalFrame={f} pulse={0} />
      <Sequence from={0} durationInFrames={COVER * FPS}>
        <Fade len={COVER * FPS}>
          <Cover />
        </Fade>
      </Sequence>
      {CHAPTERS.map((c, i) => {
        const { from, len } = TIMELINE.list[i];
        return (
          <Sequence key={c.t} from={from * FPS} durationInFrames={len * FPS} premountFor={30}>
            <Fade len={len * FPS}>
              <ChapterScene c={c} idx={i} len={len * FPS} />
            </Fade>
          </Sequence>
        );
      })}
      <Sequence from={(TIMELINE.total - OUTRO) * FPS} durationInFrames={OUTRO * FPS}>
        <Outro />
      </Sequence>
      <Progress />
      <Audio src={staticFile("tech-music.wav")} volume={0.7} />
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, len - 12, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
