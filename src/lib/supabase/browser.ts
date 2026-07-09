"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
