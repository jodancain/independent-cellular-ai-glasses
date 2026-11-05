# 系统架构图（初版）

**v0.1.2 · 2026-11-04 · 依据 [串流终端方向](streaming-direction.md) v0.7.5、[技术路线](technical-roadmap.md) v0.1.1 · 配套 [设计开发要求](design-requirements.md)**

本页把方案和技术路线画成图，供评审和分工使用。

> **证据边界**：
> - 图中的芯片和器件型号都是**候选**，按技术路线第 1 节的门禁和切换条件定案，M1 结束前不冻结。
> - 接口和数值是【设计目标】，还没有实测。
> - 图用 Mermaid 编写，GitHub 上能直接显示。
> - **动态版**：同样 9 张图的信号流动动画（Remotion），单文件 HTML 在 [`visuals/architecture-motion/dist/system-architecture-motion.html`](../visuals/architecture-motion/dist/system-architecture-motion.html)，下载后用浏览器打开。

**目录**

1. 系统全景
2. 眼镜硬件框图
3. 显示数据通路
4. 软件栈分层
5. 开放协议的通道
6. 功耗状态机
7. 视频通话与虚拟形象链路
8. 部署视图：官方云与自建

---

## 1 系统全景

眼镜靠网络工作，不依赖手机。联网时，渲染交给 PC、手机、车机、云这四类主机中的任意一台；断网时，眼镜退化为手表级设备。按决定 #22，这四类主机都是**手**，眼镜 + 云端 LLM 是**脑**，眼镜自身算力只当**小脑**；谁的手谁渲染，重渲染不在眼镜上。

```mermaid
flowchart LR
  subgraph HOSTS["外部主机（负责渲染，可任选）"]
    PC["PC / 笔记本<br/>虚拟显示驱动 + 串流服务<br/>虚拟摄像头 / 麦克风"]
    PHONE["手机<br/>伴随服务"]
    CAR["车机<br/>车机侧串流服务"]
    CLOUD["云 / 自建服务端<br/>云串流 · 通话 · 虚拟形象渲染<br/>同步 · 设备管理 · 小程序源"]
  end

  subgraph NET["连接方式"]
    A1["A1 有线原始画面<br/>USB-C DP Alt"]
    A2["A2 有线编码串流<br/>USB 3"]
    B["B Wi-Fi 7"]
    C["C 蜂窝<br/>机身 RedCap / 模块 5G"]
  end

  GLASSES["眼镜本体（默认无线）<br/>联网：全功能<br/>断网：手表模式"]
  MODULE["可选线控模块<br/>大电池 + 全功能 5G<br/>（可选算力版）"]
  USER["佩戴者<br/>看到真实世界 + 叠加内容"]

  PC --- A1
  PC --- A2
  PHONE --- A1
  PHONE --- A2
  PC --- B
  PHONE --- B
  CAR --- B
  CLOUD --- C
  CLOUD --- B
  A1 --> GLASSES
  A2 --> GLASSES
  B <--> GLASSES
  C <--> GLASSES
  MODULE -. USB-C 供电 + 数据 .- GLASSES
  GLASSES --> USER
```

**要点**：
- 多台主机同时可用时，按 **有线 > 同一局域网 > 云** 的顺序优先（方案第 3.4 节）。
- 判断“联网”的依据是能不能连上主机或云，而不是有没有连手机（方案第 2.1 节）。

---

## 2 眼镜硬件框图

眼镜里有四颗主芯片：①显示与重投影处理器（可选：集成硬件解码，扩展为视频与显示处理器）、②主 SoC、③RedCap 蜂窝、④低功耗 MCU。决定 #24 的 A 案在 MCU 外再加一颗小 BLE 芯片，框图按“四颗主芯片 + 1 颗小 BLE”表示；B 案 MCU 改用 BES2800BP，蓝牙在片内。见技术路线第 0、1.2、1.5、1.6 节。

### 2.1 显示、计算与连接

