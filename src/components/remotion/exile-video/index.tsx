/* Landing-page player chrome. Default export, client-only (mounted via next/dynamic). */
"use client";

import { Player } from "@remotion/player";
import { ExileVideo } from "./ExileVideo";
import { DEFAULT_PROPS, FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./constants";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function ExileProductDemo() {
  const { t } = useTranslation();

  return (
    <div className="w-full bg-background-primary-default rounded-3xl p-5 md:p-6 shadow-card space-y-4">
      <div className="space-y-1">
        <h3 className="text-title-2-semibold text-text-primary tracking-tight">
          {t?.trailer?.title || "Exile"}
        </h3>
        <p className="text-body-2-regular text-text-secondary">
          {t?.trailer?.subtitle || "A debut: exile.web.id"}
        </p>
      </div>
      <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-[16/9]">
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
