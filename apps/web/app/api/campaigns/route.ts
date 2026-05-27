import { NextRequest, NextResponse } from "next/server";
import { backend } from "@/shared/lib/backend";
import type { PublishFromJobPayload } from "@/shared/lib/backend/types";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ detail: "client_id is required" }, { status: 400 });
  }
  return NextResponse.json(await backend.listCampaigns(clientId));
}

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as PublishFromJobPayload;
  try {
    const campaign = await backend.publishFromJob(payload);
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    return NextResponse.json({ detail: String(err) }, { status: 400 });
  }
}