```mermaid
flowchart LR
  USBC["USB-C<br/>DP Alt / USB 3 / PD"]
  DPRX["DP 接收桥接芯片<br/>候选 LT7911UXC 类"]
  DPU["① 显示与重投影处理器<br/>原型 FPGA<br/>扭曲 · 畸变 · 缩放 · 补帧<br/>可选：集成硬解（视频与显示处理器）"]
  DSW["显示开关"]
  OPT["左右光波导 + 光机<br/>视场 30–50° · 光机待定"]
  SOC["② 主 SoC<br/>主选 AR2 Gen 1 / 有条件备选 AR1+ Gen 1<br/>解码 · 6DoF · 手势 · 合成 · 通话"]
  WIFI["Wi-Fi 7 / 蓝牙"]
  CELL["③ RedCap 模组<br/>RG255C-GL（X35）+ eSIM"]
  UFS["UFS / eMMC"]
  IMU["IMU ≥ 1 kHz"]
  TRK["追踪相机 ×2"]
  EYE["眼动相机 ×2（预留）"]
  CSW["主摄 MIPI 开关"]
  MIC["麦克风阵列 / 扬声器"]

  USBC -- "DP 4 路 / 2 路 + DSC" --> DPRX --> DPU --> DSW --> OPT
  USBC -- "USB 3 / USB 2" --> SOC
  SOC -- "MIPI 解码帧 + 姿态" --> DPU
  IMU --> DPU
  IMU --> SOC
  TRK --> SOC
  EYE -.-> SOC
  CSW --> SOC
  MIC -.-> SOC
  SOC --- WIFI
  SOC -- "PCIe / USB" --- CELL
  SOC --- UFS
```

### 2.2 低功耗、存储与电源

```mermaid
flowchart LR
  SOC["② 主 SoC"]
  MCU["④ 低功耗 MCU<br/>A 案 STM32N657 + PSRAM + 小 BLE<br/>B 案 BES2800BP（自带蓝牙）<br/>手表模式 · 状态机 · 电源管理 · 音频前级"]
  BLE["BLE<br/>A 案外加芯片 / B 案片内"]
  RGB["主摄 RGB<br/>1080p30 起 · 防抖"]
  CSW["主摄 MIPI 开关<br/>（MCU 仲裁）"]
  DSW["显示开关"]
  WEAR["佩戴检测"]
  MIC["麦克风"]
  NAND["小容量 NAND<br/>手表模式录制"]
  PMIC["PMIC + 负载开关"]
  DOMS["各电源域<br/>显示 · 显示处理器 · 主 SoC · Wi-Fi<br/>蜂窝 · 追踪 / 眼动（预留）/ 主摄"]
  BAT["左右耳后电池<br/>合计 5–7 Wh"]
  PD["USB-C PD"]

  SOC <-- "SPI + 唤醒 / 中断 / 复位 GPIO" --> MCU
  RGB --> CSW
  CSW --> MCU
  CSW --> SOC
  MCU -- "低速显示" --> DSW
  WEAR --> MCU
  MIC --> MCU
  BLE <-- "气泡 / 看板描述" --> MCU
  MCU --- NAND
  MCU -- I2C --> PMIC --> DOMS
  BAT --> PMIC
  PD --> PMIC
```

**布局**（方案第 7.3 节）：前框只放光学、显示、追踪 / 主摄和麦克风；眼动相机仅预留结构空间，当前版本不装。主板、射频、电池全部后移到镜腿，主 SoC 和蜂窝放外侧远离太阳穴，两侧镜腿重量差 ≤ 3 g。

**设计约束**（见技术路线第 1.6–1.9 节、方案第 7.3 节）：

