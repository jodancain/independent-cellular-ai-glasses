#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第 3 组持续速率与 RTT 对照工具（方案 6.3 三档）。

- 实机模式调用系统 iperf3 --json 测下行/上行持续速率，并调用 ping 或 UDP
  探测测 RTT，计算 p50/p95。
- 离线模式用 --from-json 读取已保存的 iperf3 JSON，不要求安装 iperf3。
- 三档阈值来自方案 6.3，全部标注“设计目标，非已验证结论”。

只使用 Python 3.9+ 标准库；实机模式需要系统安装 iperf3。
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

TIERS: List[Dict[str, Any]] = [
    {
        "scenario": "云串流",
        "note": "1080p60，H.265/AV1",
        "down": 30.0,
        "up": 2.0,
        "rtt": 50.0,
    },
    {
        "scenario": "视频通话/会议",
        "note": "1080p30 上行",
        "down": 5.0,
        "up": 5.0,
        "rtt": 100.0,
    },
    {
        "scenario": "串流+通话并发",
        "note": "最重负载",
        "down": 35.0,
        "up": 8.0,
        "rtt": 50.0,
    },
]

TARGET_NOTE = "设计目标，非已验证结论"


class BenchError(Exception):
    """可读的测量/解析错误。"""


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    match = re.search(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?", text)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def percentile(values: Sequence[float], p: float) -> Optional[float]:
    """nearest-rank 分位数：排序后第 ceil(p*n) 个。"""
    clean = sorted(float(item) for item in values if item is not None)
    if not clean:
        return None
    if not 0 < p <= 1:
        raise ValueError("p 必须在 (0, 1] 内")
    rank = max(1, int(math.ceil(p * len(clean) - 1e-9)))
    return clean[min(rank - 1, len(clean) - 1)]


def rtt_summary(values: Sequence[float]) -> Dict[str, Optional[float]]:
    clean = [float(item) for item in values if item is not None]
    return {
        "n": len(clean),
        "p50": percentile(clean, 0.50),
        "p95": percentile(clean, 0.95),
        "max": max(clean) if clean else None,
        "min": min(clean) if clean else None,
    }


def _load_json(source: Any) -> Tuple[Any, str]:
    if isinstance(source, dict):
        return source, ""
    path = Path(source)
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle), path.name.lower()


