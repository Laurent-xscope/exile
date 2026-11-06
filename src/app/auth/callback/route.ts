import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase-admin";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/studio";
  }
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Use verified server request origin to prevent Host Header Poisoning / Open Redirects
  const origin = url.origin;

  const searchParams = url.searchParams;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=supabase_not_configured`);
  }

  if (!code) {
    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Menyelesaikan masuk dengan Google…</title>
</head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;background:#111;color:#f5f5f5;">
  <p>Menyambungkan akun Google ke Exile…</p>
  <script>
    (function () {
      var hash = window.location.hash || "";
      if (hash.indexOf("id_token=") !== -1) {
        window.location.replace("/login" + window.location.search + hash);
      } else {
        window.location.replace("/login?error=missing_code");
      }
    })();
  </script>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const cookieStore = await cookies();
  const redirectResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] Exchange code error:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  } catch (err) {
    console.error("[auth/callback] Exception during code exchange:", err);
    return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed`);
  }

  return redirectResponse;
}
