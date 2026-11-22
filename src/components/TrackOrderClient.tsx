"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  STORE_CONFIG,
  TIMELINE_STEPS,
} from "@/config/store";
import { formatRupiah, normalizeWaPhone } from "@/lib/format";
import type { OrderRecord } from "@/types/order";

export function TrackOrderClient() {
  const searchParams = useSearchParams();
  const initialTicket = (searchParams.get("order_number") || "")
    .trim()
    .toUpperCase();

  const [query, setQuery] = useState(initialTicket);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTicket = useCallback(async (ticket: string) => {
    const code = ticket.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setSearched(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/track?order_number=${encodeURIComponent(code)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setOrder(null);
        setErrorMsg(data.error || "Gagal menghubungi server. Coba lagi.");
        return;
      }
      setOrder(data.order || null);
    } catch {
      setOrder(null);
      setErrorMsg("Koneksi bermasalah. Coba ulangi beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTicket) {
      fetchTicket(initialTicket);
    }
  }, [initialTicket, fetchTicket]);

  const statusMeta = order
    ? ORDER_STATUS_META[order.order_status] || ORDER_STATUS_META.belum_dibuat
    : null;
  const paymentMeta = order
    ? PAYMENT_STATUS_META[order.payment_status] ||
      PAYMENT_STATUS_META.menunggu_validasi
    : null;
  const currentIdx = statusMeta ? statusMeta.stepIndex : -1;
  const progressPct =
    currentIdx >= 0
      ? Math.round(((currentIdx + 1) / TIMELINE_STEPS.length) * 100)
      : 0;

  const adminWa = normalizeWaPhone(STORE_CONFIG.adminWhatsApp);
  const waHelpUrl = order
    ? `https://wa.me/${adminWa}?text=${encodeURIComponent(
        `Halo Admin ${STORE_CONFIG.brandName}, saya ingin menanyakan status pesanan dengan kode pesanan *${order.order_number}* atas nama *${order.customer_name}*.`
      )}`
    : "#";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-5 sm:p-8 border border-brand-border space-y-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block">
          Lacak Pesanan LiChick
        </span>

        <div className="space-y-1">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark">
            Lacak Status Pesanan
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted">
            Masukkan kode pesananmu (contoh:{" "}
            <code className="font-mono font-bold text-brand-dark">
              LCK-261122-4821
            </code>
            ) untuk melihat status pembayaran dan progres dapur dari admin.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTicket(query);
          }}
          className="flex flex-col sm:flex-row gap-2.5 pt-1"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="Contoh: LCK-261122-4821"
            required
            className="flex-1 h-12 px-4 rounded-xl border border-brand-border bg-brand-paper text-sm font-mono font-bold uppercase text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 px-6 rounded-xl bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-60 text-white font-display font-bold text-sm cursor-pointer transition-colors shrink-0"
          >
            {loading ? "Mencari..." : "Lacak Pesanan"}
          </button>
        </form>
      </div>

      {order && statusMeta && (
        <div className="bg-white rounded-2xl p-5 sm:p-8 border border-brand-border space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-brand-border">
            <div>
              <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider block">
                Kode Pesanan
              </span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <h2 className="font-mono font-extrabold text-xl sm:text-2xl text-brand-dark">
                  {order.order_number}
                </h2>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(order.order_number);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      // Abaikan jika browser tidak mengizinkan clipboard
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-brand-paper border border-brand-border text-[11px] font-bold cursor-pointer"
                >
                  {copied ? "Tersalin" : "Salin"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {paymentMeta && (
                <span
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs border ${paymentMeta.badgeClass}`}
                >
                  {paymentMeta.label}
                </span>
              )}
              <span
                className={`px-3 py-1.5 rounded-lg font-bold text-xs border ${statusMeta.badgeClass}`}
              >
                {statusMeta.shortLabel}
              </span>
              <button
                type="button"
                onClick={() => fetchTicket(order.order_number)}
                className="h-9 px-3 rounded-lg bg-brand-paper border border-brand-border hover:border-brand-orange text-xs font-bold cursor-pointer transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {order.order_status !== "dibatalkan" ? (
            <>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-brand-muted">
                  <span>Progres Dapur</span>
                  <span className="text-brand-orange tabular-nums">
                    {progressPct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-brand-surface overflow-hidden">
                  <div
                    className="h-full bg-brand-orange transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <ol className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
                {TIMELINE_STEPS.map((stepKey, idx) => {
                  const meta = ORDER_STATUS_META[stepKey];
                  const done = currentIdx >= idx;
                  const active = currentIdx === idx;
                  return (
                    <li
                      key={stepKey}
                      className={`p-4 flex items-start gap-3.5 ${
                        active ? "bg-brand-surface" : "bg-white"
                      }`}
                    >
                      <span
                        className={`size-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          done
                            ? "bg-brand-orange text-white"
                            : "bg-brand-paper text-brand-muted border border-brand-border"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`font-bold text-sm ${
                              done ? "text-brand-dark" : "text-brand-muted"
                            }`}
                          >
                            {meta.label}
                          </h3>
                          {active && (
                            <span className="px-2 py-0.5 rounded bg-brand-dark text-white text-[10px] font-bold uppercase">
                              Saat Ini
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
                          {meta.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <p className="font-bold">Pesanan ini dibatalkan.</p>
              <p className="mt-1">{statusMeta.description}</p>
            </div>
          )}

          {/* Struk */}
          <div className="bg-brand-paper rounded-xl p-4 sm:p-5 border border-brand-border space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-brand-muted shrink-0">Pemesan</span>
              <strong className="text-brand-dark text-right">
                {order.customer_name} ({order.customer_whatsapp})
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-brand-muted shrink-0">Pengambilan</span>
              <strong className="text-brand-orange text-right">
                {order.pickup_day}, {order.pickup_slot}
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-brand-muted shrink-0">Metode</span>
              <strong className="text-brand-dark text-right">
                {order.delivery_method === "pickup"
                  ? "Ambil di Kampus"
                  : "Diantar"}
              </strong>
            </div>
            {order.delivery_address && order.delivery_address !== "-" && (
              <div className="flex justify-between gap-4">
                <span className="text-brand-muted shrink-0">Alamat</span>
                <span className="text-right font-medium text-brand-dark">
                  {order.delivery_address}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-brand-border space-y-1.5">
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between items-center gap-3">
                  <span className="font-medium text-brand-dark">
                    {it.name}{" "}
                    <span className="text-brand-orange font-bold">
                      x{it.quantity}
                    </span>
                    {it.variant ? (
                      <span className="text-brand-muted text-xs">
                        {" "}
                        ({it.variant})
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

            <div className="pt-3 border-t border-brand-border flex justify-between items-center font-extrabold text-base">
              <span>Total</span>
              <span className="font-display text-brand-orange text-xl tabular-nums">
                {formatRupiah(order.total_amount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Link
              href="/"
              className="min-h-[44px] px-5 rounded-xl bg-brand-paper border border-brand-border hover:border-brand-orange text-xs font-bold text-brand-dark flex items-center justify-center transition-colors"
            >
              Kembali ke Menu
            </Link>
            <a
              href={waHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center transition-colors"
            >
              Hubungi Dapur via WhatsApp
            </a>
          </div>
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
        <div className="bg-white rounded-2xl p-8 border border-brand-border text-center space-y-2">
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
