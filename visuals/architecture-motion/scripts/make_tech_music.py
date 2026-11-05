#!/usr/bin/env python3
"""Synthesize the calm underscore for the technical film (TechFilm).

Only numpy + the standard library. 120 BPM (one bar = 2 s), Am-F-C-G pads,
a soft sub bass, a quiet arpeggio, a gentle pulse in the body, and a short
bell at every chapter cut so the music marks the structure.

Usage: python3 scripts/make_tech_music.py <total_seconds> <cut1,cut2,...>
"""

from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np

SR = 44_100
BAR = 2.0
CHORDS = [
    (45, (57, 60, 64, 69)),  # Am
    (41, (53, 57, 60, 65)),  # F
    (48, (55, 60, 64, 67)),  # C
    (43, (55, 59, 62, 67)),  # G
]


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n: int, a: float, r: float) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4))
    tail = np.clip((n / SR - t) / max(r, 1e-4), 0, 1)
    return (e * tail).astype(np.float32)


def loop_bars() -> tuple[np.ndarray, np.ndarray]:
    """4 bars of pad+bass (bed) and arp (sparkle), mono float32."""
    n = int(SR * BAR)
    bed = np.zeros(n * 4, np.float32)
    arp = np.zeros(n * 4, np.float32)
    t = np.arange(n) / SR
    rng = np.random.default_rng(7)
    for b, (bass, pad) in enumerate(CHORDS):
        seg = np.zeros(n, np.float32)
        for m in pad:
            for det in (-0.08, 0.0, 0.08):
                ph = rng.random() * 6.28
                seg += np.sin(2 * np.pi * hz(m + det) * t + ph).astype(np.float32) * 0.035
        seg *= env(n, 0.5, 0.6)
        sub = np.sin(2 * np.pi * hz(bass - 12) * t).astype(np.float32) * 0.12 * env(n, 0.05, 0.4)
        bed[b * n:(b + 1) * n] += seg + sub
        notes = list(pad) + [pad[1] + 12, pad[2] + 12]
        step = n // 8
        for k in range(8):
            m = notes[(k * 3) % len(notes)] + 12
            tt = np.arange(step) / SR
            tone = np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 9)
            arp[b * n + k * step: b * n + (k + 1) * step] += tone.astype(np.float32) * 0.045
    return bed, arp


def kick() -> np.ndarray:
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    f = 50 + 70 * np.exp(-t * 30)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) * 0.22).astype(np.float32)


def bell() -> np.ndarray:
    n = int(SR * 2.4)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    for mult, amp in ((1, 1.0), (2.76, 0.4), (5.4, 0.2)):
        out += (np.sin(2 * np.pi * hz(81) * mult * t) * np.exp(-t * (2.2 + mult))).astype(np.float32) * amp
    return out * 0.07


def main() -> None:
    total = float(sys.argv[1])
    cuts = [float(x) for x in sys.argv[2].split(",")]
    N = int(SR * total)
    bed, arp = loop_bars()
    reps = N // len(bed) + 1
    mix = np.tile(bed, reps)[:N].copy()
    arp_full = np.tile(arp, reps)[:N]
    # 封面和结尾不加琶音与鼓点，正文加
    body0, body1 = int(SR * cuts[1]), int(SR * cuts[-1])
    mix[body0:body1] += arp_full[body0:body1]
    k = kick()
    beat = int(SR * 0.5)
    for i in range(body0, body1, beat * 2):
        e = min(N, i + len(k))
        mix[i:e] += k[: e - i]
    b = bell()
    for c in cuts[1:]:
        i = int(SR * c)
        e = min(N, i + len(b))
        mix[i:e] += b[: e - i]
    fade = int(SR * 3)
    mix[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
    mix[-fade * 2:] *= np.linspace(1, 0, fade * 2, dtype=np.float32)
    mix /= max(1e-6, float(np.max(np.abs(mix)))) / 0.8
    # 轻微立体声：右声道延迟 12 ms
    d = int(SR * 0.012)
    right = np.concatenate([np.zeros(d, np.float32), mix[:-d]])
    st = np.stack([mix, right], axis=1)
    pcm = (st * 32767).astype("<i2")
    out = Path(__file__).resolve().parent.parent / "public" / "tech-music.wav"
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(out, f"{total:.0f}s")


if __name__ == "__main__":
    main()
