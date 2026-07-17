import { NextResponse } from "next/server";

import { removeAdminInquiry, upsertAdminInquiry } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();
  const inquiry = await upsertAdminInquiry(payload);

  return NextResponse.json({ inquiry });
}

export async function DELETE(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing inquiry id." }, { status: 400 });
  }

  await removeAdminInquiry(id);

  return NextResponse.json({ ok: true });
}
