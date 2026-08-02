import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnvHazir } from "@/lib/env";

export function createClient() {
  if (!supabaseEnvHazir()) {
    throw new Error(
      "Supabase yapılandırılmamış. Önce /kurulum sayfasındaki adımları tamamlayın."
    );
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
