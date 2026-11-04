#!/usr/bin/env python3
"""Synthesize an original 112-second future-bass / synthwave cue.

Everything is generated from oscillators, filtered noise and envelopes using
only the Python standard library and numpy. The result is a 48 kHz, 16-bit,
stereo WAV plus a small JSON description used by the motion piece.
"""

from __future__ import annotations

import json
import math
import time
import wave
from pathlib import Path

import numpy as np

SR = 48_000
BPM = 120
BEAT = 60.0 / BPM
BAR = 4.0 * BEAT
BARS = 56
DURATION = 112.0
N = int(round(SR * DURATION))
CHANNELS = 2
SEED = 20250914

CHORD_ORDER = ("Am", "F", "C", "G")
CHORDS = {
    "Am": {
        "bass": 33,                     # A1
        "pad": (57, 60, 64, 69),        # A3 C4 E4 A4
        "arp": (57, 60, 64, 69, 72, 76),
    },
    "F": {
        "bass": 29,                     # F1
        "pad": (53, 57, 60, 65),        # F3 A3 C4 F4
        "arp": (53, 57, 60, 65, 69, 72),
    },
    "C": {
        "bass": 36,                     # C2
        "pad": (55, 60, 64, 67),        # G3 C4 E4 G4
        "arp": (48, 55, 60, 64, 67, 72),
    },
    "G": {
        "bass": 31,                     # G1
        "pad": (55, 59, 62, 67),        # G3 B3 D4 G4
        "arp": (55, 59, 62, 67, 71, 74),
    },
}

SECTIONS = (
    {"name": "intro", "startBar": 0, "startSec": 0.0},
    {"name": "drop1", "startBar": 8, "startSec": 16.0},
    {"name": "interlude", "startBar": 28, "startSec": 56.0},
    {"name": "drop2", "startBar": 36, "startSec": 72.0},
    {"name": "outro", "startBar": 50, "startSec": 100.0},
)
IMPACTS = [0.0, 16.0, 56.0, 72.0, 100.0]

RNG = np.random.default_rng(SEED)
_TABLE_SIZE = 2048
_TABLE_MASK = _TABLE_SIZE - 1
_WAVETABLES: dict[tuple[str, int], np.ndarray] = {}


# ---------------------------------------------------------------------------
# Small utilities


def midi_hz(midi: float) -> float:
    return 440.0 * 2.0 ** ((float(midi) - 69.0) / 12.0)


def db_to_amp(db: float) -> float:
    return 10.0 ** (db / 20.0)


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def pan_gains(pan: float) -> tuple[float, float]:
    theta = (float(np.clip(pan, -1.0, 1.0)) + 1.0) * math.pi / 4.0
    return math.cos(theta), math.sin(theta)


def fft_filter(
    x: np.ndarray,
    low: float | None = None,
    high: float | None = None,
    order: int = 2,
) -> np.ndarray:
    """Zero-phase Butterworth-magnitude low/band/high-pass via FFT."""
    n = x.size
    if n == 0:
        return x.copy()
    spectrum = np.fft.rfft(x)
    freq = np.fft.rfftfreq(n, 1.0 / SR)
    gain = np.ones_like(freq)
    if low is not None:
        gain /= np.sqrt(1.0 + (freq / max(low, 1.0)) ** (2 * order))
    if high is not None:
        gain *= 1.0 / np.sqrt(
            1.0 + (max(high, 1.0) / np.maximum(freq, 1e-9)) ** (2 * order)
        )
    return np.fft.irfft(spectrum * gain, n=n)


def add_mono(
    bus: np.ndarray,
    signal: np.ndarray,
    start_sec: float,
    gain: float = 1.0,
    pan: float = 0.0,
) -> None:
    if start_sec >= DURATION or signal.size == 0:
        return
    start = int(round(start_sec * SR))
    if start >= N:
        return
    if start < 0:
        signal = signal[-start:]
        start = 0
    count = min(signal.size, N - start)
    if count <= 0:
        return
    left, right = pan_gains(pan)
    bus[0, start:start + count] += signal[:count] * (gain * left)
    bus[1, start:start + count] += signal[:count] * (gain * right)


def normalize_peak(signal: np.ndarray, peak: float = 0.9) -> np.ndarray:
    maximum = float(np.max(np.abs(signal))) if signal.size else 0.0
    if maximum < 1e-12:
        return signal.copy()
    return signal * (peak / maximum)


# ---------------------------------------------------------------------------
# Wavetable oscillators


