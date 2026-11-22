"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STORE_CONFIG } from "@/config/store";

export function Navbar() {
  const pathname = usePathname();

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
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3"
      >
        <Link href="/" className="shrink-0 flex items-center">
          <img
            src={STORE_CONFIG.logoUrl}
            alt="LiChick by LUCUIH"
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/#katalog-menu"
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold min-h-[40px] inline-flex items-center transition-colors ${
              pathname === "/"
                ? "text-brand-orange bg-brand-surface"
                : "text-brand-dark hover:bg-brand-paper"
            }`}
          >
            Menu
          </Link>

          <Link
            href="/track"
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold min-h-[40px] inline-flex items-center border transition-colors ${
              pathname === "/track"
                ? "bg-brand-orange text-white border-brand-orange"
                : "text-brand-dark bg-white border-brand-border hover:border-brand-orange"
            }`}
          >
            Lacak
          </Link>
        </div>
      </nav>
    </header>
  );
}
