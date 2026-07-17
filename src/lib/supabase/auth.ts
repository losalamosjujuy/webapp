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
  status?: "active" | "inactive";
}

function isMissingProfilesStatusColumn(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = [
    ("message" in error ? error.message : ""),
    ("details" in error ? error.details : ""),
    ("code" in error ? error.code : "")
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return message.includes("profiles") && message.includes("status") && (message.includes("42703") || message.includes("PGRST204"));
}

function redirectToLogin(reason: "config" | "invalid" | "unauthorized" | "session" = "session"): never {
  redirect(`${ADMIN_LOGIN_PATH}?error=${reason}`);
}

async function getAdminProfile(userId: string): Promise<AdminProfile | null> {
  const supabase = createSupabaseServiceClient();
  const profileWithStatus = await supabase
    .from("profiles")
    .select("id, email, role, full_name, status")
    .eq("id", userId)
    .maybeSingle();

  if (!profileWithStatus.error) {
    return profileWithStatus.data;
  }

  if (!isMissingProfilesStatusColumn(profileWithStatus.error)) {
    throw profileWithStatus.error;
  }

  const profileWithoutStatus = await supabase
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileWithoutStatus.error) {
    throw profileWithoutStatus.error;
  }

  return profileWithoutStatus.data ? { ...profileWithoutStatus.data, status: "active" } : null;
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

  if (!profile || !ALLOWED_ADMIN_ROLES.has(profile.role) || profile.status === "inactive") {
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

  if (!profile || !ALLOWED_ADMIN_ROLES.has(profile.role) || profile.status === "inactive") {
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