def _wavetable(kind: str, harmonics: int) -> np.ndarray:
    harmonics = max(1, min(48, int(harmonics)))
    key = (kind, harmonics)
    cached = _WAVETABLES.get(key)
    if cached is not None:
        return cached

    phase = np.arange(_TABLE_SIZE, dtype=np.float64) / _TABLE_SIZE
    table = np.zeros_like(phase)
    if kind == "saw":
        for k in range(1, harmonics + 1):
            table += np.sin(2.0 * np.pi * k * phase) / k
    elif kind == "square":
        for k in range(1, harmonics + 1, 2):
            table += np.sin(2.0 * np.pi * k * phase) / k
    elif kind == "triangle":
        for index, k in enumerate(range(1, harmonics + 1, 2)):
            table += ((-1.0) ** index) * np.sin(2.0 * np.pi * k * phase) / (k * k)
    elif kind == "sine":
        table = np.sin(2.0 * np.pi * phase)
    else:
        raise ValueError(f"unknown waveform: {kind}")

    table -= table.mean()
    maximum = float(np.max(np.abs(table)))
    if maximum > 1e-12:
        table /= maximum
    table = table.astype(np.float32)
    _WAVETABLES[key] = table
    return table


def osc(
    freq: float,
    t: np.ndarray,
    kind: str = "saw",
    harmonics: int | None = None,
    phase0: float = 0.0,
) -> np.ndarray:
    if harmonics is None:
        harmonics = max(1, int(0.44 * SR / max(freq, 1.0)))
    table = _wavetable(kind, harmonics)
    cycles = float(freq) * t + phase0
    position = (cycles - np.floor(cycles)) * _TABLE_SIZE
    index0 = position.astype(np.int32)
    frac = (position - index0).astype(np.float32)
    index0 &= _TABLE_MASK
    index1 = (index0 + 1) & _TABLE_MASK
    sample0 = table[index0]
    sample1 = table[index1]
    return sample0 + (sample1 - sample0) * frac


def gate_envelope(
    n: int,
    attack: float,
    gate_end: float,
    release: float,
) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    env = smoothstep(t / max(attack, 1e-5))
    env *= 1.0 - smoothstep((t - (gate_end - release * 0.25)) / max(release, 1e-5))
    return env


def perc_envelope(
    n: int,
    attack: float,
    decay: float,
    end_fade: float = 0.02,
) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    env = np.exp(-t / max(decay, 1e-5))
    env *= smoothstep(t / max(attack, 1e-5))
    env *= 1.0 - smoothstep((t - (n / SR - end_fade)) / max(end_fade, 1e-5))
    return env


# ---------------------------------------------------------------------------
# Drums, impacts and effects


def make_kick(variant: int = 0) -> np.ndarray:
    length = 0.64
    n = int(length * SR)
    t = np.arange(n, dtype=np.float64) / SR
    start_hz = 132.0 + 3.0 * variant
    end_hz = 42.0 + 0.8 * variant
    freq = end_hz + (start_hz - end_hz) * np.exp(-t / (0.033 + 0.002 * variant))
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t / (0.21 + 0.01 * variant))
    sub = np.sin(2.0 * np.pi * (43.0 + variant) * t) * np.exp(-t / 0.34) * 0.38
    click = fft_filter(RNG.normal(0.0, 1.0, n), high=1_800, order=2)
    click *= np.exp(-t / 0.006) * 0.24
    kick = np.tanh(1.75 * (body + sub + click))
    kick *= smoothstep(t / 0.0015)
    return normalize_peak(kick, 0.98)


def make_snare(roll: bool = False, variant: int = 0) -> np.ndarray:
    length = 0.20 if roll else 0.46
    n = int(length * SR)
    t = np.arange(n, dtype=np.float64) / SR
    noise = RNG.normal(0.0, 1.0, n)
    noise = fft_filter(noise, low=7_600, high=820 + 90 * variant, order=2)

    burst = np.zeros(n, dtype=np.float64)
    spacing = 0.0085 + 0.0012 * variant
    for offset, amplitude in ((0.0, 1.0), (spacing, 0.76), (spacing * 2.0, 0.60)):
        first = int(offset * SR)
        if first < n:
            local = np.exp(-(t[first:] - offset) / 0.0085)
            burst[first:] += amplitude * local
    tail = np.exp(-t / (0.050 if roll else 0.105))
    env = 0.60 * burst + 0.55 * tail
    env *= smoothstep(t / 0.0012)

    body_hz = (248.0 if roll else 188.0) + 12.0 * variant
    body = np.sin(2.0 * np.pi * body_hz * t) * np.exp(
        -t / (0.035 if roll else 0.060)
    ) * 0.22
    snare = noise * env * 0.90 + body
    snare = np.tanh(1.35 * snare)
    return normalize_peak(snare, 0.94)


