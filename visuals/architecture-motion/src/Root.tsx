import React from "react";
import { Composition } from "remotion";
import { FlowDiagram, diagramSize, DIAGRAMS, DIAGRAM_ORDER, CYCLE_MS } from "./diagram/FlowDiagram";
import { Film, FILM_FRAMES } from "./film/Film";

export const FPS = 30;
// 两个光束周期（双向链路换向一次），首尾无缝
export const LOOP_FRAMES = Math.round(((2 * CYCLE_MS) / 1000) * FPS);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PlanFilm" component={Film} durationInFrames={FILM_FRAMES} fps={30} width={1920} height={1080} />
    {DIAGRAM_ORDER.map((id) => {
      const { width, height } = diagramSize(DIAGRAMS[id]);
      return <Composition key={id} id={id} component={FlowDiagram} durationInFrames={LOOP_FRAMES} fps={FPS} width={width} height={height} defaultProps={{ id }} />;
    })}
  </>
);
