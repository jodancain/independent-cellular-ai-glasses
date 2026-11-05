// 全流程宣传片 v3（她的进化）：112 秒，120 BPM，场景切换卡在小节线上，与 public/film-music.wav 的段落对齐。
import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Backdrop, C, Flash, Hud, bars, beatPulse } from "./kit";
import { SCompat, SDay, SRoadmap } from "./scenes";
import { SBefore, SBody, SEvolve, SFinale, SHands, SRender, SVersus, SWake } from "./story";
import { Say } from "./persona";

export const FILM_FRAMES = bars(56); // 3360 帧 = 112 秒
const IMPACTS = [0, bars(8), bars(28), bars(36), bars(50)];
// 有鼓的段落才做节拍脉冲
const isDrop = (f: number) => (f >= bars(8) && f < bars(28)) || (f >= bars(36) && f < bars(50));

type Scene = { from: number; len: number; ch: string; label: string; hue: string; el: (pulse: number) => React.ReactNode };
const SCENES: Scene[] = [
  { from: 0, len: 4, ch: "00", label: "AWAKE", hue: C.cyan, el: () => <SWake /> },
  { from: 4, len: 4, ch: "01", label: "BEFORE", hue: C.cyan, el: () => <SBefore /> },
  { from: 8, len: 8, ch: "02", label: "BEFORE / AFTER", hue: C.cyan, el: () => <SVersus /> },
  { from: 16, len: 4, ch: "03", label: "EVOLVED", hue: C.cyan, el: () => <SEvolve /> },
  { from: 20, len: 8, ch: "04", label: "HANDS · AGENT", hue: C.cyan, el: () => <SHands /> },
  { from: 28, len: 4, ch: "05", label: "RENDER · CAST", hue: C.cyan, el: () => <SRender /> },
  { from: 32, len: 4, ch: "06", label: "DISPLAY MODES", hue: C.cyan, el: () => <CompatTalk /> },
  { from: 36, len: 8, ch: "07", label: "MY DAY", hue: C.cyan, el: () => <SDay /> },
  { from: 44, len: 4, ch: "08", label: "BODY", hue: C.cyan, el: () => <SBody /> },
  { from: 48, len: 2, ch: "09", label: "ROADMAP", hue: C.cyan, el: () => <SRoadmap /> },
  { from: 50, len: 6, ch: "10", label: "SAY NO TO AI PHONE", hue: C.cyan, el: (p) => <SFinale pulse={p} /> },
];

// 显示模式演示 + 第一人称字幕
const CompatTalk: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{ transform: "translateY(-34px) scale(.93)", transformOrigin: "50% 40%" }}>
      <SCompat />
    </AbsoluteFill>
    <Say
      bottom={36}
      size={40}
      lines={[
        { from: 4, to: 60, text: "打开 QQ。", who: "you" },
        { from: 64, to: 150, text: "先给你看板；要自己点，我就投屏。" },
        { from: 156, to: 236, text: "视频、拍照、通话、图片，都在眼前。" },
      ]}
    />
  </AbsoluteFill>
);

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
