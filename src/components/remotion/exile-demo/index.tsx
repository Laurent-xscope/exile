/* Player chrome — BoardUI wrapper around the composition. Same contract as
 * the old ExileProductDemo: default export, client-only (mounted via next/dynamic).
 */
import React, { useEffect, useRef } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { ExileVideoComposition, SHEET } from "./composition";

export default function ExileProductDemo() {
  const playerRef = useRef<PlayerRef>(null);

  /* QA affordance: exact-frame seeking for automated visual checks */
  useEffect(() => {
    const win = window as typeof window & {
      __exile?: {
        seek: (f: number) => void;
        play: () => void;
        pause: () => void;
      };
    };
    win.__exile = {
      seek: (f: number) => {
        playerRef.current?.seekTo(f);
        playerRef.current?.pause();
      },
      play: () => playerRef.current?.play(),
      pause: () => playerRef.current?.pause(),
    };
    return () => {
      delete win.__exile;
    };
  }, []);

  return (
    <div className="w-full bg-background-primary-default border border-border-button-default rounded-3xl p-5 md:p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-title-2-semibold text-text-primary">
          Alur Interaksi Siswa &amp; Diagnostik Cerdas Guru
        </h3>
      </div>

      <div className="relative w-full rounded-2xl overflow-hidden border border-border-button-default bg-black shadow-inner aspect-[16/9]">
        <Player
          ref={playerRef}
          component={ExileVideoComposition}
          durationInFrames={SHEET.durationInFrames}
          compositionWidth={SHEET.width}
          compositionHeight={SHEET.height}
          fps={SHEET.fps}
          loop
          autoPlay
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}
