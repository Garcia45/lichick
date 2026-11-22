"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  STORE_CONFIG,
} from "@/config/store";
import {
  formatPickupSchedule,
  formatRupiah,
  normalizeWaPhone,
} from "@/lib/format";
import type { OrderRecord } from "@/types/order";

const LAST_ORDER_STORAGE_KEY = "lichick_last_order_code";
const LAST_WA_STORAGE_PREFIX = "lichick_wa_url_";

interface HorizontalStep {
  key: string;
  label: string;
  shortLabel: string;
}

const PROGRESS_STEPS: HorizontalStep[] = [
  { key: "verifikasi", label: "Verifikasi Pembayaran", shortLabel: "Verifikasi" },
  { key: "dibuat", label: "Sedang Dibuat", shortLabel: "Dibuat" },
  { key: "siap_diantar", label: "Siap / Diantar", shortLabel: "Siap / Antar" },
  { key: "selesai", label: "Selesai", shortLabel: "Selesai" },
];

/**
 * Menghitung posisi stepper horizontal 4 tahap dari validasi Admin:
 * - activeStep = 0 -> Verifikasi Pembayaran (menunggu validasi admin)
 * - activeStep = 1 -> Verifikasi selesai (centang), Sedang Dibuat (aktif)
 * - activeStep = 2 -> sampai Dibuat selesai (centang), Siap / Diantar (aktif)
 * - activeStep = 3 -> semua 4 tahap selesai (centang penuh)
 */
function resolveStepperState(order: OrderRecord): {
  activeStep: number;
  allDone: boolean;
  pillLabel: string;
  pillClass: string;
  helperText: string;
} {
  if (order.order_status === "dibatalkan") {
    return {
      activeStep: 0,
      allDone: false,
      pillLabel: "Dibatalkan",
      pillClass: "bg-red-100 text-red-800",
      helperText:
        "Pesanan ini dibatalkan. Hubungi admin via WhatsApp jika ada kendala.",
    };
  }

  if (order.payment_status === "ditolak") {
    return {
      activeStep: 0,
      allDone: false,
      pillLabel: "Bukti Ditolak",
      pillClass: "bg-red-100 text-red-800",
      helperText:
        "Bukti pembayaran QRIS tidak sesuai. Mohon hubungi admin via WhatsApp untuk konfirmasi ulang.",
    };
  }

  if (order.order_status === "selesai") {
    return {
      activeStep: 3,
      allDone: true,
      pillLabel: "Pesanan Selesai",
      pillClass: "bg-emerald-100 text-emerald-900",
      helperText:
        "Pesanan sudah diterima. Terima kasih sudah memesan LiChick by LUCUIH.",
    };
  }

  if (order.order_status === "siap_diantar") {
    return {
      activeStep: 2,
      allDone: false,
      pillLabel:
        order.delivery_method === "pickup" ? "Siap Diambil" : "Sedang Diantar",
      pillClass: "bg-sky-100 text-sky-900",
      helperText:
        order.delivery_method === "pickup"
          ? "Makanan sudah siap dan dikemas hangat untuk diambil di kampus."
          : "Makanan sudah siap dan sedang dalam pengantaran.",
    };
  }

  if (order.order_status === "sedang_dibuat") {
    return {
      activeStep: 1,
      allDone: false,
      pillLabel: "Sedang Dibuat",
      pillClass: "bg-orange-100 text-orange-900",
      helperText:
        "Pembayaran sudah terverifikasi. Makanan sedang dibuat hangat di dapur.",
    };
  }

  if (order.payment_status === "tervalidasi") {
    return {
      activeStep: 1,
      allDone: false,
      pillLabel: "Terverifikasi",
      pillClass: "bg-emerald-100 text-emerald-900",
      helperText:
        "Pembayaran QRIS kamu sudah diverifikasi admin dan segera masuk dapur.",
    };
  }

  return {
    activeStep: 0,
    allDone: false,
    pillLabel: "Menunggu Verifikasi",
    pillClass: "bg-amber-100 text-amber-900",
    helperText:
      "Bukti pembayaran QRIS sudah diterima. Menunggu verifikasi pembayaran dari admin.",
  };
}

