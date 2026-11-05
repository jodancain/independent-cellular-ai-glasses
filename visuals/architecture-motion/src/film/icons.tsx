// 宣传片图标库：全部用 SVG 线条绘制，无外部图片或图标依赖。100×100 画布，暖白单色。
import React from "react";

const line = (d: string, c: string, sw: number, opacity = 1) => (
  <path d={d} fill="none" stroke={c} strokeWidth={sw} opacity={opacity} />
);
const solid = (d: string, c: string, opacity = 1) => <path d={d} fill={c} stroke="none" opacity={opacity} />;
const circle = (cx: number, cy: number, r: number, c: string, sw: number, opacity = 1) => (
  <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={sw} opacity={opacity} />
);
const dot = (cx: number, cy: number, r: number, c: string, opacity = 1) => (
  <circle cx={cx} cy={cy} r={r} fill={c} stroke="none" opacity={opacity} />
);
const box = (x: number, y: number, w: number, h: number, rx: number, c: string, sw: number, opacity = 1) => (
  <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={c} strokeWidth={sw} opacity={opacity} />
);

export type GlyphName =
  | "monitor"
  | "phone"
  | "car"
  | "cloud"
  | "brain"
  | "eye"
  | "mouth"
  | "ear"
  | "retina"
  | "camera"
  | "lens"
  | "mic"
  | "speaker"
  | "sun"
  | "card"
  | "moon"
  | "watch"
  | "switch"
  | "battery"
  | "bolt"
  | "play"
  | "viewfinder"
  | "videoCall"
  | "image"
  | "magnifier"
  | "board"
  | "glasses"
  | "chip"
  | "wrench"
  | "cursor"
  | "person"
  | "people"
  | "wifi"
  | "signal"
  | "bluetooth"
  | "clock"
  | "balance";

