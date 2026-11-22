"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MENU_PRODUCTS, STORE_CONFIG } from "@/config/store";
import { formatRupiah } from "@/lib/format";

const STAGE_THEMES: Record<
  string,
  {
    bg: string;
    stripBg: string;
    accentText: string;
    wordmark: string;
  }
> = {
  "friesmoy-gerah": {
    bg: "#c94304",
    stripBg: "#9e3100",
    accentText: "#ffe5c2",
    wordmark: "FRIESMOY",
  },
  "macmoy-gerah": {
    bg: "#ad2608",
    stripBg: "#821a03",
    accentText: "#ffd9cc",
    wordmark: "MACMOY",
  },
  "friesmoy-original": {
    bg: "#dd6f04",
    stripBg: "#ad5300",
    accentText: "#fff0cf",
    wordmark: "FRIESMOY",
  },
  "macmoy-original": {
    bg: "#cc7a04",
    stripBg: "#995900",
    accentText: "#fff2cc",
    wordmark: "MACMOY",
  },
};

interface MenuHighlightStageProps {
  activeProductId: string;
  onSelectProduct: (productId: string) => void;
  onQuickAdd: (productId: string) => void;
  storeOpen: boolean;
  activeProductRemaining: number;
  activeProductMax: number;
}

export function MenuHighlightStage({
  activeProductId,
  onSelectProduct,
  onQuickAdd,
  storeOpen,
  activeProductRemaining,
  activeProductMax,
}: MenuHighlightStageProps) {
  const count = MENU_PRODUCTS.length;
  const activeIndex = Math.max(
    0,
    MENU_PRODUCTS.findIndex((p) => p.id === activeProductId)
  );
  const activeProduct = MENU_PRODUCTS[activeIndex] || MENU_PRODUCTS[0];
  const theme =
    STAGE_THEMES[activeProduct.id] || STAGE_THEMES["friesmoy-gerah"];

  // Animasi tangan menunduk & mengangkat kembali setiap kali ganti menu
  const [handDipDir, setHandDipDir] = useState<-1 | 0 | 1>(0);
  const dipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Interaksi swipe / drag horizontal langsung di stage (touch HP/iPad & mouse Desktop)
  const dragStartRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Subtle scroll-linked parallax depth (tanpa hover)
  const stageRef = useRef<HTMLElement | null>(null);
  const [scrollShift, setScrollShift] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, -rect.top / Math.max(1, rect.height)));
      setScrollShift(progress * 26);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const triggerHandPresent = useCallback((dir: -1 | 1) => {
    setHandDipDir(dir);
    if (dipTimerRef.current) clearTimeout(dipTimerRef.current);
    dipTimerRef.current = setTimeout(() => {
      setHandDipDir(0);
    }, 240);
  }, []);

  useEffect(() => {
    return () => {
      if (dipTimerRef.current) clearTimeout(dipTimerRef.current);
    };
  }, []);

  const goToIndex = useCallback(
    (nextIdx: number, dir: -1 | 1) => {
      const wrapped = ((nextIdx % count) + count) % count;
      const target = MENU_PRODUCTS[wrapped];
      if (!target) return;
      triggerHandPresent(dir);
      onSelectProduct(target.id);
    },
    [count, onSelectProduct, triggerHandPresent]
  );

  const handleNext = useCallback(() => {
    goToIndex(activeIndex + 1, 1);
  }, [activeIndex, goToIndex]);

  const handlePrev = useCallback(() => {
    goToIndex(activeIndex - 1, -1);
  }, [activeIndex, goToIndex]);

  // Keyboard kiri / kanan untuk desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, active: true };
    setIsDragging(true);
    setDragX(0);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current.active) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    // Jika gerakan lebih vertikal di HP/iPad, biarkan halaman scroll normal
    if (Math.abs(dy) > Math.abs(dx) + 12 && Math.abs(dx) < 20) {
      dragStartRef.current.active = false;
      setIsDragging(false);
      setDragX(0);
      return;
    }
    setDragX(Math.max(-160, Math.min(160, dx)));
  };

  const finishDrag = () => {
    if (!dragStartRef.current.active) return;
    dragStartRef.current.active = false;
    setIsDragging(false);
    if (dragX <= -55) {
      handleNext();
    } else if (dragX >= 55) {
      handlePrev();
    }
    setDragX(0);
  };

  // Hitung offset melingkar (-1 = kiri, 0 = tengah aktif, +1 = kanan, 2 = belakang)
  const getRelativeOffset = (idx: number) => {
    let diff = idx - activeIndex;
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;
    return diff;
  };

  const handTransform =
    handDipDir !== 0
      ? `translateX(calc(-50% + ${handDipDir * -10}px)) translateY(20px) rotate(${
          handDipDir * -3
        }deg)`
      : `translateX(calc(-50% + ${dragX * 0.16}px)) translateY(${
          Math.abs(dragX) * 0.05
        }px) rotate(${dragX * 0.035}deg)`;

  return (
    <section
      ref={stageRef}
      id="highlight-menu"
      aria-label="Sorotan Menu LiChick"
      className="rounded-3xl overflow-hidden border border-black/15 text-white transition-colors duration-500 ease-out"
      style={{ backgroundColor: theme.bg }}
    >
      {/* Top Bar: Logo Tab Putih ala Poster + Indikator Urutan + Badge Harga & Edisi */}
      <div className="px-4 sm:px-7 pt-4 sm:pt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-1.5 rounded-xl">
            <img
              src={STORE_CONFIG.logoUrl}
              alt="LiChick by LUCUIH"
              className="h-6 sm:h-7 w-auto object-contain"
            />
          </div>
          <div className="text-xs leading-tight">
            <span className="font-display font-bold uppercase tracking-wider block text-white">
              OPEN PRE ORDER
            </span>
            <span className="text-[11px] font-semibold" style={{ color: theme.accentText }}>
              0{activeIndex + 1} / 0{count} Menu Sorotan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeProduct.edition === "GERAH" ? (
            <span className="gerah-splat font-gerah text-brand-gerah text-sm sm:text-base px-4 py-1 tracking-wider">
              GERAH
            </span>
          ) : (
            <span className="font-display font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg bg-white text-brand-dark uppercase tracking-wide">
              Original
            </span>
          )}
          <span className="price-splat font-display font-bold text-white text-sm sm:text-base px-4 py-1.5">
            {activeProduct.priceShort}
          </span>
        </div>
      </div>

      {/* STAGE UTAMA ALA VIDEO REFERENSI: TEKS RAKSASA DI BELAKANG + MANGKUK ASLI DI ATAS TANGAN STUDIO */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={finishDrag}
        className="relative w-full h-[390px] sm:h-[470px] lg:h-[520px] overflow-hidden select-none touch-pan-y cursor-grab active:cursor-grabbing"
      >
        {/* LAYER 1: GIANT FULL-WIDTH DISPLAY TYPOGRAPHY DI BELAKANG BOWL (PERSIS VIDEO REFERENSI) */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[20%] sm:top-[16%] lg:top-[14%] flex items-center justify-center pointer-events-none px-2"
          style={{
            transform: `translateY(${scrollShift}px)`,
          }}
        >
          <span
            key={activeProduct.id}
            className="font-display font-bold uppercase text-white tracking-tight leading-none text-center whitespace-nowrap select-none text-[clamp(3.3rem,14.5vw,9.2rem)] transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(${dragX * 0.25}px)`,
            }}
          >
            {theme.wordmark}
          </span>
        </div>

        {/* LAYER 2: TANGAN STUDIO ASLI MENOPANG BOWL DARI BAWAH (IKUT BERGERAK SAAT GANTI MENU / SWIPE) */}
        <div
          className="absolute bottom-[-22px] sm:bottom-[-28px] left-1/2 w-[235px] sm:w-[295px] lg:w-[325px] pointer-events-none z-10 origin-bottom"
          style={{
            transform: handTransform,
            transition: isDragging
              ? "none"
              : "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <img
            src="/images/hand-holder.png"
            alt="Tangan memegang mangkuk LiChick"
            className="w-full h-auto object-contain drop-shadow-[0_14px_24px_rgba(32,10,0,0.48)]"
            draggable={false}
          />
          {/* Bayangan mangkuk tepat di atas lengkungan ujung jari */}
          <div className="absolute top-[7%] left-1/2 -translate-x-1/2 w-[135px] sm:w-[165px] h-6 rounded-full bg-black/55 blur-md" />
        </div>

        {/* LAYER 3: ORBITAL ARC CAROUSEL UNTUK 4 FOTO MANGKUK FINAL ASLI */}
        <div className="absolute inset-0 z-20 pointer-events-none flex justify-center">
          {MENU_PRODUCTS.map((item, idx) => {
            const offset = getRelativeOffset(idx);
            const isActive = offset === 0;
            const isLeft = offset === -1;
            const isRight = offset === 1;

            // Posisi busur melingkar (orbital arc): masuk dari kanan bawah melengkung ke atas jari, keluar melengkung ke kiri bawah
            let tx = 0;
            let ty = 0;
            let rot = 0;
            let scale = 1;
            let opacity = 1;

            if (isActive) {
              tx = dragX;
              ty = Math.abs(dragX) * 0.14 + (handDipDir !== 0 ? 14 : 0);
              rot = dragX * 0.08;
              scale = 1 - Math.abs(dragX) * 0.0008;
              opacity = 1;
            } else if (isLeft) {
              tx = -340 + dragX * 0.9;
              ty = 95 - Math.max(0, dragX) * 0.35;
              rot = -22 + dragX * 0.06;
              scale = 0.68 + Math.max(0, dragX) * 0.0014;
              opacity = Math.max(0, Math.min(0.85, (dragX - 10) / 130));
            } else if (isRight) {
              tx = 340 + dragX * 0.9;
              ty = 95 - Math.max(0, -dragX) * 0.35;
              rot = 22 + dragX * 0.06;
              scale = 0.68 + Math.max(0, -dragX) * 0.0014;
              opacity = Math.max(0, Math.min(0.85, (-dragX - 10) / 130));
            } else {
              tx = 0;
              ty = 180;
              rot = 0;
              scale = 0.55;
              opacity = 0;
            }

            return (
              <div
                key={item.id}
                aria-hidden={!isActive}
                className="absolute top-[20px] sm:top-[22px] lg:top-[20px] w-[200px] sm:w-[255px] lg:w-[285px]"
                style={{
                  transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`,
                  opacity,
                  transition: isDragging
                    ? "none"
                    : "transform 560ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease",
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-auto object-contain drop-shadow-[0_22px_24px_rgba(40,12,0,0.52)]"
                  draggable={false}
                />
              </div>
            );
          })}
        </div>

        {/* Tombol Navigasi Kiri & Kanan (Desktop & iPad, tetap simpel dan solid) */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Menu sebelumnya"
          className="hidden sm:inline-flex items-center justify-center absolute left-5 top-1/2 -translate-y-1/2 z-30 h-11 px-4 rounded-xl bg-brand-dark hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={handleNext}
          aria-label="Menu berikutnya"
          className="hidden sm:inline-flex items-center justify-center absolute right-5 top-1/2 -translate-y-1/2 z-30 h-11 px-4 rounded-xl bg-brand-dark hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors"
        >
          Next
        </button>
      </div>

      {/* PANEL INFO & CTA MENU YANG SEDANG DI-HIGHLIGHT */}
      <div
        className="px-4 sm:px-7 py-5 border-t border-white/15 transition-colors duration-500"
        style={{ backgroundColor: theme.stripBg }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight">
                {activeProduct.name}
              </h1>
              <span className="font-display font-bold text-xl sm:text-2xl text-brand-amber tabular-nums">
                {formatRupiah(activeProduct.price)}
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: theme.accentText }}
              >
                {storeOpen
                  ? `(Sisa kuota PO: ${activeProductRemaining}/${activeProductMax} porsi)`
                  : "(Pre Order sedang ditutup)"}
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-orange-50">
              {activeProduct.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onQuickAdd(activeProduct.id)}
              disabled={!storeOpen || activeProductRemaining <= 0}
              className="min-h-[46px] px-6 rounded-xl bg-brand-dark hover:bg-black disabled:opacity-50 text-white font-display font-bold text-sm sm:text-base whitespace-nowrap cursor-pointer transition-colors"
            >
              {!storeOpen
                ? "Pre Order Ditutup"
                : activeProductRemaining > 0
                ? `+ Pesan ${activeProduct.name}`
                : "Kuota Habis"}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="sm:hidden min-h-[44px] px-4 rounded-xl bg-brand-dark text-white text-xs font-bold cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="sm:hidden min-h-[44px] px-4 rounded-xl bg-brand-dark text-white text-xs font-bold cursor-pointer"
              >
                Next
              </button>
              <a
                href="#katalog-menu"
                className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[46px] px-4 rounded-xl bg-white hover:bg-brand-paper text-brand-dark font-bold text-xs sm:text-sm inline-flex items-center justify-center whitespace-nowrap transition-colors"
              >
                Lihat Semua Menu
              </a>
            </div>
          </div>
        </div>

        {/* 4-MENU HIGHLIGHT PICKER STRIP (User-Friendly 1-Tap Switcher) */}
        <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 md:grid-cols-4 gap-2">
          {MENU_PRODUCTS.map((item, idx) => {
            const isSelected = item.id === activeProduct.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (idx === activeIndex) return;
                  goToIndex(idx, idx > activeIndex ? 1 : -1);
                }}
                className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-white text-brand-dark border-white"
                    : "bg-brand-dark text-white border-white/15 hover:bg-black"
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="size-10 sm:size-11 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-display font-bold text-xs sm:text-sm block truncate leading-tight">
                    {item.baseTitle}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase block whitespace-nowrap mt-0.5 ${
                      isSelected
                        ? item.edition === "GERAH"
                          ? "text-red-700"
                          : "text-brand-deep"
                        : item.edition === "GERAH"
                        ? "text-red-400"
                        : "text-brand-amber"
                    }`}
                  >
                    {item.edition} {item.priceShort}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
