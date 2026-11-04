import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/studio";

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] Exchange code error:", error.message);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
      }
    } catch (err) {
      console.error("[auth/callback] Exception during code exchange:", err);
      return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
