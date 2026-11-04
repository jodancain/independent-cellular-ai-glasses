#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第 6 组人体工学汇总：称重/受力 + 主观评分（表 6-7 两张表）。

称重与受力表：
- 前后重量比 = 前框 ÷（左镜腿 + 右镜腿）；
- 左右镜腿重量差，>3 g 标出；
- 各样品鼻托受力；
- 指定对标样品后，判断其他样品鼻托受力是否 ≤ 对标实测值。

主观评分表：
- 按样品汇总 30/60/90/120 min 各时间点均值与最低值。

只使用 Python 3.9+ 标准库。
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import OrderedDict
from pathlib import Path
from statistics import mean
from typing import Any, Dict, List, Optional, Sequence, Tuple

ASYM_LIMIT_G = 3.0

WEIGHT_ALIASES = {
    "sample": ["样品", "样品名", "sample"],
    "total_g": ["总重 (g)", "总重(g)", "总重", "总重量", "total_g"],
    "front_g": ["前框 (g)", "前框(g)", "前框", "front_g"],
    "left_g": ["左镜腿 (g)", "左镜腿(g)", "左镜腿", "left_g"],
    "right_g": ["右镜腿 (g)", "右镜腿(g)", "右镜腿", "right_g"],
    "nose_g": ["鼻托受力 (g 力)", "鼻托受力(g 力)", "鼻托受力(g力)", "鼻托受力", "nose_g"],
    "left_ear_g": ["左耳 (g 力)", "左耳(g 力)", "左耳(g力)", "左耳", "left_ear_g"],
    "right_ear_g": ["右耳 (g 力)", "右耳(g 力)", "右耳(g力)", "右耳", "right_ear_g"],
    "slip_mm": ["下滑 (mm)", "下滑(mm)", "下滑", "slip_mm"],
    "note": ["备注", "note"],
}

SCORE_ALIASES = {
    "sample": ["样品", "样品名", "sample"],
    "subject": ["受试者编号", "受试者", "subject"],
    "nose_pressure": ["鼻梁压感", "鼻梁压感评分", "nose_pressure"],
    "ear_pressure": ["耳后压感", "耳后压感评分", "ear_pressure"],
    "mark": ["压痕", "mark"],
    "note": ["备注", "note"],
}


def _norm_header(value: str) -> str:
    text = (value or "").replace("\ufeff", "")
    text = re.sub(r"\s+", "", text)
    return text.replace("（", "(").replace("）", ")")


def _find_column(fieldnames: Sequence[str], aliases: Sequence[str], label: str) -> str:
    normalized = {_norm_header(name): name for name in fieldnames}
    for alias in aliases:
        key = _norm_header(alias)
        if key in normalized:
            return normalized[key]
    available = "、".join(str(name) for name in fieldnames)
    raise ValueError(f"找不到“{label}”列；可用列：{available}")


def _find_optional_column(
    fieldnames: Sequence[str], aliases: Sequence[str]
) -> Optional[str]:
    normalized = {_norm_header(name): name for name in fieldnames}
    for alias in aliases:
        key = _norm_header(alias)
        if key in normalized:
            return normalized[key]
    return None


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


