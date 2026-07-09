import { NextResponse } from "next/server";

import { removeAdminReservation, upsertAdminReservation } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();
  const reservation = await upsertAdminReservation(payload);

  return NextResponse.json({ reservation });
}

export async function DELETE(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing reservation id." }, { status: 400 });
  }

  await removeAdminReservation(id);

  return NextResponse.json({ ok: true });
}
