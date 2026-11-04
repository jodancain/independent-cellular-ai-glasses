# -*- coding: utf-8 -*-
"""第 1、3、6 组验证工具的标准库单元测试。

运行：python3 -m unittest discover -s tests -v
"""

from __future__ import annotations

import contextlib
import csv
import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, relative_path: str):
    path = ROOT / relative_path
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"无法加载模块：{path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


latency = load_module("latency_stats_tool", "tools/analysis/latency_stats.py")
redcap = load_module("redcap_at_tool", "tools/redcap/redcap_at.py")
netbench = load_module("net_bench_tool", "tools/redcap/net_bench.py")
current = load_module("current_summary_tool", "tools/redcap/current_summary.py")
ergo = load_module("ergo_stats_tool", "tools/ergonomics/ergo_stats.py")

LATENCY_HEADERS = [
    "样本号",
    "条件编号",
    "路径",
    "测试项",
    "采集时间",
    "输入/动作时间戳",
    "显示边沿时间戳",
    "延迟 (ms)",
    "帧号/场次",
    "有效",
    "无效原因/备注",
]


class TempFileMixin:
    def make_text_file(self, text: str, suffix: str = ".csv") -> str:
        handle, name = tempfile.mkstemp(suffix=suffix)
        os.close(handle)
        Path(name).write_text(text, encoding="utf-8")
        self.addCleanup(lambda: Path(name).unlink(missing_ok=True))
        return name

    def make_csv(self, headers, rows) -> str:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        writer.writerows(rows)
        return self.make_text_file(buffer.getvalue(), ".csv")

    def make_latency_csv(self, records) -> str:
        return self.make_csv(LATENCY_HEADERS, records)

    def make_json(self, data) -> str:
        return self.make_text_file(
            json.dumps(data, ensure_ascii=False), ".json"
        )


class TestNearestRank(unittest.TestCase):
    def test_n1(self):
        stats = latency.compute_stats([7.5])
        self.assertEqual(stats["n"], 1)
        self.assertEqual(stats["p50"], 7.5)
        self.assertEqual(stats["p95"], 7.5)
        self.assertEqual(stats["max"], 7.5)
        self.assertTrue(stats["insufficient"])

    def test_n30_boundary(self):
        stats = latency.compute_stats(range(1, 31))
        self.assertEqual(stats["n"], 30)
        self.assertEqual(stats["p50"], 15)
        self.assertEqual(stats["p95"], 29)
        self.assertFalse(stats["insufficient"])

    def test_n31_boundary(self):
        stats = latency.compute_stats(range(1, 32))
        self.assertEqual(stats["n"], 31)
        self.assertEqual(stats["p50"], 16)
        self.assertEqual(stats["p95"], 30)
        self.assertFalse(stats["insufficient"])

    def test_nearest_rank_rejects_bad_percentile(self):
        with self.assertRaises(ValueError):
            latency.nearest_rank([1, 2], 0)


