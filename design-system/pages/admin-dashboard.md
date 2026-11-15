# Page Override: Kitchen & Sales Intelligence Dashboard (`admin/dashboard.blade.php`)

## Pattern Synthesis (`charts.csv` #2, #8, #18 & `styles.csv` #31, #37)
1. **KPI Metric Row with Delta & Target Indicators**:
   - Verified Revenue, Gross Revenue, Total Portions Sold (out of daily capacity), and Pending Verifications count.
2. **Visual Chart Widgets (`charts.csv` #2 & #18)**:
   - **Menu Share Comparison Bar**: Visual horizontal stacked bar comparing **Mac Gemoy** vs **Fries Gemoy** portions sold.
   - **Batch Capacity Bullet Gauges**: Real-time visual progress bars per batch (`sold_qty / 50`) with threshold color coding (`<70%` Emerald, `70-89%` Amber, `>=90%` Red).
3. **Interactive Kitchen Queue & Instant Filtering**:
   - Client-side Alpine.js filter tabs (`Semua`, `Perlu Verifikasi TF`, `Diproses Dapur`, `Siap Diambil`, `Selesai`) + instant search bar (cari nama / kode order / WA).
   - **1-Click WhatsApp Notification**: Direct button on each order row to send an automated WhatsApp message to the customer (e.g., *"Halo [Nama], pesanan LiChick #[Kode] sudah SIAP DIAMBIL di booth ya!"*).
   - **Payment Proof Lightbox Modal**: Preview transfer proof images directly in a modal without leaving the dashboard.
