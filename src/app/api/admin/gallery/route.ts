import { NextResponse } from "next/server";

import { createGalleryItems, removeGalleryItem, updateGalleryItem } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await requireAdminSession();
  const payload = await request.json();

  if (payload.id) {
    const item = await updateGalleryItem(payload);
    return NextResponse.json({ item });
  }

  const items = await createGalleryItems(payload);
  return NextResponse.json({ items });
}

export async function DELETE(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing gallery id." }, { status: 400 });
  }

  await removeGalleryItem(id);

  return NextResponse.json({ ok: true });
}
