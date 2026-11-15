# Design System Master — LiChick by LUCUIH (LUCUIH FOOD)

## 1. Brand & Product Profile
- **Brand**: LiChick by LUCUIH (LUCUIH FOOD)
- **Category**: Culinary Pre-Order E-Commerce (Batch-based Fast Casual)
- **Target Audience**: Mahasiswa & anak muda (Mobile-First 90%+ traffic)
- **Core Products**:
  - **Mac Gemoy**: Makaroni lembut, ayam crispy gurih, saus keju lumer melimpah — **Rp18.000 / porsi**
  - **Fries Gemoy**: Kentang goreng renyah, potongan ayam crispy, bumbu tabur spesial, saus signature — **Rp18.000 / porsi**
- **Sales Mechanism**: Daily Batch Pre-Order dengan kuota terbatas (**25 porsi Mac Gemoy** & **25 porsi Fries Gemoy** per batch).

## 2. Color Palette (UI/UX Pro Max Warm Culinary & Urgency)
- **Primary Brand (Warm Golden Orange)**: `#F97316` (`orange-500`) / `#EA580C` (`orange-600`)
- **Secondary Accent (Cheese Gold / Amber)**: `#F59E0B` (`amber-500`) / `#FBBF24` (`amber-400`)
- **Surface / Background**: `#FFFBF7` (Warm Alabaster White) & `#FFFFFF` (Pure Card Surface)
- **Dark Accent (Modern Espresso/Slate)**: `#0F172A` (`slate-900`) untuk tipografi utama & `#1E293B` (`slate-800`) untuk kartu kontras/sticky bar
- **Semantic Status**:
  - **Available / Safe Quota**: `#10B981` (`emerald-500`)
  - **Low Quota Urgency (< 8 porsi)**: `#EF4444` (`red-500`) dengan `animate-pulse` halus

## 3. Typography Pairing
- **Heading & Body Font**: `Poppins` (Clean, Modern Geometric, High Legibility di mobile & desktop)

## 4. Mobile-First & Micro-Interactions Rules
- **Thumb-Friendly Zone**: Tombol CTA utama, pemilih kuota (+/-), dan Sticky Checkout Bar diletakkan di bagian bawah layar (`fixed bottom-0 z-50`) dengan minimum touch target `44px x 44px` (`min-h-[44px]`).
- **Real-time Urgency Bar**: Progress bar visual untuk sisa kuota setiap menu di batch aktif (misal: `Sisa 6 dari 25 porsi`).
- **No Emoji Icons**: Seluruh ikon menggunakan inline SVG (Heroicons/Lucide) dengan `width` dan `height` eksplisit.

