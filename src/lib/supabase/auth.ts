import { redirect } from "next/navigation";

import { hasSupabaseEnv, hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

const ADMIN_LOGIN_PATH = "/admin/login";
const ALLOWED_ADMIN_ROLES = new Set(["admin", "staff"]);

export interface AdminProfile {
  id: string;
  email: string;
  role: "admin" | "staff";
  full_name: string | null;
}

function redirectToLogin(reason: "config" | "invalid" | "unauthorized" | "session" = "session"): never {
  redirect(`${ADMIN_LOGIN_PATH}?error=${reason}`);
}

async function getAdminProfile(userId: string): Promise<AdminProfile | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function requireAdminSession() {
  if (!hasSupabaseEnv() || !hasSupabaseServiceRoleEnv()) {
    redirectToLogin("config");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirectToLogin("session");
  }

  const currentUser = user;
  const profile = await getAdminProfile(currentUser.id);

  if (!profile || !ALLOWED_ADMIN_ROLES.has(profile.role)) {
    redirectToLogin("unauthorized");
  }

  return { user: currentUser, profile };
}

export async function signInAdminWithPassword(email: string, password: string) {
  if (!hasSupabaseEnv() || !hasSupabaseServiceRoleEnv()) {
    return { ok: false as const, reason: "config" as const };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const profile = await getAdminProfile(data.user.id);

  if (!profile || !ALLOWED_ADMIN_ROLES.has(profile.role)) {
    await supabase.auth.signOut();
    return { ok: false as const, reason: "unauthorized" as const };
  }

  return { ok: true as const, profile };
}

export async function signOutAdmin() {
  if (!hasSupabaseEnv()) {
    return;
  }

  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
}