class TestLatencyStats(TempFileMixin, unittest.TestCase):
    def test_invalid_samples_are_excluded(self):
        records = [
            [1, "C1", "A1", "内容", "2026-01-01 10:00:00", "1000", "1010", "10", 1, "是", "示例"],
            [2, "C1", "A1", "内容", "2026-01-01 10:00:01", "1100", "1120", "20", 2, "是", "示例"],
            [3, "C1", "A1", "内容", "2026-01-01 10:00:02", "1200", "1230", "30", 3, "是", "示例"],
            [4, "C1", "A1", "内容", "2026-01-01 10:00:03", "1300", "1399", "99", 4, "否", "遮挡"],
            [5, "C1", "A1", "内容", "2026-01-01 10:00:04", "1400", "1500", "100", 5, "否", "丢帧"],
        ]
        path = self.make_latency_csv(records)
        summaries = latency.summarize(latency.read_latency_csv(path))
        self.assertEqual(len(summaries), 1)
        item = summaries[0]
        self.assertEqual(item["n"], 3)
        self.assertEqual(item["p95"], 30)
        self.assertEqual(item["max"], 30)
        self.assertIn("无效 2 条已排除", item["note"])

    def test_insufficient_sample_annotation(self):
        records = []
        for index in range(10):
            records.append(
                [
                    index + 1,
                    "C1",
                    "A1",
                    "内容",
                    "2026-01-01 10:00:00",
                    str(1000 + index),
                    str(1010 + index),
                    str(10 + index),
                    index + 1,
                    "是",
                    "示例",
                ]
            )
        path = self.make_latency_csv(records)
        summaries = latency.summarize(latency.read_latency_csv(path))
        self.assertEqual(summaries[0]["n"], 10)
        self.assertIn("样本不足", summaries[0]["note"])
        markdown = latency.render_summary_markdown(summaries)
        self.assertIn("样本不足", markdown)

    def test_drift_with_period_column(self):
        path = ROOT / "tools/samples/latency_drift_sample.csv"
        results = latency.drift_analysis(latency.read_latency_csv(path))
        self.assertEqual(len(results), 1)
        item = results[0]
        self.assertEqual(item["early_n"], 31)
        self.assertEqual(item["late_n"], 31)
        self.assertEqual(item["early_p95"], 39)
        self.assertEqual(item["late_p95"], 49)
        self.assertAlmostEqual(item["drift_ms"], 10.0)
        self.assertAlmostEqual(item["drift_pct"], 10.0 / 39.0 * 100.0, places=6)
        self.assertIn("漂移", latency.render_drift_markdown(results))

    def test_drift_falls_back_to_collected_time(self):
        records = []
        sequence = 0
        for minute, base in ((0, 10), (25, 20)):
            for index in range(31):
                sequence += 1
                minute_value = minute + (index * 8) // 60
                second_value = (index * 8) % 60
                records.append(
                    [
                        sequence,
                        "C1",
                        "B",
                        "内容",
                        f"2026-01-01 10:{minute_value:02d}:{second_value:02d}",
                        str(1000 + sequence * 100),
                        str(1000 + sequence * 100 + base + index),
                        str(base + index),
                        sequence,
                        "是",
                        "示例",
                    ]
                )
        path = self.make_latency_csv(records)
        results = latency.drift_analysis(
            latency.read_latency_csv(path), time_col="采集时间"
        )
        self.assertEqual(results[0]["early_p95"], 39)
        self.assertEqual(results[0]["late_p95"], 49)
        self.assertAlmostEqual(results[0]["drift_ms"], 10.0)

    def test_sample_latency_summary(self):
        path = ROOT / "tools/samples/latency_sample.csv"
        summaries = latency.summarize(latency.read_latency_csv(path))
        self.assertEqual(summaries[0]["n"], 31)
        self.assertEqual(summaries[0]["p50"], 25)
        self.assertEqual(summaries[0]["p95"], 39)
        self.assertEqual(summaries[0]["max"], 40)


class TestRedcapAt(TempFileMixin, unittest.TestCase):
    def test_mock_full_flow_and_redaction(self):
        transport = redcap.MockTransport()
        commands = redcap.build_commands(
            set_psm=True,
            psm_t3412="00001001",
            psm_t3324="00000010",
            set_edrx=True,
            edrx_mode="1",
            edrx_act="5",
            edrx_cycle="0101",
        )
        log_path = self.make_text_file("", ".csv")
        result = redcap.run_session(
            transport, commands, log_path=log_path, verbose=False
        )

        self.assertIn("AT+CFUN?", commands)
        self.assertIn("AT+COPS?", commands)
        self.assertIn("AT+CEREG?", commands)
        self.assertIn("AT+C5GREG?", commands)
        self.assertIn("AT+CSQ", commands)
        self.assertIn("AT+CESQ", commands)
        self.assertIn("AT+CPSMS?", commands)
        self.assertIn("AT+CEDRXS?", commands)
        self.assertIn("AT+CEDRXRDP", commands)
        self.assertIn('AT+CPSMS=1,,,"00001001","00000010"', commands)
        self.assertIn('AT+CEDRXS=1,5,"0101"', commands)

        joined_commands = "\n".join(commands)
        self.assertNotIn("AT+CIMI", joined_commands)
        self.assertNotIn("AT+CGSN", joined_commands)
        self.assertNotIn("AT+CCID", joined_commands)
        self.assertEqual(transport.sent, commands)

        log_text = Path(log_path).read_text(encoding="utf-8-sig")
        for raw_identifier in (
            "111111111111111",
            "222222222222222",
            "33333333333333333333",
        ):
            self.assertNotIn(raw_identifier, log_text)
        self.assertIn("[已脱敏]", log_text)
        self.assertIn("AT+C5GREG?", log_text)
        self.assertTrue(all(row["timestamp"] for row in result["rows"]))
        self.assertGreater(len(result["rows"]), len(commands))

    def test_redact_sensitive_directly(self):
        text = redcap.redact_sensitive("+CGSN: 222222222222222")
        self.assertIn("[已脱敏]", text)
        self.assertNotIn("222222222222222", text)
        self.assertNotIn("+CIMI: 111111111111111", redcap.redact_sensitive("+CIMI: 111111111111111"))

    def test_sensitive_raw_command_is_rejected(self):
        with self.assertRaises(ValueError):
            redcap.build_commands(raw=["AT+CIMI"])
        with self.assertRaises(ValueError):
            redcap.build_commands(raw=["AT+CGSN?"])
        with self.assertRaises(ValueError):
            redcap.build_commands(raw=["AT+CCID"])


