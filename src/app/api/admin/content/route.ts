import { NextResponse } from "next/server";

import { updateAdminContent } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();
  await updateAdminContent(payload);

  return NextResponse.json({ ok: true });
}
