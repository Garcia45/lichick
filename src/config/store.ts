import type { MenuBaseType, MenuProduct, OrderStatus } from "@/types/order";

export const STORE_CONFIG = {
  brandName: "LiChick",
  brandSub: "by LUCUIH",
  brandTagline: "OPEN PRE ORDER: Friesmoy & Macmoy",
  brandDescription:
    "Potongan ayam crispy hangat khas LiChick dengan pilihan French Fries atau Mac & Cheese creamy, tersedia dalam versi Original gurih dan GERAH bersaus pedas mengkilap.",
  adminWhatsApp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "6282190437013",
  adminWhatsAppDisplay: "0821-9043-7013",
  instagramHandle: "@lichik.id",
  instagramUrl: "https://instagram.com/lichik.id",
  logoUrl: "/images/lichick-logo.png",
  posterUrl: "/images/poster-lichick.jpg",
  paymentInfo: {
    label: "QRIS Resmi",
    merchantName: "LiChick by Lucuih, Makanan",
    nmid: "ID1026645157441",
    qrisImageUrl: "/images/qris-lichick.jpg",
    supportedApps: "semua e-wallet & mobile banking berlogo QRIS (GoPay, OVO, DANA, ShopeePay, BCA, Mandiri, BNI, BRI, dll.)",
    accountNumber: "0821 9043 7013",
    accountNumberRaw: "082190437013",
    accountHolder: "LiChick by Lucuih, Makanan",
  },
  pickupDays: ["Senin, 30 November"],
  pickupSlots: [] as string[],
};

export const MENU_PRODUCTS: MenuProduct[] = [
  {
    id: "friesmoy-gerah",
    name: "Friesmoy Gerah",
    baseTitle: "Friesmoy",
    edition: "GERAH",
    baseType: "fries",
    priceShort: "18K",
    tagline: "French Fries w/ Crispy Chicken, Saus Gerah Pedas",
    description:
      "Kentang goreng golden-crispy dipadu potongan ayam crispy renyah khas LiChick dengan siraman saus GERAH pedas-manis mengkilap.",
    price: 18000,
    defaultQuota: 10,
    badge: "Pedas Favorit",
    variants: ["Saus Gerah Normal", "Extra Saus Gerah", "Saus Gerah Dipisah"],
    imageUrl: "/images/friesmoy-gerah.png",
  },
  {
    id: "macmoy-gerah",
    name: "Macmoy Gerah",
    baseTitle: "MACMOY",
    edition: "GERAH",
    baseType: "mac",
    priceShort: "20K",
    tagline: "Mac & Cheese w/ Crispy Chicken, Saus Gerah Pedas",
    description:
      "Makaroni creamy saus keju lumer berpadu potongan ayam crispy juicy dan siraman saus GERAH pedas menggoda.",
    price: 20000,
    defaultQuota: 15,
    badge: "Signature Pedas",
    variants: ["Saus Gerah Normal", "Extra Saus Gerah", "Saus Gerah Dipisah"],
    imageUrl: "/images/macmoy-gerah.png",
  },
  {
    id: "friesmoy-original",
    name: "Friesmoy Original",
    baseTitle: "Friesmoy",
    edition: "ORIGINAL",
    baseType: "fries",
    priceShort: "18K",
    tagline: "French Fries w/ Crispy Chicken, Gurih Original",
    description:
      "Kentang goreng renyah dengan tumpukan potongan ayam crispy hangat tanpa saus pedas. Gurih, renyah, dan cocok untuk semua selera.",
    price: 18000,
    defaultQuota: 10,
    badge: "Original Gurih",
    variants: ["Original Gurih", "Tambah Saus Sambal", "Tambah Mayo"],
    imageUrl: "/images/friesmoy-original.png",
  },
  {
    id: "macmoy-original",
    name: "Macmoy Original",
    baseTitle: "MACMOY",
    edition: "ORIGINAL",
    baseType: "mac",
    priceShort: "20K",
    tagline: "Mac & Cheese w/ Crispy Chicken, Creamy Original",
    description:
      "Makaroni creamy dengan saus keju melimpah dan topping ayam crispy hangat tanpa rasa pedas.",
    price: 20000,
    defaultQuota: 15,
    badge: "Original Creamy",
    variants: ["Original Creamy Cheese", "Extra Keju", "Tambah Saus Sambal"],
    imageUrl: "/images/macmoy-original.png",
  },
];

