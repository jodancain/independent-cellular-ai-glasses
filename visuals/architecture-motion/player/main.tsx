import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { FlowDiagram, diagramSize } from "../src/diagram/FlowDiagram";
import { ALL } from "../src/diagrams";

const FPS = 30;
const LOOP = 6 * FPS;

const App: React.FC = () => {
  const [active, setActive] = useState(0);
  const d = ALL[active];
  const { width, height } = diagramSize(d);
  return (
    <div className="wrap">
      <header>
        <h1>独立蜂窝 AI 眼镜 · 系统架构图（动态初版 v0.1）</h1>
        <p>连线上的流动虚线与光点表示信号方向，颜色表示信号类型。型号均为候选，数值为设计目标，依据方案 v0.7.2 与技术路线 v0.1。</p>
        <nav>
          {ALL.map((x, i) => (
            <button key={x.id} className={i === active ? "on" : ""} onClick={() => setActive(i)}>
              {x.title}
            </button>
          ))}
        </nav>
      </header>
      <main>
        <div className="stage" style={{ aspectRatio: `${width} / ${height}`, maxHeight: "calc(100vh - 190px)" }}>
          <Player
            key={d.id}
            component={FlowDiagram}
            inputProps={{ diagram: d }}
            durationInFrames={LOOP}
            fps={FPS}
            compositionWidth={width}
            compositionHeight={height}
            style={{ width: "100%", height: "100%" }}
            autoPlay
            loop
            controls={false}
            clickToPlay={false}
            acknowledgeRemotionLicense
          />
        </div>
      </main>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
