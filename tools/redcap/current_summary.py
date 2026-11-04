#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第 3 组电流波形汇总：平均/峰值电流、休眠窗口与周期。

用途：判断 eDRX/PSM 是否真的生效。方案 3.5.1 的判据是“电流波形出现与
请求/协商周期一致的休眠窗口”；仅 AT 返回“已设置”不算生效。

输入：功耗分析仪导出的电流 CSV，默认列为“时间 s”“电流 A”，可用参数改名。
输出：Markdown 表；含平均电流、峰值、休眠窗口数、中位周期，并与
--expected-period 比较。

只使用 Python 3.9+ 标准库。
"""

from __future__ import annotations

import argparse
import csv
import re
import statistics
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

DEFAULT_TIME_ALIASES = ["时间 s", "时间(s)", "时间", "time_s", "time"]
DEFAULT_CURRENT_ALIASES = ["电流 A", "电流(A)", "电流", "current_a", "current"]


def _norm_header(value: str) -> str:
    text = (value or "").replace("\ufeff", "")
    text = re.sub(r"\s+", "", text)
    return text.replace("（", "(").replace("）", ")")


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


def _find_column(fieldnames: Sequence[str], wanted: Optional[str], aliases: Sequence[str]) -> str:
    normalized = {_norm_header(name): name for name in fieldnames}
    candidates: List[str] = []
    if wanted:
        candidates.append(wanted)
    candidates.extend(aliases)
    for candidate in candidates:
        key = _norm_header(candidate)
        if key in normalized:
            return normalized[key]
    available = "、".join(str(name) for name in fieldnames)
    raise ValueError(f"找不到列“{wanted or aliases[0]}”；可用列：{available}")


def read_current_csv(
    path: str | Path,
    time_col: Optional[str] = None,
    current_col: Optional[str] = None,
) -> Tuple[List[float], List[float], Dict[str, Any]]:
    """读取电流 CSV，返回按时间排序的 times/currents 与元数据。"""
    csv_path = Path(path)
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        lines = [line for line in handle if not line.lstrip().startswith("#")]
    reader = csv.DictReader(lines)
    if not reader.fieldnames:
        raise ValueError("电流 CSV 没有表头")

    time_key = _find_column(reader.fieldnames, time_col, DEFAULT_TIME_ALIASES)
    current_key = _find_column(reader.fieldnames, current_col, DEFAULT_CURRENT_ALIASES)

    pairs: List[Tuple[float, float]] = []
    skipped = 0
    for row in reader:
        time_value = _to_float(row.get(time_key))
        current_value = _to_float(row.get(current_key))
        if time_value is None or current_value is None:
            skipped += 1
            continue
        pairs.append((time_value, current_value))

    if not pairs:
        raise ValueError("电流 CSV 中没有可解析的数值行")
    pairs.sort(key=lambda item: item[0])
    times = [item[0] for item in pairs]
    currents = [item[1] for item in pairs]
    return times, currents, {
        "time_col": time_key,
        "current_col": current_key,
        "rows": len(pairs),
        "skipped": skipped,
    }


def detect_sleep_windows(
    times: Sequence[float],
    currents: Sequence[float],
    threshold: float,
    min_duration: float = 0.0,
) -> List[Dict[str, float]]:
    """检测电流严格低于 threshold 的连续窗口。

    时长 = 窗口内最后一个低电流采样点 - 第一个低电流采样点；不外推采样间隔。
    单点窗口时长为 0；可用 min_duration 过滤。
    """
    if len(times) != len(currents):
        raise ValueError("times 与 currents 长度不一致")
    if not times:
        return []
    if threshold <= 0:
        raise ValueError("threshold 必须大于 0")

    pairs = sorted(zip(times, currents), key=lambda item: item[0])
    windows: List[Dict[str, float]] = []
    start_index: Optional[int] = None

    def close_window(end_index: int) -> None:
        nonlocal start_index
        if start_index is None:
            return
        segment = pairs[start_index : end_index + 1]
        start_time = segment[0][0]
        end_time = segment[-1][0]
        duration = end_time - start_time
        if duration + 1e-12 >= min_duration:
            values = [item[1] for item in segment]
            windows.append(
                {
                    "start_s": start_time,
                    "end_s": end_time,
                    "duration_s": duration,
                    "n_samples": len(segment),
                    "min_current_a": min(values),
                    "mean_current_a": sum(values) / len(values),
                }
            )
        start_index = None

    for index, (_, current) in enumerate(pairs):
        if current < threshold:
            if start_index is None:
                start_index = index
        else:
            if start_index is not None:
                close_window(index - 1)
    if start_index is not None:
        close_window(len(pairs) - 1)
    return windows


def compute_summary(
    times: Sequence[float],
    currents: Sequence[float],
    threshold: float,
    min_duration: float = 0.0,
    expected_period: Optional[float] = None,
    tolerance: float = 0.10,
) -> Dict[str, Any]:
    """计算平均/峰值、休眠窗口、周期，并与请求周期比较。"""
    if len(times) != len(currents):
        raise ValueError("times 与 currents 长度不一致")
    if not times:
        raise ValueError("没有电流样本")
    if expected_period is not None and expected_period <= 0:
        raise ValueError("expected_period 必须大于 0")
    if tolerance < 0:
        raise ValueError("tolerance 不能为负")

    pairs = sorted(zip(times, currents), key=lambda item: item[0])
    sorted_times = [item[0] for item in pairs]
    sorted_currents = [item[1] for item in pairs]
    windows = detect_sleep_windows(
        sorted_times, sorted_currents, threshold, min_duration=min_duration
    )

    periods = [
        windows[index]["start_s"] - windows[index - 1]["start_s"]
        for index in range(1, len(windows))
    ]
    median_period = statistics.median(periods) if periods else None
    median_window = (
        statistics.median([item["duration_s"] for item in windows]) if windows else None
    )
    span = sorted_times[-1] - sorted_times[0] if len(sorted_times) > 1 else 0.0
    sleep_time = sum(item["duration_s"] for item in windows)
    duty_cycle = (sleep_time / span) if span > 0 else None

    period_diff: Optional[float] = None
    period_diff_pct: Optional[float] = None
    period_within: Optional[bool] = None
    if expected_period is not None and median_period is not None:
        period_diff = median_period - expected_period
        period_diff_pct = period_diff / expected_period * 100.0
        period_within = abs(period_diff) <= max(tolerance * expected_period, 1e-9)

    return {
        "n": len(sorted_times),
        "duration_s": span,
        "average_current_a": sum(sorted_currents) / len(sorted_currents),
        "peak_current_a": max(sorted_currents),
        "min_current_a": min(sorted_currents),
        "threshold_a": threshold,
        "windows": windows,
        "window_count": len(windows),
        "periods_s": periods,
        "median_period_s": median_period,
        "median_window_duration_s": median_window,
        "duty_cycle": duty_cycle,
        "expected_period_s": expected_period,
        "tolerance": tolerance,
        "period_diff_s": period_diff,
        "period_diff_pct": period_diff_pct,
        "period_within": period_within,
    }


def _fmt(value: Optional[float], digits: int = 6) -> str:
    return "—" if value is None else f"{value:.{digits}f}"


def _fmt_seconds(value: Optional[float]) -> str:
    return "—" if value is None else f"{value:.3f}"


def render_markdown(summary: Dict[str, Any], meta: Optional[Dict[str, Any]] = None) -> str:
    lines = [
        "## 第 3 组：电流波形汇总",
        "",
        "| 指标 | 数值 |",
        "| --- | --- |",
        f"| 样本数 | {summary['n']} |",
        f"| 统计时长 | {_fmt_seconds(summary['duration_s'])} s |",
        f"| 平均电流 | {_fmt(summary['average_current_a'])} A |",
        f"| 峰值电流 | {_fmt(summary['peak_current_a'])} A |",
        f"| 最小电流 | {_fmt(summary['min_current_a'])} A |",
        f"| 休眠阈值（电流 < 阈值） | {_fmt(summary['threshold_a'])} A |",
        f"| 休眠窗口数 | {summary['window_count']} |",
        f"| 休眠窗口时长中位数 | {_fmt_seconds(summary['median_window_duration_s'])} s |",
        f"| 休眠占空比 | "
        + ("—" if summary["duty_cycle"] is None else f"{summary['duty_cycle'] * 100:.2f}%")
        + " |",
        f"| 中位周期 | {_fmt_seconds(summary['median_period_s'])} s |",
    ]

    expected = summary.get("expected_period_s")
    if expected is None:
        lines.append("| 请求周期 | 未提供 |")
        lines.append("| 与请求周期比较 | 未比较（未提供 --expected-period） |")
    else:
        lines.append(f"| 请求周期 | {expected:.3f} s |")
        if summary["median_period_s"] is None:
            lines.append("| 与请求周期比较 | 无法比较（休眠窗口少于 2 个或未检测到） |")
        else:
            status = "一致" if summary["period_within"] else "不一致"
            lines.append(
                "| 与请求周期比较 | {status}（偏差 {diff:+.3f} s，{pct:+.1f}%；容差 ±{tol:.0f}%） |".format(
                    status=status,
                    diff=summary["period_diff_s"] or 0.0,
                    pct=summary["period_diff_pct"] or 0.0,
                    tol=summary["tolerance"] * 100,
                )
            )

    if summary["windows"]:
        lines.extend(
            [
                "",
                "### 检测到的休眠窗口",
                "",
                "| 窗口 | 开始 (s) | 结束 (s) | 时长 (s) | 最低电流 (A) |",
                "| --- | --- | --- | --- | --- |",
            ]
        )
        for index, window in enumerate(summary["windows"], start=1):
            lines.append(
                f"| {index} | {window['start_s']:.3f} | {window['end_s']:.3f} | "
                f"{window['duration_s']:.3f} | {window['min_current_a']:.6f} |"
            )

    lines.extend(
        [
            "",
            "> 休眠窗口按“电流严格低于阈值且连续采样”判定；时长取首末低电流采样点之差，"
            "不外推采样间隔。单点窗口时长为 0，可用 --min-duration 过滤。",
        ]
    )
    if meta:
        lines.append(
            f"> 输入列：时间={meta['time_col']}，电流={meta['current_col']}；"
            f"有效行 {meta['rows']}，跳过 {meta['skipped']} 行。"
        )
    if expected is not None and summary["median_period_s"] is not None:
        if summary["period_within"]:
            lines.append(
                "> 结论：电流波形出现与请求周期一致的休眠窗口，可记为“观察到生效”；"
                "仍需同时记录 AT 协商值、判定人与原始波形编号。"
            )
        else:
            lines.append(
                "> 结论：未观察到与请求周期一致的休眠窗口；不能仅凭 AT 返回“已设置”记为生效。"
            )
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="第 3 组电流 CSV 汇总：平均/峰值、休眠窗口、周期与请求周期比较"
    )
    parser.add_argument("csv", help="功耗分析仪导出的电流 CSV（默认列：时间 s、电流 A）")
    parser.add_argument("--threshold", type=float, required=True, help="休眠判定阈值，单位 A")
    parser.add_argument("--time-col", default=None, help="时间列名，默认自动识别“时间 s”")
    parser.add_argument("--current-col", default=None, help="电流列名，默认自动识别“电流 A”")
    parser.add_argument(
        "--min-duration",
        type=float,
        default=0.0,
        help="休眠窗口最短时长秒数，默认 0（不过滤）",
    )
    parser.add_argument(
        "--expected-period",
        type=float,
        default=None,
        help="请求/协商的 eDRX 或 PSM 周期，单位 s",
    )
    parser.add_argument(
        "--tolerance",
        type=float,
        default=0.10,
        help="周期一致性容差（比例），默认 0.10 即 ±10%%",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        times, currents, meta = read_current_csv(
            args.csv, time_col=args.time_col, current_col=args.current_col
        )
        summary = compute_summary(
            times,
            currents,
            threshold=args.threshold,
            min_duration=args.min_duration,
            expected_period=args.expected_period,
            tolerance=args.tolerance,
        )
    except (OSError, ValueError, csv.Error) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2
    print(render_markdown(summary, meta=meta))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