export function TrackOrderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTicket = (searchParams.get("order_number") || "")
    .trim()
    .toUpperCase();
  const justOrdered = searchParams.get("ordered") === "1";

  const [query, setQuery] = useState(initialTicket);
  const [storedWaUrl, setStoredWaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(!initialTicket);
  const [copied, setCopied] = useState(false);

  const fetchTicket = useCallback(
    async (ticket: string, opts?: { silent?: boolean }) => {
      const code = ticket.trim().toUpperCase();
      if (!code) return;
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setSearched(true);
        setErrorMsg("");
      }

      try {
        const res = await fetch(
          `/api/track?order_number=${encodeURIComponent(code)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (!opts?.silent) {
            setOrder(null);
            setErrorMsg(data.error || "Gagal menghubungi server. Coba lagi.");
          }
          return;
        }
        setOrder(data.order || null);
        if (data.order) {
          setShowSearchBar(false);
        }
      } catch {
        if (!opts?.silent) {
          setOrder(null);
          setErrorMsg("Koneksi bermasalah. Coba ulangi beberapa saat lagi.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Bersihkan riwayat kode lama di localStorage & ambil link WA dari sessionStorage (khusus tab yang baru order)
  useEffect(() => {
    try {
      localStorage.removeItem(LAST_ORDER_STORAGE_KEY);
      if (initialTicket) {
        const wa =
          sessionStorage.getItem(`${LAST_WA_STORAGE_PREFIX}${initialTicket}`) ||
          "";
        if (wa) setStoredWaUrl(wa);
      }
    } catch {
      // Abaikan
    }
  }, [initialTicket]);

  // Fetch otomatis ketika URL memiliki ?order_number=...
  useEffect(() => {
    if (initialTicket) {
      setQuery(initialTicket);
      fetchTicket(initialTicket);
    }
  }, [initialTicket, fetchTicket]);

  // Auto-refresh status setiap 20 detik selama pesanan belum selesai / batal
  useEffect(() => {
    if (
      !order ||
      order.order_status === "selesai" ||
      order.order_status === "dibatalkan"
    ) {
      return;
    }
    const timer = setInterval(() => {
      fetchTicket(order.order_number, { silent: true });
    }, 20000);
    return () => clearInterval(timer);
  }, [order, fetchTicket]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = query.trim().toUpperCase();
    if (!code) return;
    setShowDetails(false);
    router.replace(`/track?order_number=${encodeURIComponent(code)}`);
    fetchTicket(code);
  };

  const stepper = order ? resolveStepperState(order) : null;
  const statusMeta = order
    ? ORDER_STATUS_META[order.order_status] || ORDER_STATUS_META.belum_dibuat
    : null;
  const paymentMeta = order
    ? PAYMENT_STATUS_META[order.payment_status] ||
      PAYMENT_STATUS_META.menunggu_validasi
    : null;

  const adminWa = normalizeWaPhone(STORE_CONFIG.adminWhatsApp);
  const waHelpUrl = order
    ? storedWaUrl && justOrdered
      ? storedWaUrl
      : `https://wa.me/${adminWa}?text=${encodeURIComponent(
          `Halo Admin ${STORE_CONFIG.brandName}, saya ingin konfirmasi / menanyakan status pesanan dengan kode *${order.order_number}* atas nama *${order.customer_name}*.`
        )}`
    : "#";

  const progressFillPercent =
    stepper && PROGRESS_STEPS.length > 1
      ? Math.min(
          100,
          Math.max(
            0,
            (stepper.activeStep / (PROGRESS_STEPS.length - 1)) * 100
          )
        )
      : 0;

  return (
    <div className="max-w-lg mx-auto space-y-5 py-2 sm:py-4">
      {/* Banner Konfirmasi Singkat Jika Baru Selesai Order */}
      {justOrdered && order && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-900 flex items-center justify-between gap-3">
          <span className="font-bold">
            Pesanan &amp; bukti bayar QRIS berhasil tercatat di sistem.
          </span>
          <span className="font-mono font-extrabold shrink-0">
            {order.order_number}
          </span>
        </div>
      )}

      {/* KARTU STATUS PESANAN ALA REFERENSI (KOMPAK, STEPPER HORIZONTAL, UPDATE LIVE DARI ADMIN) */}
      {order && stepper && statusMeta && paymentMeta && (
        <section
          aria-label="Status Pesanan"
          className="rounded-3xl bg-white border border-brand-border p-5 sm:p-7 space-y-6 shadow-sm"
        >
          {/* Baris Atas: Kode Pesanan & Pill Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm sm:text-base text-brand-muted">
                  {order.order_number}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(order.order_number);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      // Abaikan
                    }
                  }}
                  className="px-2 py-0.5 rounded-md bg-brand-paper border border-brand-border text-[10px] font-bold text-brand-dark cursor-pointer hover:border-brand-orange transition-colors"
                >
                  {copied ? "Tersalin" : "Salin"}
                </button>
              </div>
              <p className="text-xs font-semibold text-brand-dark truncate">
                {order.customer_name}
              </p>
            </div>

            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold text-center leading-tight shrink-0 ${stepper.pillClass}`}
            >
              {stepper.pillLabel}
            </span>
          </div>

          {/* Nominal Utama & Jadwal Pengambilan */}
          <div className="space-y-1">
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-brand-dark tabular-nums tracking-tight">
              {formatRupiah(order.total_amount)}
            </h1>
            <p className="text-xs sm:text-sm text-brand-muted font-medium">
              Pengambilan {formatPickupSchedule(order.pickup_day, order.pickup_slot)}{" "}
              ({order.delivery_method === "pickup" ? "Ambil di Kampus" : "Diantar"})
            </p>
          </div>

          {/* Horizontal Progress Stepper (Tersinkron Langsung dengan Validasi Admin) */}
          {order.order_status !== "dibatalkan" ? (
            <div className="pt-2 pb-1 space-y-3">
              <div className="relative">
                {/* Garis Dasar Abu (4 tahap: pusat kolom 1 di 12.5% s.d. kolom 4 di 87.5%) */}
                <div className="absolute top-3.5 left-[12.5%] right-[12.5%] h-[3px] bg-brand-border rounded-full" />
                {/* Garis Progres Aktif Oranye */}
                <div
                  className="absolute top-3.5 left-[12.5%] h-[3px] bg-brand-orange rounded-full transition-all duration-500"
                  style={{
                    width: `${progressFillPercent * 0.75}%`,
                  }}
                />

                <ol className="relative grid grid-cols-4 gap-1">
                  {PROGRESS_STEPS.map((step, idx) => {
                    const isDone = stepper.allDone || idx < stepper.activeStep;
                    const isCurrent =
                      !stepper.allDone && idx === stepper.activeStep;
                    const isRejectedStep =
                      order.payment_status === "ditolak" && idx === 0;

                    return (
                      <li
                        key={step.key}
                        className="flex flex-col items-center text-center gap-2"
                      >
                        <span
                          className={`size-7 rounded-full flex items-center justify-center transition-colors ${
                            isRejectedStep
                              ? "bg-red-600 ring-4 ring-red-100"
                              : isDone
                              ? "bg-brand-orange"
                              : isCurrent
                              ? "bg-white border-2 border-brand-orange ring-4 ring-brand-surface"
                              : "bg-brand-border"
                          }`}
                        >
                          {isDone ? (
                            <span
                              aria-hidden="true"
                              className="block w-2 h-3.5 border-r-2 border-b-2 border-white rotate-45 -translate-y-[1px]"
                            />
                          ) : isCurrent ? (
                            <span
                              aria-hidden="true"
                              className={`size-2.5 rounded-full ${
                                isRejectedStep ? "bg-white" : "bg-brand-orange"
                              }`}
                            />
                          ) : null}
                        </span>
                        <span
                          className={`text-[10px] sm:text-xs leading-tight ${
                            isRejectedStep
                              ? "font-bold text-red-700"
                              : isCurrent || isDone
                              ? "font-bold text-brand-dark"
                              : "font-medium text-brand-muted"
                          }`}
                        >
                          <span className="sm:hidden">{step.shortLabel}</span>
                          <span className="hidden sm:inline">{step.label}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <p className="text-xs text-brand-muted leading-relaxed bg-brand-paper rounded-xl px-3.5 py-2.5 border border-brand-border">
                {stepper.helperText}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <p className="font-bold">Pesanan ini dibatalkan.</p>
              <p className="mt-1">{statusMeta.description}</p>
            </div>
          )}

          {/* Tombol Aksi Utama Bentuk Pill (Seperti Referensi) */}
          <div className="space-y-3 pt-1">
            {justOrdered || order.payment_status === "ditolak" ? (
              <a
                href={waHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full min-h-[48px] px-6 rounded-full font-display font-bold text-sm sm:text-base text-white flex items-center justify-center transition-colors ${
                  order.payment_status === "ditolak"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-brand-orange hover:bg-brand-orange-hover"
                }`}
              >
                {order.payment_status === "ditolak"
                  ? "Konfirmasi Ulang via WhatsApp"
                  : "Kirim Konfirmasi ke WhatsApp"}
              </a>
            ) : (
              <button
                type="button"
                disabled={refreshing}
                onClick={() => fetchTicket(order.order_number, { silent: true })}
                className="w-full min-h-[48px] px-6 rounded-full bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-60 text-white font-display font-bold text-sm sm:text-base cursor-pointer transition-colors"
              >
                {refreshing ? "Memperbarui Status..." : "Perbarui Status Terbaru"}
              </button>
            )}

            {/* Tautan Expandable "Lihat rincian pesanan" ala Referensi */}
            <div className="flex items-center justify-center gap-4 text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="text-brand-orange hover:underline cursor-pointer py-1"
              >
                {showDetails
                  ? "Sembunyikan rincian pesanan"
                  : "Lihat rincian pesanan"}
              </button>
            </div>
          </div>

          {/* Rincian Pesanan Lengkap (Expandable) */}
          {showDetails && (
            <div className="bg-brand-paper rounded-2xl p-4 sm:p-5 border border-brand-border space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-brand-muted shrink-0">Status Pembayaran</span>
                <strong className="text-brand-dark text-right">
                  {paymentMeta.label}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-brand-muted shrink-0">Status Dapur</span>
                <strong className="text-brand-dark text-right">
                  {statusMeta.shortLabel}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-brand-muted shrink-0">Pemesan</span>
                <strong className="text-brand-dark text-right">
                  {order.customer_name} ({order.customer_whatsapp})
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-brand-muted shrink-0">Pengambilan</span>
                <strong className="text-brand-orange text-right">
                  {formatPickupSchedule(order.pickup_day, order.pickup_slot)}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-brand-muted shrink-0">Metode</span>
                <strong className="text-brand-dark text-right">
                  {order.delivery_method === "pickup"
                    ? "Ambil di Kampus"
                    : "Diantar"}
                </strong>
              </div>
              {order.delivery_address && order.delivery_address !== "-" && (
                <div className="flex justify-between gap-3">
                  <span className="text-brand-muted shrink-0">Alamat</span>
                  <span className="text-right font-medium text-brand-dark">
                    {order.delivery_address}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-brand-border space-y-2">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-start gap-3">
                    <span className="font-semibold text-brand-dark">
                      {it.name}{" "}
                      <span className="text-brand-orange font-bold">
                        x{it.quantity}
                      </span>
                      {it.variant ? (
                        <span className="text-brand-muted text-xs block">
                          {it.variant}
                          {it.notes ? ` / ${it.notes}` : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-bold tabular-nums shrink-0">
                      {formatRupiah(it.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && order.notes !== "-" && (
                <div className="pt-2 border-t border-brand-border text-xs text-brand-muted">
                  <strong className="text-brand-dark">Catatan:</strong>{" "}
                  {order.notes}
                </div>
              )}

              <div className="pt-3 border-t border-brand-border flex justify-between items-center font-extrabold text-sm sm:text-base">
                <span>Total ({order.total_portions} Porsi)</span>
                <span className="font-display text-brand-orange text-lg sm:text-xl tabular-nums">
                  {formatRupiah(order.total_amount)}
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={waHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-[42px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center transition-colors"
                >
                  Hubungi Admin via WhatsApp
                </a>
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() =>
                    fetchTicket(order.order_number, { silent: true })
                  }
                  className="min-h-[42px] px-4 rounded-xl bg-white border border-brand-border hover:border-brand-orange text-xs font-bold text-brand-dark cursor-pointer transition-colors"
                >
                  {refreshing ? "Memuat..." : "Refresh"}
                </button>
              </div>
            </div>
          )}

          {/* Footer Kecil Kartu: Ganti Kode Pesanan / Kembali ke Menu */}
          <div className="pt-3 border-t border-brand-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <Link
              href="/"
              className="font-bold text-brand-muted hover:text-brand-dark"
            >
              Kembali ke Menu
            </Link>
            <button
              type="button"
              onClick={() => setShowSearchBar((prev) => !prev)}
              className="font-bold text-brand-dark hover:text-brand-orange cursor-pointer"
            >
              {showSearchBar ? "Tutup Pencarian" : "Lacak Kode Lain"}
            </button>
          </div>
        </section>
      )}

      {/* FORM PENCARIAN KODE PESANAN */}
      {(showSearchBar || !order) && (
        <section
          aria-label="Cari Kode Pesanan"
          className="bg-white rounded-3xl p-5 sm:p-7 border border-brand-border space-y-4"
        >
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block">
            Lacak Pesanan LiChick
          </span>

          <div className="space-y-1">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-dark">
              Cek Status Pembayaran &amp; Dapur
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted">
              Masukkan kode pesananmu (contoh:{" "}
              <code className="font-mono font-bold text-brand-dark">
                LCK-261123-7K4M9P
              </code>
              ) untuk melihat progres langsung dari validasi admin.
            </p>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row gap-2.5 pt-1"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Contoh: LCK-261123-7K4M9P"
              required
              className="flex-1 h-12 px-4 rounded-xl border border-brand-border bg-brand-paper text-sm font-mono font-bold uppercase text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 px-6 rounded-xl bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-60 text-white font-display font-bold text-sm cursor-pointer transition-colors shrink-0"
            >
              {loading ? "Mencari..." : "Lacak"}
            </button>
          </form>
        </section>
      )}

      {loading && !order && (
        <div className="bg-white rounded-3xl p-8 border border-brand-border text-center text-xs sm:text-sm text-brand-muted font-semibold">
          Mengambil status pesanan terbaru...
        </div>
      )}

      {errorMsg && !loading && (
        <div className="bg-red-50 rounded-2xl p-6 border border-red-200 text-center space-y-2">
          <h2 className="font-display font-bold text-base text-red-900">
            Gagal Memuat Status
          </h2>
          <p className="text-xs sm:text-sm text-red-800">{errorMsg}</p>
        </div>
      )}

      {searched && !loading && !order && !errorMsg && (
        <div className="bg-white rounded-3xl p-8 border border-brand-border text-center space-y-2">
          <h2 className="font-display font-bold text-lg text-brand-dark">
            Pesanan Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted">
            Kode pesanan <strong className="font-mono">{query}</strong> belum
            terdaftar. Pastikan penulisannya sesuai atau konfirmasi via WhatsApp.
          </p>
        </div>
      )}
    </div>
  );
}