const GLYPHS: Record<GlyphName, (c: string, sw: number) => React.ReactNode> = {
  monitor: (c, sw) => (
    <>
      {box(10, 16, 80, 54, 5, c, sw)}
      {line("M40 70 V83 M60 70 V83 M28 86 H72", c, sw)}
      {line("M18 60 H82", c, sw, 0.25)}
    </>
  ),
  phone: (c, sw) => (
    <>
      {box(29, 8, 42, 80, 9, c, sw)}
      {line("M42 79 H58", c, sw)}
      {dot(50, 18, 2, c)}
      {line("M36 28 H64", c, sw, 0.3)}
    </>
  ),
  car: (c, sw) => (
    <>
      {line("M11 66 V55 Q11 48 19 48 H28 L38 29 H62 L72 48 H81 Q89 48 89 55 V66", c, sw)}
      {line("M11 66 H89", c, sw)}
      {circle(30, 69, 8, c, sw)}
      {circle(70, 69, 8, c, sw)}
      {line("M40 33 H60 L66 47 H34 Z", c, sw, 0.55)}
      {line("M22 56 H32 M68 56 H78", c, sw, 0.45)}
    </>
  ),
  cloud: (c, sw) => (
    <path
      d="M28 70 C16 70 10 62 12 53 C13 44 22 41 29 43 C30 29 41 20 54 24 C65 27 69 36 68 43 C80 42 88 49 88 58 C88 66 82 70 72 70 Z"
      fill="none"
      stroke={c}
      strokeWidth={sw}
    />
  ),
  brain: (c, sw) => (
    <>
      {line("M48 20 C38 14 26 20 26 32 C16 36 14 50 22 56 C18 66 26 76 38 74 C42 82 48 82 48 74 Z", c, sw)}
      {line("M52 20 C62 14 74 20 74 32 C84 36 86 50 78 56 C82 66 74 76 62 74 C58 82 52 82 52 74 Z", c, sw)}
      {line("M50 20 V74", c, sw * 0.7, 0.55)}
      {line("M34 34 C40 32 44 36 44 42 C44 48 38 49 38 54", c, sw * 0.55, 0.8)}
      {line("M40 62 C44 60 48 64 48 68", c, sw * 0.5, 0.65)}
      {line("M66 34 C60 32 56 36 56 42 C56 48 62 49 62 54", c, sw * 0.55, 0.8)}
      {line("M60 62 C56 60 52 64 52 68", c, sw * 0.5, 0.65)}
      {line("M74 74 C78 76 80 80 78 84 C72 84 68 78 74 74 Z", c, sw * 0.6, 0.8)}
    </>
  ),
  eye: (c, sw) => (
    <>
      {line("M8 50 C24 30 38 24 50 24 C62 24 76 30 92 50 C76 70 62 76 50 76 C38 76 24 70 8 50 Z", c, sw)}
      {circle(50, 50, 13, c, sw)}
      {dot(50, 50, 4, c)}
    </>
  ),
  mouth: (c, sw) => (
    <>
      {line("M18 44 C30 34 42 40 50 40 C58 40 70 34 82 44", c, sw)}
      {line("M18 44 C28 66 40 74 50 74 C60 74 72 66 82 44", c, sw)}
      {line("M50 40 V47", c, sw * 0.7, 0.7)}
      {line("M27 50 Q50 57 73 50", c, sw * 0.6, 0.55)}
      <path d="M42 66 Q50 61 58 66 Q54 73 50 73 Q46 73 42 66 Z" fill={c} stroke="none" opacity={0.35} />
    </>
  ),
  ear: (c, sw) => (
    <>
      {line("M64 18 C48 16 36 26 36 43 C36 53 42 58 42 67 C42 76 47 84 55 84 C62 84 66 79 66 73", c, sw)}
      {line("M58 34 C50 33 45 38 46 46 C47 53 52 55 52 63 C52 69 54 72 58 72", c, sw * 0.8)}
      {line("M52 80 C56 82 60 80 62 76", c, sw * 0.7, 0.65)}
    </>
  ),
  retina: (c, sw) => (
    <>
      {circle(50, 50, 30, c, sw)}
      {circle(50, 50, 13, c, sw)}
      {dot(50, 50, 5, c)}
      {line("M78 43 L94 34 M78 56 L94 62", c, sw * 0.8)}
      {line("M30 32 C34 29 38 27 42 26", c, sw * 0.6, 0.55)}
    </>
  ),
  camera: (c, sw) => (
    <>
      {box(12, 30, 76, 48, 8, c, sw)}
      {line("M36 30 L41 18 H59 L64 30", c, sw)}
      {circle(50, 54, 15, c, sw)}
      {dot(50, 54, 5, c)}
      {dot(77, 40, 3, c)}
    </>
  ),
  lens: (c, sw) => (
    <>
      {circle(50, 50, 28, c, sw)}
      {circle(50, 50, 14, c, sw)}
      {circle(50, 50, 4, c, sw * 0.8)}
      {line("M50 14 V23 M50 77 V86 M14 50 H23 M77 50 H86", c, sw * 0.75, 0.7)}
    </>
  ),
  mic: (c, sw) => (
    <>
      {box(36, 9, 28, 47, 14, c, sw)}
      {line("M24 44 C24 62 36 74 50 74 C64 74 76 62 76 44", c, sw)}
      {line("M50 74 V91 M36 91 H64", c, sw)}
      {line("M44 24 H56 M44 33 H56", c, sw * 0.6, 0.55)}
    </>
  ),
  speaker: (c, sw) => (
    <>
      {line("M18 40 H34 L52 22 V78 L34 60 H18 Z", c, sw)}
      {line("M64 38 C70 44 70 56 64 62", c, sw * 0.9)}
      {line("M74 29 C84 39 84 61 74 71", c, sw * 0.9)}
    </>
  ),
  sun: (c, sw) => (
    <>
      {circle(50, 50, 17, c, sw)}
      {line("M50 7 V20 M50 80 V93 M7 50 H20 M80 50 H93", c, sw)}
      {line("M20 20 L29 29 M71 71 L80 80 M80 20 L71 29 M29 71 L20 80", c, sw)}
    </>
  ),
  card: (c, sw) => (
    <>
      {box(12, 19, 76, 62, 9, c, sw)}
      {line("M12 36 H88", c, sw, 0.65)}
      {dot(23, 28, 2.5, c, 0.8)}
      {dot(32, 28, 2.5, c, 0.55)}
      {line("M24 48 H58 M24 58 H72 M24 68 H48", c, sw * 0.7, 0.8)}
    </>
  ),
  moon: (c, sw) => (
    <path
      d="M63 12 C45 18 33 36 37 54 C41 72 57 84 75 80 C59 74 51 62 51 48 C51 34 55 22 63 12 Z"
      fill="none"
      stroke={c}
      strokeWidth={sw}
    />
  ),
  watch: (c, sw) => (
    <>
      {circle(50, 50, 24, c, sw)}
      {line("M50 50 V34 M50 50 L62 58", c, sw)}
      {box(38, 8, 24, 18, 5, c, sw, 0.8)}
      {box(38, 74, 24, 18, 5, c, sw, 0.8)}
      {line("M74 44 H80 V56 H74", c, sw, 0.7)}
      {dot(50, 50, 2.5, c)}
    </>
  ),
  switch: (c, sw) => (
    <>
      {box(9, 31, 82, 38, 19, c, sw)}
      {dot(68, 50, 13, c)}
      {line("M22 50 H40", c, sw, 0.5)}
    </>
  ),
  battery: (c, sw) => (
    <>
      {box(6, 28, 80, 44, 8, c, sw)}
      {solid("M86 40 H94 V60 H86 Z", c, 0.9)}
      {line("M20 38 V62 M30 38 V62 M40 38 V62", c, sw * 0.7, 0.55)}
    </>
  ),
  bolt: (c, sw) => (
    <path d="M56 4 L22 54 H44 L38 96 L78 40 H54 L56 4 Z" fill="none" stroke={c} strokeWidth={sw} />
  ),
  play: (c, sw) => <path d="M33 21 L82 50 L33 79 Z" fill="none" stroke={c} strokeWidth={sw} />,
  viewfinder: (c, sw) => (
    <>
      {line("M14 34 V20 Q14 14 20 14 H34 M66 14 H80 Q86 14 86 20 V34", c, sw)}
      {line("M86 66 V80 Q86 86 80 86 H66 M34 86 H20 Q14 86 14 80 V66", c, sw)}
      {circle(50, 50, 15, c, sw)}
      {dot(50, 50, 4, c)}
    </>
  ),
  videoCall: (c, sw) => (
    <>
      {box(7, 25, 56, 50, 8, c, sw)}
      {line("M63 42 L91 27 V73 L63 58 Z", c, sw)}
      {circle(31, 43, 7, c, sw * 0.8)}
      {line("M20 67 C22 56 40 56 42 67", c, sw * 0.8)}
    </>
  ),
  image: (c, sw) => (
    <>
      {box(10, 19, 80, 62, 7, c, sw)}
      {circle(32, 38, 7, c, sw * 0.8)}
      {line("M18 71 L40 48 L52 60 L66 44 L84 71", c, sw)}
    </>
  ),
  magnifier: (c, sw) => (
    <>
      {circle(42, 42, 24, c, sw)}
      {line("M59 59 L87 87", c, sw * 1.15)}
      {line("M31 42 H53 M42 31 V53", c, sw * 0.6, 0.45)}
    </>
  ),
  board: (c, sw) => (
    <>
      {box(20, 20, 60, 60, 5, c, sw)}
      {box(37, 37, 26, 26, 3, c, sw * 0.8)}
      {line(
        "M20 33 H10 M20 50 H10 M20 67 H10 M80 33 H90 M80 50 H90 M80 67 H90 M33 20 V10 M50 20 V10 M67 20 V10 M33 80 V90 M50 80 V90 M67 80 V90",
        c,
        sw * 0.65,
        0.7,
      )}
      {dot(50, 50, 3, c)}
    </>
  ),
  glasses: (c, sw) => (
    <>
      {box(8, 29, 36, 30, 10, c, sw)}
      {box(56, 29, 36, 30, 10, c, sw)}
      {line("M44 39 Q50 32 56 39", c, sw)}
      {line("M8 37 L1 33 M92 37 L99 33", c, sw, 0.8)}
    </>
  ),
  chip: (c, sw) => (
    <>
      {box(27, 27, 46, 46, 6, c, sw)}
      {box(40, 40, 20, 20, 3, c, sw * 0.75)}
      {line(
        "M33 27 V15 M50 27 V15 M67 27 V15 M33 73 V85 M50 73 V85 M67 73 V85 M27 33 H15 M27 50 H15 M27 67 H15 M73 33 H85 M73 50 H85 M73 67 H85",
        c,
        sw * 0.7,
        0.8,
      )}
    </>
  ),
  wrench: (c, sw) => (
    <>
      {line("M30 13 C20 13 14 21 16 30 C17 36 21 40 26 42 L34 34 L30 28 L36 22 L42 28 L50 20 C46 15 39 13 30 13 Z", c, sw)}
      {line("M35 42 L84 91 M90 85 L41 36", c, sw)}
    </>
  ),
  cursor: (c, sw) => (
    <path d="M28 13 L77 52 L55 56 L67 82 L56 87 L44 61 L28 75 Z" fill="none" stroke={c} strokeWidth={sw} />
  ),
  person: (c, sw) => (
    <>
      {circle(50, 31, 13, c, sw)}
      {line("M22 82 C22 61 36 51 50 51 C64 51 78 61 78 82", c, sw)}
    </>
  ),
  people: (c, sw) => (
    <>
      {circle(34, 34, 10, c, sw * 0.9)}
      {line("M14 76 C14 61 24 54 34 54 C44 54 54 61 54 76", c, sw * 0.9)}
      {circle(68, 38, 9, c, sw * 0.8)}
      {line("M54 76 C56 63 62 58 68 58 C78 58 86 65 86 76", c, sw * 0.8)}
    </>
  ),
  wifi: (c, sw) => (
    <>
      {line("M13 42 C35 20 65 20 87 42", c, sw)}
      {line("M27 55 C42 40 58 40 73 55", c, sw)}
      {line("M40 68 C46 62 54 62 60 68", c, sw)}
      {dot(50, 80, 3, c)}
    </>
  ),
  signal: (c, sw) => (
    <>
      <rect x={14} y={62} width={13} height={24} rx={2} fill="none" stroke={c} strokeWidth={sw * 0.75} />
      <rect x={33} y={48} width={13} height={38} rx={2} fill="none" stroke={c} strokeWidth={sw * 0.75} />
      <rect x={52} y={33} width={13} height={53} rx={2} fill="none" stroke={c} strokeWidth={sw * 0.75} />
      <rect x={71} y={17} width={13} height={69} rx={2} fill={c} stroke="none" opacity={0.85} />
    </>
  ),
  bluetooth: (c, sw) => (
    <>
      {line("M52 9 V91 L75 68 L29 32 L52 9 L75 32 L29 68", c, sw)}
      {line("M52 9 V91", c, sw, 0.25)}
    </>
  ),
  clock: (c, sw) => (
    <>
      {circle(50, 50, 34, c, sw)}
      {line("M50 50 V28 M50 50 L66 60", c, sw)}
      {dot(50, 50, 2.5, c)}
      {line("M50 9 V15 M50 85 V91 M9 50 H15 M85 50 H91", c, sw * 0.7, 0.6)}
    </>
  ),
  balance: (c, sw) => (
    <>
      {line("M50 12 V82 M30 88 H70", c, sw)}
      {line("M18 34 H82", c, sw)}
      {line("M18 34 L8 58 H28 Z", c, sw * 0.8)}
      {line("M82 34 L72 58 H92 Z", c, sw * 0.8)}
      {dot(50, 32, 4, c)}
    </>
  ),
};

export const Glyph: React.FC<{
  name: GlyphName;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  opacity?: number;
  strokeWidth?: number;
}> = ({ name, x = 0, y = 0, size = 100, color = "#e8e2d4", opacity = 1, strokeWidth = 4 }) => (
  <g transform={`translate(${x} ${y}) scale(${size / 100})`} opacity={opacity} strokeLinecap="round" strokeLinejoin="round">
    {GLYPHS[name](color, strokeWidth)}
  </g>
);

export const Icon: React.FC<{
  name: GlyphName;
  size?: number;
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({ name, size = 100, color = "#e8e2d4", opacity = 1, strokeWidth = 4, style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", display: "block", ...style }}>
    <Glyph name={name} size={100} color={color} opacity={opacity} strokeWidth={strokeWidth} />
  </svg>
);
