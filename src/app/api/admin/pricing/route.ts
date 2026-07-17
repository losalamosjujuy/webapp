import { NextResponse } from "next/server";

import { removeAdminPriceSeason, upsertAdminPriceSeason } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();
  const season = await upsertAdminPriceSeason(payload);

  return NextResponse.json({ season });
}

export async function DELETE(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing season id." }, { status: 400 });
  }

  await removeAdminPriceSeason(id);

  return NextResponse.json({ ok: true });
}
