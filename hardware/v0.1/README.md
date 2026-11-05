# 初版原理图与 PCB v0.1（2026-11-05）

**一句话**：两块板的 KiCad 原理图与 PCB 已生成，能在网站的 [硬件页](https://glasses.youngtuo.win/hardware.html) 用 three.js 看（原理图可无限缩放、可搜网络；PCB 是三维的；还有装进眼镜的示意）。**这一版只做了原理图和布局，没有布线，不能直接下单。**

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

1. **布线**（最大的一步）：MCU 常驻板可以在 KiCad 里继续布；主板要等占位器件换成真实引脚和封装。
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
