"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCartUi } from "@/components/CartUiContext";
import { STORE_CONFIG } from "@/config/store";
import { formatRupiah } from "@/lib/format";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, cartTotal, cartOpen, toggleCart } = useCartUi();

  const isStorefront = pathname === "/";

  const handleCartClick = () => {
    if (isStorefront) {
      toggleCart();
    } else {
      router.push("/#katalog-menu");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-brand-border">
      <div className="bg-brand-dark text-white py-2 px-4 text-[11px] sm:text-xs font-medium">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <p className="truncate">
            <span className="font-display text-brand-amber font-bold uppercase tracking-wide mr-2">
              OPEN PRE ORDER
            </span>
            <span className="text-zinc-300">
              Pengambilan {STORE_CONFIG.pickupDays[0]} | Kuota Terbatas 25 Porsi
              (Semua Menu) | WA {STORE_CONFIG.adminWhatsAppDisplay}
            </span>
          </p>
          <Link
            href="/track"
            className="hidden sm:inline-block text-brand-amber font-semibold hover:underline shrink-0"
          >
            Lacak Status Dapur
          </Link>
        </div>
      </div>

      <nav
        aria-label="Navigasi Utama"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3"
      >
        <Link href="/" className="shrink-0 flex items-center">
          <img
            src={STORE_CONFIG.logoUrl}
            alt="LiChick by LUCUIH"
            className="h-7 sm:h-9 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/#katalog-menu"
            className={`px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold min-h-[40px] inline-flex items-center transition-colors ${
              pathname === "/"
                ? "text-brand-orange bg-brand-surface"
                : "text-brand-dark hover:bg-brand-paper"
            }`}
          >
            Menu
          </Link>

          <Link
            href="/track"
            className={`px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold min-h-[40px] inline-flex items-center border transition-colors ${
              pathname === "/track"
                ? "bg-brand-orange text-white border-brand-orange"
                : "text-brand-dark bg-white border-brand-border hover:border-brand-orange"
            }`}
          >
            Lacak
          </Link>

          {!pathname.startsWith("/portal") && (
            <button
              type="button"
              onClick={handleCartClick}
              aria-expanded={isStorefront ? cartOpen : undefined}
              aria-label="Buka keranjang pesanan"
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold min-h-[40px] inline-flex items-center gap-2 cursor-pointer transition-colors ${
                cartCount > 0 || cartOpen
                  ? "bg-brand-dark hover:bg-black text-white"
                  : "bg-brand-paper hover:bg-brand-surface text-brand-dark border border-brand-border"
              }`}
            >
              <span>Keranjang</span>
              <span
                className={`min-w-[22px] h-[22px] px-1.5 rounded-md text-[11px] font-display font-bold inline-flex items-center justify-center tabular-nums ${
                  cartCount > 0
                    ? "bg-brand-orange text-white"
                    : "bg-white text-brand-dark border border-brand-border"
                }`}
              >
                {cartCount}
              </span>
              {cartCount > 0 && (
                <span className="hidden md:inline text-xs font-display font-bold text-brand-amber tabular-nums">
                  {formatRupiah(cartTotal)}
                </span>
              )}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
