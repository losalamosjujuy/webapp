import { NextResponse } from "next/server";

import { createInquiry } from "@/lib/data-access";
import { inquirySchema } from "@/lib/validations/reservation";

export async function POST(request: Request) {
  const body = await request.json();
  const payload = inquirySchema.parse(body);
  const inquiry = await createInquiry({
    ...payload,
    source: "website"
  });

  return NextResponse.json({
    ok: true,
    inquiryId: inquiry.id,
    inquiry
  });
}
