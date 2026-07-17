import { NextResponse } from "next/server";

import { removeAdminUser, upsertAdminUser } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();
  const user = await upsertAdminUser(payload);

  return NextResponse.json({ user });
}

export async function DELETE(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  await removeAdminUser(id);

  return NextResponse.json({ ok: true });
}
