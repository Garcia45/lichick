import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateStoreConfigRecord } from "@/lib/sheets-client";

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const result = await updateStoreConfigRecord({
      store_open: body.store_open !== false,
      quotas: typeof body.quotas === "object" && body.quotas ? body.quotas : {},
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal update pengaturan" },
      { status: 500 }
    );
  }
}