- **主摄共享**：同一时刻只给 MCU 或主 SoC 一方用，由 MCU 仲裁。I2C、时钟、复位、电源随 MIPI 开关一起切换。
- **显示开关**：正常时显示接显示处理器；手表模式下切到 MCU，主 SoC 和显示处理器都断电。
- **存储分开**：主 SoC 挂 UFS / eMMC，MCU 挂 NAND。手表模式录的内容，联网后经 SPI 交给主 SoC 同步。
- **BLE 常驻**：手机这只手的气泡 / 看板描述主要走 BLE，主 SoC 睡眠时由 MCU 收；A 案外加小 BLE 芯片，B 案用 BES2800BP 片内蓝牙（方案第 5.4、6.2 节）。
- **音频前级常驻**：麦克风阵列直连 MCU，唤醒词与人声检测在主 SoC 睡眠时也能工作；扬声器 / 蓝牙耳机做下行与切换（方案第 5.4 节）。

### 2.3 USB-C 各模式的通道分配

| 模式 | 高速通道 | 眼镜的角色 |
| --- | --- | --- |
| A1 有线原始 | 4 路 DP（主机只给 2 路时，用 2 路 DP + DSC） | DP 接收端 + USB 2.0 设备（UVC / UAC）+ 受电 |
| A2 有线编码 | USB 3 | USB 设备（串流 + UVC / UAC）+ 受电 |
| 接线控模块 | USB 3（视模块版本加 DP） | 受电；数据角色由模块决定 |
| 充电 | — | 受电（PD） |

---

## 3 显示数据通路

扭曲始终在离屏幕最近的一级做，所以头动感知延迟不受网络影响（方案第 3.5 节）。

```mermaid
flowchart TB
  subgraph A1_3["A1-3DoF（省电）"]
    direction LR
    a1["主机 DP"] --> a2["DP 桥接"] --> a3["显示处理器<br/>直读 IMU，只做旋转稳定"] --> a4["屏幕"]
    a5["主 SoC 休眠"]
  end
  subgraph A1_6["A1-6DoF"]
    direction LR
    b1["主机 DP"] --> b2["DP 桥接"] --> b3["显示处理器<br/>平面虚拟屏 6DoF 扭曲"] --> b4["屏幕"]
    b5["主 SoC 跑 VIO"] -- 6DoF 姿态 --> b3
  end
  subgraph ENC["A2 / B / C 编码串流"]
    direction LR
    c1["主机 / 云编码"] -- "USB 3 / Wi-Fi / 蜂窝" --> c2["主 SoC 硬解<br/>+ 空间合成"] -- MIPI --> c3["显示处理器<br/>扭曲 · 缩放 · 补帧"] --> c4["屏幕"]
  end
  subgraph WATCH["手表模式"]
    direction LR
    d1["MCU"] -- "低刷新 / 局部点亮" --> d2["显示开关"] --> d3["屏幕"]
    d4["主 SoC + 显示处理器断电"]
  end
  A1_3 ~~~ A1_6
  A1_6 ~~~ ENC
  ENC ~~~ WATCH
```

**边界**：
- DP 送来的是二维画面。合成为空间里的平面虚拟屏时，平移重投影是精确的。
- 如果 DP 送来的是 3D 内容，没有深度信息，平移只能近似。这类内容改走 L1 OpenXR 串流。

---

## 4 软件栈分层

