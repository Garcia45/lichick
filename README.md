# LiChick by LUCUIH | Open Pre Order Friesmoy & Macmoy

Website pre-order kuliner berbasis **Next.js (App Router) + TypeScript + Tailwind CSS**, siap deploy langsung di **Vercel** tanpa backend server terpisah.

Data pesanan otomatis tercatat ke **Google Sheets** (langsung berbentuk tabel seperti Excel), foto bukti transfer QRIS tersimpan otomatis ke **Google Drive**, struk diarahkan ke **WhatsApp Admin (`0821-9043-7013`)**, dan dilengkapi **Portal Admin Privat** untuk validasi pembayaran, progres dapur, dan cetak pesanan.

## Fitur Utama
- **Menu Highlight Stage (`/`)**: Sorotan 4 menu interaktif dengan latar warna per menu, teks display besar di belakang produk, dan tangan studio memegang foto produk asli dengan transisi busur melingkar (swipe/drag di HP, iPad, maupun desktop).
- **Katalog 4 Menu Resmi + Sidebar Keranjang Live**: Friesmoy Gerah (18K), Macmoy Gerah (20K), Friesmoy Original (18K), dan Macmoy Original (20K), lengkap dengan sisa kuota, pilihan saus, catatan bebas, QRIS resmi (`LiChick by Lucuih, Makanan`), upload bukti transfer QRIS wajib, pilihan Hari & Jam Pengambilan, serta checkout otomatis ke Google Sheets + WhatsApp.
- **Lacak Status Pesanan (`/track`)**: Pembeli memantau status validasi pembayaran dan progres dapur (`Belum Dibuat`, `Sedang Dibuat`, `Siap / Diantar`, `Sudah Selesai`).
- **Portal Admin Privat**: `/admin` otomatis mengembalikan 404. Portal hanya dapat diakses lewat path rahasia (`ADMIN_SECRET_SLUG`) atau shortcut tersembunyi (ketuk 5x logo footer / `Ctrl + Shift + L`) dengan proteksi PIN/Password dan batas 5x percobaan. Mendukung validasi bukti bayar QRIS, cetak struk & rekap dapur, pengaturan buka/tutup PO & kuota, serta **Export Excel (`.xlsx`)**.

## Menjalankan Secara Lokal
```bash
npm install
npm run dev
```

Konfigurasi variabel lingkungan mengikuti template pada `.env.example` (salin ke `.env.local` untuk lokal, dan pasang nilai yang sama di **Vercel Settings -> Environment Variables**).

## Kustomisasi
- Menu, harga, varian, jadwal hari/jam, nomor WA, & info QRIS: `src/config/store.ts`
- Warna & token desain: `src/app/globals.css`
- Sorotan menu utama: `src/components/MenuHighlightStage.tsx`
- Apps Script Google Sheets + Google Drive: `google-sheets-script.gs`
