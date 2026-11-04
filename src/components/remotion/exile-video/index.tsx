/* Landing-page player chrome. Default export, client-only (mounted via next/dynamic). */
import React from "react";
import { Player } from "@remotion/player";
import { ExileVideo } from "./ExileVideo";
import { DEFAULT_PROPS, FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./constants";

export default function ExileProductDemo() {
  return (
    <div className="w-full bg-background-primary-default border border-border-button-default rounded-3xl p-5 md:p-6 shadow-card space-y-4">
      <h3 className="text-title-2-semibold text-text-primary">
        Trailer: Dari Modul ke Laporan Miskonsepsi dalam 60 Detik
      </h3>
      <div className="relative w-full rounded-2xl overflow-hidden border border-border-button-default bg-black aspect-[16/9]">
        <Player
          component={ExileVideo}
          inputProps={DEFAULT_PROPS}
          durationInFrames={TOTAL_FRAMES}
          compositionWidth={WIDTH}
          compositionHeight={HEIGHT}
          fps={FPS}
          controls
          loop
          autoPlay
          clickToPlay
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
