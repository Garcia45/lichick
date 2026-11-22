import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { verifySameOrigin } from "@/lib/request-security";
import {
  deleteOrderRecord,
  fetchAdminDashboardData,
  updateOrderStatusRecord,
} from "@/lib/sheets-client";
import type { OrderStatus, PaymentStatus } from "@/types/order";

const ALLOWED_STATUSES: OrderStatus[] = [
  "belum_dibuat",
  "sedang_dibuat",
  "siap_diantar",
  "selesai",
  "dibatalkan",
];

const ALLOWED_PAYMENT_STATUSES: PaymentStatus[] = [
  "menunggu_validasi",
  "tervalidasi",
  "ditolak",
];

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "Sesi admin tidak aktif. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  try {
    const data = await fetchAdminDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal memuat dashboard" },
      { status: 500 }
    );
  }
}

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
    const orderNumber = String(body.order_number || "").trim().toUpperCase();
    const orderStatus = body.order_status
      ? (String(body.order_status).trim() as OrderStatus)
      : undefined;
    const paymentStatus = body.payment_status
      ? (String(body.payment_status).trim() as PaymentStatus)
      : undefined;

    if (!orderNumber || (!orderStatus && !paymentStatus)) {
      return NextResponse.json(
        { ok: false, error: "Kode pesanan atau perubahan status tidak valid." },
        { status: 400 }
      );
    }

    if (orderStatus && !ALLOWED_STATUSES.includes(orderStatus)) {
      return NextResponse.json(
        { ok: false, error: "Status dapur tidak valid." },
        { status: 400 }
      );
    }

    if (paymentStatus && !ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
      return NextResponse.json(
        { ok: false, error: "Status pembayaran tidak valid." },
        { status: 400 }
      );
    }

    const result = await updateOrderStatusRecord({
      orderNumber,
      orderStatus,
      paymentStatus,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal memperbarui status" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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
    const orderNumber = req.nextUrl.searchParams.get("order_number") || "";
    if (!orderNumber.trim()) {
      return NextResponse.json(
        { ok: false, error: "order_number wajib diisi." },
        { status: 400 }
      );
    }
    const result = await deleteOrderRecord(orderNumber);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal menghapus pesanan" },
      { status: 500 }
    );
  }
}
