#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第 1 组延迟原始记录统计（表 1-2 -> 表 1-3）。

约定：
- 只统计“有效=是”的样本；无效样本保留在原始表中，统计时排除并计数。
- p50 / p95 使用 nearest-rank：排序后取第 ceil(p * n) 个样本。
- 有效样本 n < 30 时，在备注中标注“样本不足”。
- 漂移对比默认比较同一条件“0–5 min”与“25–30 min”两段的 p95。

只使用 Python 3.9+ 标准库。
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

SUMMARY_FIELDS = [
    "条件编号",
    "路径",
    "编码/码率",
    "分辨率/刷新",
    "样本数 n",
    "p50 (ms)",
    "p95 (ms)",
    "最大值 (ms)",
    "备注",
]

DRIFT_FIELDS = [
    "条件编号",
    "早段 n",
    "早段 p50 (ms)",
    "早段 p95 (ms)",
    "晚段 n",
    "晚段 p50 (ms)",
    "晚段 p95 (ms)",
    "漂移 (ms)",
    "漂移 (%)",
    "备注",
]

MIN_SAMPLES = 30


def _norm_header(value: str) -> str:
    """归一化表头：去空白、去 BOM、统一中英文括号。"""
    text = (value or "").replace("\ufeff", "")
    text = re.sub(r"\s+", "", text)
    text = text.replace("（", "(").replace("）", ")")
    return text


def _pick(row: Dict[str, str], aliases: Sequence[str]) -> str:
    """按别名从一行原始 CSV 中取值；表头已做归一化比较。"""
    wanted = {_norm_header(item) for item in aliases}
    for key, value in row.items():
        if key is not None and _norm_header(key) in wanted:
            return (value or "").strip()
    return ""


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
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


def _parse_valid(value: str) -> bool:
    text = (value or "").strip().lower()
    return text in {"是", "yes", "y", "true", "1", "有效"}


