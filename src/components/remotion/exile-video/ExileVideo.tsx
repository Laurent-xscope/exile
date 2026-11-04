import React from "react";
import { AbsoluteFill, Audio } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import {
  DEFAULT_PROPS,
  ExileVideoProps,
  MUSIC_SRC,
  MUSIC_VOLUME,
  SCENE_FRAMES,
  TRANSITION,
} from "./constants";
import { ThemeProvider, makeTheme } from "./ui";
import { HookScene } from "./scenes/Hook";
import { ProblemScene } from "./scenes/Problem";
import { SolutionScene } from "./scenes/Solution";
import { ClassroomScene } from "./scenes/Classroom";
import { DifferentiatorScene } from "./scenes/Differentiator";
import { CtaScene } from "./scenes/Cta";

const timing = () =>
  springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION, durationRestThreshold: 0.001 });

export const ExileVideo: React.FC<ExileVideoProps> = (props) => {
  const p = { ...DEFAULT_PROPS, ...props };
  const theme = makeTheme({ teal: p.teal, gold: p.gold, cream: p.cream });
  const f = (n: number) => n + TRANSITION; // scenes with an outgoing transition
  return (
    <ThemeProvider value={theme}>
      <AbsoluteFill style={{ background: theme.tealDeep }}>
        {MUSIC_SRC ? <Audio src={MUSIC_SRC} volume={MUSIC_VOLUME} /> : null}
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={f(SCENE_FRAMES.hook)}>
            <HookScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={timing()} />
          <TransitionSeries.Sequence durationInFrames={f(SCENE_FRAMES.problem)}>
            <ProblemScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing()} />
          <TransitionSeries.Sequence durationInFrames={f(SCENE_FRAMES.solution)}>
            <SolutionScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={timing()} />
          <TransitionSeries.Sequence durationInFrames={f(SCENE_FRAMES.classroom)}>
            <ClassroomScene pin={p.pin} url={p.url} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={timing()} />
          <TransitionSeries.Sequence durationInFrames={f(SCENE_FRAMES.differentiator)}>
            <DifferentiatorScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={timing()} />
          <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.cta}>
            <CtaScene tagline={p.tagline} url={p.url} />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>
    </ThemeProvider>
  );
};
