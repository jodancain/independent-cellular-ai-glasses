# 核验来源与参考项目

**来源核验日期 2026-11-02；S43–S48 及 S17、S18 摘要补充于 2026-11-03；S49–S56 补充于 2026-11-04**

以下链接用于支持技术讨论。原厂规格和参考板信息只证明其公开内容；器件可采购性、实际量产配置、整机实现、授权和可获得的 BSP 仍须供应商书面确认。推荐与适用性判断见 [芯片候选](chips.md) 和 [工程判断](engineering-assessment.md)。

本仓库只提供来源链接，不附原厂 PDF、固件、SDK 或第三方项目副本。第三方内容遵循各自许可和使用条件。

## S1

UNISOC W527 官方产品页

<https://www.unisoc.com/cn/product/SmartWearables/W527>

## S2

Qualcomm W5 与 W5+ Gen 1 Product Brief Rev C

<https://docs.qualcomm.com/bundle/publicresource/87-43671-1_REV_C_Snapdragon_W5__and_Snapdragon_W5_Gen_1_Wearable_Platforms_Product_Brief.pdf>

## S3

Thundercomm TurboX W5+ Development Kit Product Brief V1.1

<https://thundercomm.s3.ap-northeast-1.amazonaws.com/uploads/web/pb/%5Btc-V-1111-en%5D_TurboX_W5%2B_Development_Kit_Product_Brief_V1.1.pdf>

## S4

Rockchip RV1126B Brief Datasheet V1.0

<https://www.rock-chips.com/uploads/pdf/2026.2.11/192/RV1126B%20brief%20datasheet%20V1.0%2020241219.pdf>

## S5

Luckfox Aura 官方文档

<https://wiki.luckfox.com/Luckfox-Aura/Introduction/>

## S6

Qualcomm AR1 Gen 1 Product Brief Rev B

<https://docs.qualcomm.com/bundle/publicresource/87-86507-1_REV_B_Snapdragon_AR1_Gen_1_Platform_Product_Brief.pdf>

## S7

Qualcomm AR1+ Gen 1 官方产品页

<https://www.qualcomm.com/xr-vr-ar/products/ar-series/snapdragon-ar1-plus-gen-1-platform>

## S8

Qualcomm W5+ Gen 2 Product Brief

<https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/snapdragon-w5-plus-gen-2-product-brief.pdf>

## S9

Qualcomm Wear Elite Product Brief Rev C

<https://docs.qualcomm.com/doc/87-97359-1/87-97359-1_REV_C_Snapdragon_Wear_Elite_Platform_Product_Brief.pdf>

## S10

Bestechnic BES2800BP 官方资料

<https://www.bestechnic.com/Uploads/keditor/file/20241010/20241010192510_70770.pdf>

## S11

恒玄科技 2026年第三季度报告 第2页

<https://static.cninfo.com.cn/finalpage/2026-10-23/1225617120.PDF>

## S12

ST STM32N657x0 官方产品页

<https://www.st.com/en/microcontrollers-microprocessors/stm32n657x0.html>

## S13

Frame 官方代码仓库

<https://github.com/brilliantlabsAR/frame-codebase>

可参考眼镜固件、API 和开发资料；不证明独立蜂窝能力。

## S14

Halo 官方固件仓库

<https://github.com/brilliantlabsAR/halo-firmware>

公开内容涉及 Zephyr、Alif Balletto、Lua、BLE 与 OTA；不等于本项目所需的 ARM 应用平台加蜂窝方案。

## S15

OpenSource Ai Glasses 项目仓库

<https://github.com/Iam5tillLearning/OpenSource-Ai-Glasses>

可参考 Linux 摄像、RTSP、BLE 音频及可选显示的功能原型；轻量化、低功耗和量产成熟度仍需验证。

## S16

MentraOS 社区代码仓库

<https://github.com/Mentra-Community/MentraOS>

手机运行架构可供应用生态设计参考，不能直接当作独立眼镜操作系统。

---

## 串流终端方向补充来源（核验日期 2026-11-03）

以下来源支持 [串流终端方向](streaming-direction.md)。厂商宣传数字（延迟、功耗、性能倍数）未经本项目复现；论坛内容是个别用户反馈，只作为待核实线索。

## S17

Qualcomm Snapdragon AR2 Gen 1 官方产品页（多芯片分布式架构，含 AR 处理器与协处理器、Wi-Fi 7、宣称 < 2 ms 持续延迟）

<https://www.qualcomm.com/xr-vr-ar/products/ar-series/snapdragon-ar2-gen-1-platform>

## S18

