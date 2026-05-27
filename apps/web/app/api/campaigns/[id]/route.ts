import { NextResponse } from "next/server";
import { backend } from "@/shared/lib/backend";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await backend.getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ detail: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json(campaign);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await backend.deleteCampaign(id);
  return new NextResponse(null, { status: 204 });
}
