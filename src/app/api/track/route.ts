import { NextRequest, NextResponse } from "next/server";
import { trackOrderByNumber } from "@/lib/sheets-client";

export async function GET(req: NextRequest) {
  try {
    const orderNumber = req.nextUrl.searchParams.get("order_number") || "";
    if (!orderNumber.trim()) {
      return NextResponse.json(
        { ok: false, error: "Parameter order_number wajib diisi." },
        { status: 400 }
      );
    }

    const result = await trackOrderByNumber(orderNumber);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal melacak pesanan" },
      { status: 500 }
    );
  }
}
