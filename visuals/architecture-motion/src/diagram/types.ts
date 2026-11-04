export type SignalKind = "video" | "data" | "control" | "pose" | "power" | "rf" | "audio";

export type DiagramNode = {
  id: string;
  label: string; // 多行用 \n
  group?: string;
  accent?: boolean; // 关键芯片高亮
};

export type DiagramEdge = {
  from: string;
  to: string;
  kind: SignalKind;
  label?: string;
  bidir?: boolean;
  dashed?: boolean; // 可选 / 次要链路
  reverse?: boolean; // 排版按 from→to，信号实际从 to 流向 from（用于回传链路，避免打乱分层）
};

export type DiagramGroup = { id: string; label: string; parent?: string };

export type Diagram = {
  id: string;
  title: string;
  subtitle: string;
  rankdir: "LR" | "TB";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  notes?: string[];
  nodesep?: number;
  ranksep?: number;
};

export const SIGNAL_STYLE: Record<SignalKind, { color: string; name: string }> = {
  video: { color: "#38bdf8", name: "视频 / 画面" },
  data: { color: "#a78bfa", name: "数据" },
  control: { color: "#fbbf24", name: "控制 / 信令" },
  pose: { color: "#f472b6", name: "姿态 / 传感" },
  audio: { color: "#2dd4bf", name: "音频" },
  rf: { color: "#4ade80", name: "无线 / 网络" },
  power: { color: "#f87171", name: "供电 / 电源" },
};
