import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { FlowDiagram, diagramSize, DIAGRAMS, DIAGRAM_ORDER, CYCLE_MS } from "../src/diagram/FlowDiagram";

const FPS = 30;
// 两个光束周期，首尾无缝
const LOOP = Math.round(((2 * CYCLE_MS) / 1000) * FPS);

const App: React.FC = () => {
  const [active, setActive] = useState(0);
  const id = DIAGRAM_ORDER[active];
  const { width, height } = diagramSize(DIAGRAMS[id]);
  return (
    <div className="wrap">
      <header>
        <div className="eyebrow">OPEN SIGNAL · ARCHITECTURE</div>
        <h1>系统架构图</h1>
        <p>每条线上的光带是一路信号，线型代表信号类型。型号均为候选，数值为设计目标。</p>
        <nav>
          {DIAGRAM_ORDER.map((k, i) => (
            <button key={k} className={i === active ? "on" : ""} onClick={() => setActive(i)}>
              {DIAGRAMS[k].title}
            </button>
          ))}
        </nav>
      </header>
      <main>
        <div className="stage" style={{ aspectRatio: `${width} / ${height}` }}>
          <Player
            key={id}
            component={FlowDiagram}
            inputProps={{ id }}
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
