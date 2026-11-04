#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第 3 组 RedCap 模组标准 3GPP AT 命令采集工具。

特性：
- 只发送标准 3GPP 查询/设置命令；厂商私有命令只能通过 --raw 可选透传。
- 所有发送与接收都带时间戳写入 CSV；--mock 用内置假回应跑通全流程。
- 不主动发送 AT+CIMI / AT+CGSN / AT+CCID；回应中出现的 IMSI/IMEI/ICCID
  类长数字标识在写入日志和打印前统一脱敏。
- pyserial 只在实机串口模式导入，未安装时给出明确错误。

注意：AT 返回“已设置”不等于网络授予或实际生效；是否生效要结合电流波形
（current_summary.py）判断。
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

LOG_FIELDS = ["序号", "时间戳", "方向", "内容", "备注"]

# 这些命令由程序主动发送会触碰设备标识，禁止发送。
SENSITIVE_QUERY_RE = re.compile(r"(?i)\bAT\+(?:CIMI|CGSN|CCID)\b")

# 回应中的 +CIMI / +CGSN / +CCID 行，以及裸长数字，都要脱敏。
_SENSITIVE_VALUE_RE = re.compile(
    r"(?i)((?:\+?(?:CIMI|CGSN|CCID))\s*[:=]\s*)([^\s,;]+)"
)
_SENSITIVE_COMMAND_RE = re.compile(r"(?i)(AT\+(?:CIMI|CGSN|CCID))([^\r\n]*)")
_LONG_DIGITS_RE = re.compile(r"(?<!\d)\d{14,22}(?!\d)")


def redact_sensitive(text: Any) -> str:
    """对 IMSI/IMEI/ICCID 类内容脱敏；保留命令名和少量上下文。"""
    value = "" if text is None else str(text)
    value = _SENSITIVE_VALUE_RE.sub(r"\1[已脱敏]", value)
    value = _SENSITIVE_COMMAND_RE.sub(r"\1 [已脱敏]", value)
    value = _LONG_DIGITS_RE.sub("[已脱敏]", value)
    return value


def contains_sensitive_query(command: str) -> bool:
    return bool(SENSITIVE_QUERY_RE.search(command or ""))


def _strip_quotes(value: str) -> str:
    return (value or "").strip().strip('"').strip("'")


def build_commands(
    set_psm: bool = False,
    psm_t3412: Optional[str] = None,
    psm_t3324: Optional[str] = None,
    set_edrx: bool = False,
    edrx_mode: Optional[str] = None,
    edrx_act: Optional[str] = None,
    edrx_cycle: Optional[str] = None,
    raw: Optional[Sequence[str]] = None,
) -> List[str]:
    """构造标准 AT 命令序列；不包含任何设备标识查询。"""
    if isinstance(raw, str):
        raw = [raw]
    commands: List[str] = [
        "AT+CFUN?",
        "AT+COPS?",
        "AT+CEREG?",
        "AT+C5GREG?",
        "AT+CSQ",
        "AT+CESQ",
        "AT+CPSMS?",
    ]

    if set_psm:
        if not psm_t3412 or not psm_t3324:
            raise ValueError("设置 PSM 需要同时提供 --psm-t3412 与 --psm-t3324")
        t3412 = _strip_quotes(psm_t3412)
        t3324 = _strip_quotes(psm_t3324)
        commands.append(f'AT+CPSMS=1,,,"{t3412}","{t3324}"')
        commands.append("AT+CPSMS?")

    commands.append("AT+CEDRXS?")
    if set_edrx:
        if not edrx_mode or not edrx_act or not edrx_cycle:
            raise ValueError(
                "设置 eDRX 需要同时提供 --edrx-mode、--edrx-act 与 --edrx-cycle"
            )
        mode = _strip_quotes(edrx_mode)
        act = _strip_quotes(edrx_act)
        cycle = _strip_quotes(edrx_cycle)
        commands.append(f'AT+CEDRXS={mode},{act},"{cycle}"')
        commands.append("AT+CEDRXS?")

    commands.append("AT+CEDRXRDP")

    for item in raw or []:
        command = (item or "").strip()
        if not command:
            continue
        if contains_sensitive_query(command):
            raise ValueError(f"禁止发送设备标识查询命令：{command}")
        commands.append(command)

    for command in commands:
        if contains_sensitive_query(command):
            raise ValueError(f"命令序列包含禁止发送的标识查询：{command}")
    return commands