def parse_iperf3_json(source: Any, direction: str = "auto") -> Dict[str, Any]:
    """解析 iperf3 --json 结果。

    - down：使用 end.sum_received（--reverse 时客户端为接收端）。
    - up：使用 end.sum_sent（客户端为发送端）。
    - auto：根据 start.test_start.reverse 或文件名判断。
    """
    data, source_name = _load_json(source)
    if not isinstance(data, dict):
        raise BenchError("iperf3 JSON 顶层不是对象")

    start = data.get("start") or {}
    test_start = start.get("test_start") or {}
    reverse = test_start.get("reverse", 0)

    normalized = (direction or "auto").lower()
    if normalized in {"down", "downlink", "dl", "下行"}:
        resolved = "down"
    elif normalized in {"up", "uplink", "ul", "上行"}:
        resolved = "up"
    elif normalized == "auto":
        if reverse in (1, True, "1", "true", "True"):
            resolved = "down"
        elif "down" in source_name or "下行" in source_name:
            resolved = "down"
        elif "up" in source_name or "上行" in source_name:
            resolved = "up"
        else:
            resolved = "up"
    else:
        raise BenchError("direction 只支持 auto/down/up")

    end = data.get("end")
    if not isinstance(end, dict):
        raise BenchError("iperf3 JSON 缺少 end 字段，无法解析结果")

    if normalized == "auto" and reverse not in (1, True, "1", "true", "True"):
        # 某些保存结果没有 test_start.reverse；只有一侧汇总时据此判断。
        if "sum_received" in end and "sum_sent" not in end:
            resolved = "down"
        elif "sum_sent" in end and "sum_received" not in end:
            resolved = "up"

    if resolved == "down":
        stats = end.get("sum_received") or end.get("sum") or {}
    else:
        stats = end.get("sum_sent") or end.get("sum") or {}
    if not isinstance(stats, dict) or not stats:
        raise BenchError(f"iperf3 JSON 缺少 {resolved} 方向的汇总结果")

    bits_per_second = _to_float(stats.get("bits_per_second"))
    seconds = _to_float(stats.get("seconds"))
    if bits_per_second is None:
        total_bytes = _to_float(stats.get("bytes"))
        if total_bytes is not None and seconds:
            bits_per_second = total_bytes * 8.0 / seconds
    if bits_per_second is None:
        raise BenchError("iperf3 JSON 缺少 bits_per_second/bytes，无法计算速率")

    interval_rates: List[float] = []
    for interval in data.get("intervals") or []:
        if not isinstance(interval, dict):
            continue
        sum_stats = interval.get("sum") or {}
        rate = _to_float(sum_stats.get("bits_per_second"))
        if rate is not None:
            interval_rates.append(rate / 1e6)

    sum_all = end.get("sum") if isinstance(end.get("sum"), dict) else {}
    sum_sent = end.get("sum_sent") if isinstance(end.get("sum_sent"), dict) else {}
    jitter = _to_float(sum_all.get("jitter_ms"))
    lost = _to_float(sum_all.get("lost_percent"))
    retransmits = _to_float(sum_sent.get("retransmits"))

    return {
        "direction": resolved,
        "mbps": bits_per_second / 1e6,
        "duration_s": seconds,
        "min_mbps": min(interval_rates) if interval_rates else bits_per_second / 1e6,
        "jitter_ms": jitter,
        "lost_percent": lost,
        "retransmits": retransmits,
        "source": source_name,
        "raw": data,
    }


def parse_rtt_source(source: Any) -> List[float]:
    """解析 RTT 样本：支持 JSON 列表/字典、CSV、纯文本或 ping 输出。"""
    if isinstance(source, (list, tuple)):
        values = [
            float(number)
            for number in (_to_float(item) for item in source)
            if number is not None
        ]
        if not values:
            raise BenchError("RTT 列表为空")
        return values

    if isinstance(source, dict):
        for key in ("rtts_ms", "rtt_ms", "rtts", "values", "samples", "rtt"):
            candidate = source.get(key)
            if isinstance(candidate, list):
                values = [
                    float(number)
                    for number in (_to_float(item) for item in candidate)
                    if number is not None
                ]
                if values:
                    return values
        raise BenchError("RTT JSON 中未找到 rtts_ms/rtt_ms/values 列表")

    path = Path(source)
    suffix = path.suffix.lower()
    text = path.read_text(encoding="utf-8-sig")

    if suffix == ".json":
        data = json.loads(text)
        return parse_rtt_source(data)

    if suffix == ".csv":
        rows = list(csv.reader(text.splitlines()))
        if not rows:
            raise BenchError("RTT CSV 为空")
        header = [item.strip().lower() for item in rows[0]]
        column = 0
        for index, name in enumerate(header):
            if any(token in name for token in ("rtt", "ms", "延迟", "时间")):
                column = index
                break
        values: List[float] = []
        for row in rows[1:]:
            if column < len(row):
                number = _to_float(row[column])
                if number is not None:
                    values.append(number)
        if not values:
            raise BenchError("RTT CSV 中未解析到数值")
        return values

    ping_values = re.findall(
        r"(?:time|时间)\s*[=<]\s*([0-9]+(?:\.[0-9]+)?)\s*ms", text, flags=re.IGNORECASE
    )
    if ping_values:
        return [float(item) for item in ping_values]

    values = []
    for line in text.splitlines():
        number = _to_float(line)
        if number is not None:
            values.append(number)
    if not values:
        raise BenchError("RTT 文本中未解析到数值")
    return values


