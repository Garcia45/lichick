# LiChick by LUCUIH (LUCUIH FOOD) 🍗🧀

Website e-commerce sistem **Pre-Order (Batch Drop)** kuliner untuk brand **LiChick by LUCUIH** dengan porsi gemoy, ayam crispy gurih, dan saus keju lumer melimpah.

---

## 🍽️ Menu Utama
- **Mac Gemoy** (Rp18.000 / porsi): Makaroni al-dente, potongan ayam crispy boneless juicy, disiram saus keju spesial LiChick.
- **Fries Gemoy** (Rp18.000 / porsi): Kentang goreng golden-crispy, ayam crispy popcorn, taburan bumbu rahasia LUCUIH FOOD, dan saus keju/pedas.

Sistem Pre-Order menerapkan **kuota terbatas 25 porsi Mac Gemoy & 25 porsi Fries Gemoy** per batch untuk mengontrol kapasitas dapur agar selalu disajikan hangat.

---

## ✨ Fitur Utama
1. **Customer Frontend**:
   - Landing Page dengan visual kuliner interaktif & bento highlights.
   - Pilihan Batch harian & slot waktu pengambilan / pengantaran.
   - Indikator sisa kuota real-time dengan efek urgency.
   - Floating Thumb-Friendly Cart Dock & Drawer Checkout (Mobile-First).
   - Fitur 1-click salin nomor rekening pembayaran (BCA / SeaBank / GoPay).
   - Form upload dan preview bukti transfer pembayaran.
   - Real-time Order Tracking (Verifikasi Pembayaran ➔ Diproses Dapur ➔ Siap Diambil ➔ Selesai).
2. **Admin Dashboard**:
   - Rekap omset harian dan total porsi terjual.
   - Manajemen kapasitas dan kuota batch per menu.
   - Antrean pesanan dan verifikasi bukti transfer 1-klik (*Approve TF*).
   - Update status operasional dapur.

---

## 🚀 Cara Menjalankan

### Prasyarat
- PHP >= 8.2 (dengan ekstensi `openssl`, `curl`, `pdo_sqlite` aktif)
- Composer

### Langkah Instalasi
```bash
# 1. Clone repository
git clone https://github.com/Garcia45/lichick.git
cd lichick

# 2. Install dependensi PHP
composer install

# 3. Salin file environment & generate app key
cp .env.example .env
php artisan key:generate

# 4. Jalankan migrasi dan seeder menu
php artisan migrate --seed
php artisan storage:link

# 5. Jalankan server lokal
php artisan serve
```

Akses di browser:
- **Pelanggan**: `http://127.0.0.1:8000`
- **Lacak Pesanan**: `http://127.0.0.1:8000/track`
- **Admin Dapur**: `http://127.0.0.1:8000/admin/dashboard`
