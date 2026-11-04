import React from "react";
import { Composition } from "remotion";
import { FlowDiagram, diagramSize } from "./diagram/FlowDiagram";
import { ALL } from "./diagrams";

export const FPS = 30;
export const LOOP_FRAMES = 6 * FPS;

export const RemotionRoot: React.FC = () => (
  <>
    {ALL.map((d) => {
      const { width, height } = diagramSize(d);
      return (
        <Composition key={d.id} id={d.id} component={FlowDiagram} durationInFrames={LOOP_FRAMES} fps={FPS} width={width} height={height} defaultProps={{ diagram: d }} />
      );
    })}
  </>
);
