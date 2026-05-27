import { NextRequest, NextResponse } from "next/server";
import { backend } from "@/shared/lib/backend";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status } = (await req.json()) as { status: string };
  try {
    return NextResponse.json(await backend.updateStatus(id, status));
  } catch (err) {
    return NextResponse.json({ detail: String(err) }, { status: 400 });
  }
}