def _text(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_weights_csv(path: str | Path) -> List[Dict[str, Any]]:
    """读取表 6-7 称重与受力表。"""
    csv_path = Path(path)
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("称重与受力 CSV 没有表头")
        required = {
            name: _find_column(reader.fieldnames, aliases, name)
            for name, aliases in WEIGHT_ALIASES.items()
            if name in {"sample", "front_g", "left_g", "right_g", "nose_g"}
        }
        optional = {
            name: _find_optional_column(reader.fieldnames, aliases)
            for name, aliases in WEIGHT_ALIASES.items()
            if name not in required
        }
        rows: List[Dict[str, Any]] = []
        for raw in reader:
            sample = _text(raw.get(required["sample"]))
            if not sample:
                continue

            def value(name: str, parser: Any = _to_float) -> Any:
                column = required.get(name) or optional.get(name)
                return parser(raw.get(column)) if column else parser(None)

            rows.append(
                {
                    "sample": sample,
                    "total_g": value("total_g"),
                    "front_g": value("front_g"),
                    "left_g": value("left_g"),
                    "right_g": value("right_g"),
                    "nose_g": value("nose_g"),
                    "left_ear_g": value("left_ear_g"),
                    "right_ear_g": value("right_ear_g"),
                    "slip_mm": value("slip_mm"),
                    "note": value("note", _text),
                }
            )
    if not rows:
        raise ValueError("称重与受力 CSV 中没有样品行")
    return rows


def _time_columns(fieldnames: Sequence[str]) -> List[Tuple[int, str, str]]:
    """返回 [(分钟数, 规范标签, 原始列名)]，按分钟排序。"""
    found: List[Tuple[int, str, str]] = []
    for name in fieldnames:
        normalized = _norm_header(name).lower()
        match = re.fullmatch(r"(\d+)(?:min|分钟)", normalized)
        if match:
            minutes = int(match.group(1))
            found.append((minutes, f"{minutes} min", name))
    found.sort(key=lambda item: item[0])
    return found


def read_scores_csv(path: str | Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    """读取表 6-7 主观评分表，返回记录与时间点标签。"""
    csv_path = Path(path)
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("主观评分 CSV 没有表头")
        required = {
            name: _find_column(reader.fieldnames, aliases, name)
            for name, aliases in SCORE_ALIASES.items()
            if name in {"sample", "subject"}
        }
        optional = {
            name: _find_optional_column(reader.fieldnames, aliases)
            for name, aliases in SCORE_ALIASES.items()
            if name not in required
        }
        time_columns = _time_columns(reader.fieldnames)
        if not time_columns:
            raise ValueError("主观评分 CSV 中找不到 30 min/60 min/90 min/120 min 列")
        labels = [item[1] for item in time_columns]
        rows: List[Dict[str, Any]] = []
        for raw in reader:
            sample = _text(raw.get(required["sample"]))
            if not sample:
                continue

            def value(name: str) -> str:
                column = optional.get(name)
                return _text(raw.get(column)) if column else ""

            scores = {
                label: _to_float(raw.get(source_name))
                for _, label, source_name in time_columns
            }
            rows.append(
                {
                    "sample": sample,
                    "subject": _text(raw.get(required["subject"])) or "(未填受试者)",
                    "scores": scores,
                    "nose_pressure": value("nose_pressure"),
                    "ear_pressure": value("ear_pressure"),
                    "mark": value("mark"),
                    "note": value("note"),
                }
            )
    if not rows:
        raise ValueError("主观评分 CSV 中没有评分行")
    return rows, labels


def front_back_ratio(
    front_g: Optional[float], left_g: Optional[float], right_g: Optional[float]
) -> Optional[float]:
    """前后重量比 = 前框 ÷（左镜腿 + 右镜腿）。"""
    if front_g is None or left_g is None or right_g is None:
        return None
    back = left_g + right_g
    if back <= 0:
        return None
    return front_g / back


def left_right_diff(left_g: Optional[float], right_g: Optional[float]) -> Optional[float]:
    if left_g is None or right_g is None:
        return None
    return abs(left_g - right_g)


def is_asymmetric(diff_g: Optional[float], limit_g: float = ASYM_LIMIT_G) -> bool:
    return diff_g is not None and diff_g > limit_g


def summarize_weights(
    rows: Sequence[Dict[str, Any]], benchmark: Optional[str] = None
) -> List[Dict[str, Any]]:
    """计算比值/左右差/鼻托对标判定。"""
    benchmark_name = (benchmark or "").strip()
    benchmark_row: Optional[Dict[str, Any]] = None
    benchmark_nose: Optional[float] = None
    if benchmark_name:
        benchmark_row = next(
            (row for row in rows if _text(row.get("sample")) == benchmark_name), None
        )
        if benchmark_row is None:
            names = "、".join(_text(row.get("sample")) for row in rows)
            raise ValueError(f"找不到对标样品“{benchmark_name}”；可用样品：{names}")
        benchmark_nose = benchmark_row.get("nose_g")
        if benchmark_nose is None:
            raise ValueError(f"对标样品“{benchmark_name}”缺少鼻托受力实测值")

    results: List[Dict[str, Any]] = []
    for row in rows:
        ratio = front_back_ratio(row.get("front_g"), row.get("left_g"), row.get("right_g"))
        diff = left_right_diff(row.get("left_g"), row.get("right_g"))
        flag = is_asymmetric(diff)
        sample = _text(row.get("sample"))
        is_benchmark = benchmark_row is not None and sample == benchmark_name
        nose = row.get("nose_g")

        if not benchmark_name:
            comparison = "—"
            verdict = "—"
        elif is_benchmark:
            comparison = "—（对标）"
            verdict = "—"
        elif nose is None:
            comparison = "—"
            verdict = "缺鼻托受力"
        elif benchmark_nose is not None and nose <= benchmark_nose:
            comparison = "满足"
            verdict = "≤ 对标"
        else:
            comparison = "不满足"
            verdict = "> 对标"

        results.append(
            {
                **row,
                "ratio": ratio,
                "left_right_diff_g": diff,
                "asymmetric": flag,
                "is_benchmark": is_benchmark,
                "nose_comparison": comparison,
                "nose_verdict": verdict,
            }
        )
    return results


def _fmt(value: Optional[float], digits: int = 2) -> str:
    return "—" if value is None else f"{value:.{digits}f}"


def format_weights_markdown(
    results: Sequence[Dict[str, Any]], benchmark: Optional[str] = None
) -> str:
    lines = [
        "## 称重与受力（表 6-7 上半）",
        "",
        "| 样品 | 总重 (g) | 前框 (g) | 左镜腿 (g) | 右镜腿 (g) | 前后重量比 | 左右差 (g) | 左右差>3 g | 鼻托受力 (g 力) | 鼻托 vs 对标 | 判定 | 备注 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for item in results:
        flag_text = "是（>3 g）" if item["asymmetric"] else "否"
        lines.append(
            "| {sample} | {total} | {front} | {left} | {right} | {ratio} | {diff} | {flag} | {nose} | {comparison} | {verdict} | {note} |".format(
                sample=str(item["sample"]).replace("|", "/"),
                total=_fmt(item.get("total_g")),
                front=_fmt(item.get("front_g")),
                left=_fmt(item.get("left_g")),
                right=_fmt(item.get("right_g")),
                ratio=_fmt(item.get("ratio"), 3),
                diff=_fmt(item.get("left_right_diff_g")),
                flag=flag_text,
                nose=_fmt(item.get("nose_g")),
                comparison=item["nose_comparison"],
                verdict=item["nose_verdict"],
                note=(item.get("note") or "—").replace("|", "/"),
            )
        )
    lines.append("")
    lines.append("> 前后重量比 = 前框 ÷（左镜腿 + 右镜腿）。左右差 >3 g 标为“是（>3 g）”。")
    if benchmark:
        lines.append(
            f"> 对标样品：{benchmark}；判定规则为“其他样品鼻托受力 ≤ 对标实测值”。"
        )
    else:
        lines.append("> 未指定 --benchmark，未做鼻托受力对标判定。")
    return "\n".join(lines)


def summarize_scores(
    rows: Sequence[Dict[str, Any]], labels: Sequence[str]
) -> List[Dict[str, Any]]:
    """按样品汇总各时间点均值/最低值与总体最低值。"""
    grouped: "OrderedDict[str, List[Dict[str, Any]]]" = OrderedDict()
    for row in rows:
        grouped.setdefault(_text(row.get("sample")), []).append(row)

    results: List[Dict[str, Any]] = []
    for sample, group in grouped.items():
        subjects = {_text(row.get("subject")) for row in group}
        time_means: Dict[str, Optional[float]] = {}
        time_mins: Dict[str, Optional[float]] = {}
        for label in labels:
            values = [
                row["scores"].get(label)
                for row in group
                if row["scores"].get(label) is not None
            ]
            time_means[label] = mean(values) if values else None
            time_mins[label] = min(values) if values else None

        all_values: List[Tuple[str, float]] = []
        for row in group:
            for label in labels:
                value = row["scores"].get(label)
                if value is not None:
                    all_values.append((label, value))

        if all_values:
            overall_mean: Optional[float] = mean(value for _, value in all_values)
            min_label, min_value = min(all_values, key=lambda item: item[1])
        else:
            overall_mean = None
            min_label = ""
            min_value = None

        results.append(
            {
                "sample": sample,
                "n_subjects": len(subjects),
                "time_means": time_means,
                "time_mins": time_mins,
                "overall_mean": overall_mean,
                "min_label": min_label,
                "min_value": min_value,
            }
        )
    return results


def format_scores_markdown(
    results: Sequence[Dict[str, Any]], labels: Sequence[str]
) -> str:
    header = ["样品", "受试者数"]
    header.extend(f"{label} 均值" for label in labels)
    header.extend(["总体均值", "最低值", "最低值时间"])
    lines = [
        "## 主观评分（表 6-7 下半）",
        "",
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(["---"] * len(header)) + " |",
    ]
    for item in results:
        values = [str(item["sample"]).replace("|", "/"), str(item["n_subjects"])]
        values.extend(_fmt(item["time_means"].get(label)) for label in labels)
        values.extend(
            [
                _fmt(item["overall_mean"]),
                _fmt(item["min_value"]),
                item["min_label"] or "—",
            ]
        )
        lines.append("| " + " | ".join(values) + " |")

    lines.extend(
        [
            "",
            "### 各时间点最低值",
            "",
            "| 样品 | " + " | ".join(f"{label} 最低" for label in labels) + " |",
            "| --- | " + " | ".join(["---"] * len(labels)) + " |",
        ]
    )
    for item in results:
        values = [str(item["sample"]).replace("|", "/")]
        values.extend(_fmt(item["time_mins"].get(label)) for label in labels)
        lines.append("| " + " | ".join(values) + " |")

    lines.append("")
    lines.append(
        "> 主观评分为 5 分制；均值只统计填写了该时间点评分的受试者；"
        "最低值取该样品所有时间点、所有受试者中的最小值。"
    )
    return "\n".join(lines)


def render_markdown(
    weight_results: Optional[Sequence[Dict[str, Any]]] = None,
    score_results: Optional[Sequence[Dict[str, Any]]] = None,
    labels: Optional[Sequence[str]] = None,
    benchmark: Optional[str] = None,
) -> str:
    parts = ["# 第 6 组人体工学汇总", ""]
    if weight_results is not None:
        parts.append(format_weights_markdown(weight_results, benchmark=benchmark))
        parts.append("")
    if score_results is not None:
        parts.append(format_scores_markdown(score_results, labels or []))
        parts.append("")
    parts.append(
        "> 头模测量与真人佩戴存在差异；鼻托受力与主观评分只对本次样品和受试者负责。"
        "原始数据不提交公开仓库。"
    )
    return "\n".join(parts)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="第 6 组人体工学汇总：称重/受力 + 主观评分"
    )
    parser.add_argument("--weights", help="表 6-7 称重与受力 CSV")
    parser.add_argument("--scores", help="表 6-7 主观评分 CSV")
    parser.add_argument(
        "files",
        nargs="*",
        help="可选位置参数：称重表 [评分表]；也可用 --weights/--scores 指定",
    )
    parser.add_argument(
        "--benchmark",
        help="对标样品名；指定后判断其他样品鼻托受力是否 ≤ 对标实测值",
    )
    parser.add_argument("--markdown-out", help="输出 Markdown 文件")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.files:
        if len(args.files) > 2:
            print("错误：位置参数最多两个（称重表、评分表）", file=sys.stderr)
            return 2
        if not args.weights:
            args.weights = args.files[0]
        if len(args.files) > 1 and not args.scores:
            args.scores = args.files[1]

    if not args.weights and not args.scores:
        print("错误：至少提供 --weights 或 --scores 之一", file=sys.stderr)
        return 2
    if args.benchmark and not args.weights:
        print("错误：--benchmark 需要同时提供 --weights", file=sys.stderr)
        return 2

    try:
        weight_results = None
        score_results = None
        labels: List[str] = []
        if args.weights:
            weight_rows = read_weights_csv(args.weights)
            weight_results = summarize_weights(weight_rows, benchmark=args.benchmark)
        if args.scores:
            score_rows, labels = read_scores_csv(args.scores)
            score_results = summarize_scores(score_rows, labels)
    except (OSError, ValueError, csv.Error) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2

    markdown = render_markdown(
        weight_results=weight_results,
        score_results=score_results,
        labels=labels,
        benchmark=args.benchmark,
    )
    print(markdown)
    if args.markdown_out:
        Path(args.markdown_out).write_text(markdown + "\n", encoding="utf-8")
        print(f"\nMarkdown 已写入：{args.markdown_out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
