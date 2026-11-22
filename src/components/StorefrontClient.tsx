"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCartUi } from "@/components/CartUiContext";
import { MenuHighlightStage } from "@/components/MenuHighlightStage";
import {
  DEFAULT_QUOTAS,
  DEFAULT_TOTAL_QUOTA,
  MENU_PRODUCTS,
  STORE_CONFIG,
} from "@/config/store";
import {
  buildWhatsAppOrderUrl,
  formatRupiah,
  generateOrderNumber,
} from "@/lib/format";
import type {
  DeliveryMethod,
  OrderItem,
  PublicQuotaResponse,
  StoreQuotaConfig,
} from "@/types/order";

interface CartEntry {
  qty: number;
  variant: string;
  notes: string;
}

export function StorefrontClient() {
  const router = useRouter();
  const { cartOpen, setCartOpen, syncCartSummary } = useCartUi();

  const [highlightedProductId, setHighlightedProductId] = useState(
    MENU_PRODUCTS[0].id
  );
  const [editionFilter, setEditionFilter] = useState<
    "ALL" | "GERAH" | "ORIGINAL"
  >("ALL");

  const [totalSold, setTotalSold] = useState(0);
  const [storeConfig, setStoreConfig] = useState<StoreQuotaConfig>({
    store_open: true,
    quotas: { ...DEFAULT_QUOTAS },
  });

  const [cart, setCart] = useState<Record<string, CartEntry>>(() => {
    const initial: Record<string, CartEntry> = {};
    MENU_PRODUCTS.forEach((p) => {
      initial[p.id] = { qty: 0, variant: p.variants[0] || "", notes: "" };
    });
    return initial;
  });

  // Catatan bebas langsung di sidebar keranjang & dibawa sampai ke checkout/WA/Excel
  const [orderNotes, setOrderNotes] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupDay] = useState(STORE_CONFIG.pickupDays[0]);
  const [paymentProofDataUrl, setPaymentProofDataUrl] = useState("");
  const [paymentProofName, setPaymentProofName] = useState("");
  const [compressingProof, setCompressingProof] = useState(false);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState("");
  const [lastOrder, setLastOrder] = useState<{
    orderNumber: string;
    waUrl: string;
  } | null>(null);

  const clearPaymentProof = () => {
    setPaymentProofDataUrl("");
    setPaymentProofName("");
    if (proofInputRef.current) {
      proofInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!drawerOpen && !cartOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (drawerOpen && !submitting) {
          setDrawerOpen(false);
        } else if (cartOpen) {
          setCartOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, cartOpen, submitting, setCartOpen]);

  const handlePaymentProofChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("File bukti pembayaran harus berupa gambar (JPG / PNG / WebP).");
      return;
    }

    setErrorMsg("");
    setCompressingProof(true);
    setPaymentProofName(file.name);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error("Gambar tidak dapat diproses."));
          img.onload = () => {
            const maxDim = 960;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              const ratio = Math.min(maxDim / w, maxDim / h);
              w = Math.round(w * ratio);
              h = Math.round(h * ratio);
            }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(String(reader.result));
              return;
            }
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.78));
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });

      setPaymentProofDataUrl(dataUrl);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memproses bukti pembayaran."
      );
      setPaymentProofDataUrl("");
      setPaymentProofName("");
    } finally {
      setCompressingProof(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? "" : prev));
    }, 2600);
  };

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data: PublicQuotaResponse) => {
        if (data.ok) {
          setTotalSold(Number(data.total_sold) || 0);
          if (data.store_config) {
            setStoreConfig({
              store_open: data.store_config.store_open !== false,
              quotas: { ...DEFAULT_QUOTAS, ...(data.store_config.quotas || {}) },
            });
          }
        }
      })
      .catch(() => {
        // fallback ke kuota default
      });
  }, []);

  const visibleProducts = useMemo(() => {
    if (editionFilter === "ALL") return MENU_PRODUCTS;
    return MENU_PRODUCTS.filter((p) => p.edition === editionFilter);
  }, [editionFilter]);

  const cartItems = useMemo(() => {
    return MENU_PRODUCTS.filter((p) => (cart[p.id]?.qty || 0) > 0).map((p) => ({
      product: p,
      entry: cart[p.id],
      subtotal: cart[p.id].qty * p.price,
    }));
  }, [cart]);

  const totalPortions = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.entry.qty, 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    [cartItems]
  );

  useEffect(() => {
    syncCartSummary(totalPortions, totalPrice);
  }, [totalPortions, totalPrice, syncCartSummary]);

  // Stok global keseluruhan PO (default 25 porsi, bebas campur semua menu)
  const maxTotalQuota = storeConfig.quotas.total ?? DEFAULT_TOTAL_QUOTA;
  const remainingBeforeCart = Math.max(0, maxTotalQuota - totalSold);
  const availableLeft = Math.max(0, remainingBeforeCart - totalPortions);

  const updateQty = (productId: string, delta: number) => {
    const product = MENU_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    if (!storeConfig.store_open) {
      showToast("Pre Order sedang ditutup sementara.");
      return;
    }

    setCart((prev) => {
      const cur = prev[productId] || {
        qty: 0,
        variant: product.variants[0] || "",
        notes: "",
      };
      const otherItemsQty = MENU_PRODUCTS.filter(
        (p) => p.id !== productId
      ).reduce((sum, p) => sum + (prev[p.id]?.qty || 0), 0);
      const maxForItem = Math.max(0, remainingBeforeCart - otherItemsQty);
      const nextQty = Math.max(0, Math.min(maxForItem, cur.qty + delta));

      if (delta > 0 && nextQty === cur.qty) {
        showToast(
          `Kuota Pre Order (${maxTotalQuota} porsi semua menu) sudah penuh.`
        );
      } else if (delta > 0 && nextQty > cur.qty) {
        showToast(`${product.name} (+${nextQty - cur.qty}) masuk keranjang`);
      }
      return {
        ...prev,
        [productId]: { ...cur, qty: nextQty },
      };
    });
  };

  const handleCheckout = async () => {
    setErrorMsg("");
    if (!storeConfig.store_open) {
      setErrorMsg("Pre Order saat ini sedang ditutup.");
      return;
    }
    if (!customerName.trim() || !customerWhatsapp.trim()) {
      setErrorMsg("Mohon isi Nama Lengkap dan Nomor WhatsApp terlebih dahulu.");
      return;
    }
    const waDigits = customerWhatsapp.replace(/[^0-9]/g, "");
    if (waDigits.length < 9 || waDigits.length > 15) {
      setErrorMsg("Nomor WhatsApp tidak valid. Masukkan minimal 9 digit angka (contoh: 082190437013).");
      return;
    }
    if (deliveryMethod === "delivery" && !deliveryAddress.trim()) {
      setErrorMsg("Mohon isi Alamat Pengiriman atau Titik Temu.");
      return;
    }
    if (!paymentProofDataUrl) {
      setErrorMsg(
        "Mohon bayar lewat QRIS dan upload bukti pembayaran terlebih dahulu sebelum mengirim pesanan."
      );
      return;
    }

    const selectedItems: OrderItem[] = cartItems.map(({ product, entry }) => ({
      product_id: product.id,
      name: product.name,
      variant: entry.variant,
      quantity: entry.qty,
      unit_price: product.price,
      subtotal: entry.qty * product.price,
      notes: entry.notes.trim() || undefined,
    }));

    if (selectedItems.length === 0) {
      setErrorMsg("Keranjang masih kosong.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_day: pickupDay,
          pickup_slot: "-",
          customer_name: customerName.trim(),
          customer_whatsapp: customerWhatsapp.trim(),
          delivery_method: deliveryMethod,
          delivery_address:
            deliveryMethod === "delivery" ? deliveryAddress.trim() : "-",
          items: selectedItems,
          total_portions: totalPortions,
          total_amount: totalPrice,
          payment_proof_base64: paymentProofDataUrl,
          notes: orderNotes.trim() || "-",
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.ok) {
        throw new Error(result.error || "Gagal menyimpan pesanan");
      }

      const orderNumber: string =
        result.order?.order_number || generateOrderNumber();

      setTotalSold((prev) => prev + totalPortions);

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const trackUrl = origin
        ? `${origin}/track?order_number=${encodeURIComponent(orderNumber)}`
        : undefined;

      const waUrl = buildWhatsAppOrderUrl({
        orderNumber,
        customerName: customerName.trim(),
        customerWhatsapp: customerWhatsapp.trim(),
        pickupDay,
        pickupSlot: "-",
        deliveryMethod,
        deliveryAddress: deliveryAddress.trim(),
        items: selectedItems,
        totalAmount: totalPrice,
        orderNotes: orderNotes.trim(),
        trackUrl,
      });

      try {
        sessionStorage.setItem(`lichick_wa_url_${orderNumber}`, waUrl);
      } catch {
        // Abaikan jika browser memblokir storage
      }

      setLastOrder({ orderNumber, waUrl });

      setCart((prev) => {
        const reset: Record<string, CartEntry> = {};
        Object.keys(prev).forEach((k) => {
          reset[k] = { ...prev[k], qty: 0, notes: "" };
        });
        return reset;
      });
      setOrderNotes("");
      clearPaymentProof();
      setDrawerOpen(false);
      setCartOpen(false);

      showToast(`Pesanan ${orderNumber} tercatat. Membuka halaman status pesanan.`);
      window.open(waUrl, "_blank", "noopener,noreferrer");
      router.push(
        `/track?order_number=${encodeURIComponent(orderNumber)}&ordered=1`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses pesanan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-14">
      {toast && (
        <div
          role="status"
          className="fixed top-20 right-4 sm:right-8 z-50 bg-brand-dark text-white px-4 py-3 rounded-xl border border-brand-charcoal text-xs font-semibold shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* 1. FULL-STAGE MENU HIGHLIGHT SHOWCASE */}
      <MenuHighlightStage
        activeProductId={highlightedProductId}
        onSelectProduct={setHighlightedProductId}
        onQuickAdd={(id) => updateQty(id, 1)}
        storeOpen={storeConfig.store_open}
        activeProductRemaining={availableLeft}
        activeProductMax={maxTotalQuota}
      />

      {/* 2. KATALOG MENU (KIRI) + LIVE SIDEBAR KERANJANG PESANAN (KANAN) */}
      <section id="katalog-menu" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-brand-border pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block">
              Menu Resmi LiChick
            </span>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-brand-dark">
              Friesmoy &amp; Macmoy
            </h2>
          </div>

          <div className="inline-flex items-center border border-brand-border rounded-xl bg-white p-1 self-start sm:self-auto">
            {(
              [
                { key: "ALL", label: "Semua (4)" },
                { key: "GERAH", label: "GERAH" },
                { key: "ORIGINAL", label: "Original" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setEditionFilter(tab.key)}
                className={`min-h-[38px] px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  editionFilter === tab.key
                    ? tab.key === "GERAH"
                      ? "bg-brand-dark text-red-400"
                      : "bg-brand-orange text-white"
                    : "text-brand-muted hover:text-brand-dark"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-brand-border px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="font-bold text-brand-dark">
            Hari Pengambilan:{" "}
            <span className="text-brand-orange">{pickupDay}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold text-brand-muted tabular-nums">
            <span>
              Sisa Kuota PO (Semua Menu):{" "}
              <strong className="text-brand-dark">
                {availableLeft}/{maxTotalQuota} Porsi
              </strong>
            </span>
            {totalPortions > 0 && (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="text-brand-orange font-bold underline cursor-pointer"
              >
                Lihat Keranjang ({totalPortions} Porsi)
              </button>
            )}
          </div>
        </div>

        {/* DAFTAR MENU LEBAR PENUH (TANPA TERPOTONG SIDEBAR KERANJANG) */}
        <div className="divide-y divide-brand-border bg-white rounded-2xl border border-brand-border overflow-hidden">
          {visibleProducts.map((product) => {
            const entry = cart[product.id] || {
              qty: 0,
              variant: product.variants[0] || "",
              notes: "",
            };

            return (
              <article
                key={product.id}
                className="grid grid-cols-1 md:grid-cols-12 items-stretch"
              >
                {/* Panel Foto Produk */}
                <div className="md:col-span-4 lg:col-span-4 bg-lichick-poster p-4 sm:p-5 flex flex-col items-center justify-between gap-2">
                  <div className="w-full flex items-center justify-start">
                    <span className="price-splat font-display font-bold text-white text-sm px-3.5 py-1.5">
                      {product.priceShort}
                    </span>
                  </div>

                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-[145px] sm:h-[160px] w-auto object-contain my-1"
                  />

                  <div className="w-full flex items-center justify-between text-[11px] font-bold text-orange-100">
                    <span>{product.badge}</span>
                    <span className="tabular-nums">
                      {availableLeft > 0
                        ? `Sisa PO ${availableLeft}/${maxTotalQuota}`
                        : "Kuota PO Penuh"}
                    </span>
                  </div>
                </div>

                {/* Detail Menu & Kontrol Jumlah */}
                <div className="md:col-span-8 lg:col-span-8 p-5 sm:p-6 flex flex-col justify-center gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-display font-bold text-xl sm:text-2xl text-brand-dark">
                            {product.baseTitle}
                          </h3>
                          {product.edition === "GERAH" ? (
                            <span className="gerah-splat font-gerah text-brand-gerah text-xs px-3 py-0.5 tracking-wider">
                              GERAH
                            </span>
                          ) : (
                            <span className="original-splat font-gerah text-brand-amber text-xs px-3 py-0.5 tracking-wider">
                              ORIGINAL
                            </span>
                          )}
                        </div>
                          <p className="text-xs font-semibold text-brand-orange mt-0.5">
                            {product.tagline}
                          </p>
                        </div>

                        <span className="font-display font-bold text-xl text-brand-dark tabular-nums shrink-0">
                          {formatRupiah(product.price)}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-3.5 border-t border-brand-border">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] text-brand-muted block">
                            Subtotal
                          </span>
                          <span className="font-display font-bold text-lg text-brand-dark tabular-nums">
                            {formatRupiah(
                              entry.qty > 0
                                ? entry.qty * product.price
                                : product.price
                            )}
                          </span>
                        </div>

                        {entry.qty === 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!storeConfig.store_open || availableLeft < 2}
                              onClick={() => updateQty(product.id, 2)}
                              className="min-h-[42px] px-3 rounded-xl font-bold text-xs text-brand-orange bg-brand-surface hover:bg-orange-200 border border-brand-border disabled:opacity-40 cursor-pointer transition-colors"
                            >
                              +2
                            </button>
                            <button
                              type="button"
                              disabled={!storeConfig.store_open || availableLeft <= 0}
                              onClick={() => updateQty(product.id, 1)}
                              className="min-h-[42px] px-5 rounded-xl font-display font-bold text-sm text-white bg-brand-orange hover:bg-brand-orange-hover disabled:bg-zinc-300 cursor-pointer transition-colors"
                            >
                              {!storeConfig.store_open
                                ? "Tutup"
                                : availableLeft > 0
                                ? "+ Tambah"
                                : "Habis"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-brand-surface border border-brand-orange rounded-xl p-1">
                            <button
                              type="button"
                              aria-label={`Kurangi ${product.name}`}
                              onClick={() => updateQty(product.id, -1)}
                              className="size-9 rounded-lg bg-white hover:bg-brand-paper text-brand-dark font-bold text-base cursor-pointer transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-display font-bold text-base text-brand-dark tabular-nums">
                              {entry.qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Tambah ${product.name}`}
                              disabled={availableLeft <= 0}
                              onClick={() => updateQty(product.id, 1)}
                              className="size-9 rounded-lg bg-brand-orange hover:bg-brand-orange-hover disabled:bg-zinc-300 text-white font-bold text-base cursor-pointer transition-colors"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>

                      {entry.qty > 0 && (
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(e) =>
                            setCart((prev) => ({
                              ...prev,
                              [product.id]: { ...entry, notes: e.target.value },
                            }))
                          }
                          placeholder="Catatan khusus menu ini (opsional)"
                          className="w-full h-10 px-3 rounded-lg bg-brand-paper border border-brand-border text-xs text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange"
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      {/* 3. PANEL SLIDE-OVER KERANJANG PESANAN (MUNCUL ~SEPEREMPAT LAYAR DARI KANAN VIA TOMBOL NAVBAR) */}
      <div
        aria-hidden={!cartOpen}
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          cartOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop solid gelap matte (tanpa backdrop-blur) */}
        <div
          onClick={() => setCartOpen(false)}
          className="absolute inset-0 bg-black/50"
        />

        {/* Drawer kanan ~seperempat layar (max 380px di desktop, penuh di HP) */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Keranjang Pesanan"
          className={`absolute inset-y-0 right-0 w-full max-w-[380px] bg-white border-l border-brand-border flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            cartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="px-5 py-4 bg-brand-dark text-white flex items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-brand-amber font-bold block">
                Ringkasan Pesanan
              </span>
              <h3 className="font-display font-bold text-lg leading-tight">
                Keranjang ({totalPortions} Item)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="min-h-[38px] px-3 rounded-lg bg-brand-charcoal hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center space-y-3 border border-dashed border-brand-border rounded-xl px-5 bg-brand-paper">
                <p className="font-display font-bold text-base text-brand-dark">
                  Keranjang Masih Kosong
                </p>
                <p className="text-xs text-brand-muted leading-relaxed">
                  Pilih Friesmoy atau Macmoy di daftar menu untuk mulai menyusun
                  pesananmu.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    document
                      .getElementById("katalog-menu")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="min-h-[40px] px-4 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Pilih Menu Sekarang
                </button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-brand-border">
                  {cartItems.map(({ product, entry, subtotal }) => (
                    <div
                      key={product.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3"
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="size-14 rounded-lg bg-brand-surface p-1 object-contain shrink-0 border border-brand-border"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-brand-dark leading-snug">
                            {product.name}
                          </span>
                          <span className="font-bold text-xs text-brand-orange tabular-nums shrink-0">
                            {formatRupiah(subtotal)}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-[11px] text-brand-muted leading-tight">
                            {entry.notes}
                          </p>
                        )}

                        {/* Kontrol tambah / kurang langsung di drawer keranjang */}
                        <div className="flex items-center justify-between pt-1.5">
                          <div className="inline-flex items-center gap-1 bg-brand-paper border border-brand-border rounded-lg p-0.5">
                            <button
                              type="button"
                              aria-label={`Kurangi ${product.name} dari keranjang`}
                              onClick={() => updateQty(product.id, -1)}
                              className="size-8 rounded bg-white hover:bg-brand-surface text-brand-dark font-bold text-sm cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-7 text-center font-bold text-xs text-brand-dark tabular-nums">
                              {entry.qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Tambah ${product.name} di keranjang`}
                              disabled={availableLeft <= 0}
                              onClick={() => updateQty(product.id, 1)}
                              className="size-8 rounded bg-brand-orange hover:bg-brand-orange-hover disabled:bg-zinc-300 text-white font-bold text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateQty(product.id, -entry.qty)}
                            className="text-[11px] font-semibold text-brand-muted hover:text-red-700 cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Catatan Bebas Langsung di Drawer */}
                <div className="pt-4 border-t border-brand-border space-y-1.5">
                  <label
                    htmlFor="drawer-order-notes"
                    className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted"
                  >
                    Catatan Bebas (Opsional)
                  </label>
                  <textarea
                    id="drawer-order-notes"
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Contoh: minta sendok 2, saus dipisah semua, titip di satpam..."
                    className="w-full p-2.5 rounded-lg bg-brand-paper border border-brand-border text-xs text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Tetap: Total Harga + Tombol Checkout */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-brand-border bg-brand-paper space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs text-brand-muted">
                <span>Pengambilan</span>
                <strong className="text-brand-dark">{pickupDay}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-muted">
                  Total Harga ({totalPortions} Porsi)
                </span>
                <span className="font-display font-bold text-2xl text-brand-orange tabular-nums">
                  {formatRupiah(totalPrice)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  setErrorMsg("");
                  setLastOrder(null);
                  setDrawerOpen(true);
                }}
                className="w-full min-h-[48px] px-5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-sm sm:text-base cursor-pointer transition-colors"
              >
                Checkout Pesanan
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* 4. CHECKOUT MODAL (RINCIAN + GAMBAR + QRIS + HARI & JAM + WHATSAPP) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            if (!submitting) setDrawerOpen(false);
          }}
        >
          <div
            className="bg-white w-full max-w-xl rounded-t-2xl sm:rounded-2xl border border-brand-border overflow-hidden max-h-[92dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4 bg-brand-dark text-white flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-amber font-bold block">
                  Konfirmasi Pesanan LiChick
                </span>
                <h3 className="font-display font-bold text-lg">
                  {lastOrder && cartItems.length === 0
                    ? "Pesanan Berhasil Tercatat"
                    : "Checkout & Kirim WhatsApp"}
                </h3>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setDrawerOpen(false)}
                className="min-h-[40px] px-3 rounded-lg bg-brand-charcoal hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {lastOrder && cartItems.length === 0 ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-300 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
                      Bukti Pembayaran &amp; Pesanan Diterima
                    </span>
                    <span className="font-mono font-extrabold text-base bg-white px-3 py-1 rounded-lg border border-emerald-200 text-brand-dark">
                      {lastOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                    Pesanan dan foto bukti QRIS kamu sudah masuk ke daftar admin
                    dan Google Sheets. Jika WhatsApp belum terbuka otomatis di
                    perangkatmu, klik tombol di bawah untuk mengirim konfirmasi:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href={lastOrder.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center transition-colors"
                    >
                      Buka WhatsApp ({STORE_CONFIG.adminWhatsAppDisplay})
                    </a>
                    <Link
                      href={`/track?order_number=${encodeURIComponent(
                        lastOrder.orderNumber
                      )}`}
                      onClick={() => setDrawerOpen(false)}
                      className="min-h-[44px] px-4 rounded-xl bg-brand-dark hover:bg-black text-white text-xs sm:text-sm font-bold flex items-center justify-center transition-colors"
                    >
                      Lacak Status Pesanan
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLastOrder(null);
                      setDrawerOpen(false);
                    }}
                    className="w-full min-h-[42px] px-4 rounded-xl bg-white border border-emerald-300 hover:border-brand-orange text-brand-dark text-xs font-bold cursor-pointer transition-colors"
                  >
                    Tutup &amp; Pesan Menu Lagi
                  </button>
                </div>
              ) : (
                <>
              {/* Rincian Pesanan DENGAN GAMBAR PRODUK (Tanpa teks Batch) */}
              {cartItems.length > 0 && (
                <div className="bg-brand-paper border border-brand-border rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-muted block">
                    Rincian Pesanan
                  </span>

                  <div className="divide-y divide-brand-border">
                    {cartItems.map(({ product, entry, subtotal }) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="size-14 rounded-lg bg-brand-surface p-1 object-contain border border-brand-border shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-brand-dark block truncate">
                              {product.name}{" "}
                              <span className="text-brand-orange">
                                x{entry.qty}
                              </span>
                            </span>
                            {entry.notes && (
                              <p className="text-[11px] text-brand-muted">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-sm text-brand-dark tabular-nums shrink-0">
                          {formatRupiah(subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {orderNotes.trim() && (
                    <div className="pt-2 border-t border-brand-border text-xs text-brand-muted">
                      <strong className="text-brand-dark">Catatan:</strong>{" "}
                      {orderNotes.trim()}
                    </div>
                  )}

                  <div className="pt-3 border-t border-brand-border flex items-center justify-between">
                    <span className="font-bold text-sm text-brand-dark">
                      Total Pembayaran
                    </span>
                    <span className="font-display font-bold text-2xl text-brand-orange tabular-nums">
                      {formatRupiah(totalPrice)}
                    </span>
                  </div>
                </div>
              )}

              {/* Data Pelanggan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Farhan Rayhan"
                    className="w-full h-11 px-3.5 rounded-lg border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">
                    Nomor WhatsApp Aktif *
                  </label>
                  <input
                    type="tel"
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    placeholder="Contoh: 082190437013"
                    className="w-full h-11 px-3.5 rounded-lg border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>
              </div>

              {/* Metode Pengambilan: Ambil di Kampus / Diantar */}
              <div>
                <span className="block text-xs font-bold text-brand-dark mb-1">
                  Metode Pengambilan *
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(["pickup", "delivery"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDeliveryMethod(m)}
                      className={`h-11 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                        deliveryMethod === m
                          ? "border-brand-orange bg-brand-surface text-brand-deep"
                          : "border-brand-border text-brand-muted bg-white"
                      }`}
                    >
                      {m === "pickup" ? "Ambil di Kampus" : "Diantar"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hari Pengambilan (Fixed: Senin, 30 November) */}
              <div>
                <span className="block text-xs font-bold text-brand-dark mb-1">
                  Hari Pengambilan
                </span>
                <div className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-brand-orange bg-brand-surface text-sm font-bold text-brand-deep flex items-center justify-between gap-2">
                  <span>{pickupDay}</span>
                  <span className="text-[11px] font-semibold text-brand-muted">
                    Jadwal Resmi PO
                  </span>
                </div>
              </div>

              {deliveryMethod === "delivery" && (
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">
                    Alamat Pengiriman / Titik Temu *
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Contoh: Lobby Gedung Utama / Kos Melati No. 14"
                    className="w-full p-3 rounded-lg border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>
              )}

              {/* Catatan Bebas (tersinkron dengan Sidebar Kanan) */}
              <div>
                <label className="block text-xs font-bold text-brand-dark mb-1">
                  Catatan Bebas (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk pesanan ini..."
                  className="w-full p-3 rounded-lg border border-brand-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              {/* Pembayaran QRIS Resmi + Upload Bukti Pembayaran Wajib */}
              <div className="p-4 rounded-xl bg-brand-surface border border-brand-border space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-deep block">
                      Pembayaran {STORE_CONFIG.paymentInfo.label}
                    </span>
                    <strong className="text-sm text-brand-dark block">
                      {STORE_CONFIG.paymentInfo.merchantName}
                    </strong>
                    <span className="text-[11px] font-mono text-brand-muted block">
                      NMID: {STORE_CONFIG.paymentInfo.nmid}
                    </span>
                  </div>
                  <a
                    href={STORE_CONFIG.paymentInfo.qrisImageUrl}
                    download="QRIS-LiChick-by-Lucuih.jpg"
                    className="min-h-[38px] px-3.5 rounded-lg bg-brand-dark hover:bg-black text-white text-xs font-bold inline-flex items-center shrink-0 transition-colors"
                  >
                    Unduh QRIS
                  </a>
                </div>

                <div className="bg-white p-3 rounded-xl border border-brand-border flex flex-col items-center gap-2">
                  <img
                    src={STORE_CONFIG.paymentInfo.qrisImageUrl}
                    alt={`QRIS ${STORE_CONFIG.paymentInfo.merchantName}`}
                    className="w-56 sm:w-64 h-auto object-contain rounded-lg"
                  />
                  <p className="text-[11px] text-center text-brand-muted">
                    Scan QRIS sebesar{" "}
                    <strong className="text-brand-dark">
                      {formatRupiah(totalPrice)}
                    </strong>{" "}
                    a.n.{" "}
                    <strong className="text-brand-dark">
                      {STORE_CONFIG.paymentInfo.merchantName}
                    </strong>
                    . Mendukung {STORE_CONFIG.paymentInfo.supportedApps}.
                  </p>
                </div>

                {/* Upload Bukti Pembayaran (Wajib untuk Validasi Admin) */}
                <div className="bg-white p-3.5 rounded-xl border border-brand-border space-y-2.5">
                  <label
                    htmlFor="payment-proof-input"
                    className="block text-xs font-bold text-brand-dark"
                  >
                    Upload Bukti Pembayaran QRIS *
                  </label>
                  <p className="text-[11px] text-brand-muted leading-snug">
                    Upload screenshot bukti transfer berhasil agar admin bisa
                    langsung memvalidasi pembayaranmu.
                  </p>

                  <input
                    ref={proofInputRef}
                    id="payment-proof-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePaymentProofChange}
                    className="w-full text-xs text-brand-dark file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-dark file:text-white hover:file:bg-black cursor-pointer"
                  />

                  {compressingProof && (
                    <p className="text-xs font-semibold text-brand-orange">
                      Memproses gambar bukti pembayaran...
                    </p>
                  )}

                  {paymentProofDataUrl && !compressingProof && (
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={paymentProofDataUrl}
                          alt="Preview Bukti Pembayaran"
                          className="size-14 rounded-md object-cover border border-emerald-300 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-emerald-900 block">
                            Bukti pembayaran siap dikirim
                          </span>
                          <span className="text-[11px] text-emerald-800 block truncate">
                            {paymentProofName}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearPaymentProof}
                        className="text-xs font-bold text-red-700 hover:underline shrink-0 cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                  {errorMsg}
                </div>
              )}

              {cartItems.length > 0 && (
                <button
                  type="button"
                  disabled={submitting || compressingProof}
                  onClick={handleCheckout}
                  className="w-full min-h-[50px] px-5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-60 text-white font-display font-bold text-sm sm:text-base cursor-pointer transition-colors"
                >
                  {compressingProof
                    ? "Memproses Gambar..."
                    : submitting
                    ? "Mencatat Pesanan..."
                    : `Konfirmasi Pesanan ke WhatsApp (${STORE_CONFIG.adminWhatsAppDisplay})`}
                </button>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