def make_hat(open_hat: bool = False, variant: int = 0) -> np.ndarray:
    length = 0.34 if open_hat else 0.105
    n = int(length * SR)
    t = np.arange(n, dtype=np.float64) / SR
    noise = RNG.normal(0.0, 1.0, n)
    noise = fft_filter(noise, high=6_300 + 170 * variant, order=3)
    metallic = np.zeros(n, dtype=np.float64)
    for index, freq in enumerate((6_170, 8_310, 10_470, 12_210)):
        metallic += np.sin(
            2.0 * np.pi * (freq + 23.0 * variant) * t + index * 0.71
        )
    metallic *= 0.055
    decay = 0.110 if open_hat else 0.020
    env = np.exp(-t / decay) * smoothstep(t / 0.0008)
    hat = (noise * 0.92 + metallic) * env
    return normalize_peak(hat, 0.88)


def make_impact() -> np.ndarray:
    """Low boom plus a short noise blast, about 0.8 s long."""
    length = 0.82
    n = int(length * SR)
    t = np.arange(n, dtype=np.float64) / SR
    freq = 33.0 + 86.0 * np.exp(-t / 0.060)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    boom = np.sin(phase) * np.exp(-t / 0.235)
    boom += 0.28 * np.sin(2.0 * np.pi * 38.0 * t) * np.exp(-t / 0.42)

    blast = fft_filter(RNG.normal(0.0, 1.0, n), low=5_200, high=160, order=2)
    blast *= np.exp(-t / 0.105)
    crack = fft_filter(RNG.normal(0.0, 1.0, n), high=2_400, order=2)
    crack *= np.exp(-t / 0.032) * 0.42
    impact = np.tanh(1.55 * (boom * 0.92 + blast * 0.74 + crack))
    impact *= smoothstep(t / 0.002)
    impact *= 1.0 - smoothstep((t - (length - 0.04)) / 0.04)
    return normalize_peak(impact, 0.94)


def make_riser(duration: float, variant: int = 0) -> np.ndarray:
    """Stereo noise sweep with a rising tonal layer."""
    n = int(duration * SR)
    t = np.arange(n, dtype=np.float64) / SR
    rise = np.clip(t / duration, 0.0, 1.0)
    channels = []
    for channel in range(2):
        noise = RNG.normal(0.0, 1.0, n)
        low = fft_filter(noise, low=280 + 30 * channel, order=2)
        mid = fft_filter(noise, low=3_200, high=360, order=2)
        high = fft_filter(noise, high=2_600, order=3)
        swept = (
            low * (1.0 - rise) ** 1.8 * 0.45
            + mid * np.sin(np.pi * rise) ** 1.4 * 0.72
            + high * rise ** 1.7 * 0.95
        )
        channels.append(swept)
    stereo = np.vstack(channels)

    tone_hz = (135.0 + 9.0 * variant) * (
        (880.0 + 25.0 * variant) / (135.0 + 9.0 * variant)
    ) ** rise
    tone_phase = 2.0 * np.pi * np.cumsum(tone_hz) / SR
    tone = (
        np.sin(tone_phase) * 0.16
        + np.sin(2.004 * tone_phase) * 0.045
        + np.sin(0.501 * tone_phase) * 0.045
    )
    amp = (0.18 + 0.82 * rise ** 1.65) * smoothstep(t / 0.025)
    amp *= 1.0 - smoothstep((t - (duration - 0.018)) / 0.018)
    stereo *= amp
    stereo[0] += tone * amp * 0.85
    stereo[1] += tone * amp * 0.85
    return stereo


def pingpong_echo(
    source: np.ndarray,
    delay: float,
    taps: int,
    decay: float,
) -> np.ndarray:
    tail = np.zeros_like(source)
    for tap in range(1, taps + 1):
        offset = int(round(delay * tap * SR))
        if offset >= N:
            break
        gain = decay ** (tap - 1)
        if tap % 2:
            tail[0, offset:] += source[1, :N - offset] * gain
            tail[1, offset:] += source[0, :N - offset] * gain
        else:
            tail[0, offset:] += source[0, :N - offset] * gain
            tail[1, offset:] += source[1, :N - offset] * gain
    return tail


def early_reflections(send: np.ndarray) -> np.ndarray:
    tail = np.zeros_like(send)
    taps = (
        (0.037, 0.20, -0.35),
        (0.053, 0.17, 0.45),
        (0.079, 0.14, -0.55),
        (0.109, 0.115, 0.35),
        (0.149, 0.090, -0.25),
        (0.197, 0.070, 0.50),
    )
    for delay, gain, pan in taps:
        offset = int(round(delay * SR))
        left, right = pan_gains(pan)
        src = send[:, :N - offset]
        tail[0, offset:] += src[0] * gain * (0.55 + 0.45 * left)
        tail[1, offset:] += src[1] * gain * (0.55 + 0.45 * right)
    return tail


