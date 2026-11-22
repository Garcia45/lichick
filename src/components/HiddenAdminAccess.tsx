"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STORE_CONFIG } from "@/config/store";

export function HiddenAdminAccess() {
  const router = useRouter();
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const openOrEnterPortal = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth", { cache: "no-store" });
      const json = await res.json();
      if (json.authenticated && json.portalPath) {
        router.push(json.portalPath);
        return;
      }
    } catch {
      // Fallback membuka modal login
    }
    setErrorMsg("");
    setSecretInput("");
    setShowSecret(false);
    setModalOpen(true);
  }, [router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        openOrEnterPortal();
      }
      if (e.key === "Escape") {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openOrEnterPortal]);

  const handleFooterLogoTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 2500) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
    }
    lastTapRef.current = now;

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      openOrEnterPortal();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: secretInput }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok || !json.portalPath) {
        setErrorMsg(json.error || "Password / PIN tidak valid.");
        return;
      }
      setModalOpen(false);
      setSecretInput("");
      router.push(json.portalPath);
    } catch {
      setErrorMsg("Gagal menghubungi server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <img
        src={STORE_CONFIG.logoUrl}
        alt="LiChick by LUCUIH"
        onClick={handleFooterLogoTap}
        className="h-6 w-auto select-none"
      />

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-2xl border border-brand-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-brand-dark text-white flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-amber block">
                  Akses Internal
                </span>
                <h3 className="font-display font-bold text-base">
                  Masuk Portal Dapur
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[36px] px-3 rounded-lg bg-brand-charcoal hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="hidden-admin-secret"
                  className="block text-xs font-bold text-brand-dark mb-1.5"
                >
                  Password / PIN Admin
                </label>
                <div className="flex gap-2">
                  <input
                    id="hidden-admin-secret"
                    type={showSecret ? "text" : "password"}
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="Masukkan Password atau PIN"
                    autoFocus
                    autoComplete="current-password"
                    required
                    className="flex-1 min-w-0 h-11 px-3.5 rounded-xl border border-brand-border bg-brand-paper text-sm font-semibold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((prev) => !prev)}
                    className="h-11 px-3 rounded-xl border border-brand-border bg-white text-xs font-bold text-brand-dark hover:border-brand-orange cursor-pointer shrink-0 transition-colors"
                  >
                    {showSecret ? "Sembunyi" : "Lihat"}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800 text-center">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-60 text-white font-display font-bold text-sm cursor-pointer transition-colors"
              >
                {submitting ? "Memverifikasi..." : "Buka Panel Admin"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
