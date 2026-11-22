# LiChick by LUCUIH | Open Pre Order Friesmoy & Macmoy

Website pre-order kuliner berbasis **Next.js (App Router) + TypeScript + Tailwind CSS v4**, siap deploy langsung di **Vercel** tanpa server backend terpisah.

Data pesanan otomatis tercatat ke **Google Sheets**, foto bukti bayar QRIS tersimpan otomatis ke **Google Drive**, struk konfirmasi diarahkan ke **WhatsApp Admin (`0821-9043-7013`)**, dan pembeli dapat memantau status pesanan secara live.

## Fitur Utama
- **Menu Highlight Stage (`/`)**: Sorotan 4 menu interaktif dengan latar warna per menu, teks display besar di belakang produk, badge brush splat `GERAH` & `ORIGINAL`, serta tangan studio memegang foto produk asli dengan transisi busur melingkar (HP, iPad, dan desktop).
- **Katalog 4 Menu + Drawer Keranjang di Navbar**: Friesmoy Gerah (18K) & Macmoy Gerah (20K) dengan **Saus Nashville pedas khas LiChick**, serta Friesmoy Original (18K) & Macmoy Original (20K). Dilengkapi kuota global **25 porsi keseluruhan** (bebas campur semua menu), jadwal pengambilan **`Senin, 30 November`**, QRIS **`LiChick by Lucuih, Makanan` (`NMID: ID1026645157441`)**, upload bukti bayar QRIS wajib, dan tombol **Konfirmasi Pesanan ke WhatsApp**.
- **Kartu Status Pesanan (`/track`)**: Otomatis tampil setelah checkout dengan stepper horizontal 4 tahap (`Verifikasi Pembayaran`, `Sedang Dibuat`, `Siap / Diantar`, `Selesai`), rincian pesanan expandable, dan auto-refresh live mengikuti validasi admin.
- **Portal Admin Privat**: `/admin` otomatis mengembalikan 404. Portal hanya bisa diakses lewat path rahasia (`ADMIN_SECRET_SLUG`) atau shortcut tersembunyi (ketuk 5x logo footer / `Ctrl + Shift + L`) dengan PIN/Password, batas 5x salah coba, validasi bukti QRIS, rekap persiapan dapur (Macmoy vs Friesmoy), cetak struk & rekap dapur, pengaturan buka/tutup PO & kuota, serta **Export Excel (`.xlsx`)** via `write-excel-file`.
- **Keamanan Produksi**: HTTP security headers lengkap (`CSP`, `HSTS`, `X-Frame-Options: DENY`, `nosniff`), proteksi CSRF Same-Origin, validasi harga & kuota server-side, masking PII di `/api/track`, rate limiting, dan `0` vulnerability (`npm audit`).

## Kontak
- WhatsApp: `0821-9043-7013`
- Instagram: `@lichikbylucuih.id` (`https://instagram.com/lichikbylucuih.id`)

## Menjalankan Secara Lokal
```bash
npm install
npm run dev
```

Salin `.env.example` menjadi `.env.local` untuk lokal, lalu masukkan variabel yang sama di **Vercel Project Settings -> Environment Variables**.
