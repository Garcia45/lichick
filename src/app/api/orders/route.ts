import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_TOTAL_QUOTA, MENU_PRODUCTS, STORE_CONFIG } from "@/config/store";
import { generateOrderNumber } from "@/lib/format";
import {
  checkSlidingRateLimit,
  getTrustedClientIp,
  verifySameOrigin,
} from "@/lib/request-security";
import { createOrderRecord, fetchPublicQuotas } from "@/lib/sheets-client";
import type { OrderItem } from "@/types/order";

const PRODUCT_BY_ID = new Map(MENU_PRODUCTS.map((p) => [p.id, p]));
const PROOF_DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i;

export async function GET() {
  try {
    const data = await fetchPublicQuotas();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal memuat kuota" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json(
        { ok: false, error: "Origin permintaan tidak diizinkan." },
        { status: 403 }
      );
    }

    const clientIp = getTrustedClientIp(req);
    const rate = checkSlidingRateLimit({
      bucket: "create_order",
      key: clientIp,
      maxRequests: 8,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Terlalu banyak pengiriman pesanan dari perangkat ini. Tunggu beberapa menit lalu coba lagi.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();

    const customerName = String(body.customer_name || "").trim();
    const customerWhatsapp = String(body.customer_whatsapp || "").trim();
    const waDigits = customerWhatsapp.replace(/[^0-9]/g, "");
    const deliveryMethod = body.delivery_method === "delivery" ? "delivery" : "pickup";
    const deliveryAddress = String(body.delivery_address || "").trim();
    const pickupDay = String(body.pickup_day || STORE_CONFIG.pickupDays[0]).trim();
    const pickupSlot = String(body.pickup_slot || "-").trim();
    const paymentProofBase64 = String(body.payment_proof_base64 || "").trim();
    const rawItems: OrderItem[] = Array.isArray(body.items) ? body.items : [];

    if (!customerName || !customerWhatsapp) {
      return NextResponse.json(
        { ok: false, error: "Nama lengkap dan nomor WhatsApp wajib diisi." },
        { status: 400 }
      );
    }

    if (waDigits.length < 9 || waDigits.length > 15) {
      return NextResponse.json(
        { ok: false, error: "Nomor WhatsApp tidak valid. Masukkan minimal 9 digit angka." },
        { status: 400 }
      );
    }

    if (deliveryMethod === "delivery" && !deliveryAddress) {
      return NextResponse.json(
        { ok: false, error: "Alamat pengiriman atau titik temu wajib diisi." },
        { status: 400 }
      );
    }

    if (!paymentProofBase64) {
      return NextResponse.json(
        { ok: false, error: "Mohon upload bukti pembayaran QRIS terlebih dahulu." },
        { status: 400 }
      );
    }

    if (!PROOF_DATA_URL_REGEX.test(paymentProofBase64)) {
      return NextResponse.json(
        { ok: false, error: "Format bukti pembayaran harus berupa gambar JPG, PNG, atau WebP." },
        { status: 400 }
      );
    }

    if (paymentProofBase64.length > 2_500_000) {
      return NextResponse.json(
        { ok: false, error: "Ukuran gambar bukti pembayaran terlalu besar." },
        { status: 400 }
      );
    }

    // Validasi harga dan nama produk langsung dari katalog resmi server (anti manipulasi harga)
    const validItems: OrderItem[] = [];
    for (const it of rawItems) {
      const qty = Math.floor(Number(it.quantity));
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const catalogProduct = PRODUCT_BY_ID.get(String(it.product_id || "").trim());
      if (!catalogProduct) {
        return NextResponse.json(
          { ok: false, error: "Menu yang dipilih tidak dikenali." },
          { status: 400 }
        );
      }
      const safeQty = Math.min(qty, 100);
      validItems.push({
        product_id: catalogProduct.id,
        name: catalogProduct.name,
        variant: String(it.variant || catalogProduct.variants[0] || "").trim().slice(0, 80),
        quantity: safeQty,
        unit_price: catalogProduct.price,
        subtotal: safeQty * catalogProduct.price,
        notes: it.notes ? String(it.notes).trim().slice(0, 140) : undefined,
      });
    }

    if (validItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Minimal pilih 1 menu terlebih dahulu." },
        { status: 400 }
      );
    }

    // Cek status buka/tutup PO dan kuota global keseluruhan (25 porsi semua menu) di server
    const requestedTotal = validItems.reduce((sum, it) => sum + it.quantity, 0);
    try {
      const quotaSnap = await fetchPublicQuotas();
      if (quotaSnap.ok && quotaSnap.store_config?.store_open === false) {
        return NextResponse.json(
          { ok: false, error: "Pre Order saat ini sedang ditutup sementara oleh admin." },
          { status: 403 }
        );
      }
      if (quotaSnap.ok) {
        const maxTotal =
          quotaSnap.store_config?.quotas?.total ?? DEFAULT_TOTAL_QUOTA;
        const soldTotal = quotaSnap.total_sold ?? 0;
        const remainingTotal = Math.max(0, maxTotal - soldTotal);
        if (requestedTotal > remainingTotal) {
          return NextResponse.json(
            {
              ok: false,
              error:
                remainingTotal === 0
                  ? `Kuota Pre Order (${maxTotal} porsi) sudah penuh.`
                  : `Sisa kuota Pre Order tinggal ${remainingTotal} porsi (gabungan semua menu).`,
            },
            { status: 409 }
          );
        }
      }
    } catch {
      // Lanjut jika pengecekan kuota sementara gagal agar transaksi tidak terputus
    }

    const totalPortions = validItems.reduce((sum, it) => sum + it.quantity, 0);
    const totalAmount = validItems.reduce((sum, it) => sum + it.subtotal, 0);

    // Selalu buat kode pesanan di sisi server (anti spoofing / duplikasi kode pesanan dari klien)
    const orderNumber = generateOrderNumber();

    const result = await createOrderRecord({
      order_number: orderNumber,
      pickup_day: pickupDay.slice(0, 40),
      pickup_slot: pickupSlot.slice(0, 40),
      customer_name: customerName.slice(0, 80),
      customer_whatsapp: customerWhatsapp.slice(0, 24),
      delivery_method: deliveryMethod,
      delivery_address: deliveryAddress.slice(0, 200),
      items: validItems,
      total_portions: totalPortions,
      total_amount: totalAmount,
      payment_proof_base64: paymentProofBase64,
      notes: String(body.notes || "").trim().slice(0, 300) || "-",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 502 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal memproses pesanan" },
      { status: 500 }
    );
  }
}
