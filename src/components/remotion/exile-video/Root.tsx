import React from "react";
import { Composition } from "remotion";
import {
  DEFAULT_PROPS,
  FPS,
  HEIGHT,
  TOTAL_FRAMES,
  WIDTH,
  exileVideoSchema,
} from "./constants";
import { ExileVideo } from "./ExileVideo";

/** Single composition registered for Remotion Studio / `remotion render`. */
export const RemotionRoot: React.FC = () => (
  <Composition
    id="ExileVideo"
    component={ExileVideo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    schema={exileVideoSchema}
    defaultProps={DEFAULT_PROPS}
  />
);
