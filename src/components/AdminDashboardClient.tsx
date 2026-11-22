"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import {
  DEFAULT_QUOTAS,
  MENU_PRODUCTS,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  STORE_CONFIG,
} from "@/config/store";
import { buildCustomerNotifyWaUrl, formatRupiah } from "@/lib/format";
import type {
  AdminDashboardResponse,
  OrderRecord,
  OrderStatus,
  PaymentStatus,
} from "@/types/order";

type FilterKey = "all" | "pending_payment" | OrderStatus;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending_payment", label: "Cek Bukti Bayar" },
  { key: "belum_dibuat", label: "Belum Dibuat" },
  { key: "sedang_dibuat", label: "Sedang Dibuat" },
  { key: "siap_diantar", label: "Siap / Diantar" },
  { key: "selesai", label: "Sudah Selesai" },
  { key: "dibatalkan", label: "Dibatalkan" },
];

export function AdminDashboardClient() {
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [notice, setNotice] = useState("");

  const [statusFilter, setStatusFilter] = useState<FilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingOrderNo, setUpdatingOrderNo] = useState<string | null>(null);

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [storeOpenDraft, setStoreOpenDraft] = useState(true);
  const [quotasDraft, setQuotasDraft] = useState<Record<string, number>>({
    ...DEFAULT_QUOTAS,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Modal Preview & Validasi Bukti Pembayaran QRIS
  const [proofOrder, setProofOrder] = useState<OrderRecord | null>(null);

  // Target cetak: 1 pesanan spesifik atau "summary" untuk rekap dapur
  const [printTarget, setPrintTarget] = useState<OrderRecord | "summary" | null>(
    null
  );

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((prev) => (prev === msg ? "" : prev)), 3200);
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const json: AdminDashboardResponse = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Gagal memuat data dashboard");
      }
      setData(json);
      setStoreOpenDraft(json.store_config?.store_open !== false);
      setQuotasDraft({ ...DEFAULT_QUOTAS, ...(json.store_config?.quotas || {}) });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memuat data pesanan."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((res) => res.json())
      .then((json) => {
        setAuthenticated(Boolean(json.authenticated));
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecking(false));
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadDashboard();
    }
  }, [authenticated, loadDashboard]);

  useEffect(() => {
    if (!proofOrder) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !updatingOrderNo) {
        setProofOrder(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [proofOrder, updatingOrderNo]);

  const triggerPrint = (target: OrderRecord | "summary") => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pinInput }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setAuthError(json.error || "Password / PIN tidak valid.");
        return;
      }
      setAuthenticated(true);
      setPinInput("");
    } catch {
      setAuthError("Gagal menghubungi server login.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
    setData(null);
  };

  const handleUpdateOrder = async (params: {
    orderNumber: string;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    successMessage: string;
  }) => {
    setUpdatingOrderNo(params.orderNumber);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: params.orderNumber,
          order_status: params.orderStatus,
          payment_status: params.paymentStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal memperbarui pesanan");
      }
      showNotice(params.successMessage);
      if (proofOrder?.order_number === params.orderNumber) {
        setProofOrder(null);
      }
      await loadDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal update pesanan");
    } finally {
      setUpdatingOrderNo(null);
    }
  };

  const handleDeleteOrder = async (orderNumber: string) => {
    if (!confirm(`Hapus pesanan ${orderNumber} secara permanen?`)) return;
    setUpdatingOrderNo(orderNumber);
    try {
      const res = await fetch(
        `/api/admin/orders?order_number=${encodeURIComponent(orderNumber)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal menghapus pesanan");
      }
      showNotice(`Pesanan ${orderNumber} dihapus.`);
      await loadDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setUpdatingOrderNo(null);
    }
  };

  const handleSaveStoreConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_open: storeOpenDraft,
          quotas: quotasDraft,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal menyimpan pengaturan toko");
      }
      showNotice("Status toko dan kuota menu berhasil disimpan.");
      await loadDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal simpan pengaturan");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExportExcel = () => {
    if (!data) return;

    const orderRows = data.orders.map((o) => ({
      "Waktu Pesan": o.timestamp,
      "Kode Pesanan": o.order_number,
      "Hari Pengambilan": o.pickup_day,
      "Jam Pengambilan": o.pickup_slot,
      "Nama Pelanggan": o.customer_name,
      "No WhatsApp": o.customer_whatsapp,
      Metode: o.delivery_method === "pickup" ? "Ambil di Kampus" : "Diantar",
      Alamat: o.delivery_address,
      "Rincian Pesanan": o.items_summary,
      "Total Porsi": o.total_portions,
      "Total Bayar (Rp)": o.total_amount,
      "Status Pembayaran":
        PAYMENT_STATUS_META[o.payment_status || "menunggu_validasi"]?.label ||
        o.payment_status,
      "Status Dapur":
        ORDER_STATUS_META[o.order_status]?.shortLabel || o.order_status,
      "Link Bukti Pembayaran":
        o.payment_proof_url && o.payment_proof_url.startsWith("http")
          ? o.payment_proof_url
          : o.payment_proof_url
          ? "Tersimpan di preview lokal"
          : "-",
      "Catatan Pesanan": o.notes,
      "Terakhir Update": o.updated_at,
    }));

    const summaryRows = [
      { Metrik: "Tanggal Rekap", Nilai: data.today },
      { Metrik: "Total Pesanan Masuk", Nilai: data.summary.total_orders },
      { Metrik: "Pesanan Aktif (Tidak Batal)", Nilai: data.summary.active_orders },
      { Metrik: "Total Porsi Terjual", Nilai: data.summary.total_portions_sold },
      { Metrik: "Gross Pipeline (Rp)", Nilai: data.summary.gross_revenue },
      { Metrik: "Omset Tervalidasi (Lunas) (Rp)", Nilai: data.summary.verified_revenue },
      { Metrik: "Menunggu Validasi Bayar", Nilai: data.summary.pending_payments },
      { Metrik: "Belum Dibuat", Nilai: data.summary.status_counts.belum_dibuat || 0 },
      { Metrik: "Sedang Dibuat", Nilai: data.summary.status_counts.sedang_dibuat || 0 },
      { Metrik: "Siap / Diantar", Nilai: data.summary.status_counts.siap_diantar || 0 },
      { Metrik: "Sudah Selesai", Nilai: data.summary.status_counts.selesai || 0 },
      { Metrik: "Dibatalkan", Nilai: data.summary.status_counts.dibatalkan || 0 },
    ];

    const wb = XLSX.utils.book_new();
    const wsOrders = XLSX.utils.json_to_sheet(orderRows);
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsOrders, "Daftar Pesanan");
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Penjualan");
    XLSX.writeFile(wb, `Rekap-Penjualan-LiChick-${data.today}.xlsx`);
    showNotice("File Excel (.xlsx) berhasil diunduh.");
  };

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.orders.filter((o) => {
      const statusOk =
        statusFilter === "all"
          ? true
          : statusFilter === "pending_payment"
          ? o.payment_status === "menunggu_validasi" &&
            o.order_status !== "dibatalkan"
          : o.order_status === statusFilter;

      const queryOk =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_whatsapp.toLowerCase().includes(q) ||
        o.pickup_day.toLowerCase().includes(q) ||
        o.items_summary.toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  }, [data, searchQuery, statusFilter]);

  if (authChecking) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-sm text-brand-muted font-semibold">
        Memeriksa sesi admin...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-brand-border space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block">
              Akses Terbatas
            </span>
            <h1 className="font-display font-bold text-2xl text-brand-dark">
              Login Admin Dapur
            </h1>
            <p className="text-xs sm:text-sm text-brand-muted">
              Masukkan Password atau PIN Admin untuk memeriksa bukti pembayaran
              QRIS, cetak pesanan, dan memvalidasi status dapur.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-pin"
                className="block text-xs font-bold text-brand-dark mb-1.5"
              >
                Password / PIN Admin
              </label>
              <div className="flex gap-2">
                <input
                  id="admin-pin"
                  type={showPin ? "text" : "password"}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Masukkan Password atau PIN"
                  autoComplete="current-password"
                  required
                  className="flex-1 min-w-0 h-12 px-4 rounded-xl border border-brand-border bg-brand-paper font-semibold text-sm sm:text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((prev) => !prev)}
                  className="h-12 px-3.5 rounded-xl border border-brand-border bg-white text-xs font-bold text-brand-dark hover:border-brand-orange cursor-pointer shrink-0 transition-colors"
                >
                  {showPin ? "Sembunyi" : "Lihat"}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800 text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full h-12 rounded-xl bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-60 text-white font-display font-bold text-sm cursor-pointer transition-colors"
            >
              {loggingIn ? "Memverifikasi..." : "Masuk ke Dashboard Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const counts = data?.summary.status_counts || {
    belum_dibuat: 0,
    sedang_dibuat: 0,
    siap_diantar: 0,
    selesai: 0,
    dibatalkan: 0,
  };

  return (
    <>
      {/* AREA CETAK KHUSUS (@media print) */}
      {printTarget && (
        <div className="hidden print-only p-4 text-black text-xs space-y-4">
          {printTarget === "summary" && data ? (
            <div className="space-y-4">
              <div className="border-b-2 border-black pb-2 flex justify-between items-end">
                <div>
                  <h1 className="text-lg font-bold">
                    {STORE_CONFIG.brandName} {STORE_CONFIG.brandSub} - REKAP DAPUR
                  </h1>
                  <p>Tanggal: {data.today}</p>
                </div>
                <div className="text-right font-bold">
                  <p>Total Order Aktif: {data.summary.active_orders}</p>
                  <p>Total Bowl: {data.summary.total_portions_sold}</p>
                </div>
              </div>

              <div>
                <h2 className="font-bold uppercase mb-1">Ringkasan Masak per Menu</h2>
                <table className="w-full border-collapse border border-black text-left">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="p-1.5 border-r border-black">Menu</th>
                      <th className="p-1.5 border-r border-black">Total Porsi</th>
                      <th className="p-1.5">Total Omset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.menu_breakdown.map((m) => (
                      <tr key={m.name} className="border-b border-black">
                        <td className="p-1.5 border-r border-black font-bold">{m.name}</td>
                        <td className="p-1.5 border-r border-black">{m.quantity} bowl</td>
                        <td className="p-1.5">{formatRupiah(m.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h2 className="font-bold uppercase mb-1">Checklist Daftar Pesanan</h2>
                <table className="w-full border-collapse border border-black text-left">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="p-1.5 border-r border-black">Kode &amp; Waktu</th>
                      <th className="p-1.5 border-r border-black">Pemesan</th>
                      <th className="p-1.5 border-r border-black">Menu &amp; Catatan</th>
                      <th className="p-1.5 border-r border-black">Total</th>
                      <th className="p-1.5">Bayar / Dapur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders
                      .filter((o) => o.order_status !== "dibatalkan")
                      .map((o) => (
                        <tr key={o.order_number} className="border-b border-black">
                          <td className="p-1.5 border-r border-black align-top">
                            <div className="font-mono font-bold">{o.order_number}</div>
                            <div>{o.pickup_day}, {o.pickup_slot}</div>
                          </td>
                          <td className="p-1.5 border-r border-black align-top">
                            <div className="font-bold">{o.customer_name}</div>
                            <div>{o.customer_whatsapp}</div>
                            <div>
                              {o.delivery_method === "pickup"
                                ? "Ambil di Kampus"
                                : `Diantar: ${o.delivery_address}`}
                            </div>
                          </td>
                          <td className="p-1.5 border-r border-black align-top">
                            <div>{o.items_summary}</div>
                            {o.notes && o.notes !== "-" && (
                              <div className="italic mt-1">Catatan: {o.notes}</div>
                            )}
                          </td>
                          <td className="p-1.5 border-r border-black align-top font-bold">
                            {formatRupiah(o.total_amount)}
                          </td>
                          <td className="p-1.5 align-top">
                            <div>
                              {(
                                PAYMENT_STATUS_META[o.payment_status] ||
                                PAYMENT_STATUS_META.menunggu_validasi
                              ).shortLabel}
                            </div>
                            <div>
                              {(
                                ORDER_STATUS_META[o.order_status] ||
                                ORDER_STATUS_META.belum_dibuat
                              ).shortLabel}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            typeof printTarget === "object" && (
              <div className="max-w-sm mx-auto border border-black p-4 space-y-3">
                <div className="text-center border-b border-dashed border-black pb-2">
                  <h1 className="text-base font-bold">
                    {STORE_CONFIG.brandName} {STORE_CONFIG.brandSub}
                  </h1>
                  <p>STRUK PESANAN DAPUR</p>
                  <p className="font-mono font-bold text-sm mt-1">
                    {printTarget.order_number}
                  </p>
                </div>

                <div className="space-y-1 border-b border-dashed border-black pb-2">
                  <p><strong>Nama:</strong> {printTarget.customer_name}</p>
                  <p><strong>WhatsApp:</strong> {printTarget.customer_whatsapp}</p>
                  <p>
                    <strong>Pengambilan:</strong> {printTarget.pickup_day},{" "}
                    {printTarget.pickup_slot}
                  </p>
                  <p>
                    <strong>Metode:</strong>{" "}
                    {printTarget.delivery_method === "pickup"
                      ? "Ambil di Kampus"
                      : `Diantar (${printTarget.delivery_address})`}
                  </p>
                  <p>
                    <strong>Pembayaran:</strong>{" "}
                    {(
                      PAYMENT_STATUS_META[printTarget.payment_status] ||
                      PAYMENT_STATUS_META.menunggu_validasi
                    ).label}
                  </p>
                  <p>
                    <strong>Status Dapur:</strong>{" "}
                    {(
                      ORDER_STATUS_META[printTarget.order_status] ||
                      ORDER_STATUS_META.belum_dibuat
                    ).shortLabel}
                  </p>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-black pb-2">
                  {printTarget.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between gap-2">
                      <div>
                        <span className="font-bold">
                          {it.quantity}x {it.name}
                        </span>
                        {it.variant ? <div>Varian: {it.variant}</div> : null}
                        {it.notes ? <div>Note: {it.notes}</div> : null}
                      </div>
                      <span className="font-bold">{formatRupiah(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {printTarget.notes && printTarget.notes !== "-" && (
                  <div className="border-b border-dashed border-black pb-2">
                    <strong>Catatan Pesanan:</strong> {printTarget.notes}
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold">
                  <span>TOTAL ({printTarget.total_portions} porsi)</span>
                  <span>{formatRupiah(printTarget.total_amount)}</span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* MODAL PREVIEW & VALIDASI BUKTI PEMBAYARAN QRIS */}
      {proofOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 no-print"
          onClick={() => {
            if (!updatingOrderNo) setProofOrder(null);
          }}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl border border-brand-border overflow-hidden max-h-[92dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-brand-dark text-white flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-amber font-bold block">
                  Validasi Bukti Pembayaran QRIS
                </span>
                <h3 className="font-mono font-bold text-base">
                  {proofOrder.order_number} ({proofOrder.customer_name})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProofOrder(null)}
                className="min-h-[36px] px-3 rounded-lg bg-brand-charcoal hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-brand-paper p-3.5 rounded-xl border border-brand-border flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-brand-muted block">Total Tagihan</span>
                  <strong className="font-display text-xl text-brand-orange tabular-nums">
                    {formatRupiah(proofOrder.total_amount)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-brand-muted block">QRIS Penerima</span>
                  <strong className="text-brand-dark">
                    {STORE_CONFIG.paymentInfo.merchantName}
                  </strong>
                </div>
              </div>

              <div className="rounded-xl border border-brand-border bg-brand-paper p-2 flex flex-col items-center justify-center gap-2 max-h-[50vh] overflow-hidden">
                {proofOrder.payment_proof_url ? (
                  <>
                    <img
                      src={proofOrder.payment_proof_url}
                      alt={`Bukti Pembayaran ${proofOrder.order_number}`}
                      referrerPolicy="no-referrer"
                      className="max-h-[42vh] w-auto object-contain rounded-lg"
                    />
                    {proofOrder.payment_proof_url.startsWith("http") && (
                      <a
                        href={proofOrder.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-brand-orange underline"
                      >
                        Buka Foto Bukti di Tab Baru
                      </a>
                    )}
                  </>
                ) : (
                  <p className="py-10 text-xs text-brand-muted">
                    Belum ada foto bukti pembayaran pada pesanan ini.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={updatingOrderNo === proofOrder.order_number}
                  onClick={() =>
                    handleUpdateOrder({
                      orderNumber: proofOrder.order_number,
                      paymentStatus: "tervalidasi",
                      orderStatus:
                        proofOrder.order_status === "belum_dibuat"
                          ? "sedang_dibuat"
                          : undefined,
                      successMessage: `Pembayaran ${proofOrder.order_number} tervalidasi dan masuk dapur.`,
                    })
                  }
                  className="sm:col-span-2 min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors"
                >
                  Validasi Pembayaran &amp; Mulai Buat
                </button>

                <button
                  type="button"
                  disabled={updatingOrderNo === proofOrder.order_number}
                  onClick={() =>
                    handleUpdateOrder({
                      orderNumber: proofOrder.order_number,
                      paymentStatus: "tervalidasi",
                      successMessage: `Pembayaran ${proofOrder.order_number} ditandai valid.`,
                    })
                  }
                  className="min-h-[40px] px-4 rounded-xl bg-brand-dark hover:bg-black disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Validasi Bayar Saja
                </button>

                <button
                  type="button"
                  disabled={updatingOrderNo === proofOrder.order_number}
                  onClick={() =>
                    handleUpdateOrder({
                      orderNumber: proofOrder.order_number,
                      paymentStatus: "ditolak",
                      successMessage: `Bukti pembayaran ${proofOrder.order_number} ditolak.`,
                    })
                  }
                  className="min-h-[40px] px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Tolak Bukti Bayar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UI INTERAKTIF ADMIN DASHBOARD */}
      <div className="space-y-6 no-print">
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block">
              {data?.mode === "google_sheets"
                ? "Google Sheets Live"
                : "Mode Preview Lokal (Isi GOOGLE_SHEETS_WEBHOOK_URL untuk Live)"}
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark">
              Admin Dashboard &amp; Validasi Pesanan
            </h1>
            <p className="text-xs sm:text-sm text-brand-muted">
              Validasi bukti pembayaran QRIS, update progres dapur, cetak struk
              pesanan, dan export Excel (.xlsx).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="min-h-[40px] px-3.5 rounded-lg bg-brand-paper border border-brand-border hover:border-brand-orange text-xs font-bold cursor-pointer transition-colors"
            >
              {loading ? "Memuat..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => setShowConfigPanel((v) => !v)}
              className="min-h-[40px] px-3.5 rounded-lg bg-brand-paper border border-brand-border hover:border-brand-orange text-xs font-bold cursor-pointer transition-colors"
            >
              {showConfigPanel ? "Tutup Pengaturan" : "Atur Toko & Kuota"}
            </button>

            <button
              type="button"
              onClick={() => triggerPrint("summary")}
              disabled={!data}
              className="min-h-[40px] px-3.5 rounded-lg bg-brand-dark hover:bg-black disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Cetak Rekap Dapur
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!data}
              className="min-h-[40px] px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Export Excel (.xlsx)
            </button>

            {data?.sheet_url && (
              <a
                href={data.sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-4 rounded-lg bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold inline-flex items-center transition-colors"
              >
                Buka Sheets
              </a>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[40px] px-3.5 rounded-lg bg-zinc-100 hover:bg-red-50 hover:text-red-700 text-brand-dark text-xs font-bold cursor-pointer transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
            {notice}
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {/* Panel Atur Status Toko Buka/Tutup & Kuota Menu */}
        {showConfigPanel && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-bold text-lg text-brand-dark">
                Pengaturan Status Pre Order &amp; Kuota Menu
              </h2>
              <div className="inline-flex items-center gap-2">
                <span className="text-xs font-bold text-brand-muted">
                  Status PO:
                </span>
                <select
                  value={storeOpenDraft ? "open" : "closed"}
                  onChange={(e) => setStoreOpenDraft(e.target.value === "open")}
                  className="py-2 px-3 rounded-lg border border-brand-border bg-brand-paper text-xs font-bold"
                >
                  <option value="open">Buka (Menerima Pesanan)</option>
                  <option value="closed">Tutup Sementara</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MENU_PRODUCTS.map((p) => {
                const sold = data?.sold_today?.[p.id] || 0;
                const maxVal = quotasDraft[p.id] ?? p.defaultQuota;
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-brand-paper border border-brand-border flex items-center justify-between gap-3"
                  >
                    <div className="text-xs">
                      <span className="font-bold text-brand-dark block">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-brand-muted">
                        Terjual: {sold}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={maxVal}
                      onChange={(e) =>
                        setQuotasDraft((prev) => ({
                          ...prev,
                          [p.id]: Math.max(
                            0,
                            Math.min(500, Math.floor(Number(e.target.value) || 0))
                          ),
                        }))
                      }
                      className="w-20 h-9 px-2 rounded-lg border border-brand-border bg-white text-center text-xs font-bold"
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={savingConfig}
              onClick={handleSaveStoreConfig}
              className="min-h-[42px] px-5 rounded-lg bg-brand-dark hover:bg-black disabled:opacity-60 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              {savingConfig ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        )}

        {/* Editorial Ledger Strip */}
        <div className="bg-white rounded-2xl border border-brand-border grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-brand-border overflow-hidden">
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-bold uppercase text-brand-muted block">
              Omset Lunas (Valid)
            </span>
            <span className="font-display font-bold text-xl sm:text-2xl text-emerald-700 tabular-nums block mt-1">
              {formatRupiah(data?.summary.verified_revenue || 0)}
            </span>
            <span className="text-[11px] text-brand-muted tabular-nums block mt-1">
              Gross: {formatRupiah(data?.summary.gross_revenue || 0)}
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-bold uppercase text-brand-muted block">
              Perlu Cek Bukti Bayar
            </span>
            <span className="font-display font-bold text-xl sm:text-2xl text-amber-800 tabular-nums block mt-1">
              {data?.summary.pending_payments || 0} Order
            </span>
            <span className="text-[11px] text-brand-muted block mt-1">
              Menunggu validasi QRIS
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-bold uppercase text-brand-muted block">
              Antrean Dapur
            </span>
            <span className="font-display font-bold text-xl sm:text-2xl text-brand-dark tabular-nums block mt-1">
              {(counts.belum_dibuat || 0) + (counts.sedang_dibuat || 0)} Order
            </span>
            <span className="text-[11px] text-brand-orange font-semibold tabular-nums block mt-1">
              Total {data?.summary.total_portions_sold || 0} bowl terjual
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-bold uppercase text-brand-muted block">
              Siap &amp; Selesai
            </span>
            <span className="font-display font-bold text-xl sm:text-2xl text-brand-dark tabular-nums block mt-1">
              {counts.selesai || 0} Selesai
            </span>
            <span className="text-[11px] text-sky-700 font-semibold tabular-nums block mt-1">
              Siap / Diantar: {counts.siap_diantar || 0}
            </span>
          </div>
        </div>

        {/* Grafik Menu */}
        {data && data.menu_breakdown.length > 0 && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display font-bold text-lg text-brand-dark">
                Porsi Terjual per Menu
              </h2>
              <span className="text-xs text-brand-muted">
                Tidak termasuk pesanan dibatalkan
              </span>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={208}>
                <BarChart data={data.menu_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4d2bc" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#14100d" }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#665143" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} Porsi`, "Terjual"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e4d2bc",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="quantity" fill="#ea6c04" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Antrean Pesanan & Validasi Pembayaran + Status */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-border space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block">
                Validasi Pembayaran &amp; Dapur
              </span>
              <h2 className="font-display font-bold text-xl text-brand-dark">
                Daftar Pesanan &amp; Bukti QRIS
              </h2>
            </div>

            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode, nama, hari, WA, atau menu..."
              className="w-full md:w-80 h-11 px-4 rounded-xl border border-brand-border bg-brand-paper text-xs font-semibold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.key === "all"
                  ? data?.orders.length || 0
                  : tab.key === "pending_payment"
                  ? data?.summary.pending_payments || 0
                  : counts[tab.key] || 0;
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`min-h-[38px] px-3.5 rounded-lg border text-xs font-bold whitespace-nowrap cursor-pointer inline-flex items-center gap-2 transition-colors ${
                    active
                      ? "bg-brand-orange text-white border-brand-orange"
                      : "bg-brand-paper text-brand-muted border-brand-border hover:text-brand-dark"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold tabular-nums ${
                      active
                        ? "bg-black/20 text-white"
                        : "bg-white text-brand-dark border border-brand-border"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* MOBILE & TABLET VIEW (< lg) */}
          <div className="lg:hidden divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
            {filteredOrders.map((order: OrderRecord) => {
              const meta =
                ORDER_STATUS_META[order.order_status] ||
                ORDER_STATUS_META.belum_dibuat;
              const payMeta =
                PAYMENT_STATUS_META[order.payment_status] ||
                PAYMENT_STATUS_META.menunggu_validasi;
              const isBusy = updatingOrderNo === order.order_number;
              const waNotifyUrl = buildCustomerNotifyWaUrl(
                order,
                meta.waTemplate(order.customer_name, order.order_number)
              );

              return (
                <div key={order.order_number} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/track?order_number=${encodeURIComponent(
                          order.order_number
                        )}`}
                        className="font-mono font-extrabold text-sm text-brand-dark underline"
                      >
                        {order.order_number}
                      </Link>
                      <p className="text-[11px] font-semibold text-brand-orange">
                        {order.pickup_day}, {order.pickup_slot}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${payMeta.badgeClass}`}
                      >
                        {payMeta.shortLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeClass}`}
                      >
                        {meta.shortLabel}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-brand-dark">
                      {order.customer_name} ({order.customer_whatsapp})
                    </p>
                    <p className="text-brand-muted">
                      {order.delivery_method === "pickup"
                        ? "Ambil di Kampus"
                        : `Diantar: ${order.delivery_address}`}
                    </p>
                  </div>

                  <div className="bg-brand-paper p-3 rounded-lg border border-brand-border text-xs space-y-1">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span className="font-semibold text-brand-dark">
                          {it.quantity}x {it.name}
                          {it.variant ? ` (${it.variant})` : ""}
                        </span>
                        <span className="font-bold tabular-nums shrink-0">
                          {formatRupiah(it.subtotal)}
                        </span>
                      </div>
                    ))}
                    {order.notes && order.notes !== "-" && (
                      <p className="text-[11px] text-brand-muted pt-1 border-t border-brand-border">
                        Catatan: {order.notes}
                      </p>
                    )}
                    <div className="pt-1.5 border-t border-brand-border flex justify-between font-bold text-brand-orange">
                      <span>Total ({order.total_portions} porsi)</span>
                      <span className="tabular-nums">
                        {formatRupiah(order.total_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {order.payment_proof_url && (
                      <button
                        type="button"
                        onClick={() => setProofOrder(order)}
                        className="col-span-2 min-h-[40px] px-3 rounded-lg bg-brand-surface border border-brand-orange text-brand-deep text-xs font-bold cursor-pointer"
                      >
                        Lihat &amp; Validasi Bukti Pembayaran
                      </button>
                    )}

                    {meta.nextStatus && meta.nextActionLabel && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateOrder({
                            orderNumber: order.order_number,
                            orderStatus: meta.nextStatus!,
                            paymentStatus:
                              order.payment_status === "menunggu_validasi"
                                ? "tervalidasi"
                                : undefined,
                            successMessage: `Pesanan ${order.order_number} -> ${
                              ORDER_STATUS_META[meta.nextStatus!].shortLabel
                            }`,
                          })
                        }
                        className="col-span-2 min-h-[42px] px-3 rounded-lg bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        {isBusy ? "Menyimpan..." : meta.nextActionLabel}
                      </button>
                    )}

                    <select
                      aria-label={`Ubah status ${order.order_number}`}
                      disabled={isBusy}
                      value={order.order_status}
                      onChange={(e) =>
                        handleUpdateOrder({
                          orderNumber: order.order_number,
                          orderStatus: e.target.value as OrderStatus,
                          successMessage: `Status ${order.order_number} diperbarui.`,
                        })
                      }
                      className="min-h-[40px] px-2.5 rounded-lg border border-brand-border bg-white text-xs font-bold text-brand-dark"
                    >
                      <option value="belum_dibuat">Belum Dibuat</option>
                      <option value="sedang_dibuat">Sedang Dibuat</option>
                      <option value="siap_diantar">Siap / Diantar</option>
                      <option value="selesai">Sudah Selesai</option>
                      <option value="dibatalkan">Dibatalkan</option>
                    </select>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => triggerPrint(order)}
                        className="flex-1 min-h-[40px] px-2 rounded-lg bg-brand-dark text-white text-xs font-bold cursor-pointer"
                      >
                        Cetak
                      </button>
                      <a
                        href={waNotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-h-[40px] px-2 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center justify-center"
                      >
                        WA
                      </a>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteOrder(order.order_number)}
                        className="min-h-[40px] px-2.5 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-bold cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="p-10 text-center text-xs text-brand-muted">
                Belum ada pesanan yang cocok dengan filter ini.
              </div>
            )}
          </div>

          {/* DESKTOP VIEW (lg+) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted uppercase text-[11px] font-bold">
                  <th className="py-3 px-3">Kode &amp; Pengambilan</th>
                  <th className="py-3 px-3">Pelanggan</th>
                  <th className="py-3 px-3">Pesanan &amp; Catatan</th>
                  <th className="py-3 px-3">Nominal &amp; Bukti QRIS</th>
                  <th className="py-3 px-3">Status &amp; Validasi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredOrders.map((order: OrderRecord) => {
                  const meta =
                    ORDER_STATUS_META[order.order_status] ||
                    ORDER_STATUS_META.belum_dibuat;
                  const payMeta =
                    PAYMENT_STATUS_META[order.payment_status] ||
                    PAYMENT_STATUS_META.menunggu_validasi;
                  const isBusy = updatingOrderNo === order.order_number;
                  const waNotifyUrl = buildCustomerNotifyWaUrl(
                    order,
                    meta.waTemplate(order.customer_name, order.order_number)
                  );

                  return (
                    <tr
                      key={order.order_number}
                      className="hover:bg-brand-paper/60"
                    >
                      <td className="py-4 px-3 align-top space-y-1">
                        <Link
                          href={`/track?order_number=${encodeURIComponent(
                            order.order_number
                          )}`}
                          className="font-mono font-extrabold text-brand-dark hover:text-brand-orange underline"
                        >
                          {order.order_number}
                        </Link>
                        <div className="text-[11px] font-semibold text-brand-orange">
                          {order.pickup_day}, {order.pickup_slot}
                        </div>
                        <div className="text-[10px] text-brand-muted">
                          {order.timestamp}
                        </div>
                      </td>

                      <td className="py-4 px-3 align-top space-y-1">
                        <div className="font-bold text-brand-dark">
                          {order.customer_name}
                        </div>
                        <div className="text-xs font-mono text-brand-muted">
                          {order.customer_whatsapp}
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-paper border border-brand-border text-brand-dark">
                          {order.delivery_method === "pickup"
                            ? "Ambil di Kampus"
                            : "Diantar"}
                        </span>
                        {order.delivery_address &&
                          order.delivery_address !== "-" && (
                            <p className="text-[11px] text-brand-muted max-w-[180px] leading-snug">
                              {order.delivery_address}
                            </p>
                          )}
                      </td>

                      <td className="py-4 px-3 align-top space-y-1.5 min-w-[200px]">
                        {order.items.length > 0 ? (
                          order.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="bg-brand-paper px-2.5 py-1.5 rounded-lg border border-brand-border text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-brand-dark">
                                  {it.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-brand-orange text-white text-[10px] font-extrabold">
                                  x{it.quantity}
                                </span>
                              </div>
                              {(it.variant || it.notes) && (
                                <div className="text-[10px] text-brand-muted mt-0.5">
                                  {[it.variant, it.notes]
                                    .filter(Boolean)
                                    .join(" / ")}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-brand-dark">
                            {order.items_summary}
                          </span>
                        )}
                        {order.notes && order.notes !== "-" && (
                          <p className="text-[11px] text-brand-muted italic">
                            Catatan: {order.notes}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-3 align-top space-y-2 min-w-[160px]">
                        <div>
                          <div className="font-display font-bold text-brand-orange text-base tabular-nums">
                            {formatRupiah(order.total_amount)}
                          </div>
                          <div className="text-[11px] text-brand-muted">
                            {order.total_portions} porsi
                          </div>
                        </div>

                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${payMeta.badgeClass}`}
                        >
                          {payMeta.shortLabel}
                        </span>

                        {order.payment_proof_url && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setProofOrder(order)}
                              className="px-2.5 py-1.5 rounded-lg bg-brand-surface hover:bg-orange-200 border border-brand-orange text-brand-deep text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Lihat Bukti
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-3 align-top space-y-2.5 min-w-[290px]">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${meta.badgeClass}`}
                          >
                            {meta.shortLabel}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {order.payment_status === "menunggu_validasi" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleUpdateOrder({
                                  orderNumber: order.order_number,
                                  paymentStatus: "tervalidasi",
                                  orderStatus:
                                    order.order_status === "belum_dibuat"
                                      ? "sedang_dibuat"
                                      : undefined,
                                  successMessage: `Pembayaran ${order.order_number} tervalidasi.`,
                                })
                              }
                              className="h-9 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              {isBusy ? "Menyimpan..." : "Validasi Bayar"}
                            </button>
                          )}

                          {meta.nextStatus && meta.nextActionLabel && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleUpdateOrder({
                                  orderNumber: order.order_number,
                                  orderStatus: meta.nextStatus!,
                                  successMessage: `Pesanan ${order.order_number} -> ${
                                    ORDER_STATUS_META[meta.nextStatus!].shortLabel
                                  }`,
                                })
                              }
                              className="h-9 px-3 rounded-lg bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              {isBusy ? "Menyimpan..." : meta.nextActionLabel}
                            </button>
                          )}

                          <select
                            aria-label={`Ubah status ${order.order_number}`}
                            disabled={isBusy}
                            value={order.order_status}
                            onChange={(e) =>
                              handleUpdateOrder({
                                orderNumber: order.order_number,
                                orderStatus: e.target.value as OrderStatus,
                                successMessage: `Status ${order.order_number} diperbarui.`,
                              })
                            }
                            className="h-9 px-2.5 rounded-lg border border-brand-border bg-white text-xs font-bold text-brand-dark cursor-pointer"
                          >
                            <option value="belum_dibuat">Belum Dibuat</option>
                            <option value="sedang_dibuat">Sedang Dibuat</option>
                            <option value="siap_diantar">Siap / Diantar</option>
                            <option value="selesai">Sudah Selesai</option>
                            <option value="dibatalkan">Dibatalkan</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => triggerPrint(order)}
                            className="h-9 px-2.5 rounded-lg bg-brand-dark hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors"
                          >
                            Cetak
                          </button>

                          <a
                            href={waNotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center transition-colors"
                          >
                            WA
                          </a>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteOrder(order.order_number)}
                            className="h-9 px-2.5 rounded-lg bg-zinc-100 hover:bg-red-100 text-zinc-700 hover:text-red-700 text-xs font-bold cursor-pointer transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-sm text-brand-muted"
                    >
                      Belum ada pesanan yang cocok dengan filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