def evaluate_targets(
    down_mbps: Optional[float],
    up_mbps: Optional[float],
    rtt_p95_ms: Optional[float],
) -> List[Dict[str, Any]]:
    """按方案 6.3 三档逐项判定。"""
    down_mbps = _to_float(down_mbps) if down_mbps is not None else None
    up_mbps = _to_float(up_mbps) if up_mbps is not None else None
    rtt_p95_ms = _to_float(rtt_p95_ms) if rtt_p95_ms is not None else None
    results: List[Dict[str, Any]] = []
    for tier in TIERS:
        missing: List[str] = []
        failed: List[str] = []
        if down_mbps is None:
            missing.append("下行")
        elif down_mbps < tier["down"]:
            failed.append(f"下行 {down_mbps:.2f} < {tier['down']:g} Mbps")
        if up_mbps is None:
            missing.append("上行")
        elif up_mbps < tier["up"]:
            failed.append(f"上行 {up_mbps:.2f} < {tier['up']:g} Mbps")
        if rtt_p95_ms is None:
            missing.append("RTT p95")
        elif rtt_p95_ms > tier["rtt"]:
            failed.append(f"RTT p95 {rtt_p95_ms:.2f} > {tier['rtt']:g} ms")

        if missing:
            status = "待测"
            reasons = "缺少" + "、".join(missing) + "结果"
        elif failed:
            status = "未达到设计目标"
            reasons = "；".join(failed)
        else:
            status = "达到设计目标"
            reasons = "三项均满足"

        results.append(
            {
                "scenario": tier["scenario"],
                "tier_note": tier["note"],
                "targets": {
                    "down_mbps": tier["down"],
                    "up_mbps": tier["up"],
                    "rtt_p95_ms": tier["rtt"],
                },
                "measured": {
                    "down_mbps": down_mbps,
                    "up_mbps": up_mbps,
                    "rtt_p95_ms": rtt_p95_ms,
                },
                "status": status,
                "reasons": reasons,
                "passed": status == "达到设计目标",
            }
        )
    return results


def _fmt(value: Optional[float], digits: int = 2) -> str:
    return "—" if value is None else f"{value:.{digits}f}"


def _target_text(tier: Dict[str, Any]) -> str:
    return (
        f"下行≥{tier['down_mbps']:g}、上行≥{tier['up_mbps']:g} Mbps、"
        f"RTT p95≤{tier['rtt_p95_ms']:g} ms"
    )


