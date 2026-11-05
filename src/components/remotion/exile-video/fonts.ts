import { loadFont as loadDisplay } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadBody } from "@remotion/google-fonts/WorkSans";

/** VoiceBox: Archivo Black for display, Work Sans for body. */
const d = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });
const b = loadBody("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });

export const DISPLAY_FONT = d.fontFamily;
export const BODY_FONT = b.fontFamily;