```mermaid
flowchart LR
  subgraph HOST["主机侧"]
    direction TB
    H1["虚拟显示<br/>IddCx · Linux 合成器 · Android VirtualDisplay · macOS"]
    H2["统一串流服务<br/>硬件编码 · 串流纪律"]
    H3["OpenXR 远端渲染<br/>参照 ALVR / WiVRn"]
    H4["虚拟摄像头 / 麦克风（V1）"]
    H5["虚拟形象渲染<br/>语音驱动口型 + 头部姿态 · GPU<br/>眼动参数接口预留"]
  end

  subgraph SOCSW["眼镜主 SoC（AOSP，基于厂商 BSP）"]
    direction TB
    G1["串流客户端<br/>硬解 · 最新帧优先 · 关键帧恢复"]
    G2["空间合成器（自研）<br/>虚拟屏锚定 · 多屏"]
    G3["OpenXR 运行时<br/>厂商运行时，备选 Monado"]
    G4["感知<br/>6DoF VIO · 手势<br/>眼动参数接口预留"]
    G5["通话<br/>WebRTC（V2）· 云串流（V3）· UVC / UAC 设备（有线 V1）"]
    G6["兼容层 / 看板接收端<br/>L3 看板 · L4 看板兜底"]
    G7["系统服务<br/>连接管理 · 主机发现与切换 · OTA · 同步插件 · 小程序下发"]
    G8["小脑调度器<br/>六种显示模式 · 1 主 + 2 气泡 · 优先级 · 就地变形"]
  end

  subgraph DPUSW["显示处理器固件"]
    direction TB
    D1["扭曲 · 畸变 / 色差校正 · 缩放 · 补帧 · 帧计数"]
  end

  subgraph MCUSW["MCU（Zephyr，备选 FreeRTOS）"]
    direction TB
    M1["电源与状态机 S0–S3 · 看板态"]
    M2["手表模式内置程序<br/>时钟 · 相机 · 录音 · 提词卡 · 扫码"]
    M3["小程序运行时<br/>WAMR + Lua，按需加载 · 签名 · 权限"]
    M4["佩戴检测 · 唤醒词 / 人声检测 · BLE 常驻"]
  end

  subgraph CLOUDSW["云 / 自建服务端（同构容器镜像）"]
    direction TB
    S1["云串流主机"]
    S2["通话（LiveKit）"]
    S3["虚拟形象渲染"]
    S4["同步（WebDAV / S3）"]
    S5["设备管理 · 身份"]
    S6["小程序私有源"]
  end

  H2 == "开放串流协议" ==> G1
  H3 == "OpenXR 串流" ==> G3
  G1 --> G2
  G3 --> G2
  G4 --> G2
  G8 --> G2
  G2 --> D1
  G7 <-- "SPI 命令通道" --> M1
  G7 <--> S5
  G5 <--> S2
  S1 == "开放串流协议" ==> G1
```

**分层对应**（决定 #23）：L0 系统级虚拟显示器 = 投屏（接管），只在用户要求接管时出现；L3 语义转化 = 看板；L4 像素转化 = 看板的兜底。投屏中的付款、密码等安全页在眼镜上黑屏，提示到手机处理。

---

## 5 开放协议的通道

见技术路线第 2.3 节。协议规范和参考实现一起公开，官方云和自建服务端用同一份规范。

```mermaid
flowchart LR
  subgraph H["主机 / 云"]
    HC["会话管理"]
    HE["编码器"]
    HR["预测渲染"]
  end
  subgraph G["眼镜"]
    GC["会话管理"]
    GD["解码 + 合成"]
    GT["6DoF 追踪"]
    GV["本地矢量绘制"]
  end
  HC <-- "控制面：QUIC 可靠流或 TCP + TLS<br/>能力位握手 · 主机切换 · 按键 · 诊断" --> GC
  HE -- "视频面：QUIC DATAGRAM 或 RTP / UDP（不可靠）<br/>最新帧优先 · 关键帧恢复 · 自适应码率" --> GD
  GT -- "姿态上行：不可靠小包，高频<br/>6DoF 姿态 + 时间戳" --> HR
  HC -- "矢量通道（走控制面）<br/>导航 · 字幕 · 状态 · L3 看板" --> GV
  HC <-. "时钟同步：类似 NTP 的往返测量" .-> GC
```

**两条规则**：
- 控制面和视频面至少要分开拥塞控制。
- 视频面**不能用 QUIC 的普通流**：普通流可靠有序，会被队头阻塞。

---

## 6 功耗状态机

所有状态都由 MCU 调度（方案第 5.1 节、技术路线第 1.9 节）。

