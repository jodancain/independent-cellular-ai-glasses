// 全流程宣传片：112 秒，120 BPM，场景切换卡在小节线上，与 public/film-music.wav 的段落对齐。
import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Backdrop, C, Flash, Hud, bars, beatPulse } from "./kit";
import { SArchitecture, SCompat, SConnect, SDay, SIntro, SOutro, SPower, SRivals, SRoadmap, SVision, SWeight } from "./scenes";

export const FILM_FRAMES = bars(56); // 3360 帧 = 112 秒
const IMPACTS = [0, bars(8), bars(28), bars(36), bars(50)];
// 有鼓的段落才做节拍脉冲
const isDrop = (f: number) => (f >= bars(8) && f < bars(28)) || (f >= bars(36) && f < bars(50));

type Scene = { from: number; len: number; ch: string; label: string; hue: string; el: (pulse: number) => React.ReactNode };
const SCENES: Scene[] = [
  { from: 0, len: 4, ch: "00", label: "INTRO", hue: C.cyan, el: (p) => <SIntro pulse={p} /> },
  { from: 4, len: 4, ch: "01", label: "VISION", hue: C.cyan, el: () => <SVision /> },
  { from: 8, len: 6, ch: "02", label: "COMPETITORS", hue: C.pink, el: () => <SRivals /> },
  { from: 14, len: 6, ch: "03", label: "ARCHITECTURE", hue: C.cyan, el: () => <SArchitecture /> },
  { from: 20, len: 4, ch: "04", label: "CONNECT", hue: C.lime, el: () => <SConnect /> },
  { from: 24, len: 4, ch: "05", label: "COMPATIBILITY", hue: C.amber, el: () => <SCompat /> },
  { from: 28, len: 4, ch: "06", label: "POWER", hue: C.lime, el: () => <SPower /> },
  { from: 32, len: 4, ch: "07", label: "ERGONOMICS", hue: C.pink, el: () => <SWeight /> },
  { from: 36, len: 8, ch: "08", label: "EXPERIENCE", hue: C.cyan, el: () => <SDay /> },
  { from: 44, len: 6, ch: "09", label: "ROADMAP", hue: C.blue, el: () => <SRoadmap /> },
  { from: 50, len: 6, ch: "10", label: "OUTRO", hue: C.cyan, el: (p) => <SOutro pulse={p} /> },
];

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = isDrop(f) ? beatPulse(f) : beatPulse(f, 0.25);
  const cur = SCENES.find((s) => f >= bars(s.from) && f < bars(s.from + s.len)) ?? SCENES[0];
  // 场景切换时的 RGB 错位抖动
  const sinceCut = f - bars(cur.from);
  void sinceCut;
  const zoom = 1 + pulse * 0.004;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop hue={cur.hue} pulse={pulse} globalFrame={f} />
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        {SCENES.map((s) => (
          <Sequence key={s.ch} from={bars(s.from)} durationInFrames={bars(s.len)} premountFor={30}>
            <SceneFade len={bars(s.len)}>{s.el(pulse)}</SceneFade>
          </Sequence>
        ))}
      </AbsoluteFill>
      <Hud chapter={cur.ch} label={cur.label} globalFrame={f} />
      <Flash at={IMPACTS} globalFrame={f} />
      <Audio src={staticFile("film-music.wav")} />
    </AbsoluteFill>
  );
};

// 每个场景最后 10 帧淡出，避免硬切
const SceneFade: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [len - 10, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
