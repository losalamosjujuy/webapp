import { NextResponse } from "next/server";

import { removeUnit, upsertUnit } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();
  const unit = await upsertUnit(payload);

  return NextResponse.json({ unit });
}

export async function DELETE(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing unit id." }, { status: 400 });
  }

  await removeUnit(id);

  return NextResponse.json({ ok: true });
}
