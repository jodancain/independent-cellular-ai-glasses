# 独立蜂窝 AI 眼镜 · 初版原理图 / PCB 设计描述（v0.1，2026-11-05）
# 板 A：MCU 常驻板（右镜腿形，真实器件）；板 B：主板（M1 桌面载板形态，主 SoC 等无公开引脚的器件为占位）。
import json, os, re
from model import Board, custom_symbol, bga_footprint, placeholder

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------- STM32N657X0H3Q：来自 ST 官方 STM32_open_pin_data ----------------
def _load_n6():
    """从 ST 官方 STM32N657X0HxQ.xml 读取引脚与复用功能：name -> [position, signals]"""
    raw = open(os.path.join(HERE, 'STM32N657X0HxQ.xml'), encoding='utf8').read()
    pm = {}
    for m in re.finditer(r'<Pin Name="([^"]+)" Position="([^"]+)" Type="([^"]+)"[^>]*?(?:/>|>(.*?)</Pin>)', raw, re.S):
        pm[m.group(1)] = [m.group(2), re.findall(r'<Signal Name="([^"]+)"', m.group(4) or '')]
    return pm


N6 = _load_n6()
ROWS = 'ABCDEFGHJKLMNPRTU'


def n6_symbol_and_fp():
    groups = {1: [], 2: [], 3: [], 4: [], 5: []}
    xmlpins = []
    raw = open(os.path.join(HERE, 'STM32N657X0HxQ.xml')).read()
    for m in re.finditer(r'<Pin Name="([^"]+)" Position="([^"]+)" Type="([^"]+)"', raw):
        xmlpins.append((m.group(1), m.group(2), m.group(3)))
    for name, pos, typ in xmlpins:
        et = {'Power': 'power_in', 'I/O': 'bidirectional', 'MonoIO': 'passive', 'NC': 'no_connect', 'Reset': 'input', 'Boot': 'input'}[typ]
        if typ == 'I/O':
            port = name[1]
            u = 2 if port in 'ABC' else 3 if port in 'DEF' else 4 if port in 'GHN' else 5
        else:
            u = 1
        groups[u].append((pos, name, et))
    units = []
    for u in sorted(groups):
        lst = sorted(groups[u], key=lambda p: (p[1].startswith('VSS'), p[1]))
        half = (len(lst) + 1) // 2
        units.append([(pos, nm, et, 'L' if i < half else 'R') for i, (pos, nm, et) in enumerate(lst)])
    sym = custom_symbol('STM32N657X0H3Q', units, ref='U', value='STM32N657X0H3Q',
                        footprint='glasses:ST_VFBGA-264_14x14mm_P0.8mm',
                        desc='ST 官方 open pin data；VFBGA264，球距 0.8 mm 待对照 ST 封装图核实')
    balls = [(pos, int(re.search(r'\d+', pos).group()) - 1, ROWS.index(re.match(r'[A-Z]+', pos).group())) for _, pos, _ in xmlpins]
    fp = bga_footprint('ST_VFBGA-264_14x14mm_P0.8mm', balls, 0.8, 14.0, 0.35,
                       desc='STM32N657X0H3Q VFBGA264 14x14 mm，按 ST 引脚表生成；焊盘尺寸与球距须对照 ST 封装图核实')
    return sym, fp, xmlpins


class Alloc:
    """按 ST 数据给外设信号分配引脚，保证复用功能与芯片一致。"""
    def __init__(self):
        self.used = {}
        self.sig = {}
        for n, (pos, sigs) in N6.items():
            for s in sigs:
                self.sig.setdefault(s, []).append(n)

    def pin(self, signal, net):
        for n in self.sig.get(signal, []):
            if n not in self.used:
                self.used[n] = (net, signal)
                return n
        raise KeyError(signal)

    def gpio(self, net, prefer=None):
        cands = [n for n, (pos, sigs) in N6.items() if re.match(r'P[A-Q]\d', n) and n not in self.used and 'OSC' not in n and 'JT' not in n]
        if prefer:
            cands = [c for c in cands if c.startswith(prefer)] or cands
        n = sorted(cands)[0]
        self.used[n] = (net, 'GPIO')
        return n


FLASH_SYM = custom_symbol('W25Q128JW_WSON8', [[('1', '~{CS}', 'input', 'L'), ('2', 'DO/IO1', 'bidirectional', 'L'), ('3', '~{WP}/IO2', 'bidirectional', 'L'), ('4', 'GND', 'power_in', 'L'),
                         ('5', 'DI/IO0', 'bidirectional', 'R'), ('6', 'CLK', 'input', 'R'), ('7', '~{HOLD}/IO3', 'bidirectional', 'R'), ('8', 'VCC', 'power_in', 'R'), ('9', 'EP', 'passive', 'R')]],
    value='W25Q128JW', footprint='Package_SON:WSON-8-1EP_6x5mm_P1.27mm_EP3.4x4.3mm', desc='1.8V 128Mb Quad SPI NOR，标准 WSON-8 引脚')

# B2B 连接器（两板共用同一引脚定义）
B2B = {
    1: 'VBUS', 2: 'VBUS', 3: 'GND', 4: 'GND', 5: '+1V8_AON', 6: 'GND',
    7: 'SOC_SPI_SCK', 8: 'SOC_SPI_MISO', 9: 'SOC_SPI_MOSI', 10: 'SOC_SPI_CS',
    11: 'MCU_IRQ_TO_SOC', 12: 'SOC_WAKE_REQ', 13: 'SOC_RESET_N', 14: 'SOC_PWR_EN',
    15: 'CELL_PWR_EN', 16: 'WIFI_PWR_EN', 17: 'DISP_SEL', 18: 'CAM_SEL', 19: 'GND',
    20: 'DISP_LS_SCK', 21: 'DISP_LS_MOSI', 22: 'DISP_LS_CS', 23: 'DISP_LS_DC', 24: 'GND',
    25: 'CAM_MCU_CKP', 26: 'CAM_MCU_CKN', 27: 'GND', 28: 'CAM_MCU_D0P', 29: 'CAM_MCU_D0N', 30: 'GND',
    31: 'CAM_MCU_D1P', 32: 'CAM_MCU_D1N', 33: 'GND', 34: 'I2C_PWR_SCL', 35: 'I2C_PWR_SDA',
    36: 'WEAR_DET', 37: 'MIC_PDM_CLK', 38: 'MIC_PDM_DAT', 39: 'GND', 40: 'GND',
}
B2B_FP = 'Connector_Hirose_DF40:Hirose_DF40C-40DS-0.4V_2x20_P0.4mm'