class TestNetBench(TempFileMixin, unittest.TestCase):
    def make_iperf3(self, reverse: bool, bits_per_second: float) -> str:
        data = {
            "start": {
                "test_start": {
                    "protocol": "TCP",
                    "num_streams": 4,
                    "duration": 60,
                    "reverse": 1 if reverse else 0,
                }
            },
            "intervals": [
                {
                    "sum": {
                        "start": 0,
                        "end": 60,
                        "seconds": 60,
                        "bits_per_second": bits_per_second,
                    }
                }
            ],
            "end": {
                "sum_sent": {
                    "seconds": 60,
                    "bits_per_second": bits_per_second,
                    "retransmits": 5,
                },
                "sum_received": {
                    "seconds": 60,
                    "bits_per_second": bits_per_second,
                },
                "sum": {
                    "seconds": 60,
                    "bits_per_second": bits_per_second,
                    "jitter_ms": 1.2,
                    "lost_percent": 0.1,
                },
            },
        }
        return self.make_json(data)

    def test_parse_iperf3_down_and_up(self):
        down_path = self.make_iperf3(reverse=True, bits_per_second=42.0e6)
        up_path = self.make_iperf3(reverse=False, bits_per_second=12.5e6)
        down = netbench.parse_iperf3_json(down_path)
        up = netbench.parse_iperf3_json(up_path)
        self.assertEqual(down["direction"], "down")
        self.assertAlmostEqual(down["mbps"], 42.0)
        self.assertEqual(up["direction"], "up")
        self.assertAlmostEqual(up["mbps"], 12.5)
        self.assertEqual(down["duration_s"], 60.0)

    def test_three_tier_evaluation(self):
        results = netbench.evaluate_targets(42.0, 12.5, 30.0)
        self.assertEqual([item["status"] for item in results], ["达到设计目标"] * 3)

        results = netbench.evaluate_targets(10.0, 3.0, 80.0)
        self.assertEqual(
            [item["status"] for item in results],
            ["未达到设计目标", "未达到设计目标", "未达到设计目标"],
        )

        results = netbench.evaluate_targets(35.0, 5.0, 45.0)
        self.assertEqual(
            [item["status"] for item in results],
            ["达到设计目标", "达到设计目标", "未达到设计目标"],
        )

    def test_offline_cli(self):
        down_path = self.make_iperf3(reverse=True, bits_per_second=42.0e6)
        up_path = self.make_iperf3(reverse=False, bits_per_second=12.5e6)
        rtt_path = self.make_json({"rtts_ms": [20.0, 25.0, 30.0]})
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = netbench.main(
                [
                    "analyze",
                    "--from-json",
                    down_path,
                    "--from-json",
                    up_path,
                    "--rtt-json",
                    rtt_path,
                ]
            )
        self.assertEqual(code, 0)
        self.assertIn("达到设计目标", output.getvalue())
        self.assertIn("设计目标，非已验证结论", output.getvalue())

    def test_percentile_and_rtt(self):
        self.assertEqual(netbench.percentile([1, 2, 3, 4], 0.95), 4)
        self.assertEqual(netbench.rtt_summary([10, 20, 30])["p95"], 30)
        self.assertEqual(netbench.parse_rtt_source(["10 ms", "20 ms"]), [10.0, 20.0])

    def test_missing_iperf3_is_clear(self):
        with mock.patch.object(netbench.shutil, "which", return_value=None):
            with self.assertRaises(netbench.BenchError) as context:
                netbench.run_iperf3("127.0.0.1")
        self.assertIn("iperf3", str(context.exception))