```mermaid
stateDiagram-v2
  [*] --> S3
  S3: S3 深睡 / 运输<br/>只留实时时钟，射频全关
  S2: S2 待机<br/>主 SoC 挂起到内存<br/>蜂窝 eDRX / PSM
  S1: S1 浅睡（摘下 / 熄屏）<br/>主 SoC 低功耗活跃<br/>Wi-Fi 芯片或模组保活
  S0: S0 全功能（联网）
  S0w: S0' 手表模式（断网）<br/>只有 MCU 工作

  S3 --> S2: 长按 / 充电
  S2 --> S0: 戴上 · 唤醒词 · 消息推送（且能连上服务）
  S2 --> S0w: 戴上（连不上服务）
  S0 --> S1: 摘下 / 熄屏
  S1 --> S0: 戴上（目标 ≤ 1 s 恢复画面）
  S1 --> S2: 超过保活时间
  S0 --> S0w: 主机和云都连不上
  S0w --> S0: 恢复联网
  S0w --> S2: 摘下 / 超时
  S2 --> S3: 长按关机 / 电量过低
```

**恢复顺序**：先显示缓存帧，再重连，再等关键帧。超过保活时间就断开重连。

---

## 7 视频通话与虚拟形象链路

```mermaid
flowchart LR
  subgraph GL["眼镜"]
    E1["眼动相机 ×2（预留，当前版本不装）"] -. "预留" .-> E2["本地提取注视 / 眨眼参数<br/>（预留，当前版本不开发）"]
    E3["IMU / 6DoF"] --> E4["头部姿态"]
    E5["麦克风阵列<br/>波束成形 · 降噪 · 回声消除"]
    E6["主摄（第一人称视角）"]
  end
  subgraph RENDER["GPU 主机或云"]
    R1["虚拟形象渲染<br/>语音驱动口型 + 头部姿态<br/>（眼动参数接口预留）"]
    R2["输出一路视频<br/>角标注明“虚拟形象”"]
  end
  subgraph PATHS["三种接入方式"]
    V1["V1 主机通话<br/>PC 上任意通话软件<br/>虚拟摄像头 / 麦克风"]
    V2["V2 眼镜独立通话<br/>WebRTC"]
    V3["V3 云端通话<br/>云主机运行通话软件"]
  end
  E2 -. "预留" .-> R1
  E4 --> R1
  E5 --> R1
  R1 --> R2
  R2 --> V1
  R2 --> V2
  R2 --> V3
  E6 -. 切换为“我所见” .-> V1
  E6 -.-> V2
  E6 -.-> V3
```

**主机与通话方式的对应**（技术路线第 2.2 节）：

| 主机 | 通话主路 |
| --- | --- |
| PC | V1 |
| 手机 | V2 / V3 |
| 车机 | V2 |
| 云 | V3 |

**降级**：没有 GPU 主机或云时，降级为静态头像 + 口型动画。

---

## 8 部署视图：官方云与自建

```mermaid
flowchart LR
  G["眼镜<br/>设置里填服务器地址"]
  subgraph OFF["官方云"]
    O["同构服务端"]
  end
  subgraph SELF["用户自建"]
    SS["参考服务端容器镜像"]
    GPU["任意 GPU 主机"]
    ST["WebDAV / S3 / 局域网主机"]
  end
  G <-- 同一份开放协议 --> O
  G <-- 同一份开放协议 --> SS
  SS --- GPU
  SS --- ST
```

**原则**：官方云不能成为使用眼镜的前提。离线内容默认不上传，同步目标由用户选择（方案第 2.4、4.4 节）。

---

## 修订记录

| 版本 | 日期 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-11-03 | 初版，共 8 张图：系统全景、硬件框图、数据通路、软件栈、协议通道、功耗状态机、通话链路、部署视图 |
| v0.1.1 | 2026-11-04 | 显示方案改为左右光波导 + 光机；① 增加可选硬解（视频与显示处理器）；对应方案 v0.7.4 |
| v0.1.2 | 2026-11-04 | 同步决定 #22–#24：MCU 改 A/B 两案（A 案外加小 BLE），补 BLE 常驻与音频前级；L0/L3/L4 改为投屏 / 看板 / 看板兜底；对应方案 v0.7.5 |
