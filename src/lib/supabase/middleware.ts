import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnvHazir } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isKurulum = path.startsWith("/kurulum");
  const isGiris = path.startsWith("/giris");
  const isSplash = path === "/";
  const isFirebase = path.startsWith("/firebase");
  const isPublic =
    isKurulum ||
    isGiris ||
    isSplash ||
    isFirebase ||
    path.startsWith("/api/webhook") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico";

  if (!supabaseEnvHazir()) {
    if (!isKurulum && !path.startsWith("/_next") && path !== "/favicon.ico") {
      const url = request.nextUrl.clone();
      url.pathname = "/kurulum";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && isKurulum) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