class MockTransport:
    """内置假回应；用于无硬件时跑通全流程和单元测试。"""

    def __init__(self) -> None:
        self.sent: List[str] = []
        self.startup_note = "上电缓存（模拟）"
        self._banner = [
            "+CIMI: 111111111111111",
            "+CGSN: 222222222222222",
            "+CCID: 33333333333333333333",
            "RDY",
        ]
        self._responses: Dict[str, List[str]] = {
            "AT": ["OK"],
            "AT+CFUN?": ["+CFUN: 1", "OK"],
            "AT+COPS?": ['+COPS: 0,0,"测试运营商",7', "OK"],
            "AT+CEREG?": ['+CEREG: 0,1,"0001","0A1B2C3D",7', "OK"],
            "AT+C5GREG?": ['+C5GREG: 0,1,"0001","0A1B2C3D",7', "OK"],
            "AT+CSQ": ["+CSQ: 24,99", "OK"],
            "AT+CESQ": ["+CESQ: 99,99,255,255,21,45", "OK"],
            "AT+CPSMS?": ['+CPSMS: 1,,,"00001001","00000010"', "OK"],
            "AT+CEDRXS?": ['+CEDRXS: 5,"0101"', "OK"],
            "AT+CEDRXRDP": ['+CEDRXRDP: 5,"0101","0010"', "OK"],
        }
        self._prefix_responses = [
            ("AT+CPSMS=", ["OK"]),
            ("AT+CEDRXS=", ["OK"]),
            ("AT+CFUN=", ["OK"]),
            ("AT+COPS=", ["OK"]),
        ]

    def open(self) -> None:
        return None

    def close(self) -> None:
        return None

    def startup_lines(self) -> List[str]:
        return list(self._banner)

    def exchange(self, command: str) -> List[str]:
        self.sent.append(command)
        key = (command or "").strip()
        if key in self._responses:
            return list(self._responses[key])
        for prefix, lines in self._prefix_responses:
            if key.startswith(prefix):
                return list(lines)
        return ["ERROR"]


class SerialTransport:
    """实机串口传输；pyserial 为可选依赖，只在此类初始化时导入。"""

    def __init__(
        self,
        port: str,
        baudrate: int = 115200,
        timeout: float = 2.0,
    ) -> None:
        try:
            import serial  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "未安装 pyserial，无法使用实机串口模式；"
                "请先执行 python3 -m pip install pyserial，或使用 --mock"
            ) from exc
        self._serial_module = serial
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.ser: Any = None

    def open(self) -> None:
        self.ser = self._serial_module.Serial(
            self.port, self.baudrate, timeout=self.timeout
        )

    def close(self) -> None:
        if self.ser is not None:
            try:
                self.ser.close()
            finally:
                self.ser = None

    def startup_lines(self) -> List[str]:
        return []

    def exchange(self, command: str) -> List[str]:
        if self.ser is None:
            raise RuntimeError("串口尚未打开")
        self.ser.write((command + "\r\n").encode("ascii", errors="replace"))
        self.ser.flush()
        lines: List[str] = []
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            raw = self.ser.readline()
            if not raw:
                continue
            line = raw.decode("utf-8", errors="replace").strip("\r\n")
            if not line:
                continue
            lines.append(line)
            if line in {"OK", "ERROR"}:
                break
            if line.startswith("+CME ERROR") or line.startswith("+CMS ERROR"):
                break
        if not lines:
            lines.append("[超时：未收到回应]")
        return lines


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="milliseconds")


def default_log_path() -> str:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return str(Path.cwd() / f"redcap_at_{stamp}.csv")


