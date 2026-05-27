import { NextRequest, NextResponse } from "next/server";
import { backend } from "@/shared/lib/backend";
import type { StartInspirationPayload } from "@/shared/lib/backend/types";

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as StartInspirationPayload;
  const job = await backend.startInspiration(payload);
  return NextResponse.json(job, { status: 202 });
}
