import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Browser client. Uses PKCE so the OAuth callback can exchange the code
 * server-side and persist the session in cookies.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
