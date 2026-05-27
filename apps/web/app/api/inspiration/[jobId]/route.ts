import { NextResponse } from "next/server";
import { backend } from "@/shared/lib/backend";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = await backend.getJob(jobId);
  if (!job) {
    return NextResponse.json({ detail: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}