def board_a():
    b = Board('mcu_board', 'MCU 常驻板（小脑常驻 · 脚的 BLE · 耳朵和嘴巴）', 6,
              [(0, 2), (2, 0), (74, 0), (78, 4), (78, 12), (74, 16), (2, 16), (0, 14)],
              ['右镜腿形 78×16 mm，6 层，双面贴装', 'MCU A 案：STM32N657 + nRF52832（常驻 BLE）',
               '去耦电容为初版代表值，须按各芯片手册补全', '已布线：Freerouting + 迷宫补线，剩 4 处断线待人工（3 处 1.8 V、1 处 0.8 V），0 短路、0 间距问题'])
    sym, fp, xmlpins = n6_symbol_and_fp()
    A = Alloc()
    nets = {}
    # 电源引脚映射（初版假设，须对照 STM32N6 数据手册与 AN 核实）
    for name, pos, typ in xmlpins:
        if typ != 'Power' and name not in ('PDR_ON', 'V08CAP', 'CSI_REXT', 'NC', 'BOOT0', 'NRST', 'PWR_ON'):
            continue
        if name.startswith('VSS'):
            nets[pos] = 'GND'
        elif name in ('VDDCORE', 'VFBSMPS', 'VDDCSI'):
            nets[pos] = 'VCORE_0V8'
        elif name == 'VLXSMPS':
            nets[pos] = 'N6_SMPS_LX'
        elif name == 'VREF-':
            nets[pos] = 'GND'
        elif name == 'V08CAP':
            nets[pos] = 'N6_V08CAP'
        elif name == 'CSI_REXT':
            nets[pos] = 'N6_CSI_REXT'
        elif name == 'BOOT0':
            nets[pos] = 'N6_BOOT0'
        elif name == 'NRST':
            nets[pos] = 'N6_NRST'
        elif name in ('NC', 'PWR_ON'):
            continue
        else:
            nets[pos] = '+1V8'
    # 外设信号
    def sig(s, net):
        n = A.pin(s, net); return n
    for s, net in [('XSPIM_P1_CLK', 'PSRAM_CLK'), ('XSPIM_P1_NCS1', 'PSRAM_CS'), ('XSPIM_P1_IO0', 'PSRAM_IO0'), ('XSPIM_P1_IO1', 'PSRAM_IO1'), ('XSPIM_P1_IO2', 'PSRAM_IO2'), ('XSPIM_P1_IO3', 'PSRAM_IO3'),
                   ('XSPIM_P2_CLK', 'FLASH_CLK'), ('XSPIM_P2_NCS1', 'FLASH_CS'), ('XSPIM_P2_IO0', 'FLASH_IO0'), ('XSPIM_P2_IO1', 'FLASH_IO1'), ('XSPIM_P2_IO2', 'FLASH_IO2'), ('XSPIM_P2_IO3', 'FLASH_IO3'),
                   ('USART2_TX', 'BLE_UART_RX'), ('USART2_RX', 'BLE_UART_TX'), ('USART2_RTS', 'BLE_UART_CTS'), ('USART2_CTS', 'BLE_UART_RTS'),
                   ('SPI5_SCK', 'SOC_SPI_SCK'), ('SPI5_MISO', 'SOC_SPI_MISO'), ('SPI5_MOSI', 'SOC_SPI_MOSI'), ('SPI5_NSS', 'SOC_SPI_CS'),
                   ('SPI6_SCK', 'DISP_LS_SCK'), ('SPI6_MOSI', 'DISP_LS_MOSI'),
                   ('MDF1_CCK0', 'MIC_PDM_CLK'), ('MDF1_SDI0', 'MIC_PDM_DAT'),
                   ('SAI1_SCK_A', 'I2S_BCLK'), ('SAI1_FS_A', 'I2S_LRCLK'), ('SAI1_SD_A', 'I2S_DOUT'),
                   ('I2C1_SCL', 'I2C_PWR_SCL'), ('I2C1_SDA', 'I2C_PWR_SDA'),
                   ('ADC1_INP0', 'VBAT_SENSE')]:
        sig(s, net)
    for net in ['DISP_LS_CS', 'DISP_LS_DC', 'DISP_SEL', 'CAM_SEL', 'MCU_IRQ_TO_SOC', 'SOC_WAKE_REQ', 'SOC_RESET_N', 'SOC_PWR_EN',
                'CELL_PWR_EN', 'WIFI_PWR_EN', 'BLE_IRQ', 'BLE_RESET_N', 'WEAR_DET', 'AMP_SD_MODE', 'CHG_PGOOD_N', 'CHG_STAT_N', 'BTN_PWR', 'LED_STAT']:
        A.gpio(net, prefer='PG' if 'SOC' in net else None)
    for name, (net, s) in A.used.items():
        nets[N6[name][0]] = net
    # 时钟、调试
    nets[N6['PH0-OSC_IN(PH0)'][0]] = 'HSE_IN'; nets[N6['PH1-OSC_OUT(PH1)'][0]] = 'HSE_OUT'
    nets[N6['PC14-OSC32_IN(OSC32_IN)'][0]] = 'LSE_IN'; nets[N6['PC15-OSC32_OUT(OSC32_OUT)'][0]] = 'LSE_OUT'
    nets[N6['PA13(JTMS/SWDIO)'][0]] = 'N6_SWDIO'; nets[N6['PA14(JTCK/SWCLK)'][0]] = 'N6_SWCLK'
    for nm, net in [('CSI_CKP', 'CAM_MCU_CKP'), ('CSI_CKN', 'CAM_MCU_CKN'), ('CSI_D0P', 'CAM_MCU_D0P'), ('CSI_D0N', 'CAM_MCU_D0N'), ('CSI_D1P', 'CAM_MCU_D1P'), ('CSI_D1N', 'CAM_MCU_D1N')]:
        nets[N6[nm][0]] = net
    b.add('U1', 'STM32N657X0H3Q', 'glasses:ST_VFBGA-264_14x14mm_P0.8mm', 'STM32N657X0H3Q', nets,
          custom={'sym': sym, 'fpraw': ('ST_VFBGA-264_14x14mm_P0.8mm', fp)}, pos=(31, 8), group='mcu',
          note='MCU A 案；引脚来自 ST 官方 open pin data')
    b.alloc = A
    # STM32 周边
    b.L('L1', '2.2uH', 'N6_SMPS_LX', 'VCORE_0V8', fp='Inductor_SMD:L_0805_2012Metric', side='B', group='mcu')
    for i, v in enumerate(['10uF', '4.7uF', '1uF', '100nF', '100nF', '100nF']):
        b.C(f'C{1+i}', v, 'VCORE_0V8', 'GND', size='0402' if 'u' in v else '0201', side='B', group='mcu')
    for i, v in enumerate(['10uF', '4.7uF', '1uF', '100nF', '100nF', '100nF', '100nF', '100nF']):
        b.C(f'C{11+i}', v, '+1V8', 'GND', size='0402' if 'u' in v else '0201', side='B', group='mcu')
    b.C('C21', '2.2uF', 'N6_V08CAP', 'GND', size='0201', side='B', group='mcu')
    b.R('R1', '10k', 'N6_BOOT0', 'GND', side='B', group='mcu')
    b.C('C22', '100nF', 'N6_NRST', 'GND', side='B', group='mcu')
    b.R('R2', '4.02k 1%', 'N6_CSI_REXT', 'GND', side='B', group='mcu', note='CSI 参考电阻，阻值待核')
    b.add('Y1', 'Crystal_GND24', 'Crystal:Crystal_SMD_2016-4Pin_2.0x1.6mm', '48MHz', {'1': 'HSE_IN', '3': 'HSE_OUT', '2': 'GND', '4': 'GND'}, side='B', group='mcu')
    b.C('C23', '8pF', 'HSE_IN', 'GND', side='B', group='mcu'); b.C('C24', '8pF', 'HSE_OUT', 'GND', side='B', group='mcu')
    b.add('Y2', 'Crystal', 'Crystal:Crystal_SMD_2012-2Pin_2.0x1.2mm', '32.768kHz', {'1': 'LSE_IN', '2': 'LSE_OUT'}, side='B', group='mcu')
    b.C('C25', '6pF', 'LSE_IN', 'GND', side='B', group='mcu'); b.C('C26', '6pF', 'LSE_OUT', 'GND', side='B', group='mcu')
    # 外部存储
    b.add('U2', 'APS6404L-SQRx-ZR', 'Package_SON:Winbond_USON-8-1EP_3x2mm_P0.5mm_EP0.2x1.6mm', 'APS6404L 64Mb PSRAM 1.8V',
          {'~{CE}': 'PSRAM_CS', 'SO/SIO1': 'PSRAM_IO1', 'SIO2': 'PSRAM_IO2', 'VSS': 'GND', 'SI/SIO0': 'PSRAM_IO0', 'SCLK': 'PSRAM_CLK', 'SIO3': 'PSRAM_IO3', 'VDD': '+1V8', 'EPAD': 'GND'},
          side='B', pos=(42, 4), group='mem', note='方案要求外挂 PSRAM 放录像缓冲；容量待按录像需求放大')
    b.C('C30', '100nF', '+1V8', 'GND', side='B', group='mem')
    flash_sym = FLASH_SYM

    b.add('U3', 'W25Q128JW_WSON8', 'Package_SON:WSON-8-1EP_6x5mm_P1.27mm_EP3.4x4.3mm', 'W25Q128JW 1.8V NOR',
          {'1': 'FLASH_CS', '2': 'FLASH_IO1', '3': 'FLASH_IO2', '4': 'GND', '5': 'FLASH_IO0', '6': 'FLASH_CLK', '7': 'FLASH_IO3', '8': '+1V8', '9': 'GND'},
          custom={'sym': flash_sym}, side='B', pos=(50, 8), group='mem', note='手表模式录制存储；方案写小容量 NAND，初版先用 NOR，待定')
    b.C('C31', '100nF', '+1V8', 'GND', side='B', group='mem')
    # BLE：nRF52832（A 案外加的小 BLE 芯片）
    b.add('U4', 'nRF52832-QFxx', 'Package_DFN_QFN:QFN-48-1EP_6x6mm_P0.4mm_EP4.6x4.6mm', 'nRF52832-QFAA',
          {'VDD': '+1V8', 'VSS': 'GND', 'DEC1': 'BLE_DEC1', 'DEC2': 'BLE_DEC2', 'DEC3': 'BLE_DEC3', 'DEC4': 'BLE_DEC4', 'DCC': 'BLE_DCC',
           'XC1': 'BLE_XC1', 'XC2': 'BLE_XC2', 'ANT': 'BLE_ANT', 'P0.06': 'BLE_UART_TX', 'P0.08': 'BLE_UART_RX', 'P0.05/AIN3': 'BLE_UART_RTS',
           'P0.07': 'BLE_UART_CTS', 'P0.11': 'BLE_IRQ', 'P0.21/~{RESET}': 'BLE_RESET_N', 'SWDCLK': 'BLE_SWCLK', 'SWDIO': 'BLE_SWDIO'},
          pos=(58, 8), group='ble', note='常驻收手机这只手的气泡 / 看板描述')
    b.C('C40', '100nF', 'BLE_DEC1', 'GND', side='B', group='ble'); b.C('C41', '1uF', 'BLE_DEC4', 'GND', side='B', group='ble')
    b.C('C42', '100nF', 'BLE_DEC2', 'GND', side='B', group='ble'); b.C('C43', '47nF', 'BLE_DEC3', 'GND', side='B', group='ble')
    b.L('L2', '10uH', 'BLE_DCC', 'BLE_DCC_L', fp='Inductor_SMD:L_0603_1608Metric', side='B', group='ble')
    b.L('L3', '15nH', 'BLE_DCC_L', 'BLE_DEC4', fp='Inductor_SMD:L_0402_1005Metric', side='B', group='ble')
    b.C('C44', '4.7uF', '+1V8', 'GND', size='0402', side='B', group='ble'); b.C('C45', '100nF', '+1V8', 'GND', side='B', group='ble')
    b.add('Y3', 'Crystal_GND24', 'Crystal:Crystal_SMD_2016-4Pin_2.0x1.6mm', '32MHz', {'1': 'BLE_XC1', '3': 'BLE_XC2', '2': 'GND', '4': 'GND'}, pos=(63.5, 4), group='ble')
    b.C('C46', '12pF', 'BLE_XC1', 'GND', group='ble'); b.C('C47', '12pF', 'BLE_XC2', 'GND', group='ble')
    b.L('L4', '3.9nH', 'BLE_ANT', 'BLE_RF', fp='Inductor_SMD:L_0201_0603Metric', group='ble')
    b.C('C48', '0.8pF', 'BLE_RF', 'GND', group='ble', note='π 型匹配，数值按 Nordic 参考设计待调')
    b.add('AE1', 'Antenna_Chip', 'RF_Antenna:Johanson_2450AT18x100', '2.4GHz 片状天线', {'FEED': 'BLE_RF', 'PCB_Trace': None}, pos=(73, 8), rot=90, group='ble')
    # 麦克风阵列（PDM，直连 MCU）
    b.add('MK1', 'SPH0641LU4H-1', 'Sensor_Audio:Knowles_LGA-5_3.5x2.65mm', 'PDM 麦克风 L', {'DATA': 'MIC_PDM_DAT', 'SEL': 'GND', 'GND': 'GND', 'CLOCK': 'MIC_PDM_CLK', 'VDD': '+1V8'}, pos=(3.4, 8), group='mic')
    b.add('MK2', 'SPH0641LU4H-1', 'Sensor_Audio:Knowles_LGA-5_3.5x2.65mm', 'PDM 麦克风 R', {'DATA': 'MIC_PDM_DAT', 'SEL': '+1V8', 'GND': 'GND', 'CLOCK': 'MIC_PDM_CLK', 'VDD': '+1V8'}, pos=(48, 13), group='mic')
    b.C('C50', '100nF', '+1V8', 'GND', group='mic'); b.C('C51', '100nF', '+1V8', 'GND', group='mic')
    # 扬声器功放
    b.add('U5', 'MAX98357A', 'Package_DFN_QFN:TQFN-16-1EP_3x3mm_P0.5mm_EP1.23x1.23mm', 'MAX98357A',
          {'DIN': 'I2S_DOUT', 'LRCLK': 'I2S_LRCLK', 'BCLK': 'I2S_BCLK', 'GAIN_SLOT': None, '~{SD_MODE}': 'AMP_SD_MODE', 'VDD': 'VSYS', 'GND': 'GND', 'PAD': 'GND', 'OUTP': 'SPK_P', 'OUTN': 'SPK_N'},
          side='B', pos=(64, 10), group='amp', note='开放式扬声器；防漏音靠结构与算法')
    b.C('C55', '10uF', 'VSYS', 'GND', size='0402', side='B', group='amp'); b.C('C56', '100nF', 'VSYS', 'GND', side='B', group='amp')
    b.add('J3', 'Conn_01x02', 'Connector_JST:JST_SH_SM02B-SRSS-TB_1x02-1MP_P1.00mm_Horizontal', '扬声器', {'1': 'SPK_P', '2': 'SPK_N'}, side='B', pos=(70, 12.5), group='amp')
    # 充电与电源
    b.add('U6', 'BQ24075RGT', 'Package_DFN_QFN:VQFN-16-1EP_3x3mm_P0.5mm_EP1.6x1.6mm', 'BQ24075',
          {'IN': 'VBUS', 'OUT': 'VSYS', 'BAT': 'VBAT', 'TS': 'BAT_NTC', 'ILIM': 'CHG_ILIM', 'ISET': 'CHG_ISET', 'TMR': 'CHG_TMR', 'SYSOFF': 'GND',
           '~{CE}': 'GND', 'EN1': 'GND', 'EN2': '+1V8_AON', '~{PGOOD}': 'CHG_PGOOD_N', '~{CHG}': 'CHG_STAT_N', 'VSS': 'GND'},
          side='B', pos=(19, 4), group='pwr', note='USB 输入 → 系统电源路径 + 右侧电池充电')
    b.R('R10', '1.13k', 'CHG_ILIM', 'GND', side='B', group='pwr'); b.R('R11', '3.0k', 'CHG_ISET', 'GND', side='B', group='pwr', note='充电电流按电池容量定')
    b.R('R12', '46.4k', 'CHG_TMR', 'GND', side='B', group='pwr')
    b.C('C60', '1uF', 'VBUS', 'GND', size='0402', side='B', group='pwr'); b.C('C61', '4.7uF', 'VSYS', 'GND', size='0402', side='B', group='pwr')
    b.C('C62', '4.7uF', 'VBAT', 'GND', size='0402', side='B', group='pwr')
    b.add('U7', 'TPS62823DLC', 'Package_SON:Texas_VSON-HR-8_1.5x2mm_P0.5mm', 'TPS62823 1.8V',
          {'EN': 'VSYS', 'FB': 'BUCK_FB', 'AGND': 'GND', 'PGND': 'GND', 'SW': 'BUCK_SW', 'VIN': 'VSYS', 'PG': None},
          side='B', pos=(24, 11.5), group='pwr')
    b.L('L5', '0.47uH', 'BUCK_SW', '+1V8', fp='Inductor_SMD:L_0805_2012Metric', side='B', group='pwr')
    b.R('R13', '200k', '+1V8', 'BUCK_FB', side='B', group='pwr'); b.R('R14', '100k', 'BUCK_FB', 'GND', side='B', group='pwr', note='FB 0.6 V → 1.8 V')
    b.C('C63', '10uF', '+1V8', 'GND', size='0402', side='B', group='pwr'); b.C('C64', '4.7uF', 'VSYS', 'GND', size='0402', side='B', group='pwr')
    b.R('R15', '0', '+1V8', '+1V8_AON', side='B', group='pwr', note='常醒域，后续可换负载开关')
    b.add('U8', 'TLV75533PDBV', 'Package_TO_SOT_SMD:SOT-23-5', 'TLV75533 3.3V', {'IN': 'VSYS', 'GND': 'GND', 'EN': 'VSYS', 'OUT': '+3V3'}, side='B', pos=(25.5, 4), group='pwr', note='接近传感器供电')
    b.C('C65', '1uF', '+3V3', 'GND', side='B', group='pwr')
    b.R('R16', '1M', 'VBAT', 'VBAT_SENSE', side='B', group='pwr'); b.R('R17', '1M', 'VBAT_SENSE', 'GND', side='B', group='pwr')
    b.add('J2', 'Conn_01x03', 'Connector_JST:JST_SH_SM03B-SRSS-TB_1x03-1MP_P1.00mm_Horizontal', '右侧电池', {'1': 'VBAT', '2': 'BAT_NTC', '3': 'GND'}, side='B', pos=(72, 4), group='pwr', note='两块电池分置左右耳后')
    # 佩戴检测（接近传感器）
    b.add('U9', 'APDS-9160-003', 'OptoDevice:Broadcom_APDS-9160-003', 'APDS-9160 佩戴检测',
          {'GND': 'GND', 'INT': 'WEAR_DET', 'LDR': 'PROX_LDR', 'LEDK': 'PROX_LDR', 'LEDA': '+3V3', 'VDD': '+3V3', 'SDA': 'I2C_PWR_SDA', 'SCL': 'I2C_PWR_SCL'},
          pos=(44, 2.6), group='wear', note='电平匹配待核（3.3V 供电、1.8V I2C）')
    b.C('C70', '100nF', '+3V3', 'GND', group='wear')
    b.R('R20', '2.2k', 'I2C_PWR_SCL', '+1V8_AON', group='wear'); b.R('R21', '2.2k', 'I2C_PWR_SDA', '+1V8_AON', group='wear')
    b.R('R22', '10k', 'WEAR_DET', '+1V8_AON', group='wear')
    # 按键、指示灯、调试
    b.add('SW1', 'SW_Push', 'Button_Switch_SMD:SW_SPST_PTS810', '电源 / 唤醒键', {'1': 'BTN_PWR', '2': 'GND'}, pos=(20.7, 12.6), group='ui')
    b.R('R23', '10k', 'BTN_PWR', '+1V8_AON', side='B', group='ui')
    b.add('D1', 'LED', 'LED_SMD:LED_0402_1005Metric', '状态灯', {'K': 'LED_K', 'A': '+1V8'}, pos=(19.5, 2.2), group='ui')
    b.R('R24', '1k', 'LED_K', 'LED_STAT', group='ui')
    b.add('J4', 'Conn_01x06', 'Connector:Tag-Connect_TC2030-IDC-NL_2x03_P1.27mm_Vertical', 'SWD（N6 + nRF）',
          {'1': '+1V8', '2': 'N6_SWDIO', '3': 'N6_NRST', '4': 'N6_SWCLK', '5': 'GND', '6': 'BLE_SWDIO'}, side='B', pos=(14.5, 10.5), group='ui',
          note='第 6 脚复用 nRF SWDIO 只为初版调试，正式版分开')
    b.R('R25', '0', 'BLE_SWCLK', 'N6_SWCLK', side='B', group='ui', note='调试跳线，量产不贴', dnp=True)
    # 板间连接器
    b.add('J1', 'Conn_02x20_Odd_Even', B2B_FP, '板间 DF40 40P（至主板）', {str(k): v for k, v in B2B.items()}, pos=(8, 8), rot=90, group='b2b')
    b.flags = ['VBUS', 'VBAT', 'VSYS', '+1V8', '+1V8_AON', '+3V3', 'VCORE_0V8', 'GND']
    return b