// Stok global keseluruhan Pre Order: 25 porsi (bebas campur semua menu Friesmoy & Macmoy)
export const DEFAULT_TOTAL_QUOTA = 25;

export const DEFAULT_QUOTAS: Record<string, number> = {
  total: DEFAULT_TOTAL_QUOTA,
};

export function getBaseTypeForProductId(productId: string): MenuBaseType {
  const prod = MENU_PRODUCTS.find((p) => p.id === productId);
  if (prod) return prod.baseType;
  return productId.toLowerCase().includes("mac") ? "mac" : "fries";
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    stepIndex: number;
    badgeClass: string;
    nextStatus?: OrderStatus;
    nextActionLabel?: string;
    waTemplate: (customerName: string, orderNumber: string) => string;
  }
> = {
  belum_dibuat: {
    label: "Pesanan Masuk (Belum Dibuat)",
    shortLabel: "Belum Dibuat",
    description:
      "Pesanan sudah tercatat di sistem dan menunggu konfirmasi admin sebelum masuk dapur.",
    stepIndex: 0,
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    nextStatus: "sedang_dibuat",
    nextActionLabel: "Mulai Buat",
    waTemplate: (name, no) =>
      `Halo Kak ${name}, pesanan LiChick kamu dengan kode pesanan *${no}* sudah masuk di sistem kami dan sedang menunggu giliran dapur ya.`,
  },
  sedang_dibuat: {
    label: "Sedang Dibuat di Dapur",
    shortLabel: "Sedang Dibuat",
    description:
      "Pesanan sudah divalidasi. Ayam crispy sedang digoreng hangat dan saus sedang diracik.",
    stepIndex: 1,
    badgeClass: "bg-orange-100 text-orange-900 border-orange-300",
    nextStatus: "siap_diantar",
    nextActionLabel: "Siap / Antar",
    waTemplate: (name, no) =>
      `Halo Kak ${name}, pesanan LiChick *${no}* kamu sudah divalidasi dan *SEDANG DIBUAT* hangat di dapur ya.`,
  },
  siap_diantar: {
    label: "Siap Diambil / Sedang Diantar",
    shortLabel: "Siap / Diantar",
    description:
      "Bowl LiChick sudah dikemas rapi, siap diambil di kampus atau sedang dalam pengantaran.",
    stepIndex: 2,
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
    nextStatus: "selesai",
    nextActionLabel: "Tandai Selesai",
    waTemplate: (name, no) =>
      `Halo Kak ${name}, pesanan LiChick *${no}* kamu sudah *SIAP DIAMBIL / SEDANG DIANTAR* ya. Mohon ditunggu.`,
  },
  selesai: {
    label: "Pesanan Sudah Selesai",
    shortLabel: "Sudah Selesai",
    description:
      "Pesanan telah diterima pelanggan. Terima kasih sudah memesan LiChick by LUCUIH.",
    stepIndex: 3,
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    waTemplate: (name, no) =>
      `Terima kasih Kak ${name} sudah memesan LiChick (*${no}*). Semoga suka dengan rasanya, ditunggu repeat order berikutnya.`,
  },
  dibatalkan: {
    label: "Pesanan Dibatalkan",
    shortLabel: "Dibatalkan",
    description:
      "Pesanan ini dibatalkan oleh admin atau pemesan. Hubungi WhatsApp kami jika ada kendala.",
    stepIndex: -1,
    badgeClass: "bg-red-100 text-red-900 border-red-300",
    waTemplate: (name, no) =>
      `Halo Kak ${name}, mohon maaf pesanan LiChick *${no}* saat ini berstatus *DIBATALKAN*. Jika ada kendala silakan balas pesan ini.`,
  },
};

export const TIMELINE_STEPS: OrderStatus[] = [
  "belum_dibuat",
  "sedang_dibuat",
  "siap_diantar",
  "selesai",
];

export const PAYMENT_STATUS_META: Record<
  "menunggu_validasi" | "tervalidasi" | "ditolak",
  { label: string; shortLabel: string; badgeClass: string }
> = {
  menunggu_validasi: {
    label: "Menunggu Validasi Pembayaran",
    shortLabel: "Cek Bukti Bayar",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  tervalidasi: {
    label: "Pembayaran Tervalidasi (Lunas)",
    shortLabel: "Bayar Valid",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  ditolak: {
    label: "Bukti Pembayaran Ditolak",
    shortLabel: "Bayar Ditolak",
    badgeClass: "bg-red-100 text-red-900 border-red-300",
  },
};
