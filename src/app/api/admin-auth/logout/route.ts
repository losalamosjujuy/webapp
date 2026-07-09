import { NextResponse } from "next/server";

import { signOutAdmin } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await signOutAdmin();

  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  return response;
}
