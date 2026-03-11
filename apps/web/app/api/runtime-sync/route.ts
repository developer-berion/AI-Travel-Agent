import { NextResponse } from "next/server";

import { getRuntimeSyncPayload } from "@/lib/runtime-sync";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getRuntimeSyncPayload());
}
