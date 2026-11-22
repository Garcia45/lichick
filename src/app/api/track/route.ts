import { NextRequest, NextResponse } from "next/server";
import { sanitizeOrderForPublicTrack } from "@/lib/order-aggregates";
import {
  checkSlidingRateLimit,
  getTrustedClientIp,
} from "@/lib/request-security";
import { trackOrderByNumber } from "@/lib/sheets-client";

export async function GET(req: NextRequest) {
  try {
    const clientIp = getTrustedClientIp(req);
    const rate = checkSlidingRateLimit({
      bucket: "track_lookup",
      key: clientIp,
      maxRequests: 60,
      windowMs: 5 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Terlalu banyak permintaan pelacakan. Tunggu beberapa saat lalu coba lagi.",
        },
        { status: 429 }
      );
    }

    const orderNumber = (req.nextUrl.searchParams.get("order_number") || "").trim();
    if (!orderNumber || orderNumber.length > 40) {
      return NextResponse.json(
        { ok: false, error: "Parameter kode pesanan tidak valid." },
        { status: 400 }
      );
    }

    const result = await trackOrderByNumber(orderNumber);

    // Minimalkan eksposur PII pada endpoint publik /api/track:
    // hapus URL bukti pembayaran Google Drive & samarkan nomor WA / alamat panjang
    const sanitizedOrder = result.order
      ? sanitizeOrderForPublicTrack(result.order)
      : null;

    return NextResponse.json({
      ok: result.ok,
      mode: result.mode,
      order: sanitizedOrder,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal melacak pesanan" },
      { status: 500 }
    );
  }
}
