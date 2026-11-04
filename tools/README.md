# 验证工具说明（第 1、3、6 组）

本目录是[《现成硬件验证计划》](../docs/validation-plan.md)第 1、3、6 组的配套测试工具。硬件未到货时，除 `latency_page.html` 外都可以用 `tools/samples/` 下的虚构样例跑通；`redcap_at.py --mock` 内置假回应，不接模组也能走完整流程。

所有结果只对本次测试条件负责。文中出现的“通过 / 达到”均指对照方案设计目标，**不是已验证的产品结论**。

## 文件与对应验证步骤

| 文件 | 对应验证计划 | 用途 |
| --- | --- | --- |
| `latency/latency_page.html` | 第 1 组 1.4 步骤 4、1.5.1；表 1-2；第 2、5 组可复用 | 单文件延迟测试页：角落黑白翻转、`performance.now()` 毫秒计时、页面内事件表和 CSV 导出 |
| `analysis/latency_stats.py` | 第 1 组 1.4 步骤 8、12；1.5.1、1.5.5；表 1-2、1-3 | 按条件统计 n/p50/p95/最大值；nearest-rank；n<30 标注；0–5 min 与 25–30 min 的 p95 漂移 |
| `redcap/redcap_at.py` | 第 3 组 3.4 步骤 2–7；3.5.1、3.5.2；表 3-1 | 标准 3GPP AT 查询/设置；收发带时间戳 CSV；`--mock` 无硬件跑通；标识脱敏 |
| `redcap/net_bench.py` | 第 3 组 3.4 步骤 10–14；3.5.4、3.5.5；表 3-4、3-5 | iperf3 下行/上行持续速率 + ping/UDP RTT；对照方案 6.3 三档；支持离线 JSON |
| `redcap/current_summary.py` | 第 3 组 3.4 步骤 4–8；3.5.1、3.5.2；表 3-2 | 电流 CSV 的平均/峰值、休眠窗口、中位周期，与请求周期比较 |
| `ergonomics/ergo_stats.py` | 第 6 组 6.4 步骤 1–3、6；6.5、6.6；表 6-7 | 前后重量比、左右镜腿差（>3 g 标出）、鼻托受力对标、主观评分均值/最低值 |
| `samples/` | 各分析脚本 | 虚构样例数据，文件内容均注明“示例数据，非实测” |

## 安装与环境

- Python 3.9+；本目录脚本只用标准库。
- `redcap_at.py` 的**实机串口模式**额外需要 pyserial（可选依赖）：

  ```bash
  python3 -m pip install pyserial
  ```

  不装 pyserial 也可以用 `--mock`；程序只在打开实机串口时才导入 pyserial。
- `net_bench.py` 的**实机测量模式**需要系统安装 `iperf3` 并加入 `PATH`；离线 `analyze --from-json` 不需要 iperf3。
- `latency_page.html` 无外部依赖，直接用浏览器打开即可；建议全屏并保持标签页在前台。

## 1. 延迟测试页

直接双击打开：

```text
tools/latency/latency_page.html
```

页面功能：

- 左上角大方块按空格键或定时器在黑白之间翻转；定时频率可选 1–5 Hz。
- 大号计时器显示 `performance.now()` 绝对毫秒，可用于“拍屏比对”：拍下屏幕后，用画面上的计时值减去事件时间戳。
- 每次翻转或手动“记录当前计时”都会写入页面内表格。
- “导出 CSV”导出表 1-2 列名：`样本号、条件编号、路径、测试项、采集时间、输入/动作时间戳、显示边沿时间戳、延迟 (ms)、帧号/场次、有效、无效原因/备注`。

注意：

- 页面只负责产生输入/动作时间戳，**不会自动测显示边沿**；`显示边沿时间戳`、`延迟 (ms)` 需要光电传感器/高速相机结果补填后，才能直接用于 `latency_stats.py`。
- 浏览器定时器和 `performance.now()` 有调度抖动；正式测量以光电/高速相机边沿为准，页面计时只作辅助。
- 页面数据只存在本机浏览器内存中，不上传。

## 2. 延迟统计