class TestCurrentSummary(TempFileMixin, unittest.TestCase):
    def test_sleep_window_detection(self):
        times = [0, 10, 20, 30, 40, 50, 60, 70, 80]
        currents = [0.8, 0.1, 0.1, 0.8, 0.1, 0.1, 0.8, 0.1, 0.1]
        windows = current.detect_sleep_windows(times, currents, threshold=0.2)
        self.assertEqual(len(windows), 3)
        self.assertEqual([item["start_s"] for item in windows], [10, 40, 70])
        self.assertEqual([item["duration_s"] for item in windows], [10, 10, 10])

    def test_summary_and_expected_period(self):
        times = [0, 10, 20, 30, 40, 50, 60, 70, 80]
        currents = [0.8, 0.1, 0.1, 0.8, 0.1, 0.1, 0.8, 0.1, 0.1]
        summary = current.compute_summary(
            times,
            currents,
            threshold=0.2,
            expected_period=30,
            tolerance=0.10,
        )
        self.assertEqual(summary["window_count"], 3)
        self.assertEqual(summary["median_period_s"], 30)
        self.assertAlmostEqual(summary["average_current_a"], 3.0 / 9.0)
        self.assertAlmostEqual(summary["peak_current_a"], 0.8)
        self.assertTrue(summary["period_within"])

    def test_sample_current_summary(self):
        times, currents, meta = current.read_current_csv(
            ROOT / "tools/samples/current_sample.csv"
        )
        summary = current.compute_summary(
            times,
            currents,
            threshold=0.3,
            expected_period=20,
        )
        self.assertEqual(summary["window_count"], 3)
        self.assertEqual(summary["median_period_s"], 20)
        self.assertTrue(summary["period_within"])
        self.assertEqual(meta["rows"], 13)
        self.assertIn("一致", current.render_markdown(summary, meta=meta))

    def test_strict_threshold_and_configurable_columns(self):
        path = self.make_csv(
            ["t", "i"],
            [[0, 1.0], [1, 0.2], [2, 0.1], [3, 0.1], [4, 1.0]],
        )
        times, currents, meta = current.read_current_csv(
            path, time_col="t", current_col="i"
        )
        windows = current.detect_sleep_windows(times, currents, threshold=0.2)
        self.assertEqual(len(windows), 1)
        self.assertEqual(windows[0]["start_s"], 2)
        self.assertEqual(meta["time_col"], "t")
        self.assertEqual(meta["current_col"], "i")


class TestErgoStats(TempFileMixin, unittest.TestCase):
    def test_ratio_and_asymmetry(self):
        ratio = ergo.front_back_ratio(20.0, 14.5, 13.0)
        self.assertAlmostEqual(ratio, 20.0 / 27.5)
        self.assertEqual(ergo.left_right_diff(34.0, 30.0), 4.0)
        self.assertTrue(ergo.is_asymmetric(4.0))
        self.assertFalse(ergo.is_asymmetric(3.0))
        self.assertIsNone(ergo.front_back_ratio(20.0, 0.0, 0.0))

    def test_weight_summary_and_markdown(self):
        rows = ergo.read_weights_csv(ROOT / "tools/samples/ergo_weights_sample.csv")
        results = ergo.summarize_weights(rows, benchmark="对标 A")
        by_sample = {item["sample"]: item for item in results}
        self.assertEqual(by_sample["对标 A"]["nose_verdict"], "—")
        self.assertEqual(by_sample["样架 110 g 后重"]["nose_verdict"], "≤ 对标")
        self.assertEqual(by_sample["样架 85 g 前重"]["nose_verdict"], "> 对标")
        self.assertTrue(by_sample["对照 B"]["asymmetric"])
        markdown = ergo.format_weights_markdown(results, benchmark="对标 A")
        self.assertIn("是（>3 g）", markdown)
        self.assertIn("≤ 对标", markdown)

    def test_score_summary(self):
        rows, labels = ergo.read_scores_csv(
            ROOT / "tools/samples/ergo_scores_sample.csv"
        )
        results = ergo.summarize_scores(rows, labels)
        by_sample = {item["sample"]: item for item in results}
        benchmark = by_sample["对标 A"]
        self.assertEqual(benchmark["n_subjects"], 5)
        self.assertAlmostEqual(benchmark["time_means"]["30 min"], 4.6)
        self.assertEqual(benchmark["time_mins"]["120 min"], 3.0)
        self.assertEqual(benchmark["min_value"], 3.0)
        markdown = ergo.format_scores_markdown(results, labels)
        self.assertIn("各时间点最低值", markdown)
        self.assertIn("120 min 均值", markdown)

    def test_minimal_weight_columns(self):
        path = self.make_csv(
            ["样品", "前框 (g)", "左镜腿 (g)", "右镜腿 (g)", "鼻托受力 (g 力)"],
            [["对标 A", 20, 15, 15, 40], ["样架", 30, 30, 30, 35]],
        )
        rows = ergo.read_weights_csv(path)
        results = ergo.summarize_weights(rows, benchmark="对标 A")
        self.assertEqual(results[1]["nose_verdict"], "≤ 对标")


class TestSamplesAreFictional(unittest.TestCase):
    def test_every_sample_marks_fictional(self):
        sample_dir = ROOT / "tools/samples"
        files = list(sample_dir.glob("*.csv")) + list(sample_dir.glob("*.json"))
        self.assertGreaterEqual(len(files), 9)
        for path in files:
            text = path.read_text(encoding="utf-8-sig")
            self.assertIn("示例数据，非实测", text, msg=str(path))


if __name__ == "__main__":
    unittest.main(verbosity=2)
