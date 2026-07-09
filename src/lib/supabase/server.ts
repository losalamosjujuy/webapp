import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseEnv, requireSupabaseServiceRoleEnv } from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value: "", ...options });
      }
    }
  });
}

export function createSupabaseServiceClient() {
  const { url, serviceRoleKey } = requireSupabaseServiceRoleEnv();

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
