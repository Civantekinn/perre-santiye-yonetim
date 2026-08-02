import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnvHazir } from "@/lib/env";

export function createClient() {
  if (!supabaseEnvHazir()) {
    throw new Error(
      "Supabase yapılandırılmamış. Önce /kurulum sayfasındaki adımları tamamlayın."
    );
  }

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component
          }
        },
      },
    }
  );
}
