import { NextResponse } from "next/server";
import { backend } from "@/shared/lib/backend";

export async function GET() {
  return NextResponse.json(await backend.listClients());
}
