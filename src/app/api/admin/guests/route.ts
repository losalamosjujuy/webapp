import { NextResponse } from "next/server";

import { removeAdminGuest, upsertAdminGuest } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();
  const guest = await upsertAdminGuest(payload);

  return NextResponse.json({ guest });
}

export async function DELETE(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing guest id." }, { status: 400 });
  }

  await removeAdminGuest(id);

  return NextResponse.json({ ok: true });
}
