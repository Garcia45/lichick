import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="max-w-lg mx-auto py-16">
      <div className="bg-white rounded-2xl p-8 border border-brand-border text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-orange block">
          Error 404
        </span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
          Halaman yang kamu cari tidak tersedia atau sudah dipindahkan. Kembali
          ke halaman utama untuk melihat menu LiChick.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
          <Link
            href="/"
            className="min-h-[44px] px-5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-sm inline-flex items-center justify-center transition-colors"
          >
            Kembali ke Menu
          </Link>
          <Link
            href="/track"
            className="min-h-[44px] px-5 rounded-xl bg-brand-paper border border-brand-border hover:border-brand-orange text-brand-dark font-bold text-sm inline-flex items-center justify-center transition-colors"
          >
            Lacak Pesanan
          </Link>
        </div>
      </div>
    </div>
  );
}