def render_markdown(
    results: Sequence[Dict[str, Any]],
    rtt_stats: Optional[Dict[str, Optional[float]]] = None,
    source_note: str = "",
) -> str:
    lines = [
        "## 第 3 组：方案 6.3 三档对照",
        "",
        f"> {TARGET_NOTE}；结果只对本次测试条件负责，不把不同信号条件拼成“最好值”。",
        "",
        "| 场景 | 方案 6.3 设计目标 | 实测下行 (Mbps) | 实测上行 (Mbps) | 实测 RTT p95 (ms) | 判定 | 说明 |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for item in results:
        measured = item["measured"]
        lines.append(
            "| {scenario} | {target} | {down} | {up} | {rtt} | {status} | {reasons} |".format(
                scenario=item["scenario"],
                target=_target_text(item["targets"]),
                down=_fmt(measured["down_mbps"]),
                up=_fmt(measured["up_mbps"]),
                rtt=_fmt(measured["rtt_p95_ms"]),
                status=item["status"],
                reasons=item["reasons"],
            )
        )
    lines.append("")
    if rtt_stats:
        lines.append(
            f"RTT 样本 n={rtt_stats.get('n', 0)}，p50={_fmt(rtt_stats.get('p50'))} ms，"
            f"p95={_fmt(rtt_stats.get('p95'))} ms，最大值={_fmt(rtt_stats.get('max'))} ms。"
        )
    else:
        lines.append("RTT 未提供/未测，三档判定为“待测”。")
    if source_note:
        lines.append(source_note)
    lines.append(
        "> 云串流、视频通话、串流+通话并发三档均以方案 v0.7 的 6.3 设计目标为准；"
        "未达时不修改阈值，保留原始数据并记录可能原因。"
    )
    return "\n".join(lines)


def _parse_json_text(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise BenchError("iperf3 输出不是有效 JSON；请检查 iperf3 版本与参数")


def run_iperf3(
    host: str,
    port: int = 5201,
    duration: int = 60,
    streams: int = 4,
    reverse: bool = False,
    protocol: str = "tcp",
    omit: int = 0,
) -> Dict[str, Any]:
    """调用系统 iperf3 并返回解析结果；没有 iperf3 时给出明确错误。"""
    executable = shutil.which("iperf3")
    if not executable:
        raise BenchError(
            "未找到 iperf3。实机测量请先安装 iperf3 并确保在 PATH 中；"
            "离线分析可改用 --from-json 读取已保存的 iperf3 JSON。"
        )

    command = [
        executable,
        "-c",
        host,
        "-p",
        str(port),
        "-t",
        str(duration),
        "-P",
        str(streams),
        "-J",
    ]
    if reverse:
        command.append("-R")
    if omit:
        command.extend(["-O", str(omit)])
    if protocol == "udp":
        command.extend(["-u", "-b", "0"])

    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=duration + 60,
        )
    except FileNotFoundError as exc:
        raise BenchError(
            "无法执行 iperf3；请安装 iperf3，或使用 --from-json 离线分析"
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise BenchError(f"iperf3 运行超时（>{duration + 60}s）") from exc

    if completed.returncode != 0 and not completed.stdout.strip():
        detail = (completed.stderr or completed.stdout).strip()[:400]
        raise BenchError(f"iperf3 运行失败（退出码 {completed.returncode}）：{detail}")

    data = _parse_json_text(completed.stdout)
    direction = "down" if reverse else "up"
    parsed = parse_iperf3_json(data, direction=direction)
    parsed["command"] = command
    parsed["stderr"] = completed.stderr
    return parsed


def ping_host(host: str, count: int = 300, interval: float = 0.2) -> List[float]:
    """调用系统 ping，解析 RTT（ms）。"""
    if os.name == "nt":
        command = ["ping", "-n", str(count), host]
    else:
        command = ["ping", "-c", str(count), "-i", str(interval), host]

    timeout = max(30.0, count * max(interval, 0.05) + 30.0)
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        raise BenchError("系统未找到 ping 命令；可改用 --probe udp") from exc
    except subprocess.TimeoutExpired as exc:
        raise BenchError(f"ping 运行超时（>{timeout:.0f}s）") from exc

    output = (completed.stdout or "") + "\n" + (completed.stderr or "")
    values = [
        float(match)
        for match in re.findall(
            r"(?:time|时间)\s*[=<]\s*([0-9]+(?:\.[0-9]+)?)\s*ms",
            output,
            flags=re.IGNORECASE,
        )
    ]
    if not values:
        detail = output.strip()[:400]
        raise BenchError(f"ping 未解析到 RTT：{detail or '无输出'}")
    return values


def udp_probe(
    host: str,
    port: int,
    count: int = 300,
    timeout: float = 0.5,
) -> Tuple[List[float], int]:
    """向 UDP 回声服务发探测包，返回 RTT 列表与丢包数。"""
    values: List[float] = []
    lost = 0
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        for _ in range(count):
            started = time.perf_counter()
            try:
                sock.sendto(b"NET_BENCH_RTT", (host, port))
                sock.recvfrom(1024)
                values.append((time.perf_counter() - started) * 1000.0)
            except (socket.timeout, OSError):
                lost += 1
    finally:
        sock.close()
    if not values:
        raise BenchError(
            "UDP 探测未收到回应；请确认目标主机与 --udp-port 上存在回声服务"
        )
    return values, lost


def _save_raw(directory: str, name: str, data: Any) -> None:
    path = Path(directory)
    path.mkdir(parents=True, exist_ok=True)
    (path / name).write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def run_bench(args: argparse.Namespace) -> int:
    direction = "down" if getattr(args, "reverse", False) else args.direction
    down: Optional[Dict[str, Any]] = None
    up: Optional[Dict[str, Any]] = None

    if direction in {"both", "down"}:
        down = run_iperf3(
            args.host,
            port=args.port,
            duration=args.duration,
            streams=args.streams,
            reverse=True,
            protocol=args.protocol,
            omit=args.omit,
        )
        if args.save_dir:
            _save_raw(args.save_dir, "iperf3_down.json", down["raw"])
        print(
            f"下行：{down['mbps']:.2f} Mbps（iperf3 --reverse，{args.duration}s，"
            f"{args.streams} 流）",
            file=sys.stderr,
        )
    if direction in {"both", "up"}:
        up = run_iperf3(
            args.host,
            port=args.port,
            duration=args.duration,
            streams=args.streams,
            reverse=False,
            protocol=args.protocol,
            omit=args.omit,
        )
        if args.save_dir:
            _save_raw(args.save_dir, "iperf3_up.json", up["raw"])
        print(
            f"上行：{up['mbps']:.2f} Mbps（{args.duration}s，{args.streams} 流）",
            file=sys.stderr,
        )

    rtt_values: Optional[List[float]] = None
    rtt_stats: Optional[Dict[str, Optional[float]]] = None
    if args.probe == "ping":
        try:
            rtt_values = ping_host(args.host, count=args.rtt_count, interval=args.interval)
        except BenchError as exc:
            print(f"警告：{exc}；RTT 记为未测。", file=sys.stderr)
    else:
        try:
            rtt_values, lost = udp_probe(
                args.host, args.udp_port, count=args.rtt_count, timeout=args.interval
            )
            print(f"UDP 探测：{len(rtt_values)} 个样本，丢包 {lost} 个", file=sys.stderr)
        except BenchError as exc:
            print(f"警告：{exc}；RTT 记为未测。", file=sys.stderr)

    if rtt_values:
        rtt_stats = rtt_summary(rtt_values)
        if args.save_dir:
            _save_raw(
                args.save_dir,
                "rtt.json",
                {
                    "rtts_ms": rtt_values,
                    "note": "由 net_bench.py 实测保存；原始数据不提交公开仓库",
                },
            )

    results = evaluate_targets(
        down["mbps"] if down else None,
        up["mbps"] if up else None,
        rtt_stats["p95"] if rtt_stats else None,
    )
    print(
        render_markdown(
            results,
            rtt_stats=rtt_stats,
            source_note=f"数据来源：{args.host}，测试时间 {time.strftime('%Y-%m-%d %H:%M:%S')}。",
        )
    )
    return 0


def analyze_offline(args: argparse.Namespace) -> int:
    down: Optional[Dict[str, Any]] = None
    up: Optional[Dict[str, Any]] = None

    if args.down_json:
        down = parse_iperf3_json(args.down_json, direction="down")
    if args.up_json:
        up = parse_iperf3_json(args.up_json, direction="up")

    from_json = list(args.from_json or [])
    for index, path in enumerate(from_json):
        direction = "auto"
        if len(from_json) == 1 and args.direction != "auto":
            direction = args.direction
        parsed = parse_iperf3_json(path, direction=direction)
        if parsed["direction"] == "down":
            if down is not None:
                raise BenchError("下行 iperf3 结果重复；请只保留一个下行 JSON")
            down = parsed
        else:
            if up is not None:
                raise BenchError("上行 iperf3 结果重复；请只保留一个上行 JSON")
            up = parsed

    if down is None and up is None:
        raise BenchError("未提供任何 iperf3 结果；请用 --from-json/--down-json/--up-json")

    rtt_stats: Optional[Dict[str, Optional[float]]] = None
    if args.rtt_json or args.rtt_csv:
        values = parse_rtt_source(args.rtt_json or args.rtt_csv)
        rtt_stats = rtt_summary(values)

    results = evaluate_targets(
        down["mbps"] if down else None,
        up["mbps"] if up else None,
        rtt_stats["p95"] if rtt_stats else None,
    )
    source_parts = []
    if down:
        source_parts.append(f"下行 JSON={down['source'] or '内存数据'}")
    if up:
        source_parts.append(f"上行 JSON={up['source'] or '内存数据'}")
    print(
        render_markdown(
            results,
            rtt_stats=rtt_stats,
            source_note="离线分析：" + "；".join(source_parts) + "。",
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="第 3 组 iperf3 持续速率 + RTT 对照方案 6.3 三档"
    )
    subparsers = parser.add_subparsers(dest="command")

    run_parser = subparsers.add_parser("run", help="调用系统 iperf3 与 ping/UDP 实测")
    run_parser.add_argument("--host", required=True, help="iperf3 服务器/探测目标")
    run_parser.add_argument("--port", type=int, default=5201, help="iperf3 端口")
    run_parser.add_argument("--duration", type=int, default=60, help="单向持续秒数")
    run_parser.add_argument("--streams", type=int, default=4, help="并发流数")
    run_parser.add_argument(
        "--direction",
        choices=["both", "down", "up"],
        default="both",
        help="both=先下行(--reverse)再上行；down=只测下行；up=只测上行",
    )
    run_parser.add_argument(
        "--reverse",
        action="store_true",
        help="只测下行（等价于 --direction down，iperf3 使用 -R）",
    )
    run_parser.add_argument("--protocol", choices=["tcp", "udp"], default="tcp")
    run_parser.add_argument("--omit", type=int, default=0, help="iperf3 预热忽略秒数")
    run_parser.add_argument("--probe", choices=["ping", "udp"], default="ping")
    run_parser.add_argument("--rtt-count", type=int, default=300, help="RTT 样本数")
    run_parser.add_argument("--interval", type=float, default=0.2, help="ping 间隔/ UDP 超时秒")
    run_parser.add_argument("--udp-port", type=int, default=5201, help="UDP 回声服务端口")
    run_parser.add_argument("--save-dir", help="保存 iperf3/RTT 原始 JSON 的目录")

    analyze_parser = subparsers.add_parser(
        "analyze", help="离线读取已保存的 iperf3 JSON / RTT JSON"
    )
    analyze_parser.add_argument(
        "--from-json",
        action="append",
        default=[],
        help="iperf3 JSON；可重复两次，方向按 reverse 或文件名自动判断",
    )
    analyze_parser.add_argument("--down-json", help="明确指定下行 iperf3 JSON")
    analyze_parser.add_argument("--up-json", help="明确指定上行 iperf3 JSON")
    analyze_parser.add_argument(
        "--direction",
        choices=["auto", "down", "up"],
        default="auto",
        help="仅一个 --from-json 时强制方向",
    )
    analyze_parser.add_argument("--rtt-json", help="RTT 样本 JSON")
    analyze_parser.add_argument("--rtt-csv", help="RTT 样本 CSV")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    args_list = list(sys.argv[1:] if argv is None else argv)
    if args_list and args_list[0] not in {"run", "analyze", "-h", "--help"}:
        if any(
            item == option or item.startswith(option + "=")
            for item in args_list
            for option in (
                "--from-json",
                "--down-json",
                "--up-json",
                "--rtt-json",
                "--rtt-csv",
            )
        ):
            args_list = ["analyze"] + args_list
        else:
            args_list = ["run"] + args_list

    parser = build_parser()
    args = parser.parse_args(args_list)
    if not args.command:
        parser.print_help()
        return 2
    if (
        args.command == "run"
        and getattr(args, "reverse", False)
        and getattr(args, "direction", "both") == "up"
    ):
        print("错误：--reverse 与 --direction up 冲突", file=sys.stderr)
        return 2

    try:
        if args.command == "run":
            return run_bench(args)
        return analyze_offline(args)
    except (BenchError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
