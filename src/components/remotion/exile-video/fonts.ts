import { loadFont as loadDisplay } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadBody } from "@remotion/google-fonts/PlusJakartaSans";

/** Display: Fraunces (warm, high-contrast serif). Body: Plus Jakarta Sans. */
const d = loadDisplay("normal", { weights: ["600", "700"], subsets: ["latin"] });
const b = loadBody("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });

export const DISPLAY_FONT = d.fontFamily;
export const BODY_FONT = b.fontFamily;