def board_b():
    b = Board('main_board', '主板（小脑：主 SoC + 显示处理器；脚：RedCap + Wi-Fi 7 + USB-C）', 8,
              [(0, 3), (3, 0), (97, 0), (100, 3), (100, 67), (97, 70), (3, 70), (0, 67)],
              ['M1 桌面载板形态 100×70 mm，8 层 HDI', '主 SoC / Wi-Fi 7 / LT7911UXC / FPGA / RedCap / 开关 为占位：引脚待供应商资料或 NDA',
               'RedCap 模组外形尺寸待按移远硬件设计手册核实', '未布线：只有布局与飞线'])
    G = lambda n: [('GND', 'GND', 'power_in')] * n
    # 主 SoC（AR2 Gen 1 占位）
    soc = [('VDD_CORE', 'VDD_SOC_CORE', 'power_in'), ('VDD_MX', 'VDD_SOC_MX', 'power_in'), ('VDD_IO_1V8', '+1V8_IO', 'power_in'), ('VDD_LPDDR', 'VDD_SOC_MEM', 'power_in')] + G(4)
    for i, pfx in enumerate(['DSI0']):
        soc += [(f'{pfx}_CKP', 'SOC_DSI_CKP', 'output'), (f'{pfx}_CKN', 'SOC_DSI_CKN', 'output')]
        for l in range(4):
            soc += [(f'{pfx}_D{l}P', f'SOC_DSI_D{l}P', 'output'), (f'{pfx}_D{l}N', f'SOC_DSI_D{l}N', 'output')]
    for cam, lanes in [('CSI0', 2), ('CSI1', 2), ('CSI2', 2), ('CSI3', 2)]:
        nm = {'CSI0': 'TRKL', 'CSI1': 'TRKR', 'CSI2': 'CAM_SOC', 'CSI3': 'EYE'}[cam]
        soc += [(f'{cam}_CKP', f'{nm}_CKP', 'input'), (f'{cam}_CKN', f'{nm}_CKN', 'input')]
        for l in range(lanes):
            soc += [(f'{cam}_D{l}P', f'{nm}_D{l}P', 'input'), (f'{cam}_D{l}N', f'{nm}_D{l}N', 'input')]
    for pc, tgt in [('PCIE0', 'CELL'), ('PCIE1', 'WLAN')]:
        soc += [(f'{pc}_TXP', f'{tgt}_PCIE_TXP', 'output'), (f'{pc}_TXN', f'{tgt}_PCIE_TXN', 'output'), (f'{pc}_RXP', f'{tgt}_PCIE_RXP', 'input'),
                (f'{pc}_RXN', f'{tgt}_PCIE_RXN', 'input'), (f'{pc}_REFCLKP', f'{tgt}_PCIE_CKP', 'output'), (f'{pc}_REFCLKN', f'{tgt}_PCIE_CKN', 'output'),
                (f'{pc}_PERST_N', f'{tgt}_PERST_N', 'output'), (f'{pc}_CLKREQ_N', f'{tgt}_CLKREQ_N', 'bidirectional'), (f'{pc}_WAKE_N', f'{tgt}_WAKE_N', 'input')]
    soc += [('USB3_SSTXP', 'USB_SSTXP', 'output'), ('USB3_SSTXN', 'USB_SSTXN', 'output'), ('USB3_SSRXP', 'USB_SSRXP', 'input'), ('USB3_SSRXN', 'USB_SSRXN', 'input'),
            ('USB_DP', 'USB_DP', 'bidirectional'), ('USB_DM', 'USB_DM', 'bidirectional'),
            ('SPI_MCU_SCK', 'SOC_SPI_SCK', 'output'), ('SPI_MCU_MISO', 'SOC_SPI_MISO', 'input'), ('SPI_MCU_MOSI', 'SOC_SPI_MOSI', 'output'), ('SPI_MCU_CS', 'SOC_SPI_CS', 'output'),
            ('GPIO_MCU_IRQ', 'MCU_IRQ_TO_SOC', 'input'), ('GPIO_WAKE_REQ', 'SOC_WAKE_REQ', 'input'), ('RESIN_N', 'SOC_RESET_N', 'input'), ('PWR_EN', 'SOC_PWR_EN', 'input'),
            ('SPI_DPU_SCK', 'DPU_SPI_SCK', 'output'), ('SPI_DPU_MOSI', 'DPU_SPI_MOSI', 'output'), ('SPI_DPU_MISO', 'DPU_SPI_MISO', 'input'), ('SPI_DPU_CS', 'DPU_SPI_CS', 'output'),
            ('I2C_SNS_SCL', 'I2C_SNS_SCL', 'output'), ('I2C_SNS_SDA', 'I2C_SNS_SDA', 'bidirectional'), ('IMU_INT', 'IMU_INT1', 'input'),
            ('PDM_CLK', 'MIC_PDM_CLK', 'input'), ('PDM_DAT', 'MIC_PDM_DAT', 'input'),
            ('BT_UART_TX', 'BT_UART_TX', 'output'), ('BT_UART_RX', 'BT_UART_RX', 'input'), ('WLAN_EN', 'WLAN_EN', 'output'),
            ('LT_RST_N', 'LT_RST_N', 'output'), ('DPU_RST_N', 'DPU_RST_N', 'output'), ('CELL_PWRKEY', 'CELL_PWRKEY', 'output'),
            ('CELL_RESET_N', 'CELL_RESET_N', 'output'), ('CELL_STATUS', 'CELL_STATUS', 'input'), ('TYPEC_ALT_SEL', 'TYPEC_ALT_SEL', 'output'), ('PD_INT_N', 'PD_INT_N', 'input')]
    placeholder(b, 'U1', 'SOC_AR2_GEN1_PLACEHOLDER', 'Snapdragon AR2 Gen 1（占位）', (12, 12), soc, pos=(40, 32), group='soc',
                note='主选 AR2 Gen 1；引脚与封装需与高通签 NDA 后替换；有条件备选 AR1+ Gen 1')
    for i, (net, v) in enumerate([('VDD_SOC_CORE', '22uF'), ('VDD_SOC_CORE', '1uF'), ('VDD_SOC_MX', '10uF'), ('VDD_SOC_MEM', '10uF'), ('+1V8_IO', '10uF'), ('+1V8_IO', '1uF')]):
        b.C(f'C{1+i}', v, net, 'GND', size='0402', side='B', group='soc')
    # SoC 电源管理（占位）
    pmic = [('VIN', 'VSYS_MAIN', 'power_in'), ('VIN2', 'VSYS_MAIN', 'power_in')] + G(3) + [('EN', 'SOC_PWR_EN', 'input'), ('VREG_CORE', 'VDD_SOC_CORE', 'power_out'),
            ('VREG_MX', 'VDD_SOC_MX', 'power_out'), ('VREG_MEM', 'VDD_SOC_MEM', 'power_out'), ('VREG_IO', '+1V8_IO', 'power_out'), ('SCL', 'I2C_PWR_SCL', 'input'), ('SDA', 'I2C_PWR_SDA', 'bidirectional')]
    placeholder(b, 'U2', 'PMIC_SOC_PLACEHOLDER', 'SoC 配套 PMIC（占位）', (6, 6), pmic, pos=(22, 46), group='pwr', note='随 SoC 平台选定')
    # Wi-Fi 7 / 蓝牙（占位）
    wl = [('VDD_3V3', '+3V3_RF', 'power_in'), ('VDD_1V8', '+1V8_IO', 'power_in')] + G(3) + [('PCIE_TXP', 'WLAN_PCIE_RXP', 'output'), ('PCIE_TXN', 'WLAN_PCIE_RXN', 'output'),
          ('PCIE_RXP', 'WLAN_PCIE_TXP', 'input'), ('PCIE_RXN', 'WLAN_PCIE_TXN', 'input'), ('PCIE_CKP', 'WLAN_PCIE_CKP', 'input'), ('PCIE_CKN', 'WLAN_PCIE_CKN', 'input'),
          ('PERST_N', 'WLAN_PERST_N', 'input'), ('CLKREQ_N', 'WLAN_CLKREQ_N', 'bidirectional'), ('WAKE_N', 'WLAN_WAKE_N', 'output'), ('WLAN_EN', 'WLAN_EN', 'input'),
          ('BT_TX', 'BT_UART_RX', 'output'), ('BT_RX', 'BT_UART_TX', 'input'), ('PWR_EN', 'WIFI_PWR_EN', 'input'), ('ANT_WIFI', 'ANT_WIFI', 'passive')]
    placeholder(b, 'U3', 'WIFI7_COMBO_PLACEHOLDER', 'Wi-Fi 7 + 蓝牙连接芯片（占位）', (8, 8), wl, pos=(64, 14), group='wifi', note='AR2 / AR1+ 平台配套连接芯片')
    b.add('J9', 'Conn_Coaxial', 'Connector_Coaxial:U.FL_Hirose_U.FL-R-SMT-1_Vertical', 'Wi-Fi 天线', {'1': 'ANT_WIFI', '2': 'GND'}, pos=(76, 7), group='wifi')
    # RedCap 模组（占位，引脚按功能列出）
    cell = [('VBAT_BB', 'VSYS_CELL', 'power_in'), ('VBAT_RF', 'VSYS_CELL', 'power_in')] + G(6) + [('USB_DP', None, 'bidirectional'), ('USB_DM', None, 'bidirectional'),
            ('PCIE_TXP', 'CELL_PCIE_RXP', 'output'), ('PCIE_TXN', 'CELL_PCIE_RXN', 'output'), ('PCIE_RXP', 'CELL_PCIE_TXP', 'input'), ('PCIE_RXN', 'CELL_PCIE_TXN', 'input'),
            ('PCIE_REFCLKP', 'CELL_PCIE_CKP', 'input'), ('PCIE_REFCLKN', 'CELL_PCIE_CKN', 'input'), ('PCIE_RST_N', 'CELL_PERST_N', 'input'), ('PCIE_CLKREQ_N', 'CELL_CLKREQ_N', 'bidirectional'),
            ('PCIE_WAKE_N', 'CELL_WAKE_N', 'output'), ('USIM_VDD', 'USIM_VDD', 'power_out'), ('USIM_DATA', 'USIM_DATA', 'bidirectional'), ('USIM_CLK', 'USIM_CLK', 'output'),
            ('USIM_RST', 'USIM_RST', 'output'), ('USIM_DET', 'USIM_DET', 'input'), ('PWRKEY', 'CELL_PWRKEY', 'input'), ('RESET_N', 'CELL_RESET_N', 'input'),
            ('STATUS', 'CELL_STATUS', 'output'), ('W_DISABLE_N', 'CELL_PWR_EN', 'input'), ('ANT_MAIN', 'ANT_CELL_MAIN', 'passive'), ('ANT_DIV', 'ANT_CELL_DIV', 'passive')]
    placeholder(b, 'U4', 'RG255C_GL_PLACEHOLDER', 'Quectel RG255C-GL（X35，占位）', (29, 32), cell, pos=(82, 47), group='cell',
                note='引脚编号按移远《RG255C-GL 硬件设计手册》替换；外形尺寸待核')
    b.C('C20', '100uF', 'VSYS_CELL', 'GND', size='0603', side='B', group='cell'); b.C('C21', '10uF', 'VSYS_CELL', 'GND', size='0402', side='B', group='cell')
    b.R('R20', '0', 'VSYS_MAIN', 'VSYS_CELL', size='0603', group='cell', note='后续换负载开关，由 CELL_PWR_EN 控制')
    b.add('J10', 'Conn_Coaxial', 'Connector_Coaxial:U.FL_Hirose_U.FL-R-SMT-1_Vertical', '蜂窝主天线', {'1': 'ANT_CELL_MAIN', '2': 'GND'}, pos=(92, 26), group='cell')
    b.add('J11', 'Conn_Coaxial', 'Connector_Coaxial:U.FL_Hirose_U.FL-R-SMT-1_Vertical', '蜂窝分集天线', {'1': 'ANT_CELL_DIV', '2': 'GND'}, pos=(92, 66), group='cell')
    sim = [('VCC', 'USIM_VDD', 'power_in'), ('RST', 'USIM_RST', 'input'), ('CLK', 'USIM_CLK', 'input'), ('IO', 'USIM_DATA', 'bidirectional'), ('DET', 'USIM_DET', 'output'), ('GND', 'GND', 'power_in')]
    placeholder(b, 'J12', 'NANO_SIM_HOLDER', 'Nano SIM 卡座（M2 期间保留）', (12, 13), sim, pos=(58, 60), group='cell', note='选型待定')
    esim = [('VCC', 'USIM_VDD', 'power_in'), ('RST', 'USIM_RST', 'input'), ('CLK', 'USIM_CLK', 'input'), ('IO', 'USIM_DATA', 'bidirectional'), ('GND', 'GND', 'power_in')]
    placeholder(b, 'U5', 'ESIM_MFF2', 'eSIM（MFF2，占位）', (6, 5), esim, pos=(47, 57), group='cell', dnp=True, note='与卡座二选一贴装')
    b.C('C22', '100nF', 'USIM_VDD', 'GND', group='cell')
    # 显示处理器（原型 FPGA，占位）
    dpu = [('VCC_CORE', 'VDD_DPU_CORE', 'power_in'), ('VCCIO_1V8', '+1V8_IO', 'power_in')] + G(4)
    dpu += [('RXA_CKP', 'SOC_DSI_CKP', 'input'), ('RXA_CKN', 'SOC_DSI_CKN', 'input')] + sum([[(f'RXA_D{l}P', f'SOC_DSI_D{l}P', 'input'), (f'RXA_D{l}N', f'SOC_DSI_D{l}N', 'input')] for l in range(4)], [])
    dpu += [('RXB_CKP', 'LT_MIPI_CKP', 'input'), ('RXB_CKN', 'LT_MIPI_CKN', 'input')] + sum([[(f'RXB_D{l}P', f'LT_MIPI_D{l}P', 'input'), (f'RXB_D{l}N', f'LT_MIPI_D{l}N', 'input')] for l in range(4)], [])
    for eye in 'LR':
        dpu += [(f'TX{eye}_CKP', f'DPU_{eye}_CKP', 'output'), (f'TX{eye}_CKN', f'DPU_{eye}_CKN', 'output')] + sum([[(f'TX{eye}_D{l}P', f'DPU_{eye}_D{l}P', 'output'), (f'TX{eye}_D{l}N', f'DPU_{eye}_D{l}N', 'output')] for l in range(2)], [])
    dpu += [('SPI_SCK', 'DPU_SPI_SCK', 'input'), ('SPI_MOSI', 'DPU_SPI_MOSI', 'input'), ('SPI_MISO', 'DPU_SPI_MISO', 'output'), ('SPI_CS', 'DPU_SPI_CS', 'input'),
            ('IMU_SCK', 'IMU_SCK', 'output'), ('IMU_MOSI', 'IMU_MOSI', 'output'), ('IMU_MISO', 'IMU_MISO', 'input'), ('IMU_CS', 'IMU_CS', 'output'), ('IMU_INT', 'IMU_INT1', 'input'),
            ('OVL_SCK', 'DISP_LS_SCK', 'input'), ('OVL_MOSI', 'DISP_LS_MOSI', 'input'), ('OVL_CS', 'DISP_LS_CS', 'input'), ('OVL_DC', 'DISP_LS_DC', 'input'),
            ('RESET_N', 'DPU_RST_N', 'input'), ('CFG_SCK', 'DPU_CFG_SCK', 'output'), ('CFG_SO', 'DPU_CFG_IO0', 'bidirectional'), ('CFG_SI', 'DPU_CFG_IO1', 'bidirectional'), ('CFG_CS', 'DPU_CFG_CS', 'output')]
    placeholder(b, 'U6', 'DPU_FPGA_PLACEHOLDER', '显示与重投影处理器（原型 FPGA，占位）', (10, 10), dpu, pos=(40, 15), group='dpu',
                note='扭曲、畸变与色差校正、缩放、60→90 Hz 以上补帧；两路 MIPI 输入（主 SoC、DP 桥）+ 一路来自 MCU 的低速叠加层（DP 层 + 气泡叠加，方案 §4.5）；型号 M1 定')
    b.add('U7', 'W25Q128JW_WSON8', 'Package_SON:WSON-8-1EP_6x5mm_P1.27mm_EP3.4x4.3mm', 'FPGA 配置 Flash',
          {'1': 'DPU_CFG_CS', '2': 'DPU_CFG_IO1', '3': None, '4': 'GND', '5': 'DPU_CFG_IO0', '6': 'DPU_CFG_SCK', '7': None, '8': '+1V8_IO', '9': 'GND'},
          custom={'sym': FLASH_SYM}, side='B', pos=(48, 10), group='dpu')
    b.add('U8', 'TPS62823DLC', 'Package_SON:Texas_VSON-HR-8_1.5x2mm_P0.5mm', 'TPS62823 DPU 内核',
          {'EN': 'SOC_PWR_EN', 'FB': 'DPU_FB', 'AGND': 'GND', 'PGND': 'GND', 'SW': 'DPU_SW', 'VIN': 'VSYS_MAIN', 'PG': None}, side='B', pos=(32, 6), group='dpu')
    b.L('L1', '0.47uH', 'DPU_SW', 'VDD_DPU_CORE', fp='Inductor_SMD:L_0805_2012Metric', side='B', group='dpu')
    b.R('R1', '100k', 'VDD_DPU_CORE', 'DPU_FB', side='B', group='dpu'); b.R('R2', '150k', 'DPU_FB', 'GND', side='B', group='dpu', note='内核电压待定，按 FPGA 选型调整')
    for i in range(3):
        b.C(f'C{30+i}', '10uF' if i == 0 else '100nF', 'VDD_DPU_CORE', 'GND', size='0402' if i == 0 else '0201', side='B', group='dpu')
    # IMU（显示处理器直读）
    b.add('U9', 'LSM6DSM', 'Package_LGA:LGA-14_3x2.5mm_P0.5mm_LayoutBorder3x4y', 'LSM6DSM 6 轴 IMU（≥1 kHz）',
          {'SDO/SA0': 'IMU_MISO', 'SCL': 'IMU_SCK', 'SDA': 'IMU_MOSI', 'CS': 'IMU_CS', 'INT1': 'IMU_INT1', 'VDDIO': '+1V8_IO', 'VDD': '+1V8_IO', 'GND': 'GND', 'INT2': None, 'SDX': 'GND', 'SCX': 'GND', 'OCS_Aux': None, 'SDO_Aux': None},
          pos=(52, 24), group='dpu', note='型号待选（方案要求 6 轴、采样 ≥1 kHz）')
    b.C('C35', '100nF', '+1V8_IO', 'GND', group='dpu')
    # DP 接收桥（占位）
    lt = [('VDD_1V8', '+1V8_IO', 'power_in'), ('VDD_3V3', '+3V3_RF', 'power_in')] + G(3)
    lt += sum([[(f'DP_ML{l}P', f'DP_ML{l}P', 'input'), (f'DP_ML{l}N', f'DP_ML{l}N', 'input')] for l in range(4)], [])
    lt += [('DP_AUXP', 'DP_AUXP', 'bidirectional'), ('DP_AUXN', 'DP_AUXN', 'bidirectional'), ('DP_HPD', 'DP_HPD', 'output'), ('MIPI_CKP', 'LT_MIPI_CKP', 'output'), ('MIPI_CKN', 'LT_MIPI_CKN', 'output')]
    lt += sum([[(f'MIPI_D{l}P', f'LT_MIPI_D{l}P', 'output'), (f'MIPI_D{l}N', f'LT_MIPI_D{l}N', 'output')] for l in range(4)], [])
    lt += [('I2C_SCL', 'I2C_SNS_SCL', 'input'), ('I2C_SDA', 'I2C_SNS_SDA', 'bidirectional'), ('RST_N', 'LT_RST_N', 'input')]
    placeholder(b, 'U10', 'LT7911UXC_PLACEHOLDER', 'LT7911UXC DP→MIPI（占位）', (7, 7), lt, pos=(24, 17), group='dp', note='A1 有线原始画面入口；引脚待龙迅资料')
    # USB-C、Type-C 复用开关、PD 控制器
    b.add('J1', 'USB_C_Receptacle', 'Connector_USB:USB_C_Receptacle_Amphenol_12401610E4-2A', 'USB-C（DP Alt / USB 3 / PD）',
          {'VBUS': 'VBUS', 'GND': 'GND', 'CC1': 'CC1', 'CC2': 'CC2', 'D+': 'USB_DP', 'D-': 'USB_DM', 'SBU1': 'SBU1', 'SBU2': 'SBU2',
           'TX1+': 'C_TX1P', 'TX1-': 'C_TX1N', 'RX1+': 'C_RX1P', 'RX1-': 'C_RX1N', 'TX2+': 'C_TX2P', 'TX2-': 'C_TX2N', 'RX2+': 'C_RX2P', 'RX2-': 'C_RX2N', 'SHIELD': 'GND'},
          pos=(7, 35), rot=270, group='usb')
    mux = [('VCC', '+1V8_IO', 'power_in')] + G(2) + [(f'C_{n}', f'C_{n}', 'bidirectional') for n in ['TX1P', 'TX1N', 'RX1P', 'RX1N', 'TX2P', 'TX2N', 'RX2P', 'RX2N', 'SBU1', 'SBU2']]
    mux = [(n.replace('C_SBU', 'SBU'), net.replace('C_SBU', 'SBU'), t) for n, net, t in mux]
    mux += sum([[(f'DP{l}P', f'DP_ML{l}P', 'bidirectional'), (f'DP{l}N', f'DP_ML{l}N', 'bidirectional')] for l in range(4)], [])
    mux += [('AUXP', 'DP_AUXP', 'bidirectional'), ('AUXN', 'DP_AUXN', 'bidirectional'), ('SSTXP', 'USB_SSTXP', 'input'), ('SSTXN', 'USB_SSTXN', 'input'),
            ('SSRXP', 'USB_SSRXP', 'output'), ('SSRXN', 'USB_SSRXN', 'output'), ('ALT_SEL', 'TYPEC_ALT_SEL', 'input'), ('HPD', 'DP_HPD', 'input')]
    placeholder(b, 'U11', 'TYPEC_DP_USB_MUX_PLACEHOLDER', 'Type-C DP/USB3 复用开关（占位）', (6, 6), mux, pos=(13, 26), group='usb', note='A1 时 4 路 DP；A2 时 USB 3')
    pd = [('VBUS', 'VBUS', 'power_in'), ('VDD', '+1V8_IO', 'power_in')] + G(2) + [('CC1', 'CC1', 'bidirectional'), ('CC2', 'CC2', 'bidirectional'),
          ('SCL', 'I2C_PWR_SCL', 'input'), ('SDA', 'I2C_PWR_SDA', 'bidirectional'), ('INT_N', 'PD_INT_N', 'output')]
    placeholder(b, 'U12', 'PD_CONTROLLER_PLACEHOLDER', 'USB PD + DP Alt 控制器（占位）', (4, 4), pd, pos=(13, 45), group='usb', note='受电 + DP Alt 协商')
    b.add('U13', 'TPD4E05U06DQA', 'Package_SON:USON-10_2.5x1.0mm_P0.5mm', 'ESD', {'D1+': 'USB_DP', 'D1-': 'USB_DM', 'D2+': 'CC1', 'D2-': 'CC2', 'GND': 'GND'}, pos=(15, 41), group='usb')
    # 主板电池与充电（左侧电池）
    b.add('U14', 'BQ24075RGT', 'Package_DFN_QFN:VQFN-16-1EP_3x3mm_P0.5mm_EP1.6x1.6mm', 'BQ24075 左侧',
          {'IN': 'VBUS', 'OUT': 'VSYS_MAIN', 'BAT': 'VBAT_L', 'TS': 'BATL_NTC', 'ILIM': 'CHGL_ILIM', 'ISET': 'CHGL_ISET', 'TMR': 'CHGL_TMR', 'SYSOFF': 'GND',
           '~{CE}': 'GND', 'EN1': 'GND', 'EN2': '+1V8_AON', '~{PGOOD}': None, '~{CHG}': None, 'VSS': 'GND'}, side='B', pos=(22, 58), group='pwr')
    b.R('R10', '1.13k', 'CHGL_ILIM', 'GND', side='B', group='pwr'); b.R('R11', '3.0k', 'CHGL_ISET', 'GND', side='B', group='pwr'); b.R('R12', '46.4k', 'CHGL_TMR', 'GND', side='B', group='pwr')
    b.C('C40', '1uF', 'VBUS', 'GND', size='0402', side='B', group='pwr'); b.C('C41', '10uF', 'VSYS_MAIN', 'GND', size='0402', side='B', group='pwr'); b.C('C42', '4.7uF', 'VBAT_L', 'GND', size='0402', side='B', group='pwr')
    b.add('J13', 'Conn_01x03', 'Connector_JST:JST_SH_SM03B-SRSS-TB_1x03-1MP_P1.00mm_Horizontal', '左侧电池', {'1': 'VBAT_L', '2': 'BATL_NTC', '3': 'GND'}, pos=(17, 58), group='pwr')
    b.add('U15', 'TLV75533PDBV', 'Package_TO_SOT_SMD:SOT-23-5', 'TLV75533 3.3V 射频', {'IN': 'VSYS_MAIN', 'GND': 'GND', 'EN': 'WIFI_PWR_EN', 'OUT': '+3V3_RF'}, side='B', pos=(64, 26), group='wifi')
    b.C('C43', '1uF', '+3V3_RF', 'GND', side='B', group='wifi')
    # 摄像头、显示 FPC 与开关
    for ref, nm, pre, x in [('J3', '追踪相机 L', 'TRKL', 30), ('J4', '追踪相机 R', 'TRKR', 44), ('J6', '眼动相机（预留）', 'EYE', 8)]:
        nets = {'1': 'GND', '2': f'{pre}_D0N', '3': f'{pre}_D0P', '4': 'GND', '5': f'{pre}_D1N', '6': f'{pre}_D1P', '7': 'GND', '8': f'{pre}_CKN', '9': f'{pre}_CKP', '10': 'GND',
                '11': 'I2C_SNS_SCL', '12': 'I2C_SNS_SDA', '13': '+1V8_IO', '14': '+1V8_IO', '15': 'GND'}
        b.add(ref, 'Conn_01x15', 'Connector_FFC-FPC:Hirose_FH26-15S-0.3SHW_2Rows-15Pins-1MP_P0.60mm_Horizontal', nm, nets, pos=(x, 66), rot=90, group='cam',
              dnp=(pre == 'EYE'), note='眼动只预留，不贴' if pre == 'EYE' else '')
    camsw = [('VCC', '+1V8_IO', 'power_in')] + G(2) + [('SEL', 'CAM_SEL', 'input')]
    for n in ['CKP', 'CKN', 'D0P', 'D0N', 'D1P', 'D1N']:
        camsw += [(f'IN_{n}', f'CAM_{n}', 'bidirectional'), (f'A_{n}', f'CAM_SOC_{n}', 'bidirectional'), (f'B_{n}', f'CAM_MCU_{n}', 'bidirectional')]
    placeholder(b, 'U16', 'MIPI_SWITCH_CAM_PLACEHOLDER', '主摄 MIPI 二选一（占位）', (4, 4), camsw, pos=(58, 40), group='cam', note='同一时刻只给 MCU 或主 SoC；MCU 仲裁')
    b.add('J5', 'Conn_01x15', 'Connector_FFC-FPC:Hirose_FH26-15S-0.3SHW_2Rows-15Pins-1MP_P0.60mm_Horizontal', '主摄（1080p30 起）',
          {'1': 'GND', '2': 'CAM_D0N', '3': 'CAM_D0P', '4': 'GND', '5': 'CAM_D1N', '6': 'CAM_D1P', '7': 'GND', '8': 'CAM_CKN', '9': 'CAM_CKP', '10': 'GND',
           '11': 'I2C_SNS_SCL', '12': 'I2C_SNS_SDA', '13': '+1V8_IO', '14': '+1V8_IO', '15': 'GND'}, pos=(50, 44), group='cam')
    for eye, x in [('L', 22), ('R', 46)]:
        dsw = [('VCC', '+1V8_IO', 'power_in')] + G(2) + [('SEL', 'DISP_SEL', 'input')]
        for n in ['CKP', 'CKN', 'D0P', 'D0N', 'D1P', 'D1N']:
            dsw += [(f'A_{n}', f'DPU_{eye}_{n}', 'bidirectional'), (f'OUT_{n}', f'DISP{eye}_{n}', 'bidirectional')]
        dsw += [('B_SCK', 'DISP_LS_SCK', 'input'), ('B_MOSI', 'DISP_LS_MOSI', 'input'), ('B_CS', 'DISP_LS_CS', 'input'), ('B_DC', 'DISP_LS_DC', 'input'),
                ('OUT_SCK', f'DISP{eye}_LS_SCK', 'output'), ('OUT_MOSI', f'DISP{eye}_LS_MOSI', 'output'), ('OUT_CS', f'DISP{eye}_LS_CS', 'output'), ('OUT_DC', f'DISP{eye}_LS_DC', 'output')]
        placeholder(b, f'U{17 if eye == "L" else 18}', f'DISP_SWITCH_{eye}_PLACEHOLDER', f'显示开关 {eye}（占位）', (4, 4), dsw, pos=(x + 7, 6), group='disp',
                    note='正常接显示处理器；手表模式切到 MCU 低速显示')
        b.add(f'J{7 if eye == "L" else 8}', 'Conn_01x25_Socket', 'Connector_FFC-FPC:Hirose_FH26-25S-0.3SHW_2Rows-25Pins-1MP_P0.60mm_Horizontal', f'光机 {eye}（光波导）',
              {'1': 'GND', '2': f'DISP{eye}_D0N', '3': f'DISP{eye}_D0P', '4': 'GND', '5': f'DISP{eye}_D1N', '6': f'DISP{eye}_D1P', '7': 'GND', '8': f'DISP{eye}_CKN', '9': f'DISP{eye}_CKP',
               '10': 'GND', '11': f'DISP{eye}_LS_SCK', '12': f'DISP{eye}_LS_MOSI', '13': f'DISP{eye}_LS_CS', '14': f'DISP{eye}_LS_DC', '15': 'GND', '16': '+1V8_IO', '17': '+1V8_IO',
               '18': 'VSYS_MAIN', '19': 'VSYS_MAIN', '20': 'GND', '21': 'GND', '22': 'I2C_SNS_SCL', '23': 'I2C_SNS_SDA', '24': 'GND', '25': 'GND'},
              pos=(x - 6, 4.5), rot=90, group='disp', note='光机 LCoS / 全彩 microLED 在 M1 定案，引脚按光机重排')
    # 板间连接器
    b.add('J2', 'Conn_02x20_Odd_Even', B2B_FP, '板间 DF40 40P（至 MCU 板）', {str(k): v for k, v in B2B.items()}, pos=(40, 52), rot=90, group='b2b')
    b.flags = ['VBUS', 'VBAT_L', 'VSYS_MAIN', 'VSYS_CELL', '+1V8_IO', '+1V8_AON', '+3V3_RF', 'VDD_SOC_CORE', 'VDD_SOC_MX', 'VDD_SOC_MEM', 'VDD_DPU_CORE', 'GND']
    return b


# 按方案 §1.1（决定 #22、#25）给每组器件标角色
ROLES = {
    'mcu_board': {'mcu': '小脑常驻', 'mem': '小脑常驻', 'wear': '小脑常驻', 'ui': '小脑常驻', 'ble': '脚', 'b2b': '板间连接',
                  'mic': '器官 · 嘴巴', 'amp': '器官 · 耳朵', 'pwr': '身体 · 电源'},
    'main_board': {'soc': '小脑（含脑的端侧入口）', 'dpu': '小脑', 'wifi': '脚', 'cell': '脚', 'dp': '脚（有线 A1）', 'usb': '脚（有线）',
                   'cam': '器官 · 眼睛', 'disp': '器官 · 视网膜', 'pwr': '身体 · 电源', 'b2b': '板间连接'},
}


def role_of(board, group):
    return ROLES.get(board, {}).get(group, '其他')


BOARDS = [board_a, board_b]
