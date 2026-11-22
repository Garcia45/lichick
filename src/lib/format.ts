import { STORE_CONFIG } from "@/config/store";
import type { OrderItem, OrderRecord } from "@/types/order";

export function formatRupiah(amount: number): string {
  return "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(amount || 0));
}

export function normalizeWaPhone(raw: string): string {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function generateOrderNumber(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const yy = parts.find((p) => p.type === "year")?.value || "26";
  const mm = parts.find((p) => p.type === "month")?.value || "01";
  const dd = parts.find((p) => p.type === "day")?.value || "01";
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LCK-${yy}${mm}${dd}-${rand}`;
}

export function buildWhatsAppOrderUrl(params: {
  orderNumber: string;
  customerName: string;
  customerWhatsapp: string;
  pickupDay: string;
  pickupSlot: string;
  deliveryMethod: "pickup" | "delivery";
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: number;
  orderNotes?: string;
  trackUrl?: string;
}): string {
  const adminPhone = normalizeWaPhone(STORE_CONFIG.adminWhatsApp);

  const lines: string[] = [
    `Halo *${STORE_CONFIG.brandName} ${STORE_CONFIG.brandSub}*, saya mau konfirmasi pesanan:`,
    "",
    `*KODE PESANAN:* ${params.orderNumber}`,
    `*Nama:* ${params.customerName}`,
    `*No. WA:* ${params.customerWhatsapp}`,
    `*Pengambilan:* ${params.pickupDay}, ${params.pickupSlot}`,
    `*Metode:* ${
      params.deliveryMethod === "pickup"
        ? "Ambil di Kampus"
        : `Diantar (${params.deliveryAddress || "-"})`
    }`,
    "",
    "*RINCIAN PESANAN:*",
  ];

  params.items.forEach((item) => {
    const extra = [item.variant, item.notes].filter(Boolean).join(" / ");
    lines.push(
      `- ${item.quantity}x ${item.name}${extra ? ` (${extra})` : ""} = ${formatRupiah(
        item.subtotal
      )}`
    );
  });

  if (params.orderNotes && params.orderNotes.trim() && params.orderNotes.trim() !== "-") {
    lines.push("");
    lines.push(`*Catatan Tambahan:* ${params.orderNotes.trim()}`);
  }

  lines.push("----------------------------------");
  lines.push(`*TOTAL PEMBAYARAN: ${formatRupiah(params.totalAmount)}*`);
  lines.push(
    `*Pembayaran:* QRIS (${STORE_CONFIG.paymentInfo.merchantName}) / Bukti bayar sudah diupload di website`
  );

  if (params.trackUrl) {
    lines.push("");
    lines.push(`Lacak status pesanan: ${params.trackUrl}`);
  }

  lines.push("");
  lines.push("Pesanan dan bukti pembayaran sudah tercatat di sistem. Mohon divalidasi dan diproses ya, terima kasih.");

  return `https://wa.me/${adminPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function buildCustomerNotifyWaUrl(order: OrderRecord, message: string): string {
  const phone = normalizeWaPhone(order.customer_whatsapp);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
