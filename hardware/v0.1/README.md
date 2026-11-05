# 初版原理图与 PCB v0.1（2026-11-05）

**一句话**：两块板的 KiCad 原理图与 PCB 已生成，能在网站的 [硬件页](https://glasses.youngtuo.win/hardware.html) 用 three.js 看（原理图可无限缩放、可搜网络；PCB 是三维的；还有装进眼镜的示意）。**MCU 常驻板已布线，只剩 4 处断线待人工补（0 短路、0 间距问题）；主板仍只有布局。两块都还不能直接下单。**

## 目录

| 位置 | 内容 |
| --- | --- |
| `viewer/` | three.js 展示页（three.js 0.180 已内置）。本地看：在该目录运行 `python3 -m http.server`，打开 http://localhost:8000 |
| `kicad/mcu_board/`、`kicad/main_board/` | KiCad 10 工程：原理图、PCB、项目自建符号库与封装库 |
| `exports/<板>/` | 原理图 PDF、渲染图、ERC / DRC 报告（三维 GLB 在 `viewer/data/`）；`exports/kicad-projects-v0.1.zip` 为两个 KiCad 工程打包 |
| `exports/<板>/jlcpcb/` | 嘉立创格式：Gerber 压缩包、钻孔、`BOM_JLCPCB.csv`、`CPL_JLCPCB.csv`（坐标） |
| `generator/` | 生成脚本。需要 KiCad 10，并从 ST 的 [STM32_open_pin_data](https://github.com/STMicroelectronics/STM32_open_pin_data) 下载 `mcu/STM32N657X0HxQ.xml` 放进本目录（本仓库不转载 ST 原始文件）；改 `design.py` 后运行 `./build_all.sh <输出目录>` 一键重建 |

## 两块板

| 板 | 形态 | 层数 | 器件 / 网络 | 说明 |
| --- | --- | --- | --- | --- |
| **MCU 常驻板** | 右镜腿形 78×16 mm，双面贴装 | 6 层 | 84 / 95 | **全部真实器件**：STM32N657（MCU A 案）、nRF52832（常驻 BLE）、APS6404L PSRAM、W25Q128JW NOR、2 颗 PDM 麦克风、MAX98357A 功放、BQ24075 充电、TPS62823 1.8 V、佩戴检测、SWD |
| **主板** | M1 桌面载板 100×70 mm | 8 层 HDI | 55 / 207 | 主 SoC、Wi-Fi 7、PMIC、RedCap、LT7911UXC、FPGA、Type-C 复用 / PD、显示与摄像头开关、SIM 卡座、eSIM **共 13 个占位**；USB-C、IMU、充电、FPC / 板间连接器、天线座为真实器件 |

两板之间用 Hirose DF40 40 针板对板连接器，引脚定义两边共用（见下表）。

## MCU 常驻板布线（2026-11-05）

- **工具**：Freerouting 2.5（开源自动布线器），由 `generator/route.py` 调用；KiCad 10 导出 / 导入 Specctra。
- **叠层**：6 层。F.Cu 信号 / In1 地平面 / In2 信号 / In3 1.8 V 平面 / In4 信号 / B.Cu 信号；顶层、底层铺地。
- **规则**：信号线 0.1 mm（Freerouting 在细间距处收窄的线统一加宽到 0.09 mm），电源线 0.25 mm，间距 0.09–0.1 mm，过孔 0.3 / 0.15 mm，板边 0.25 mm——按嘉立创多层板能力设定。
- **做法**：先扇出（地和 1.8 V 焊盘就近打孔到平面，BGA 与散热焊盘用盘中孔），再三遍自动布线；Freerouting 卡住的断线再用自写的网格迷宫布线器（`maze.py`，A* 寻路，四个信号层可换层打孔，保持 0.1 mm 间距与 0.2 mm 孔距）补；最后按 DRC 清掉悬空过孔和多余短线。
- **结果**：约 2000 段走线、约 350 个过孔；**0 短路、0 间距、0 线宽 / 板边问题**。迷宫布线器补上了核心 0.8 V、降压反馈、按键、系统电源、麦克风地各一处。还剩 **4 处断线**（C17、R15、C45 三个 1.8 V 焊盘和 U1 的 R4 球位 0.8 V，都在底面器件密集处，可能要挪一两个电阻电容）、1 段悬空短线、3 条铺地连通提示（需在 KiCad 里打开确认）和 11 处散热焊盘连接筋偏少的提醒，需要人工处理。
- **盘中孔**：STM32N657 的 0.8 mm BGA 在 16 mm 高的板上必须用盘中孔，下单时要选“盘中孔（树脂塞孔 + 电镀盖帽）”工艺。
- 重新布线：`<KiCad python> generator/route.py kicad/mcu_board <java25> <freerouting.jar> 60`，再用 `drc_cleanup.py` 按 DRC 报告清理。


## 按角色看两块板（方案 §1.1：脑、小脑、手、脚）

| 角色 | MCU 常驻板（右镜腿） | 主板（左镜腿，暂为桌面载板） |
| --- | --- | --- |
| **脑** | 唤醒词入口（MCU 常驻听音） | 意图入口与派手路由跑在主 SoC 上；推理在云端 LLM，没有单独芯片 |
| **小脑** | STM32N657、PSRAM、NOR、佩戴检测（常醒的那部分小脑） | 主 SoC（占位）、显示与重投影 FPGA（占位）、IMU、显示开关 |
| **脚** | nRF52832 + 片状天线：BLE 常连，主 SoC 睡着也能收气泡 | RedCap 模组 + SIM / eSIM + 两路蜂窝天线、Wi-Fi 7 + 天线、USB-C（A1 DP / A2 USB 3）、DP 接收桥 |
| **手** | 不在眼镜上 | 不在眼镜上（手机、电脑、车机、云主机） |
| **器官** | 麦克风 ×2（嘴巴）、扬声器功放（耳朵） | 主摄与追踪相机（眼睛）、两路光机排线（视网膜） |
| **身体** | 右侧电池、充电、1.8 V 电源 | 左侧电池、充电、SoC 电源（占位） |

每个器件的角色写在 `kicad/<板>/<板>.netlist.json` 的 `role` 字段，查看页“按角色”一栏也按这个分组。

## 投屏与多路信号在板上的落点（方案 §3.11、§4.5）

- **显示处理器（主板 U6，FPGA 占位）**：两路 MIPI 输入（主 SoC 合成画面、LT7911UXC 的 DP 画面）+ 一路来自 MCU 的低速叠加层输入（`DISP_LS_*`，经板间连接器），用来在 A1 有线、主 SoC 睡着时把气泡叠加到 DP 画面上（设计开发要求 HW-DP-07）。
- **主摄**：经 MIPI 二选一开关给主 SoC 或 MCU；主 SoC 端一次采集分给取景、识别、通话编码（SW-22）。
- **麦克风**：直连 MCU 常驻听音，同时经板间连接器把 PDM 送给主 SoC 做混音与回声消除（HW-AUD-04）。
- **并发能力**：能同时硬解几路取决于主 SoC，属于门禁 HW-SOC-07，等芯片资料，板上不体现。

## 引脚从哪来

- **STM32N657X0H3Q**：264 个球位全部来自 ST 官方 `STM32_open_pin_data`；外设复用功能（XSPI、USART、SPI、MDF、SAI、I2C、ADC）由脚本按 ST 数据自动分配，保证与芯片一致。封装按 VFBGA264、球距 0.8 mm 生成，**须对照 ST 封装图核实焊盘尺寸**。
- **其余真实器件**：KiCad 10 官方库的符号与封装。
- **占位器件**：只列功能引脚，编号是临时的。拿到资料后替换：AR2 Gen 1 要和高通签 NDA；RG255C-GL 按移远《硬件设计手册》；LT7911UXC 向龙迅要手册；FPGA 与开关等 M1 选型后补。

## 检查结果

| 板 | ERC | DRC 硬错误（间距 / 短路 / 重叠） | 其余 DRC | 未布线焊盘 |
| --- | --- | --- | --- | --- |
| MCU 常驻板 | 2 条（两颗 PDM 麦克风共用数据线、功放散热焊盘接地，均属正常） | 0 | 丝印重叠等外观项；地平面与麦克风 / SWD 定位孔的间距 | 335 |
| 主板 | 2 条（WEAR_DET 只经板间连接器；IMU 辅助口接地） | 0 | 丝印外观项；USB-C 贴板边（按设计） | 429 |

设计规则按嘉立创多层板能力设为线宽 / 间距 0.09–0.1 mm、过孔 0.3 / 0.15 mm。

## 交给嘉立创之前还差什么

1. **布线**：MCU 常驻板剩 4 处断线在 KiCad 里人工补完并复查 DRC；主板要等占位器件换成真实引脚和封装。
2. **补全器件资料**：去耦电容按各芯片手册补齐；BOM 的 `LCSC` 一列填立创商城编号；高通、移远、龙迅等器件走客供料。
3. **工艺确认**：STM32N657 的 0.8 mm BGA、DF40 0.4 mm 连接器，需要 HDI / 盲埋孔报价；眼镜形态的软硬结合板要单独询价。
4. **再跑一次 DRC、出 Gerber**，用嘉立创的 DFM 检查后下单。

## MCU 引脚分配（脚本按 ST 数据生成）

| 网络 | STM32N657 引脚 | 球位 | 功能 |
| --- | --- | --- | --- |
| AMP_SD_MODE | PA7 | R12 | GPIO |
| BLE_IRQ | PA4 | U14 | GPIO |
| BLE_RESET_N | PA5 | R8 | GPIO |
| BLE_UART_CTS | PF3 | M2 | USART2_RTS |
| BLE_UART_RTS | PG5 | M4 | USART2_CTS |
| BLE_UART_RX | PD5 | D14 | USART2_TX |
| BLE_UART_TX | PC2 | D9 | USART2_RX |
| BTN_PWR | PB1 | R11 | GPIO |
| CAM_SEL | PA12 | U7 | GPIO |
| CELL_PWR_EN | PA2 | T8 | GPIO |
| CHG_PGOOD_N | PA8 | U8 | GPIO |
| CHG_STAT_N | PA9 | P7 | GPIO |
| DISP_LS_CS | PA1 | P9 | GPIO |
| DISP_LS_DC | PA10 | R7 | GPIO |
| DISP_LS_MOSI | PG14 | P6 | SPI6_MOSI |
| DISP_LS_SCK | PC12 | C8 | SPI6_SCK |
| DISP_SEL | PA11 | T7 | GPIO |
| FLASH_CLK | PN6 | P15 | XSPIM_P2_CLK |
| FLASH_CS | PN1 | R17 | XSPIM_P2_NCS1 |
| FLASH_IO0 | PN2 | T17 | XSPIM_P2_IO0 |
| FLASH_IO1 | PN3 | R15 | XSPIM_P2_IO1 |
| FLASH_IO2 | PN4 | N17 | XSPIM_P2_IO2 |
| FLASH_IO3 | PN5 | R16 | XSPIM_P2_IO3 |
| I2C_PWR_SCL | PE5 | C11 | I2C1_SCL |
| I2C_PWR_SDA | PC1 | A9 | I2C1_SDA |
| I2S_BCLK | PB6 | E17 | SAI1_SCK_A |
| I2S_DOUT | PD2 | C12 | SAI1_SD_A |
| I2S_LRCLK | PB0 | E15 | SAI1_FS_A |
| LED_STAT | PB10 | U11 | GPIO |
| MCU_IRQ_TO_SOC | PG0 | R13 | GPIO |
| MIC_PDM_CLK | PE2 | F15 | MDF1_CCK0 |
| MIC_PDM_DAT | PE8 | A15 | MDF1_SDI0 |
| PSRAM_CLK | PO4 | N16 | XSPIM_P1_CLK |
| PSRAM_CS | PO0 | M17 | XSPIM_P1_NCS1 |
| PSRAM_IO0 | PP0 | G17 | XSPIM_P1_IO0 |
| PSRAM_IO1 | PP1 | H16 | XSPIM_P1_IO1 |
| PSRAM_IO2 | PP2 | J17 | XSPIM_P1_IO2 |
| PSRAM_IO3 | PP3 | J16 | XSPIM_P1_IO3 |
| SOC_PWR_EN | PG11 | U13 | GPIO |
| SOC_RESET_N | PG10 | T10 | GPIO |
| SOC_SPI_CS | PH6 | B2 | SPI5_NSS |
| SOC_SPI_MISO | PD4 | B15 | SPI5_MISO |
| SOC_SPI_MOSI | PH7 | D2 | SPI5_MOSI |
| SOC_SPI_SCK | PE15 | A12 | SPI5_SCK |
| SOC_WAKE_REQ | PG1 | R9 | GPIO |
| VBAT_SENSE | PA0 | U10 | ADC1_INP0 |
| WEAR_DET | PA6 | P8 | GPIO |
| WIFI_PWR_EN | PA3 | R14 | GPIO |


## 板间连接器 J1 / J2（DF40 40 针）

| 针 | 网络 |
| --- | --- |
| 1 | VBUS |
| 2 | VBUS |
| 3 | GND |
| 4 | GND |
| 5 | +1V8_AON |
| 6 | GND |
| 7 | SOC_SPI_SCK |
| 8 | SOC_SPI_MISO |
| 9 | SOC_SPI_MOSI |
| 10 | SOC_SPI_CS |
| 11 | MCU_IRQ_TO_SOC |
| 12 | SOC_WAKE_REQ |
| 13 | SOC_RESET_N |
| 14 | SOC_PWR_EN |
| 15 | CELL_PWR_EN |
| 16 | WIFI_PWR_EN |
| 17 | DISP_SEL |
| 18 | CAM_SEL |
| 19 | GND |
| 20 | DISP_LS_SCK |
| 21 | DISP_LS_MOSI |
| 22 | DISP_LS_CS |
| 23 | DISP_LS_DC |
| 24 | GND |
| 25 | CAM_MCU_CKP |
| 26 | CAM_MCU_CKN |
| 27 | GND |
| 28 | CAM_MCU_D0P |
| 29 | CAM_MCU_D0N |
| 30 | GND |
| 31 | CAM_MCU_D1P |
| 32 | CAM_MCU_D1N |
| 33 | GND |
| 34 | I2C_PWR_SCL |
| 35 | I2C_PWR_SDA |
| 36 | WEAR_DET |
| 37 | MIC_PDM_CLK |
| 38 | MIC_PDM_DAT |
| 39 | GND |
| 40 | GND |

## 已知的初版假设（须核实）

- STM32N6 电源脚：VDDCORE / VDDCSI 接内部 SMPS 输出 0.8 V，其余 VDD* 接 1.8 V；VDD33USB 未用 USB，暂接 1.8 V。
- 佩戴检测 APDS-9160 用 3.3 V 供电、I2C 上拉到 1.8 V，电平兼容待核。
- 手表模式录制存储方案写的是小容量 NAND，初版先放 NOR，待定。
- 主板 RedCap 电源暂用 0 Ω 直连，后续换负载开关。