UploadVR：Snapdragon AR1+ Gen 1 发布报道（每眼最高 1280×1280 @ 60 Hz、Wi-Fi 7、端侧小模型；比 AR1 小约 26%、功耗低约 7%，改进 ISP，支持单目 / 双目 HUD 输出）；官方页见 [S7](#s7)

<https://www.uploadvr.com/qualcomm-snapdragon-ar1-plus-smart-glasses-chip/>

## S19

Road to VR：Snapdragon XR2（第一代）发布报道，5G 为可选集成（X55）

<https://roadtovr.com/qualcomm-snapdragon-xr2-5g-announcement/>

## S20

Notebookcheck：XREAL One Pro 发布报道（X1 芯片、USB-C DP 输入、宣称约 3 ms 运动到光子延迟）

<https://www.notebookcheck.net/xreal-one-pro-ar-glasses-launch-with-virtual-171-inch-display-bose-audio-and-optional-12-mp-camera.928200.0.html>

## S21

Qualcomm Snapdragon XR2+ Gen 2 官方产品页

<https://www.qualcomm.com/xr-vr-ar/products/vr-mr-series/snapdragon-xr2-plus-gen-2-platform>

## S22

Qualcomm 新闻稿：Snapdragon X35 5G NR-Light（RedCap）Modem-RF 系统

<https://www.qualcomm.com/news/releases/2023/02/qualcomm-introduces-the-world-s-first-5g-nr-light-modem-rf-system>

## S23

Quectel RG255C 系列官方产品页；Quectel 论坛 eDRX 用户反馈（非官方规格）

<https://www.quectel.com/product/5g-redcap-rg255c-series>

<https://forums.quectel.com/t/seting-up-edrx-for-redcap/53612>

## S24

ALVR 官方代码仓库（PC VR 无线串流到一体机）

<https://github.com/alvr-org/ALVR>

## S25

WiVRn 代码仓库（OpenXR 应用串流到一体机）

<https://github.com/WiVRn/WiVRn>

## S26

Sunshine（LizardByte）与 Moonlight 客户端代码仓库

<https://github.com/LizardByte/Sunshine>

<https://github.com/moonlight-stream/moonlight-qt>

## S27

Windows 虚拟显示驱动开源项目（基于 IddCx 间接显示驱动）

<https://github.com/VirtualDrivers/Virtual-Display-Driver>

## S28

Breezy Desktop 与 XRLinuxDriver（Linux 下 XR 眼镜虚拟屏与头动驱动）

<https://github.com/wheaney/breezy-desktop>

<https://github.com/wheaney/XRLinuxDriver>

## S29

WebAssembly Micro Runtime（WAMR）代码仓库（小体积 WebAssembly 运行时，供手表模式小程序沙箱参考）

<https://github.com/bytecodealliance/wasm-micro-runtime>

## S30

Linux 内核文档：USB gadget UVC 功能（设备作为标准 USB 摄像头）

<https://docs.kernel.org/usb/gadget_uvc.html>

## S31

WebRTC 官方网站（开源实时音视频通信框架）

<https://webrtc.org/>

## S32

NVIDIA Audio2Face-3D SDK 代码仓库（语音驱动口型与情绪，C++ / CUDA；许可条款以仓库为准）

<https://github.com/NVIDIA/Audio2Face-3D-SDK>

## S33

LiveKit 代码仓库（开源实时音视频服务，Apache-2.0）

<https://github.com/livekit/livekit>

## S34

Meta Ray-Ban Display 官方产品页（镜框电池 960 mWh，混合使用最长约 6 小时）

<https://www.meta.com/ai-glasses/meta-ray-ban-display-glasses-and-neural-band/>

## S35

Android Central：Ray-Ban Meta Gen 2 与 Gen 1 对比（Gen 2 约 48 g；其他来源 48–52 g 不一）

<https://www.androidcentral.com/apps-software/meta/ray-ban-meta-smart-glasses-gen-2-vs-gen-1>

## S36

Tom's Guide：Meta Ray-Ban Display 发布报道（约 69 g）

<https://www.tomsguide.com/computing/smart-glasses/meta-ray-ban-display-glasses-features-neural-link-price-and-availability>

## S37

Tom's Hardware：XREAL One 评测（约 84 g，无内置电池；One Pro 约 87 g）

<https://www.tomshardware.com/peripherals/wearable-tech/xreal-one-review>

## S38

Quectel 5G RedCap EVB Kit 官方产品页（适用 RG255AA / RG255C / RG255G-GL 系列）

<https://www.quectel.com/product/5g-redcap-evb-kit>

## S39

DigiKey 论坛：5G-REDCAP-EVB-KIT 购买时不含 RG255C 模组（分销商答复，非厂商规格）

<https://forum.digikey.com/t/quectel-5g-redcap-evb-kit-rg255c/47262>

## S40

Quectel 新闻稿：Rx255C 系列 5G RedCap 模组基于 Snapdragon X35 5G Modem-RF 系统

<https://www.quectel.com/news-and-pr/rx255c-5g-redcap-module/>

## S41

Qoitech Otii Arc Pro 技术规格书（2024，Mouser 托管）

<https://mouser.com/datasheet/2/1394/Qoitech_5282024_Otii_Arc_Pro_TechSpec_2024-3453416.pdf>

## S42

Nordic Power Profiler Kit II 产品简介（Mouser 托管）

<https://www.mouser.com/datasheet/2/297/Power_Profiler_Kit_II_PB_v1_0-1928294.pdf>

## S43

UploadVR：Qualcomm Snapdragon Reality Elite 发布（2026-06，XR2+ Gen 2 继任；面向一体机与有线计算盒，GPU +60%、NPU 48 TOPS、UFS 4.0、2×USB 3.1、蓝牙 6.0，均为厂商宣称）

<https://uploadvr.com/qualcomm-snapdragon-reality-elite-new-flagship-xr-chipset>

## S44

XREAL Aura（原 Project Aura）：眼镜内 X1S 芯片 + 外接 Snapdragon 计算盒；约 70° 视场、每眼 1920×1200、最高 120 Hz、眼镜约 95 g（媒体报道，计算盒芯片名称各报道说法不一）

<https://www.androidcentral.com/gaming/virtual-reality/xreal-project-aura-google-io-2026>

## S45

龙迅 LT7911UXC 产品简介（Type-C / DP1.4a 接收，四路 MIPI DSI / CSI 或 LVDS 输出，DSC；标注为预发布资料，LCSC 托管）

<https://wmsc.lcsc.com/wmsc/upload/file/pdf/v2/lcsc/2212091108_LONTIUM-SEMICONDUCTOR-LT7911UXC-U3B00AED_C5310989.pdf>

## S46

Sony Semiconductor Solutions 新闻稿：0.44 英寸全高清 OLED 微显示屏（ECX350F，120 Hz，最高 10000 尼特，2024-09）

<https://sony.mediaroom.com/2024-09-24-Sony-Semiconductor-Solutions-to-Release-0-44-Type-Full-HD-OLED-Microdisplay-with-Industrys-Smallest-Pixels-and-Highest-Brightness>

## S47

Monado 开源 OpenXR 运行时（含基于 Basalt 的 inside-out 追踪与光学手部追踪，追踪部分标为实验性）

<https://monado.freedesktop.org/>

## S48

Road to VR：Google 扩大与 XREAL 的 Android XR 硬件合作（2026-01）

<https://roadtovr.com/google-hardware-partnership-xreal-android-xr-leader/>

## S49

Engadget：Lumus 在 CES 2026 展示 Z-30 光波导（30° 视场、演示机 720×720、几何反射式）与 70° 宽视场光波导原型

<https://www.engadget.com/wearables/lumus-brought-a-massively-wider-fov-to-smartglasses-at-ces-2026-233245949.html>

## S50

Mixed News：Lumus Z-30 光学引擎（30° 视场，比 Z-50 轻约一半）

<https://mixed-news.com/en/lumus-z-30-optical-engine/>

## S51

Virtual Reality News：Meta Ray-Ban Display 采用 Lumus 几何光波导 + LCoS 光源

<https://virtual.reality.news/news/chinese-companys-laser-tech-could-fix-ar-glasses/>

## S52

Advanced Photonics（2025）：户外可读需约 4000 尼特入眼亮度

<https://www.researching.cn/articles/OJcc665f3ab505f0fd>

## S53

JBD Hummingbird 全彩 microLED 光机新闻稿（2023）：0.13 英寸、640×480、30° 视场可在 25–45° 定制、1.0 g、典型功耗约 260 mW

<https://prnewswire.com/news-releases/jbd-launches-hummingbird-polychrome-microled-projector-an-industry-supremacy-for-consumer-ar-market-equipped-with-sid-2023-display-of-the-year-award-winning-0-13-microled-panels-in-mass-production-now-301833241.html>

## S54

BusinessWire：Hexagon Semi HX77 AR 显示处理器基于芯原 Nano IP（2026-03；可驱动双路独立 1080p，支持 MIPI / LVDS / DP / eDP）

<https://secure.businesswire.com/news/home/20260304459518/en/Hexagon-Semis-HX77-AR-Display-Processor-Achieves-Ultra-Low-Power-Consumption-with-VeriSilicons-Nano-IP-Portfolio>

## S55

Synaptics VS680 产品简介（AV1 / HEVC / H.264 硬解、MIPI DSI 输出）

<https://manuals.plus/m/f5a5fcde50f7ed25d614ac5a9c02f2f57254bf011a9184e1b9e8e2a7f18ab7d5>

## S56

BusinessWire：芯原 VC9800D 视频 IP 支持 AV1 / AV2 等（2026-06）

<https://secure.businesswire.com/news/home/20260605153030/en/VeriSilicon-Drives-Commercial-Adoption-of-AV2-Across-Next-Generation-Video-and-Streaming-Applications>
