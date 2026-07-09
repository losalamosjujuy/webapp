import { NextResponse } from "next/server";

import { signInAdminWithPassword } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const result = await signInAdminWithPassword(email, password);

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/admin/login?error=${result.reason}`, request.url));
  }

  return NextResponse.redirect(new URL("/admin/dashboard", request.url));
}