def _parse_datetime(value: str) -> Optional[datetime]:
    text = (value or "").strip()
    if not text:
        return None
    normalized = text.replace("Z", "+00:00").replace("z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass
    for fmt in (
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S.%f",
        "%Y/%m/%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _timestamp_seconds(value: str) -> Optional[float]:
    """把时间戳转成可比较的秒数。

    支持 ISO 日期时间、纯数字（performance.now 毫秒或 epoch 秒）和
    HH:MM:SS(.fff) 时刻。仅用于同一条件内求相对时间。
    """
    text = (value or "").strip()
    if not text:
        return None
    number = _to_float(text)
    if number is not None and re.fullmatch(
        r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?", text.replace(",", "")
    ):
        return number
    dt = _parse_datetime(text)
    if dt is not None:
        try:
            return dt.timestamp()
        except (OverflowError, OSError, ValueError):
            return None
    match = re.fullmatch(r"(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?", text)
    if match:
        hour, minute, second = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
        fraction = match.group(4) or "0"
        return hour * 3600 + minute * 60 + second + float("0." + fraction)
    return None


def _derive_latency_ms(input_ts: str, display_ts: str) -> Optional[float]:
    """延迟列缺失时，尽量从输入/显示时间戳推导；无法判断单位则返回 None。"""
    input_dt = _parse_datetime(input_ts)
    display_dt = _parse_datetime(display_ts)
    if input_dt is not None and display_dt is not None:
        delta = (display_dt - input_dt).total_seconds() * 1000.0
        return delta if delta >= 0 else None

    start = _to_float(input_ts)
    end = _to_float(display_ts)
    if start is None or end is None or end < start:
        return None
    # performance.now() 是毫秒；epoch 秒通常在 1e9 量级。
    if max(start, end) > 1e9:
        return (end - start) * 1000.0
    if max(start, end) < 1e8:
        return end - start
    return None


def read_latency_csv(path: str | Path) -> List[Dict[str, Any]]:
    """读取表 1-2 格式 CSV，返回统一字段的原始记录。"""
    rows: List[Dict[str, Any]] = []
    csv_path = Path(path)
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("CSV 没有表头，无法按表 1-2 解析")
        for raw in reader:
            latency = _to_float(_pick(raw, ["延迟 (ms)", "延迟(ms)", "延迟", "latency_ms"]))
            input_ts = _pick(raw, ["输入/动作时间戳", "输入/动作时间", "输入时间戳", "input_ts"])
            display_ts = _pick(
                raw, ["显示边沿时间戳", "显示边沿时间", "显示时间戳", "display_ts"]
            )
            if latency is None and input_ts and display_ts:
                latency = _derive_latency_ms(input_ts, display_ts)
            condition = _pick(raw, ["条件编号", "条件", "condition"]) or "(未填条件编号)"
            rows.append(
                {
                    "sample": _pick(raw, ["样本号", "样本编号", "sample"]),
                    "condition": condition,
                    "path": _pick(raw, ["路径", "path"]),
                    "item": _pick(raw, ["测试项", "item"]),
                    "collected_at": _pick(raw, ["采集时间", "采集时间戳", "collected_at"]),
                    "input_ts": input_ts,
                    "display_ts": display_ts,
                    "latency_ms": latency,
                    "frame": _pick(raw, ["帧号/场次", "帧号", "场次", "frame"]),
                    "is_valid": _parse_valid(_pick(raw, ["有效", "valid"])),
                    "valid_raw": _pick(raw, ["有效", "valid"]),
                    "note": _pick(raw, ["无效原因/备注", "备注", "note"]),
                    "period": _pick(raw, ["时段", "period"]),
                    "encoding": _pick(raw, ["编码/码率", "编码", "codec_bitrate"]),
                    "resolution": _pick(raw, ["分辨率/刷新", "分辨率", "resolution_refresh"]),
                }
            )
    return rows


def nearest_rank(values: Sequence[float], percentile: float) -> Optional[float]:
    """nearest-rank 分位数；内部先排序，输入顺序不限。"""
    ordered = sorted(float(item) for item in values)
    count = len(ordered)
    if count == 0:
        return None
    if not 0 < percentile <= 1:
        raise ValueError("percentile 必须在 (0, 1] 内")
    rank = max(1, int(math.ceil(percentile * count - 1e-9)))
    return ordered[min(rank - 1, count - 1)]


def compute_stats(values: Iterable[float]) -> Dict[str, Any]:
    """计算 n、p50、p95、最大值；nearest-rank。"""
    clean = sorted(float(item) for item in values if item is not None)
    count = len(clean)
    if count == 0:
        return {
            "n": 0,
            "p50": None,
            "p95": None,
            "max": None,
            "min": None,
            "insufficient": True,
        }
    return {
        "n": count,
        "p50": nearest_rank(clean, 0.50),
        "p95": nearest_rank(clean, 0.95),
        "max": clean[-1],
        "min": clean[0],
        "insufficient": count < MIN_SAMPLES,
    }


def summarize(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """按条件编号汇总；只统计“有效=是”且有延迟值的样本。"""
    grouped: "OrderedDict[str, List[Dict[str, Any]]]" = OrderedDict()
    for row in rows:
        grouped.setdefault(str(row.get("condition") or "(未填条件编号)"), []).append(row)

    summaries: List[Dict[str, Any]] = []
    for condition, group in grouped.items():
        valid_rows = [
            row
            for row in group
            if row.get("is_valid") and row.get("latency_ms") is not None
        ]
        invalid_count = sum(1 for row in group if not row.get("is_valid"))
        missing_latency = sum(
            1 for row in group if row.get("is_valid") and row.get("latency_ms") is None
        )
        stats = compute_stats([row["latency_ms"] for row in valid_rows])
        notes: List[str] = []
        if invalid_count:
            notes.append(f"无效 {invalid_count} 条已排除")
        if missing_latency:
            notes.append(f"有效但缺延迟值 {missing_latency} 条已排除")
        if stats["insufficient"]:
            notes.append(f"样本不足（n={stats['n']}，建议≥{MIN_SAMPLES}）")
        summaries.append(
            {
                "condition": condition,
                "path": next((row.get("path", "") for row in group if row.get("path")), ""),
                "encoding": next(
                    (row.get("encoding", "") for row in group if row.get("encoding")), ""
                ),
                "resolution": next(
                    (row.get("resolution", "") for row in group if row.get("resolution")), ""
                ),
                "n": stats["n"],
                "p50": stats["p50"],
                "p95": stats["p95"],
                "max": stats["max"],
                "min": stats["min"],
                "insufficient": stats["insufficient"],
                "invalid_count": invalid_count,
                "missing_latency": missing_latency,
                "total_rows": len(group),
                "note": "；".join(notes),
            }
        )
    return summaries


def _parse_period_label(label: str) -> Optional[Tuple[float, float]]:
    text = (label or "").strip().lower()
    text = text.replace("–", "-").replace("—", "-").replace("～", "-").replace("~", "-")
    text = text.replace("至", "-").replace(" ", "")
    match = re.match(
        r"^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(?:min|分钟|分)?$", text, re.IGNORECASE
    )
    if not match:
        return None
    return float(match.group(1)), float(match.group(2))


def _period_category(
    label: str, early: Tuple[float, float], late: Tuple[float, float]
) -> Optional[str]:
    parsed = _parse_period_label(label)
    if parsed is None:
        return None
    start, end = parsed
    if start >= early[0] - 1e-9 and end <= early[1] + 1e-9:
        return "early"
    if start >= late[0] - 1e-9 and end <= late[1] + 1e-9:
        return "late"
    return None


def _time_category(
    value: str,
    base: Optional[float],
    early: Tuple[float, float],
    late: Tuple[float, float],
) -> Optional[str]:
    seconds = _timestamp_seconds(value)
    if seconds is None or base is None:
        return None
    minutes = (seconds - base) / 60.0
    if early[0] - 1e-9 <= minutes <= early[1] + 1e-9:
        return "early"
    if late[0] - 1e-9 <= minutes <= late[1] + 1e-9:
        return "late"
    return None


def drift_analysis(
    rows: Iterable[Dict[str, Any]],
    time_col: Optional[str] = None,
    early: Tuple[float, float] = (0.0, 5.0),
    late: Tuple[float, float] = (25.0, 30.0),
) -> List[Dict[str, Any]]:
    """比较同一条件早段与晚段 p95。

    time_col 为 None 时优先用“时段”列，缺失则用“采集时间”相对首样本的分钟数。
    time_col 可显式指定“时段”或“采集时间”。
    """
    if time_col is not None and time_col not in {"时段", "采集时间"}:
        raise ValueError("time_col 只支持“时段”或“采集时间”")

    grouped: "OrderedDict[str, List[Dict[str, Any]]]" = OrderedDict()
    for row in rows:
        grouped.setdefault(str(row.get("condition") or "(未填条件编号)"), []).append(row)

    any_time_info = False
    results: List[Dict[str, Any]] = []
    for condition, group in grouped.items():
        use_period: Optional[bool]
        if time_col == "时段":
            use_period = True
        elif time_col == "采集时间":
            use_period = False
        else:
            use_period = None

        timestamps = [_timestamp_seconds(row.get("collected_at", "")) for row in group]
        base = min((item for item in timestamps if item is not None), default=None)

        early_rows: List[Dict[str, Any]] = []
        late_rows: List[Dict[str, Any]] = []
        invalid_count = 0

        for row, timestamp in zip(group, timestamps):
            category: Optional[str] = None
            period_label = row.get("period", "")
            if use_period is not False and period_label:
                category = _period_category(period_label, early, late)
            if category is None and use_period is not True:
                category = _time_category(row.get("collected_at", ""), base, early, late)
            if category is not None:
                any_time_info = True
            if not row.get("is_valid"):
                invalid_count += 1
                continue
            if row.get("latency_ms") is None:
                continue
            if category == "early":
                early_rows.append(row)
            elif category == "late":
                late_rows.append(row)

        early_stats = compute_stats([row["latency_ms"] for row in early_rows])
        late_stats = compute_stats([row["latency_ms"] for row in late_rows])
        notes: List[str] = []
        if invalid_count:
            notes.append(f"无效 {invalid_count} 条已排除")
        if early_stats["n"] == 0:
            notes.append("缺少早段（0–5 min）有效样本")
        if late_stats["n"] == 0:
            notes.append("缺少晚段（25–30 min）有效样本")
        if early_stats["insufficient"] or late_stats["insufficient"]:
            notes.append("样本不足（每段建议≥30）")

        drift_ms: Optional[float] = None
        drift_pct: Optional[float] = None
        if early_stats["p95"] is not None and late_stats["p95"] is not None:
            drift_ms = late_stats["p95"] - early_stats["p95"]
            if early_stats["p95"] != 0:
                drift_pct = drift_ms / early_stats["p95"] * 100.0

        results.append(
            {
                "condition": condition,
                "early_n": early_stats["n"],
                "early_p50": early_stats["p50"],
                "early_p95": early_stats["p95"],
                "late_n": late_stats["n"],
                "late_p50": late_stats["p50"],
                "late_p95": late_stats["p95"],
                "drift_ms": drift_ms,
                "drift_pct": drift_pct,
                "note": "；".join(notes),
            }
        )

    if not any_time_info:
        raise ValueError(
            "漂移对比需要“时段”或“采集时间”列；当前数据无法划分 0–5 min 与 25–30 min"
        )
    return results


def _fmt(value: Optional[float], digits: int = 2) -> str:
    if value is None:
        return "—"
    return f"{value:.{digits}f}"


def _md(value: Any) -> str:
    return str(value if value not in (None, "") else "—").replace("|", "/")


def render_summary_markdown(summaries: Sequence[Dict[str, Any]]) -> str:
    lines = [
        "## 表 1-3 延迟汇总（nearest-rank p95）",
        "",
        "| 条件编号 | 路径 | 编码/码率 | 分辨率/刷新 | 样本数 n | p50 (ms) | p95 (ms) | 最大值 (ms) | 备注 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for item in summaries:
        lines.append(
            "| {condition} | {path} | {encoding} | {resolution} | {n} | {p50} | {p95} | {max} | {note} |".format(
                condition=_md(item["condition"]),
                path=_md(item["path"]),
                encoding=_md(item["encoding"]),
                resolution=_md(item["resolution"]),
                n=item["n"],
                p50=_fmt(item["p50"]),
                p95=_fmt(item["p95"]),
                max=_fmt(item["max"]),
                note=_md(item["note"]),
            )
        )
    lines.append("")
    lines.append(
        "> p95 = 排序后第 ceil(0.95n) 个样本；只统计“有效=是”。n<30 的条件已在备注标注“样本不足”。"
    )
    return "\n".join(lines)


def render_drift_markdown(results: Sequence[Dict[str, Any]]) -> str:
    lines = [
        "## 时段 p95 漂移（0–5 min vs 25–30 min，nearest-rank）",
        "",
        "| 条件编号 | 早段 n | 早段 p50 (ms) | 早段 p95 (ms) | 晚段 n | 晚段 p50 (ms) | 晚段 p95 (ms) | 漂移 (ms) | 漂移 (%) | 备注 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for item in results:
        lines.append(
            "| {condition} | {early_n} | {early_p50} | {early_p95} | {late_n} | {late_p50} | {late_p95} | {drift_ms} | {drift_pct} | {note} |".format(
                condition=_md(item["condition"]),
                early_n=item["early_n"],
                early_p50=_fmt(item["early_p50"]),
                early_p95=_fmt(item["early_p95"]),
                late_n=item["late_n"],
                late_p50=_fmt(item["late_p50"]),
                late_p95=_fmt(item["late_p95"]),
                drift_ms=_fmt(item["drift_ms"]),
                drift_pct=_fmt(item["drift_pct"], 1),
                note=_md(item["note"]),
            )
        )
    lines.append("")
    lines.append("> 漂移 = 晚段 p95 − 早段 p95；正值为变差。漂移阈值方案未给，按“待定”处理。")
    return "\n".join(lines)


def write_summary_csv(summaries: Sequence[Dict[str, Any]], path: str | Path) -> None:
    with Path(path).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=SUMMARY_FIELDS)
        writer.writeheader()
        for item in summaries:
            writer.writerow(
                {
                    "条件编号": item["condition"],
                    "路径": item["path"],
                    "编码/码率": item["encoding"],
                    "分辨率/刷新": item["resolution"],
                    "样本数 n": item["n"],
                    "p50 (ms)": _fmt(item["p50"], 3),
                    "p95 (ms)": _fmt(item["p95"], 3),
                    "最大值 (ms)": _fmt(item["max"], 3),
                    "备注": item["note"],
                }
            )


def write_drift_csv(results: Sequence[Dict[str, Any]], path: str | Path) -> None:
    with Path(path).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=DRIFT_FIELDS)
        writer.writeheader()
        for item in results:
            writer.writerow(
                {
                    "条件编号": item["condition"],
                    "早段 n": item["early_n"],
                    "早段 p50 (ms)": _fmt(item["early_p50"], 3),
                    "早段 p95 (ms)": _fmt(item["early_p95"], 3),
                    "晚段 n": item["late_n"],
                    "晚段 p50 (ms)": _fmt(item["late_p50"], 3),
                    "晚段 p95 (ms)": _fmt(item["late_p95"], 3),
                    "漂移 (ms)": _fmt(item["drift_ms"], 3),
                    "漂移 (%)": _fmt(item["drift_pct"], 1),
                    "备注": item["note"],
                }
            )


def _write_text(path: Optional[str], text: str) -> None:
    if path:
        Path(path).write_text(text + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="第 1 组延迟统计：表 1-2 CSV -> 表 1-3 汇总 / 时段 p95 漂移"
    )
    subparsers = parser.add_subparsers(dest="command")
    summarize_parser = subparsers.add_parser("summarize", help="按条件汇总 p50/p95/最大值")
    summarize_parser.add_argument("csv", help="表 1-2 格式的 UTF-8 CSV")
    summarize_parser.add_argument("--csv-out", "--csv", dest="csv_out", help="输出汇总 CSV")
    summarize_parser.add_argument("--markdown-out", help="输出 Markdown 文件")
    drift_parser = subparsers.add_parser("drift", help="比较 0–5 min 与 25–30 min 的 p95")
    drift_parser.add_argument("csv", help="表 1-2 格式的 UTF-8 CSV")
    drift_parser.add_argument(
        "--time-col",
        default=None,
        help="用于分段的列：时段 / 采集时间；不填则优先时段，缺失时用采集时间",
    )
    drift_parser.add_argument("--csv-out", "--csv", dest="csv_out", help="输出漂移 CSV")
    drift_parser.add_argument("--markdown-out", help="输出 Markdown 文件")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    args_list = list(sys.argv[1:] if argv is None else argv)
    parser = build_parser()
    if args_list and args_list[0] not in {"summarize", "drift", "-h", "--help"}:
        args_list = ["summarize"] + args_list
    args = parser.parse_args(args_list)
    if not args.command:
        parser.print_help()
        return 2

    try:
        rows = read_latency_csv(args.csv)
        if args.command == "summarize":
            summaries = summarize(rows)
            markdown = render_summary_markdown(summaries)
            if args.csv_out:
                write_summary_csv(summaries, args.csv_out)
        else:
            results = drift_analysis(rows, time_col=args.time_col)
            markdown = render_drift_markdown(results)
            if args.csv_out:
                write_drift_csv(results, args.csv_out)
    except (OSError, ValueError, csv.Error) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2

    print(markdown)
    _write_text(args.markdown_out, markdown)
    if args.csv_out:
        print(f"\nCSV 已写入：{args.csv_out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
