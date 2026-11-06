import { continueRender, delayRender } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadBody } from "@remotion/google-fonts/WorkSans";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

/** Typography: Archivo Black for display, Work Sans for video body, Inter for clean UI & end card, JetBrains Mono for mono/url. */
const d = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });
const b = loadBody("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
const i = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
const m = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

const handle = delayRender("Loading video fonts");
Promise.all([
  d.waitUntilDone(),
  b.waitUntilDone(),
  i.waitUntilDone(),
  m.waitUntilDone(),
])
  .then(() => {
    continueRender(handle);
  })
  .catch((err) => {
    console.error("Font loading error:", err);
    continueRender(handle);
  });

export const DISPLAY_FONT = d.fontFamily;
export const BODY_FONT = b.fontFamily;
export const INTER_FONT = i.fontFamily;
export const MONO_FONT = m.fontFamily;
