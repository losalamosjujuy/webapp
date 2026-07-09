import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/supabase/auth";
import { uploadFilesToStorage } from "@/lib/supabase/storage";

export async function POST(request: Request) {
  await requireAdminSession();

  const formData = await request.formData();
  const scope = formData.get("scope")?.toString();
  const entityId = formData.get("entityId")?.toString() || undefined;
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!scope || !files.length) {
    return NextResponse.json({ error: "Missing scope or files." }, { status: 400 });
  }

  const uploads = await uploadFilesToStorage({
    files,
    scope,
    entityId
  });

  return NextResponse.json({ uploads });
}