def run_session(
    transport: Any,
    commands: Sequence[str],
    log_path: Optional[str] = None,
    verbose: bool = True,
) -> Dict[str, Any]:
    """执行命令序列，把每次收发带时间戳写入 CSV，返回记录与日志路径。"""
    if isinstance(commands, str):
        commands = [commands]
    path = Path(log_path) if log_path else Path(default_log_path())
    path.parent.mkdir(parents=True, exist_ok=True)

    rows: List[Dict[str, Any]] = []
    sequence = 0
    transport.open()
    try:
        with path.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(LOG_FIELDS)

            def write_row(direction: str, content: str, note: str = "") -> None:
                nonlocal sequence
                sequence += 1
                safe = redact_sensitive(content)
                timestamp = now_iso()
                writer.writerow([sequence, timestamp, direction, safe, note])
                handle.flush()
                rows.append(
                    {
                        "seq": sequence,
                        "timestamp": timestamp,
                        "direction": direction,
                        "content": safe,
                        "note": note,
                    }
                )
                if verbose:
                    print(f"[{direction}] {timestamp} {safe}")

            startup = []
            if hasattr(transport, "startup_lines"):
                startup = transport.startup_lines() or []
            if isinstance(startup, str):
                startup = [startup]
            startup_note = getattr(transport, "startup_note", "")
            for line in startup:
                write_row("接收", str(line), startup_note)

            for command in commands:
                safe_command = redact_sensitive(command)
                write_row("发送", safe_command, "")
                responses = transport.exchange(command)
                if responses is None:
                    responses = ["[无回应]"]
                if isinstance(responses, str):
                    responses = [responses]
                for line in responses:
                    write_row("接收", str(line), "")
    finally:
        transport.close()

    return {
        "log_path": str(path),
        "rows": rows,
        "sent": list(getattr(transport, "sent", [])),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="第 3 组 RedCap 标准 3GPP AT 命令采集（支持 --mock 无硬件运行）"
    )
    parser.add_argument("--mock", action="store_true", help="使用内置假回应")
    parser.add_argument("--port", help="实机串口，如 /dev/ttyUSB0 或 COM3")
    parser.add_argument("--baud", type=int, default=115200, help="波特率，默认 115200")
    parser.add_argument("--timeout", type=float, default=2.0, help="单条命令读取超时秒数")
    parser.add_argument("--log", help="CSV 日志路径；不填则写入当前目录")
    parser.add_argument("--set-psm", action="store_true", help="发送 PSM 设置命令")
    parser.add_argument("--psm-t3412", "--t3412", dest="psm_t3412", help="PSM T3412 参数，如 00001001")
    parser.add_argument("--psm-t3324", "--t3324", dest="psm_t3324", help="PSM T3324 参数，如 00000010")
    parser.add_argument("--set-edrx", action="store_true", help="发送 eDRX 设置命令")
    parser.add_argument("--edrx-mode", "--mode", dest="edrx_mode", help="eDRX mode，如 1")
    parser.add_argument("--edrx-act", "--act", dest="edrx_act", help="eDRX AcT-type，如 5")
    parser.add_argument("--edrx-cycle", "--cycle", dest="edrx_cycle", help="eDRX cycle，如 0101")
    parser.add_argument(
        "--raw",
        action="append",
        default=[],
        help="可选透传一条原始 AT 命令；不得是 CIMI/CGSN/CCID 查询",
    )
    parser.add_argument("--quiet", action="store_true", help="只写日志，不逐行打印")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.mock and args.port:
        print("错误：--mock 与 --port 只能二选一", file=sys.stderr)
        return 2
    if not args.mock and not args.port:
        print("错误：请提供 --mock，或提供实机串口 --port", file=sys.stderr)
        return 2
    if args.set_psm and (not args.psm_t3412 or not args.psm_t3324):
        print("错误：--set-psm 需要同时提供 --psm-t3412 与 --psm-t3324", file=sys.stderr)
        return 2
    if args.set_edrx and (not args.edrx_mode or not args.edrx_act or not args.edrx_cycle):
        print(
            "错误：--set-edrx 需要同时提供 --edrx-mode、--edrx-act 与 --edrx-cycle",
            file=sys.stderr,
        )
        return 2

    try:
        commands = build_commands(
            set_psm=args.set_psm,
            psm_t3412=args.psm_t3412,
            psm_t3324=args.psm_t3324,
            set_edrx=args.set_edrx,
            edrx_mode=args.edrx_mode,
            edrx_act=args.edrx_act,
            edrx_cycle=args.edrx_cycle,
            raw=args.raw,
        )
    except ValueError as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2

    try:
        if args.mock:
            transport: Any = MockTransport()
        else:
            transport = SerialTransport(args.port, args.baud, args.timeout)
        result = run_session(
            transport,
            commands,
            log_path=args.log,
            verbose=not args.quiet,
        )
    except Exception as exc:  # 串口/依赖错误给出可读提示，不吞掉退出码
        print(f"错误：{exc}", file=sys.stderr)
        return 2

    print(f"\n日志已写入：{result['log_path']}")
    print(f"共记录 {len(result['rows'])} 行（发送/接收），已脱敏。")
    print("未主动发送 AT+CIMI / AT+CGSN / AT+CCID；回应中的长数字标识已脱敏。")
    print("提示：AT 返回“已设置”不代表网络授予或实际生效，需结合电流波形判断。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
