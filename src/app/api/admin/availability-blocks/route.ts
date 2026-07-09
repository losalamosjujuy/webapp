import { NextResponse } from "next/server";

import { removeAvailabilityBlock, upsertAvailabilityBlock } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();
  const block = await upsertAvailabilityBlock(payload);

  return NextResponse.json({ block });
}

export async function DELETE(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing block id." }, { status: 400 });
  }

  await removeAvailabilityBlock(id);

  return NextResponse.json({ ok: true });
}
