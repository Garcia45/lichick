import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_TOTAL_QUOTA } from "@/config/store";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { verifySameOrigin } from "@/lib/request-security";
import { updateStoreConfigRecord } from "@/lib/sheets-client";

export async function PATCH(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json(
      { ok: false, error: "Origin permintaan tidak diizinkan." },
      { status: 403 }
    );
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const rawTotal = Number(body.quotas?.total);
    const safeTotal = Number.isFinite(rawTotal)
      ? Math.max(0, Math.min(500, Math.floor(rawTotal)))
      : DEFAULT_TOTAL_QUOTA;

    const result = await updateStoreConfigRecord({
      store_open: body.store_open !== false,
      quotas: { total: safeTotal },
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