```bash
# 按条件汇总（默认子命令）
python3 tools/analysis/latency_stats.py tools/samples/latency_sample.csv

# 显式 summarize，并输出 CSV
python3 tools/analysis/latency_stats.py summarize tools/samples/latency_sample.csv \
  --csv-out /tmp/latency_summary.csv

# 比较同一条件 0–5 min 与 25–30 min 的 p95 漂移
python3 tools/analysis/latency_stats.py drift tools/samples/latency_drift_sample.csv

# 没有“时段”列时，用“采集时间”相对首样本的分钟数分段
python3 tools/analysis/latency_stats.py drift tools/samples/latency_sample.csv \
  --time-col 采集时间
```

约定：

- 只统计 `有效=是` 的样本；无效样本在备注中计数，不删除原始行。
- p50/p95 使用 nearest-rank：排序后第 `ceil(p*n)` 个样本。
- 有效样本 `n<30` 时备注写“样本不足”；不补造样本。
- 漂移 = 晚段 p95 − 早段 p95；方案未给漂移阈值，按“待定”处理。

## 3. RedCap AT 采集

无硬件先跑 mock：

```bash
python3 tools/redcap/redcap_at.py --mock --log /tmp/redcap_at_mock.csv
```

实机串口：

```bash
python3 tools/redcap/redcap_at.py --port /dev/ttyUSB0 --baud 115200 \
  --log /tmp/redcap_at_real.csv

# PSM 设置（参数由命令行给出）
python3 tools/redcap/redcap_at.py --port /dev/ttyUSB0 \
  --set-psm --psm-t3412 00001001 --psm-t3324 00000010 \
  --log /tmp/redcap_at_psm.csv

# eDRX 设置与网络实际协商值
python3 tools/redcap/redcap_at.py --port /dev/ttyUSB0 \
  --set-edrx --edrx-mode 1 --edrx-act 5 --edrx-cycle 0101 \
  --log /tmp/redcap_at_edrx.csv

# 可选：厂商私有命令只做透传，不作为必需步骤
python3 tools/redcap/redcap_at.py --port /dev/ttyUSB0 \
  --raw "AT+VENDOR?" --log /tmp/redcap_at_raw.csv
```

程序发送的标准命令：`AT+CFUN?`、`AT+COPS?`、`AT+CEREG?`、`AT+C5GREG?`、`AT+CSQ`、`AT+CESQ`、`AT+CPSMS?`、`AT+CEDRXS?`、`AT+CEDRXRDP`；设置时使用 `AT+CPSMS=1,,,"<T3412>","<T3324>"` 和 `AT+CEDRXS=<mode>,<act>,"<cycle>"`。

隐私与边界：

- 程序**不主动发送** `AT+CIMI`、`AT+CGSN`、`AT+CCID`；`--raw` 里出现这些查询会直接报错。
- 回应中若出现 `+CIMI/+CGSN/+CCID` 或 14–22 位连续数字，写入 CSV 和打印前统一替换为 `[已脱敏]`。
- AT 返回“已设置”不等于网络授予或实际生效；必须结合 `current_summary.py` 的电流波形判断（方案 3.5.1）。
- 日志仍是原始测量数据，放在受控目录，不提交公开仓库。

## 4. 持续速率与 RTT

实机（需要 iperf3）：

```bash
# 默认先下行（iperf3 --reverse）再上行，各 60 s、4 流；RTT 用 ping 300 次
python3 tools/redcap/net_bench.py run --host 192.0.2.10 \
  --duration 60 --streams 4 --rtt-count 300 \
  --save-dir /tmp/netbench

# 只测下行；UDP 探测需目标端口提供回声服务
python3 tools/redcap/net_bench.py run --host 192.0.2.10 \
  --direction down --probe udp --udp-port 5201
```

`192.0.2.10` 是文档示例地址，不是内部地址；实际测试替换为测试服务器别名/地址，报告中不要写内部地址与凭据。

离线分析已保存的 iperf3 JSON（不需要 iperf3）：

```bash
python3 tools/redcap/net_bench.py analyze \
  --from-json tools/samples/iperf3_down_sample.json \
  --from-json tools/samples/iperf3_up_sample.json \
  --rtt-json tools/samples/rtt_sample.json
```

三档阈值来自方案 6.3，输出会逐项写“达到 / 未达到设计目标”，并标注“设计目标，非已验证结论”：

| 场景 | 下行 | 上行 | RTT p95 |
| --- | --- | --- | --- |
| 云串流 | ≥30 Mbps | ≥2 Mbps | ≤50 ms |
| 视频通话/会议 | ≥5 Mbps | ≥5 Mbps | ≤100 ms |
| 串流+通话并发 | ≥35 Mbps | ≥8 Mbps | ≤50 ms |