# ---------------------------------------------------------------------------
# Harmonic instruments


def make_bass_note(midi: int, duration: float = 0.205) -> np.ndarray:
    length = duration + 0.075
    n = int(length * SR)
    t = np.arange(n, dtype=np.float64) / SR
    freq = midi_hz(midi)
    harmonics = max(2, min(22, int(0.42 * SR / freq)))
    saw = osc(freq, t, "saw", harmonics=harmonics)
    octave = osc(freq * 2.0, t, "saw", harmonics=max(2, harmonics // 2))
    sub = np.sin(2.0 * np.pi * (freq * 0.5) * t)
    tone = saw * 0.70 + octave * 0.20 + sub * 0.48
    tone = np.tanh(2.05 * tone)
    env = gate_envelope(n, 0.004, duration, 0.055)
    return tone * env


def make_lead_note(midi: int, duration: float) -> np.ndarray:
    release = 0.075
    length = duration + release
    n = int(length * SR)
    t = np.arange(n, dtype=np.float64) / SR
    freq = midi_hz(midi)
    harmonics = max(3, min(24, int(0.44 * SR / freq)))
    saw_a = osc(freq * 0.9975, t, "saw", harmonics=harmonics)
    saw_b = osc(freq * 1.0030, t, "saw", harmonics=harmonics)
    square = osc(freq, t, "square", harmonics=max(3, harmonics // 2))
    glass = np.sin(2.0 * np.pi * freq * 2.0 * t) * 0.09
    tone = saw_a * 0.42 + saw_b * 0.34 + square * 0.28 + glass
    tone = np.tanh(1.18 * tone)
    env = gate_envelope(n, 0.006, duration, release)
    env *= 0.72 + 0.28 * np.exp(-t / 0.22)
    return tone * env


def make_arp_note(midi: int) -> np.ndarray:
    length = 0.23
    n = int(length * SR)
    t = np.arange(n, dtype=np.float64) / SR
    freq = midi_hz(midi)
    body = osc(freq, t, "triangle", harmonics=7)
    sparkle = osc(freq * 2.0, t, "sine", harmonics=1)
    tone = body * 0.72 + sparkle * 0.28
    env = perc_envelope(n, 0.0025, 0.065, end_fade=0.045)
    return tone * env


def build_pad() -> np.ndarray:
    pad = np.zeros((CHANNELS, N), dtype=np.float64)
    for start_bar in range(0, BARS, 2):
        chord = CHORDS[CHORD_ORDER[(start_bar // 2) % 4]]
        start = start_bar * BAR
        if start >= DURATION:
            continue
        length = min(4.48, DURATION - start)
        n = int(length * SR)
        t = np.arange(n, dtype=np.float64) / SR
        env = smoothstep(t / 0.38)
        env *= 1.0 - smoothstep((t - 3.84) / 0.60)
        env *= 1.0 - smoothstep((t - (length - 0.035)) / 0.035)

        if start_bar < 8:
            section_gain = 0.94
        elif start_bar < 28:
            section_gain = 0.68
        elif start_bar < 36:
            section_gain = 1.00
        elif start_bar < 50:
            section_gain = 0.72
        else:
            section_gain = 0.92

        notes = chord["pad"]
        for note_index, midi in enumerate(notes):
            freq = midi_hz(midi)
            detune = 5.5 + 0.4 * note_index
            left_wave = osc(
                freq * 2.0 ** (-detune / 1200.0),
                t,
                "saw",
                harmonics=7,
                phase0=0.11 * note_index,
            )
            right_wave = osc(
                freq * 2.0 ** (detune / 1200.0),
                t,
                "saw",
                harmonics=7,
                phase0=0.19 + 0.11 * note_index,
            )
            left_wave += 0.42 * osc(
                freq, t, "triangle", harmonics=5, phase0=0.31 * note_index
            )
            right_wave += 0.42 * osc(
                freq, t, "triangle", harmonics=5, phase0=0.47 + 0.31 * note_index
            )
            pan = (note_index - 1.5) * 0.25
            left_gain, right_gain = pan_gains(pan)
            amplitude = 0.071 * section_gain * env
            pad[0, int(start * SR):int(start * SR) + n] += (
                left_wave * amplitude * left_gain
            )
            pad[1, int(start * SR):int(start * SR) + n] += (
                right_wave * amplitude * right_gain
            )

        # A quiet sub-octave root anchors the pad without making it muddy.
        root = midi_hz(chord["bass"] + 12)
        sub = np.sin(2.0 * np.pi * root * 0.5 * t)
        sub_env = env * 0.018 * section_gain
        pad[0, int(start * SR):int(start * SR) + n] += sub * sub_env
        pad[1, int(start * SR):int(start * SR) + n] += sub * sub_env
    return pad


def build_arp() -> np.ndarray:
    arp = np.zeros((CHANNELS, N), dtype=np.float64)
    pattern = (0, 2, 4, 1, 3, 5, 4, 2, 0, 3, 5, 2, 4, 1, 3, 5)
    for bar in range(BARS):
        chord = CHORDS[CHORD_ORDER[(bar // 2) % 4]]
        notes = chord["arp"]
        if bar < 8:
            level = 0.050
        elif bar < 28:
            level = 0.036
        elif bar < 36:
            level = 0.061
        elif bar < 50:
            level = 0.042
        else:
            level = 0.055
        for step in range(16):
            start = bar * BAR + step * 0.125
            if 15.0 <= start < 16.0 or 71.0 <= start < 72.0:
                continue
            if start >= DURATION:
                continue
            midi = notes[pattern[step]]
            velocity = 1.0 if step % 4 == 0 else (0.70 if step % 2 == 0 else 0.52)
            pan = -0.42 if step % 2 == 0 else 0.42
            add_mono(
                arp,
                make_arp_note(midi),
                start,
                gain=level * velocity,
                pan=pan,
            )
    arp += pingpong_echo(arp, 0.375, 3, 0.34) * 0.25
    return arp


def build_bass() -> np.ndarray:
    bass = np.zeros((CHANNELS, N), dtype=np.float64)
    offsets = (0, 0, 12, 0, 7, 0, 12, 7)
    velocities = (1.0, 0.72, 0.88, 0.76, 0.92, 0.68, 0.86, 0.74)
    for bar in list(range(8, 28)) + list(range(36, 50)):
        chord = CHORDS[CHORD_ORDER[(bar // 2) % 4]]
        for step, offset in enumerate(offsets):
            start = bar * BAR + step * 0.25
            note = chord["bass"] + offset
            add_mono(
                bass,
                make_bass_note(note),
                start,
                gain=0.155 * velocities[step],
                pan=0.0,
            )
    return bass


def add_lead_phrase(
    bus: np.ndarray,
    melody: dict[int, list[tuple[float, float, int, float]]],
    start_bar: int,
    gain: float,
    transpose: int = 0,
) -> None:
    for relative_bar, notes in melody.items():
        bar = start_bar + relative_bar
        if bar >= BARS:
            continue
        for beat, beats, midi, velocity in notes:
            start = bar * BAR + beat * BEAT
            if start >= DURATION:
                continue
            duration = max(0.12, beats * BEAT)
            add_mono(
                bus,
                make_lead_note(midi + transpose, duration),
                start,
                gain=gain * velocity,
                pan=0.0,
            )


MELODY_A = {
    0: [(0.0, 0.5, 69, 0.92), (0.75, 0.25, 72, 0.78), (1.5, 0.5, 76, 0.88),
        (2.25, 0.25, 74, 0.74), (2.5, 0.5, 72, 0.82), (3.25, 0.75, 69, 0.90)],
    1: [(0.0, 0.75, 72, 0.86), (1.0, 0.5, 69, 0.78), (2.0, 0.5, 72, 0.82),
        (2.5, 0.75, 76, 0.90), (3.5, 0.5, 74, 0.82)],
    2: [(0.0, 0.5, 69, 0.86), (0.75, 0.5, 72, 0.82), (1.5, 0.75, 76, 0.92),
        (2.75, 0.25, 74, 0.72), (3.0, 1.0, 72, 0.88)],
    3: [(0.0, 0.5, 69, 0.82), (0.5, 0.5, 72, 0.78), (1.25, 0.75, 69, 0.82),
        (2.0, 1.0, 67, 0.86), (3.25, 0.75, 64, 0.76)],
    4: [(0.0, 0.5, 67, 0.84), (0.75, 0.5, 72, 0.82), (1.5, 0.75, 76, 0.92),
        (2.5, 0.5, 74, 0.82), (3.0, 1.0, 72, 0.88)],
    5: [(0.0, 0.75, 76, 0.92), (1.0, 0.5, 74, 0.84), (1.75, 0.5, 72, 0.82),
        (2.5, 0.75, 67, 0.82), (3.5, 0.5, 69, 0.88)],
    6: [(0.0, 0.5, 74, 0.88), (0.75, 0.5, 79, 0.94), (1.5, 0.75, 76, 0.92),
        (2.5, 0.5, 74, 0.84), (3.0, 0.75, 72, 0.88)],
    7: [(0.0, 0.5, 67, 0.82), (0.5, 0.5, 69, 0.82), (1.0, 0.5, 72, 0.86),
        (1.5, 1.0, 74, 0.92), (2.75, 0.5, 76, 0.88), (3.5, 0.5, 74, 0.82)],
}

MELODY_A_FILL = {
    0: [(0.0, 0.5, 76, 0.94), (0.75, 0.5, 79, 0.98), (1.5, 0.75, 81, 1.0),
        (2.5, 0.5, 79, 0.92), (3.0, 1.0, 76, 0.96)],
    1: [(0.0, 0.5, 74, 0.88), (0.75, 0.5, 76, 0.92), (1.5, 0.5, 79, 0.96),
        (2.0, 1.0, 76, 0.94), (3.5, 0.5, 72, 0.82)],
    2: [(0.0, 0.5, 72, 0.86), (0.75, 0.5, 76, 0.94), (1.5, 0.75, 79, 0.98),
        (2.75, 0.25, 76, 0.84), (3.0, 1.0, 72, 0.90)],
    3: [(0.0, 0.75, 69, 0.88), (1.0, 0.5, 72, 0.86), (2.0, 0.5, 76, 0.94),
        (2.5, 1.0, 74, 0.92), (3.5, 0.5, 72, 0.84)],
}

MELODY_B = {
    0: [(0.0, 0.5, 67, 0.94), (0.75, 0.5, 72, 0.90), (1.5, 0.75, 76, 0.98),
        (2.5, 0.5, 74, 0.90), (3.0, 1.0, 72, 0.94)],
    1: [(0.0, 0.5, 74, 0.92), (0.5, 0.5, 79, 0.98), (1.25, 0.5, 76, 0.92),
        (1.75, 0.5, 74, 0.88), (2.5, 1.0, 72, 0.92), (3.5, 0.5, 67, 0.82)],
    2: [(0.0, 0.5, 69, 0.92), (0.75, 0.5, 72, 0.88), (1.5, 0.75, 76, 0.98),
        (2.5, 0.5, 74, 0.90), (3.0, 1.0, 69, 0.94)],
    3: [(0.0, 0.75, 72, 0.92), (1.0, 0.5, 69, 0.84), (1.75, 0.5, 67, 0.84),
        (2.5, 0.5, 69, 0.88), (3.0, 1.0, 64, 0.80)],
    12: [(0.0, 0.5, 79, 0.98), (0.75, 0.5, 76, 0.92), (1.5, 0.75, 72, 0.88),
         (2.5, 0.5, 74, 0.92), (3.0, 1.0, 76, 0.96)],
    13: [(0.0, 0.5, 74, 0.92), (0.5, 0.5, 79, 0.98), (1.0, 1.0, 81, 1.0),
         (2.5, 0.5, 79, 0.94), (3.5, 0.5, 76, 0.88)],
}


def build_lead() -> np.ndarray:
    lead = np.zeros((CHANNELS, N), dtype=np.float64)
    add_lead_phrase(lead, MELODY_A, 8, gain=0.185)
    add_lead_phrase(lead, MELODY_A, 16, gain=0.192)
    add_lead_phrase(lead, MELODY_A_FILL, 24, gain=0.200)

    # The second drop repeats the hook an octave higher and adds extra weight.
    add_lead_phrase(lead, MELODY_B, 36, gain=0.205)
    add_lead_phrase(lead, MELODY_B, 40, gain=0.205)
    add_lead_phrase(lead, MELODY_B, 44, gain=0.205)
    add_lead_phrase(lead, {0: MELODY_B[0], 1: MELODY_B[1]}, 48, gain=0.212)
    add_lead_phrase(lead, MELODY_B, 36, gain=0.078, transpose=12)
    add_lead_phrase(lead, MELODY_B, 40, gain=0.082, transpose=12)
    add_lead_phrase(lead, MELODY_B, 44, gain=0.086, transpose=12)
    add_lead_phrase(
        lead, {0: MELODY_B[12], 1: MELODY_B[13]}, 48, gain=0.090, transpose=12
    )
    return lead


# ---------------------------------------------------------------------------
# Arrangement and mixing


def add_impacts(mix: np.ndarray, send: np.ndarray) -> None:
    gains = (0.86, 0.80, 0.76, 0.84, 0.80)
    for start, gain in zip(IMPACTS, gains):
        impact = make_impact()
        add_mono(mix, impact, start, gain=gain, pan=0.0)
        add_mono(send, impact, start, gain=gain * 0.20, pan=0.0)


def add_drums(mix: np.ndarray, send: np.ndarray, second_drop: bool) -> None:
    kicks = [make_kick(index) for index in range(3)]
    snares = [make_snare(False, index) for index in range(3)]
    hats_closed = [make_hat(False, index) for index in range(3)]
    hats_open = [make_hat(True, index) for index in range(2)]

    if second_drop:
        start_bar, end_bar = 36, 50
    else:
        start_bar, end_bar = 8, 28

    for bar in range(start_bar, end_bar):
        for beat in range(4):
            start = bar * BAR + beat * BEAT
            kick = kicks[(bar * 4 + beat) % 3]
            add_mono(mix, kick, start, gain=0.58, pan=0.0)

        for beat in (1, 3):
            start = bar * BAR + beat * BEAT
            snare = snares[(bar + beat) % 3]
            add_mono(mix, snare, start, gain=0.38, pan=0.08)
            add_mono(send, snare, start, gain=0.10, pan=0.08)

        for step in range(16):
            start = bar * BAR + step * 0.125
            if second_drop and step % 4 == 2:
                add_mono(
                    mix,
                    hats_open[(bar + step) % 2],
                    start,
                    gain=0.145,
                    pan=0.34 if (bar + step) % 2 else -0.34,
                )
            else:
                accent = 1.0 if step % 4 == 0 else (0.72 if step % 2 == 0 else 0.52)
                add_mono(
                    mix,
                    hats_closed[(bar + step) % 3],
                    start,
                    gain=0.102 * accent,
                    pan=-0.26 if step % 2 else 0.26,
                )


def add_risers_and_rolls(mix: np.ndarray, send: np.ndarray) -> None:
    for start, strength in ((12.0, 1.0), (68.0, 1.06)):
        riser = make_riser(3.0, 0 if start < 20 else 1)
        add_mono(mix, riser[0], start, gain=0.38 * strength, pan=-0.65)
        add_mono(mix, riser[1], start, gain=0.38 * strength, pan=0.65)

    # Accelerating snare roll: eighths in bar 34, sixteenths in bar 35,
    # then a full beat of silence before the second drop.
    roll_hits: list[tuple[float, float]] = []
    for step in range(8):
        roll_hits.append((68.0 + step * 0.25, 0.42 + 0.04 * step))
    for step in range(8):
        roll_hits.append((70.0 + step * 0.125, 0.68 + 0.045 * step))
    for index, (start, velocity) in enumerate(roll_hits):
        snare = make_snare(True, index % 2)
        add_mono(mix, snare, start, gain=0.16 + 0.18 * velocity, pan=0.0)
        add_mono(send, snare, start, gain=0.045 + 0.035 * velocity, pan=0.0)


def add_air(mix: np.ndarray) -> None:
    for start, length, level in (
        (0.0, 16.0, 0.014),
        (56.0, 16.0, 0.023),
        (100.0, 12.0, 0.016),
    ):
        n = int(length * SR)
        t = np.arange(n, dtype=np.float64) / SR
        for channel in range(2):
            noise = RNG.normal(0.0, 1.0, n)
            noise = fft_filter(noise, low=5_400, high=260, order=2)
            swell = 0.48 + 0.52 * (
                0.5 + 0.5 * np.sin(2.0 * np.pi * (0.071 + 0.013 * channel) * t)
            )
            fade = smoothstep(t / 0.7)
            fade *= 1.0 - smoothstep((t - (length - 1.2)) / 1.2)
            add_mono(
                mix,
                noise * swell * fade,
                start,
                gain=level,
                pan=-0.55 if channel == 0 else 0.55,
            )


def build_sidechain() -> np.ndarray:
    env = np.ones(N, dtype=np.float64)
    beat_starts = list(np.arange(16.0, 56.0, BEAT))
    beat_starts += list(np.arange(72.0, 100.0, BEAT))
    for start in beat_starts:
        first = int(round(start * SR))
        n = min(int(0.31 * SR), N - first)
        if n <= 0:
            continue
        t = np.arange(n, dtype=np.float64) / SR
        attack = 0.006
        minimum = 0.16
        curve = np.empty(n, dtype=np.float64)
        early = t < attack
        curve[early] = 1.0 - (1.0 - minimum) * smoothstep(t[early] / attack)
        curve[~early] = minimum + (1.0 - minimum) * (
            1.0 - np.exp(-(t[~early] - attack) / 0.070)
        )
        env[first:first + n] = np.minimum(env[first:first + n], curve)
    return env


def time_gate() -> np.ndarray:
    gate = np.ones(N, dtype=np.float64)
    for start, end in ((15.0, 16.0), (71.0, 72.0)):
        first = int(round(start * SR))
        last = int(round(end * SR))
        ramp = int(0.010 * SR)
        gate[first - ramp:first] *= np.linspace(1.0, 0.0, ramp)
        gate[first:last] = 0.0
    return gate


def final_fade() -> np.ndarray:
    fade = np.ones(N, dtype=np.float64)
    start = int(round((DURATION - 4.0) * SR))
    t = np.arange(N - start, dtype=np.float64) / SR
    fade[start:] = 0.5 + 0.5 * np.cos(np.pi * np.clip(t / 4.0, 0.0, 1.0))
    fade[-1] = 0.0
    return fade


def soft_limit(
    signal: np.ndarray,
    threshold: float = 0.58,
    ceiling: float = 0.885,
) -> np.ndarray:
    magnitude = np.abs(signal)
    limited = magnitude.copy()
    over = magnitude > threshold
    limited[over] = threshold + (ceiling - threshold) * np.tanh(
        (magnitude[over] - threshold) / (ceiling - threshold)
    )
    return np.sign(signal) * limited


def apply_ceiling(signal: np.ndarray, ceiling: float) -> np.ndarray:
    maximum = float(np.max(np.abs(signal)))
    if maximum < 1e-12:
        return signal
    return signal * (ceiling / maximum)


def master(signal: np.ndarray) -> np.ndarray:
    maximum = float(np.max(np.abs(signal)))
    signal = signal / maximum
    target_rms = db_to_amp(-15.0)
    ceiling = db_to_amp(-1.06)

    def candidate(drive: float) -> np.ndarray:
        return apply_ceiling(soft_limit(signal * drive, ceiling=ceiling), ceiling)

    base = candidate(1.0)
    base_rms = float(np.sqrt(np.mean(base * base)))
    if base_rms >= target_rms:
        mastered = base * (target_rms / base_rms)
        return apply_ceiling(mastered, ceiling)

    low = 1.0
    high = 2.0
    while high < 32.0:
        trial = candidate(high)
        if float(np.sqrt(np.mean(trial * trial))) >= target_rms:
            break
        high *= 1.6

    for _ in range(13):
        middle = 0.5 * (low + high)
        trial = candidate(middle)
        if float(np.sqrt(np.mean(trial * trial))) < target_rms:
            low = middle
        else:
            high = middle

    return candidate(0.5 * (low + high))


def build_mix() -> np.ndarray:
    mix = np.zeros((CHANNELS, N), dtype=np.float64)
    send = np.zeros((CHANNELS, N), dtype=np.float64)

    add_impacts(mix, send)
    add_drums(mix, send, second_drop=False)
    add_drums(mix, send, second_drop=True)
    add_risers_and_rolls(mix, send)
    add_air(mix)

    sidechain = build_sidechain()
    pad = build_pad()
    pad_duck = 0.44 + 0.56 * sidechain
    mix += pad * pad_duck

    arp = build_arp()
    arp_duck = 0.72 + 0.28 * sidechain
    mix += arp * arp_duck

    bass = build_bass()
    mix += bass * sidechain

    lead = build_lead()
    mix += lead
    mix += pingpong_echo(lead, 0.375, 4, 0.38) * 0.33

    mix += early_reflections(send) * 0.52
    return mix


# ---------------------------------------------------------------------------
# Export


def write_wav(path: Path, stereo: np.ndarray) -> np.ndarray:
    pcm = np.clip(np.rint(stereo.T * 32767.0), -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(CHANNELS)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())
    return pcm


def main() -> None:
    started = time.perf_counter()
    mix = build_mix()
    mix = mix - mix.mean(axis=1, keepdims=True)
    mix *= time_gate()
    mix *= final_fade()
    mastered = master(mix)

    # The very last sample is exactly silent, confirming the fade end.
    mastered[:, -1] = 0.0

    output_dir = Path(__file__).resolve().parent.parent / "public"
    output_dir.mkdir(parents=True, exist_ok=True)
    wav_path = output_dir / "film-music.wav"
    json_path = output_dir / "film-music.json"

    pcm = write_wav(wav_path, mastered)
    audio = pcm.astype(np.float64) / 32768.0
    duration = pcm.shape[0] / float(SR)
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio * audio)))
    peak_db = 20.0 * math.log10(max(peak, 1e-12))
    rms_db = 20.0 * math.log10(max(rms, 1e-12))

    metadata = {
        "bpm": BPM,
        "bars": BARS,
        "duration": DURATION,
        "sections": list(SECTIONS),
        "impacts": list(IMPACTS),
    }
    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    elapsed = time.perf_counter() - started
    print(f"duration_s={duration:.3f}")
    print(f"sample_rate={SR}")
    print(f"channels={CHANNELS}")
    print("bit_depth=16")
    print(f"peak_dbfs={peak_db:.2f}")
    print(f"rms_dbfs={rms_db:.2f}")
    print(f"elapsed_s={elapsed:.2f}")


if __name__ == "__main__":
    main()