没有安装 iperf3 时，实机模式会给出明确错误并提示改用 `--from-json`。离线分析只解析已保存结果，不代表本次网络实测。

> 三档中的“串流+通话并发”目前用同一轮下行/上行结果代入；真正同时并发需另跑双向 iperf3 并保留原始 JSON，不把两次单向结果冒充同时并发。

## 5. 电流波形汇总

```bash
python3 tools/redcap/current_summary.py tools/samples/current_sample.csv \
  --threshold 0.3 --expected-period 20
```

可改列名、最短窗口和周期容差：

```bash
python3 tools/redcap/current_summary.py /path/to/current.csv \
  --time-col "时间 s" --current-col "电流 A" \
  --threshold 0.0005 --min-duration 5 --expected-period 20 --tolerance 0.10
```

约定：

- 休眠窗口 = 电流**严格低于**阈值且连续采样；窗口时长取首末低电流采样点之差，不额外外推采样间隔。
- 中位周期 = 相邻休眠窗口开始时间差的中位数；只有一个窗口时无法计算周期。
- 与 `--expected-period` 比较时，默认容差 ±10%，可用 `--tolerance` 改。
- 方案 3.5.1 要求“电流波形出现与协商周期一致的休眠窗口”才记为观察到生效；本工具只给波形证据，仍需同时记录 AT 协商值、判定人和原始波形编号。

## 6. 人体工学汇总

```bash
python3 tools/ergonomics/ergo_stats.py \
  --weights tools/samples/ergo_weights_sample.csv \
  --scores tools/samples/ergo_scores_sample.csv \
  --benchmark "对标 A"
```

输出：

- 称重与受力表：总重、前框、左右镜腿、**前后重量比 = 前框 ÷（左镜腿 + 右镜腿）**、左右差、`左右差>3 g` 标记、鼻托受力、鼻托受力是否 ≤ 对标实测值。
- 主观评分表：按样品汇总 30/60/90/120 min 各时间点均值、总体均值、最低值及最低值时间，并另列各时间点最低值。
- 未指定 `--benchmark` 时不做鼻托对标判定。

注意：头模测量与真人佩戴有差异；主观评分只记录匿名受试者编号，不记录姓名、照片等个人信息。

## 样例数据

`tools/samples/` 下所有 CSV/JSON 都是虚构样例，内容注明“示例数据，非实测”，仅用于验证脚本能跑通。样例中的“对标 A”“样架 110 g 后重”等名称是通用占位，不代表任何真实产品或供应商。

## 单元测试

在仓库根目录运行：

```bash
python3 -m unittest discover -s tests -v
```

测试使用标准库 `unittest`，覆盖 nearest-rank 边界、无效样本过滤、样本不足、漂移、AT mock 与脱敏、iperf3 JSON 离线解析与三档判定、休眠窗口、人体工学比值与 >3 g 标记。

## 隐私与公开仓库边界

- 原始 CSV、视频、照片、AT 日志、电流波形不放进本公开仓库；仓库只放工具、虚构样例和脱敏汇总。
- 不写公司名、内部项目名、账号、密钥、真实设备序列号、IMSI/IMEI/ICCID、SIM 卡号、内部地址或受试者个人信息。
- 设备用实验室别名（如 G1-PC1）；受试者用匿名编号（如 P1）。
- `latency_page.html` 不上传数据；`redcap_at.py` 只做标识脱敏，不替代受控存储要求。

## 已知限制

- 延迟页面的浏览器定时器有调度抖动；低帧率相机不能单独用于下结论，需光电法或更高帧率设备补充。
- `latency_stats.py` 的漂移分段依赖“时段”或“采集时间”；两列都没有时会报错，不猜时间。
- `current_summary.py` 的窗口时长是采样点之差；采样率、量程和不确定度仍需按方案 3.3/3.5.2 记录。
- `redcap_at.py` 的 mock 只验证命令流程与脱敏，不代表真实模组/网络的 AT 行为；不同厂商/固件的命令差异以实物手册为准。
- `net_bench.py` 的离线模式只解析已保存 iperf3 JSON；实机模式需要系统 iperf3，RTT 结果受服务器位置、路由和网络时段影响。
