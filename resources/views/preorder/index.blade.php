@extends('layouts.app')

@section('title', 'LiChick by LUCUIH — Pre-Order Mac Gemoy & Fries Gemoy Rp18.000')

@section('content')
@php
    $catalogItems = $products->map(function ($product) use ($activeBatch) {
        $quotaObj = $activeBatch?->productQuotas->firstWhere('product_id', $product->id);
        $initialQuota = $quotaObj ? $quotaObj->initial_quota : $product->default_batch_quota;
        $soldQty = $quotaObj ? $quotaObj->sold_qty : 0;
        $remaining = max(0, $initialQuota - $soldQty);

        $isMac = $product->slug === 'mac-gemoy';

        return [
            'id'           => $product->id,
            'name'         => $product->name,
            'slug'         => $product->slug,
            'tagline'      => $isMac ? 'Makaroni Al-Dente • Ayam Crispy • Saus Keju Lumer' : 'Shoestring Fries • Ayam Crispy • Bumbu Tabur & Saus',
            'description'  => $product->description,
            'badge'        => $product->ingredients_badge,
            'price'        => $product->price,
            'initialQuota' => $initialQuota,
            'soldQty'      => $soldQty,
            'remaining'    => $remaining,
            'qty'          => 0,
            'notes'        => '',
            'selectedFlavor' => 'Original Cheese Lava',
            'flavors'      => $isMac
                ? ['Original Cheese Lava', 'Spicy Fire Cheese', 'Saus Keju Dipisah']
                : ['Original Cheese Dip', 'Balado Pedas Manis', 'BBQ Savory Dust'],
            'highlights'   => $isMac
                ? ['Makaroni Creamy', '100% Dada Ayam Fillet', 'Saus Keju Melimpah', 'Box 450ml Kenyang']
                : ['Kentang Golden Crisp', 'Ayam Crispy Popcorn', 'Bumbu Umami Spesial', 'Saus Cocol Keju'],
            'taste'        => $isMac ? 'Extra Cheesy & Creamy' : 'Super Crunchy & Savory',
            'calories'     => $isMac ? '540 kkal • 26g Protein' : '510 kkal • 24g Protein',
            'image'        => $isMac
                ? asset('images/mac-gemoy.jpg')
                : 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=900&q=80',
        ];
    })->values();
@endphp

<div x-data="{
    batchId: {{ $activeBatch?->id ?? 'null' }},
    batchName: {{ Js::from($activeBatch?->name ?? 'Batch 1 — Makan Siang Kampus') }},
    pickupSlot: {{ Js::from($activeBatch?->pickup_time_slot ?? '11:30 - 13:00 WIB') }},
    deliveryMethod: 'pickup',
    customerName: '',
    customerWhatsapp: '',
    deliveryAddress: '',
    drawerOpen: false,
    copied: false,
    isSubmittingCloud: false,
    lastCreatedTicket: '',
    toastMessage: '',
    proofPreview: null,
    activeFaq: 1,
    countdown: { hours: '02', minutes: '14', seconds: '45' },
    items: {{ Js::from($catalogItems) }},

    async init() {
        let totalSeconds = 2 * 3600 + 14 * 60 + 45;
        setInterval(() => {
            if (totalSeconds > 0) totalSeconds--;
            const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(totalSeconds % 60).padStart(2, '0');
            this.countdown = { hours: h, minutes: m, seconds: s };
        }, 1000);

        // Sinkronisasi Kuota Real-Time dari Google Sheets (Maks. 50 Porsi / Menu)
        if (window.LICHICK_CLOUD) {
            const cloud = await window.LICHICK_CLOUD.fetchSheetsData();
            if (cloud && cloud.ok && cloud.quotas) {
                const isBatch2 = (this.batchName || '').toLowerCase().includes('batch 2') || (this.batchName || '').toLowerCase().includes('sore');
                const q = isBatch2 ? cloud.quotas.batch_2 : cloud.quotas.batch_1;
                if (q) {
                    this.items.forEach(item => {
                        if (item.slug === 'mac-gemoy') {
                            item.soldQty = q.mac_sold;
                            item.remaining = q.mac_remaining;
                        } else {
                            item.soldQty = q.fries_sold;
                            item.remaining = q.fries_remaining;
                        }
                    });
                }
            }
        }
    },

    haptic() {
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(12);
        }
    },

    showToast(msg) {
        this.toastMessage = msg;
        setTimeout(() => {
            if (this.toastMessage === msg) this.toastMessage = '';
        }, 2800);
    },

    increment(index, amount = 1) {
        const available = this.items[index].remaining - this.items[index].qty;
        if (available > 0) {
            const add = Math.min(amount, available);
            this.items[index].qty += add;
            this.haptic();
            this.showToast(this.items[index].name + ' (+' + add + ' porsi) masuk keranjang');
        }
    },

    decrement(index) {
        if (this.items[index].qty > 0) {
            this.items[index].qty--;
            this.haptic();
        }
    },

    selectFlavor(index, flavor) {
        this.items[index].selectedFlavor = flavor;
        this.haptic();
    },

    get totalPortions() {
        return this.items.reduce((sum, item) => sum + item.qty, 0);
    },

    get totalPrice() {
        return this.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    },

    get totalRemainingInBatch() {
        return this.items.reduce((sum, item) => sum + Math.max(0, item.remaining - item.qty), 0);
    },

    formatRupiah(number) {
        return 'Rp' + new Intl.NumberFormat('id-ID').format(number);
    },

    copyAccount() {
        navigator.clipboard.writeText('7810992811');
        this.copied = true;
        this.haptic();
        this.showToast('Nomor rekening 7810-9928-11 berhasil disalin!');
        setTimeout(() => this.copied = false, 2500);
    },

    handleFilePreview(e) {
        const file = e.target.files[0];
        if (file) {
            this.proofPreview = URL.createObjectURL(file);
        }
    },

    async checkoutViaWhatsApp() {
        if (!this.customerName.trim() || !this.customerWhatsapp.trim()) {
            this.showToast('Mohon isi Nama Lengkap & Nomor WhatsApp terlebih dahulu.');
            return;
        }
        if (this.deliveryMethod === 'delivery' && !this.deliveryAddress.trim()) {
            this.showToast('Mohon isi Alamat Lengkap / Titik Temu Kampus untuk pengiriman kurir.');
            return;
        }

        const selected = this.items.filter(i => i.qty > 0);
        if (selected.length === 0) return;

        this.isSubmittingCloud = true;
        this.haptic();

        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const rand = Math.floor(1000 + Math.random() * 9000);
        const orderCode = `LCK-${yy}${mm}${dd}-${rand}`;

        const macItem = this.items.find(i => i.slug === 'mac-gemoy');
        const friesItem = this.items.find(i => i.slug === 'fries-gemoy');

        const orderPayload = {
            timestamp: now.toISOString(),
            order_number: orderCode,
            batch_date: `${now.getFullYear()}-${mm}-${dd}`,
            batch_name: this.batchName,
            pickup_slot: this.pickupSlot,
            pickup_time_slot: this.pickupSlot,
            customer_name: this.customerName.trim(),
            customer_whatsapp: this.customerWhatsapp.trim(),
            delivery_method: this.deliveryMethod,
            delivery_address: this.deliveryMethod === 'delivery' ? this.deliveryAddress.trim() : '-',
            mac_qty: macItem ? macItem.qty : 0,
            mac_flavor: macItem && macItem.qty > 0 ? (macItem.selectedFlavor + (macItem.notes ? ' - ' + macItem.notes : '')) : '-',
            fries_qty: friesItem ? friesItem.qty : 0,
            fries_flavor: friesItem && friesItem.qty > 0 ? (friesItem.selectedFlavor + (friesItem.notes ? ' - ' + friesItem.notes : '')) : '-',
            total_portions: this.totalPortions,
            total_amount: this.totalPrice,
            order_status: 'waiting_payment',
            payment_status: 'pending_verification',
            notes: selected.map(s => `${s.name}: ${s.selectedFlavor}`).join(' | '),
            details: selected.map(s => ({
                product_name_snapshot: s.name,
                quantity: s.qty,
                subtotal: s.qty * s.price,
                item_notes: s.selectedFlavor + (s.notes ? ' - ' + s.notes : '')
            }))
        };

        // 1. Kirim otomatis ke Google Sheets Webhook & simpan di Browser Cache
        if (window.LICHICK_CLOUD) {
            await window.LICHICK_CLOUD.sendOrderToSheets(orderPayload);
        }

        // 2. Susun pesan struk WhatsApp ke Admin Dapur LiChick
        let lines = [
            'Halo *Dapur LiChick by LUCUIH*! Saya mau konfirmasi Pre-Order:',
            '',
            '*KODE TIKET:* ' + orderCode,
            '*Nama Pemesan:* ' + this.customerName.trim(),
            '*No. WhatsApp:* ' + this.customerWhatsapp.trim(),
            '*Batch:* ' + this.batchName,
            '*Jam Ambil/Kirim:* ' + this.pickupSlot,
            '*Metode:* ' + (this.deliveryMethod === 'pickup' ? 'Ambil di Booth' : 'Kurir Kampus (' + (this.deliveryAddress || '-') + ')'),
            '',
            '*RINCIAN MENU GEMOY:*'
        ];

        selected.forEach(item => {
            const noteStr = item.notes ? ' (' + item.selectedFlavor + ' - ' + item.notes + ')' : ' (' + item.selectedFlavor + ')';
            lines.push('• ' + item.qty + 'x ' + item.name + noteStr + ' = ' + this.formatRupiah(item.qty * item.price));
        });

        lines.push('----------------------------------');
        lines.push('*TOTAL PEMBAYARAN: ' + this.formatRupiah(this.totalPrice) + '*');
        lines.push('');
        lines.push('Pesanan sudah tercatat otomatis di sistem. Berikut saya kirimkan foto bukti transfernya ya. Terima kasih!');

        // 3. Kurangi sisa kuota 50 porsi secara real-time di UI
        this.items.forEach(item => {
            if (item.qty > 0) {
                item.soldQty += item.qty;
                item.remaining = Math.max(0, item.remaining - item.qty);
                item.qty = 0;
            }
        });

        this.isSubmittingCloud = false;
        this.lastCreatedTicket = orderCode;
        this.showToast('Pesanan ' + orderCode + ' tercatat di Google Sheets & membuka WhatsApp!');

        const adminWa = window.LICHICK_CLOUD ? window.LICHICK_CLOUD.getAdminWa() : '6281234567890';
        const waUrl = 'https://wa.me/' + adminWa + '?text=' + encodeURIComponent(lines.join('\n'));
        window.open(waUrl, '_blank');
    }
}">

    <!-- Contextual Toast Notification (ux-guidelines.csv #82) -->
    <div x-show="toastMessage"
         x-cloak
         x-transition:enter="transition ease-out duration-200"
         x-transition:enter-start="opacity-0 -translate-y-4"
         x-transition:enter-end="opacity-100 translate-y-0"
         x-transition:leave="transition ease-in duration-150"
         x-transition:leave-start="opacity-100 translate-y-0"
         x-transition:leave-end="opacity-0 -translate-y-4"
         role="status"
         aria-live="polite"
         class="fixed top-20 right-4 sm:right-8 z-50 bg-brand-dark text-white px-4 py-3 rounded-2xl shadow-floating border border-brand-charcoal flex items-center gap-2.5 text-xs font-semibold">
        <span class="size-2 rounded-full bg-brand-amber animate-ping" aria-hidden="true"></span>
        <span x-text="toastMessage"></span>
    </div>

    <!-- 1. ASYMMETRIC BENTO HERO SHOWCASE (UI/UX Pro Max Style #39 & #53) -->
    <section aria-label="Highlight Produk Utama" class="mb-10 sm:mb-14">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">

            <!-- Left Primary Bento Card (7 Columns) -->
            <div class="lg:col-span-7 bg-brand-creamy border border-brand-border rounded-3xl p-6 sm:p-9 lg:p-10 shadow-card flex flex-col justify-between relative overflow-hidden">
                <div class="space-y-5 relative z-10">
                    <!-- Top Scarcity & Live Countdown Row -->
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-brand-orange text-xs font-bold">
                            <span class="size-2 rounded-full bg-brand-orange animate-ping" aria-hidden="true"></span>
                            <span>PRE-ORDER BATCH HARI INI BUKA</span>
                        </div>

                        <!-- Live Batch Countdown Pill -->
                        <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-dark text-white text-xs font-semibold">
                            <svg class="size-3.5 text-brand-amber" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span class="text-zinc-300">Tutup PO:</span>
                            <span class="font-mono font-bold text-brand-amber" x-text="`${countdown.hours}:${countdown.minutes}:${countdown.seconds}`">02:14:45</span>
                        </div>
                    </div>

                    <!-- Headline -->
                    <h1 class="font-heading font-extrabold text-3xl sm:text-5xl text-brand-dark tracking-tight leading-[1.12]">
                        Krenyes Ayamnya,<br>
                        <span class="text-brand-orange">Lumer Saus Kejunya.</span>
                    </h1>

                    <!-- Readable Body Copy (Min 16px on mobile per ux-guidelines.csv #67) -->
                    <p class="text-zinc-600 text-base leading-relaxed max-w-xl">
                        Kuliner pre-order nomor satu favorit anak kampus dari <strong class="text-brand-dark font-bold">LiChick by LUCUIH</strong>. Potongan dada ayam crispy tanpa tulang berpadu saus keju gurih melimpah. Dimasak hangat sesuai jam slot pilihanmu.
                    </p>

                    <!-- Social Proof Rating Bar (landing.csv #19) -->
                    <div class="flex flex-wrap items-center gap-3 pt-1">
                        <div class="flex items-center -space-x-2" aria-hidden="true">
                            <span class="size-8 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-[11px] font-bold text-brand-orange">RA</span>
                            <span class="size-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-[11px] font-bold text-amber-800">DN</span>
                            <span class="size-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[11px] font-bold text-emerald-800">KP</span>
                            <span class="size-8 rounded-full bg-brand-dark border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">+420</span>
                        </div>
                        <div class="text-xs">
                            <div class="flex items-center gap-1 font-bold text-brand-dark">
                                <svg class="size-4 text-brand-amber fill-brand-amber" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                <span>4.9 / 5.0 Rating Mahasiswa</span>
                            </div>
                            <span class="text-zinc-500">98% repeat order setiap minggu</span>
                        </div>
                    </div>
                </div>

                <!-- Hero CTA & Guarantee Footer -->
                <div class="pt-7 mt-6 border-t border-brand-border flex flex-wrap items-center justify-between gap-4">
                    <div class="flex flex-wrap items-center gap-3">
                        <a href="#katalog-menu"
                           class="btn-tactile inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white font-heading font-bold text-sm sm:text-base shadow-brand cursor-pointer min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2">
                            <span>Pesan Sekarang — Rp18.000</span>
                            <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </a>
                        <a href="#cara-pesan"
                           class="btn-tactile inline-flex items-center justify-center px-5 py-4 rounded-2xl bg-white hover:bg-zinc-50 text-brand-dark border border-brand-border font-semibold text-xs sm:text-sm min-h-[48px] cursor-pointer">
                            Cara Pre-Order
                        </a>
                    </div>
                </div>
            </div>

            <!-- Right Asymmetric Bento Stack (5 Columns) -->
            <div class="lg:col-span-5 grid grid-cols-2 gap-4">

                <!-- Top 2x1 Visual Food Hero Card -->
                <div class="col-span-2 relative rounded-3xl overflow-hidden border border-brand-border shadow-card group min-h-[250px] sm:min-h-[280px] flex flex-col justify-between p-6 bg-brand-dark text-white">
                    <img src="{{ asset('images/mac-gemoy.jpg') }}"
                         alt="Sajian hangat Mac Gemoy LiChick by LUCUIH dengan ayam crispy dan saus keju lumer"
                         class="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/15"></div>

                    <div class="relative z-10 flex items-center justify-between gap-2">
                        <span class="px-3 py-1 rounded-full bg-brand-amber text-brand-dark font-extrabold text-xs uppercase tracking-wider shadow-sm">
                            Signature Menu
                        </span>
                        <span class="px-3 py-1 rounded-full bg-white/95 text-brand-dark font-extrabold text-xs shadow-sm">
                            Rp18.000 / Porsi
                        </span>
                    </div>

                    <div class="relative z-10 space-y-1">
                        <span class="text-xs font-semibold text-brand-amber block">Mac Gemoy &amp; Fries Gemoy</span>
                        <h2 class="font-heading font-extrabold text-xl sm:text-2xl leading-snug">
                            Box 450ml Penuh Ayam Crispy &amp; Saus Keju Lumer
                        </h2>
                    </div>
                </div>

                <!-- Bottom Left 1x1 Bento Tile: Live Quota -->
                <div class="bg-white rounded-3xl p-5 border border-brand-border shadow-card flex flex-col justify-between">
                    <div class="size-10 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center mb-3">
                        <svg class="size-5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                    </div>
                    <div>
                        <span class="font-heading font-extrabold text-2xl text-brand-dark block" x-text="totalRemainingInBatch + ' Porsi'"></span>
                        <span class="text-xs font-medium text-zinc-500">Total Sisa Kuota Batch Aktif (Maks. 50/Menu)</span>
                    </div>
                </div>

                <!-- Bottom Right 1x1 Bento Tile: Fresh Guarantee -->
                <div class="bg-brand-dark text-white rounded-3xl p-5 border border-brand-charcoal shadow-card flex flex-col justify-between">
                    <div class="size-10 rounded-2xl bg-brand-orange/20 text-brand-amber flex items-center justify-center mb-3">
                        <svg class="size-5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                        </svg>
                    </div>
                    <div>
                        <span class="font-heading font-extrabold text-xl text-brand-amber block">100% Fresh</span>
                        <span class="text-xs font-medium text-zinc-300">Digoreng Dadakan Sesuai Slot Jam Ambil</span>
                    </div>
                </div>

            </div>
        </div>
    </section>

    <!-- 2. BATCH & SLOT WAKTU SELECTOR (TICKET-STUB DESIGN) -->
    <section aria-labelledby="heading-batch" class="mb-12">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
            <div>
                <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange block">Langkah 01 • Kapasitas Dapur</span>
                <h2 id="heading-batch" class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark">Pilih Batch &amp; Jam Pengambilan</h2>
            </div>
            <p class="text-xs sm:text-sm text-zinc-600">Pilih jadwal batch agar pesananmu selesai dimasak tepat saat kamu tiba.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @forelse($batches as $batch)
                @php
                    $isSelected = $activeBatch && $activeBatch->id === $batch->id;
                    $batchTotalInitial = $batch->productQuotas->sum('initial_quota') ?: 100;
                    $batchTotalSold = $batch->productQuotas->sum('sold_qty');
                    $batchRemaining = max(0, $batchTotalInitial - $batchTotalSold);
                    $batchPercent = min(100, (int) round(($batchTotalSold / $batchTotalInitial) * 100));
                @endphp
                <a href="{{ route('preorder.index', ['batch_id' => $batch->id]) }}"
                   class="btn-tactile group relative rounded-3xl p-5 sm:p-6 border-2 transition-colors duration-200 cursor-pointer flex flex-col justify-between gap-4 {{ $isSelected ? 'bg-white border-brand-orange shadow-brand' : 'bg-white border-brand-border hover:border-orange-300 shadow-card' }}">

                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-3.5">
                            <div class="size-12 rounded-2xl flex items-center justify-center shrink-0 {{ $isSelected ? 'bg-brand-orange text-white shadow-sm' : 'bg-brand-paper text-zinc-700 group-hover:bg-orange-50 group-hover:text-brand-orange' }}">
                                <svg class="size-6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                            </div>
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="font-heading font-bold text-lg text-brand-dark">{{ $batch->name }}</h3>
                                    @if($isSelected)
                                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-brand-orange">
                                            Terpilih
                                        </span>
                                    @endif
                                </div>
                                <p class="text-xs sm:text-sm font-semibold text-zinc-600 mt-1">
                                    Slot Waktu: <strong class="text-brand-dark">{{ $batch->pickup_time_slot }}</strong>
                                </p>
                            </div>
                        </div>

                        <span class="px-3 py-1 rounded-xl text-xs font-bold shrink-0 {{ $batchRemaining <= 15 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200' }}">
                            Sisa {{ $batchRemaining }} Porsi
                        </span>
                    </div>

                    <!-- Ticket Perforation Divider & Capacity Bar -->
                    <div class="pt-3.5 border-t-2 border-dashed border-brand-border space-y-2">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-zinc-500 font-medium">{{ \Carbon\Carbon::parse($batch->batch_date)->translatedFormat('d M Y') }} • Kuota 50 Mac &amp; 50 Fries</span>
                            <span class="font-bold text-brand-dark">{{ $batchTotalSold }}/{{ $batchTotalInitial }} Terpesan ({{ $batchPercent }}%)</span>
                        </div>
                        <div class="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div class="h-full bg-brand-orange rounded-full transition-all duration-300" style="width: {{ $batchPercent }}%"></div>
                        </div>
                    </div>
                </a>
            @empty
                <div class="col-span-2 p-8 rounded-3xl bg-white border border-brand-border text-center text-zinc-600 text-sm">
                    Belum ada batch pre-order yang dibuka untuk hari ini.
                </div>
            @endforelse
        </div>
    </section>

    <!-- 3. KATALOG MENU UTAMA (MAC GEMOY & FRIES GEMOY) DENGAN CUSTOMIZER SAUS -->
    <section id="katalog-menu" aria-labelledby="heading-katalog" class="mb-14 scroll-mt-24">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
                <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange block">Langkah 02 • Katalog Menu</span>
                <h2 id="heading-katalog" class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark">Pilih Menu Gemoy Favoritmu</h2>
            </div>
            <div class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-semibold">
                <svg class="size-4 text-brand-orange shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <span>Kuota Real-Time: Maksimal 50 Porsi / Menu / Batch</span>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-7">
            <template x-for="(item, index) in items" :key="item.id">
                <article class="bg-white rounded-3xl border border-brand-border shadow-card hover:shadow-card-hover transition-shadow duration-300 flex flex-col justify-between overflow-hidden group">
                    <div>
                        <!-- High-Resolution Appetizing Product Photography + Badges -->
                        <div class="relative aspect-[4/3] bg-brand-dark overflow-hidden">
                            <img :src="item.image"
                                 :alt="item.name + ' - ' + item.tagline"
                                 loading="lazy"
                                 class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/10"></div>

                            <!-- Top Left: Taste Profile Pill -->
                            <div class="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-dark/90 backdrop-blur-md text-white text-xs font-bold border border-white/15">
                                <svg class="size-3.5 text-brand-amber" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                </svg>
                                <span x-text="item.taste"></span>
                            </div>

                            <!-- Top Right: Real-Time Urgency Quota Badge -->
                            <div class="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-md flex items-center gap-1.5"
                                 :class="(item.remaining - item.qty) <= 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-white/95 text-brand-dark'"
                                 aria-live="polite">
                                <span class="size-2 rounded-full" :class="(item.remaining - item.qty) <= 10 ? 'bg-white' : 'bg-emerald-500'" aria-hidden="true"></span>
                                <span x-text="(item.remaining - item.qty) > 0 ? 'Sisa ' + (item.remaining - item.qty) + ' / ' + item.initialQuota + ' Porsi' : 'Kuota Habis'"></span>
                            </div>

                            <!-- Bottom Overlay: Price Tag & Nutrition Metadata -->
                            <div class="absolute bottom-4 inset-x-4 z-10 flex items-end justify-between text-white">
                                <div>
                                    <span class="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block" x-text="item.calories"></span>
                                    <h3 class="font-heading font-extrabold text-2xl sm:text-3xl leading-tight" x-text="item.name"></h3>
                                </div>
                                <div class="bg-brand-orange text-white px-4 py-2 rounded-2xl shadow-brand text-right shrink-0">
                                    <span class="text-[10px] uppercase font-bold block opacity-90 leading-none">Harga PO</span>
                                    <span class="font-heading font-extrabold text-lg sm:text-xl leading-none">Rp18.000</span>
                                </div>
                            </div>
                        </div>

                        <!-- Card Content Body -->
                        <div class="p-6 space-y-5">
                            <div>
                                <p class="text-xs font-bold text-brand-orange uppercase tracking-wide" x-text="item.tagline"></p>
                                <p class="text-zinc-600 text-sm sm:text-base leading-relaxed mt-2" x-text="item.description"></p>
                            </div>

                            <!-- Bento Ingredient Breakdown Pills -->
                            <div>
                                <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">Komponen di Dalam Box:</span>
                                <div class="grid grid-cols-2 gap-2">
                                    <template x-for="h in item.highlights" :key="h">
                                        <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-paper border border-brand-border text-xs font-semibold text-zinc-800">
                                            <svg class="size-3.5 text-brand-orange shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                                            <span class="truncate" x-text="h"></span>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <!-- Interactive Sauce / Spice Level Selector (Product Customizer) -->
                            <div>
                                <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">Pilih Varian Saus / Bumbu:</span>
                                <div class="flex flex-wrap gap-2">
                                    <template x-for="flavor in item.flavors" :key="flavor">
                                        <button type="button"
                                                @click="selectFlavor(index, flavor)"
                                                class="btn-tactile px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[38px]"
                                                :class="item.selectedFlavor === flavor ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-zinc-700 border-brand-border hover:border-brand-orange'">
                                            <span x-text="flavor"></span>
                                        </button>
                                    </template>
                                </div>
                            </div>

                            <!-- Real-Time Batch Quota Progress Bar -->
                            <div class="bg-brand-paper p-3.5 rounded-2xl border border-brand-border space-y-2">
                                <div class="flex items-center justify-between text-xs">
                                    <span class="font-bold text-zinc-700">Ketersediaan Batch Aktif</span>
                                    <span class="font-extrabold"
                                          :class="(item.remaining - item.qty) <= 10 ? 'text-red-600' : 'text-brand-orange'"
                                          x-text="(item.soldQty + item.qty) + ' Terpesan • Sisa ' + Math.max(0, item.remaining - item.qty) + ' Porsi'"></span>
                                </div>
                                <div class="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                                    <div class="h-full rounded-full transition-all duration-300"
                                         :class="(item.remaining - item.qty) <= 10 ? 'bg-red-500' : 'bg-gradient-to-r from-brand-amber to-brand-orange'"
                                         :style="'width: ' + Math.min(100, Math.round(((item.soldQty + item.qty) / item.initialQuota) * 100)) + '%'"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Card Footer: Thumb-Friendly Stepper Controls (Min 44x44px Touch Target) -->
                    <div class="px-6 pb-6 pt-2">
                        <div class="pt-4 border-t border-brand-border flex items-center justify-between gap-3">
                            <div>
                                <span class="text-xs font-medium text-zinc-500 block">Subtotal Item</span>
                                <span class="font-heading font-extrabold text-xl text-brand-dark"
                                      x-text="item.qty > 0 ? formatRupiah(item.qty * item.price) : 'Rp18.000'"></span>
                            </div>

                            <!-- State 1: Qty == 0 -->
                            <template x-if="item.qty === 0">
                                <div class="flex items-center gap-2">
                                    <button type="button"
                                            @click="increment(index, 2)"
                                            :disabled="item.remaining < 2"
                                            title="Tambah 2 Porsi Sekaligus"
                                            class="btn-tactile hidden sm:inline-flex items-center justify-center px-3.5 py-3 rounded-2xl font-bold text-xs text-brand-orange bg-orange-50 hover:bg-orange-100 border border-orange-200 disabled:opacity-40 cursor-pointer min-h-[46px]">
                                        +2 Bestie
                                    </button>
                                    <button type="button"
                                            @click="increment(index, 1)"
                                            :disabled="item.remaining === 0"
                                            class="btn-tactile px-6 py-3.5 rounded-2xl font-heading font-bold text-sm text-white bg-brand-orange hover:bg-brand-orange-hover disabled:bg-zinc-300 disabled:cursor-not-allowed shadow-brand cursor-pointer min-h-[46px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">
                                        <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                        <span x-text="item.remaining > 0 ? 'Pesan Sekarang' : 'Habis'"></span>
                                    </button>
                                </div>
                            </template>

                            <!-- State 2: Qty > 0 (Tactile Stepper) -->
                            <template x-if="item.qty > 0">
                                <div class="flex items-center gap-1.5 bg-orange-50 border-2 border-brand-orange rounded-2xl p-1">
                                    <button type="button"
                                            @click="decrement(index)"
                                            aria-label="Kurangi porsi"
                                            class="btn-tactile size-11 rounded-xl bg-white hover:bg-zinc-100 text-brand-dark font-extrabold flex items-center justify-center shadow-sm cursor-pointer">
                                        <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    </button>
                                    <span class="w-10 text-center font-heading font-extrabold text-lg text-brand-dark" x-text="item.qty" aria-live="polite"></span>
                                    <button type="button"
                                            @click="increment(index, 1)"
                                            :disabled="item.qty >= item.remaining"
                                            aria-label="Tambah porsi"
                                            class="btn-tactile size-11 rounded-xl bg-brand-orange hover:bg-brand-orange-hover disabled:bg-zinc-300 text-white font-extrabold flex items-center justify-center shadow-sm cursor-pointer">
                                        <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    </button>
                                </div>
                            </template>
                        </div>

                        <!-- Catatan Tambahan Item -->
                        <div x-show="item.qty > 0" x-transition class="mt-3">
                            <label :for="'note-' + item.id" class="sr-only">Catatan tambahan</label>
                            <input type="text"
                                   :id="'note-' + item.id"
                                   x-model="item.notes"
                                   placeholder="Catatan khusus (cth: tidak pakai bawang / ekstra saus)..."
                                   class="w-full h-11 px-3.5 rounded-xl bg-brand-paper border border-brand-border text-xs sm:text-sm text-brand-dark placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-orange">
                        </div>
                    </div>
                </article>
            </template>
        </div>
    </section>

    <!-- 4. SOCIAL PROOF & TESTIMONI MAHASISWA (UI/UX Pro Max Pattern #2 & #19) -->
    <section aria-labelledby="heading-testimoni" class="mb-14">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
                <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange block">Social Proof • Kata Mereka</span>
                <h2 id="heading-testimoni" class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark">Kenapa Anak Kampus Ketagihan LiChick?</h2>
            </div>
            <span class="text-xs font-semibold text-zinc-500">Review asli pelanggan batch harian</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <!-- Review 1 -->
            <div class="bg-white rounded-3xl p-6 border border-brand-border shadow-card flex flex-col justify-between space-y-4">
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1 text-brand-amber" aria-label="Rating 5 dari 5 bintang">
                            <template x-for="i in 5"><svg class="size-4 fill-current" width="16" height="16" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></template>
                        </div>
                        <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-brand-orange">Mac Gemoy</span>
                    </div>
                    <p class="text-sm text-zinc-700 leading-relaxed">
                        "Saus kejunya beneran lumer dan gurih banget, bukan keju encer. Ayam crispy-nya juga gede-gede. Buat harga Rp18.000 ini mengenyangkan banget buat makan siang habis kelas!"
                    </p>
                </div>
                <div class="flex items-center gap-3 pt-3 border-t border-brand-border">
                    <div class="size-10 rounded-full bg-orange-100 text-brand-orange font-bold text-xs flex items-center justify-center">ND</div>
                    <div>
                        <div class="text-xs font-bold text-brand-dark">Nadia Putri</div>
                        <div class="text-[11px] text-zinc-500">Mahasiswi • Fakultas Ekonomi</div>
                    </div>
                </div>
            </div>

            <!-- Review 2 -->
            <div class="bg-white rounded-3xl p-6 border border-brand-border shadow-card flex flex-col justify-between space-y-4">
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1 text-brand-amber" aria-label="Rating 5 dari 5 bintang">
                            <template x-for="i in 5"><svg class="size-4 fill-current" width="16" height="16" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></template>
                        </div>
                        <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900">Fries Gemoy</span>
                    </div>
                    <p class="text-sm text-zinc-700 leading-relaxed">
                        "Enaknya sistem batch PO gini pas kita ambil jam 12 siang, kentang sama ayamnya beneran baru diangkat dari penggorengan. Nggak perlu antre lama di kantin."
                    </p>
                </div>
                <div class="flex items-center gap-3 pt-3 border-t border-brand-border">
                    <div class="size-10 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">RK</div>
                    <div>
                        <div class="text-xs font-bold text-brand-dark">Raka Pratama</div>
                        <div class="text-[11px] text-zinc-500">Mahasiswa • Teknik Informatika</div>
                    </div>
                </div>
            </div>

            <!-- Review 3 -->
            <div class="bg-white rounded-3xl p-6 border border-brand-border shadow-card flex flex-col justify-between space-y-4">
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1 text-brand-amber" aria-label="Rating 5 dari 5 bintang">
                            <template x-for="i in 5"><svg class="size-4 fill-current" width="16" height="16" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></template>
                        </div>
                        <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800">Mix 2 Menu</span>
                    </div>
                    <p class="text-sm text-zinc-700 leading-relaxed">
                        "Sering patungan bareng temen sekelas beli Mac Gemoy + Fries Gemoy. Kalau kuota batch udah tinggal dikit suka deg-degan takut kehabisan!"
                    </p>
                </div>
                <div class="flex items-center gap-3 pt-3 border-t border-brand-border">
                    <div class="size-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">AL</div>
                    <div>
                        <div class="text-xs font-bold text-brand-dark">Alya Zahra</div>
                        <div class="text-[11px] text-zinc-500">Mahasiswi • Ilmu Komunikasi</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 5. CARA PESAN & FAQ ACCORDION (UI/UX Pro Max Funnel & FAQ Pattern) -->
    <section id="cara-pesan" aria-labelledby="heading-faq" class="mb-10 scroll-mt-24">
        <div class="bg-white rounded-3xl p-6 sm:p-9 border border-brand-border shadow-card grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div class="lg:col-span-5 space-y-3">
                <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange block">Tanya Jawab • Sistem PO</span>
                <h2 id="heading-faq" class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark leading-tight">
                    Pertanyaan Seputar Pre-Order LiChick
                </h2>
                <p class="text-sm text-zinc-600 leading-relaxed">
                    Sistem pre-order per batch memastikan setiap box Mac Gemoy &amp; Fries Gemoy disajikan hangat, renyah, dan tidak ada bahan yang terbuang.
                </p>
            </div>

            <div class="lg:col-span-7 space-y-3">
                <!-- FAQ Item 1 -->
                <div class="border border-brand-border rounded-2xl overflow-hidden">
                    <button type="button"
                            @click="activeFaq = activeFaq === 1 ? null : 1"
                            class="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-brand-dark hover:bg-brand-paper transition-colors cursor-pointer">
                        <span>Kenapa kuotanya dibatasi 50 porsi per menu di setiap batch?</span>
                        <svg class="size-4 text-brand-orange shrink-0 transition-transform duration-200" :class="activeFaq === 1 ? 'rotate-180' : ''" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div x-show="activeFaq === 1" x-collapse class="px-5 pb-4 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                        Kami menjaga kualitas gorengan ayam crispy dan tingkat kelumeran saus keju. Dengan batas 50 porsi Mac Gemoy &amp; 50 porsi Fries Gemoy per batch, semua pesanan selesai tepat waktu dalam kondisi hangat.
                    </div>
                </div>

                <!-- FAQ Item 2 -->
                <div class="border border-brand-border rounded-2xl overflow-hidden">
                    <button type="button"
                            @click="activeFaq = activeFaq === 2 ? null : 2"
                            class="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-brand-dark hover:bg-brand-paper transition-colors cursor-pointer">
                        <span>Bagaimana cara mengambil pesanan atau diantar kurir kampus?</span>
                        <svg class="size-4 text-brand-orange shrink-0 transition-transform duration-200" :class="activeFaq === 2 ? 'rotate-180' : ''" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div x-show="activeFaq === 2" x-collapse class="px-5 pb-4 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                        Saat checkout, kamu bebas memilih <strong>Ambil di Booth</strong> (tanpa antre, cukup tunjukkan kode pesanan) atau <strong>Kurir Kampus</strong> (diantar langsung ke lobby fakultas/kos sesuai slot waktu batch).
                    </div>
                </div>

                <!-- FAQ Item 3 -->
                <div class="border border-brand-border rounded-2xl overflow-hidden">
                    <button type="button"
                            @click="activeFaq = activeFaq === 3 ? null : 3"
                            class="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-brand-dark hover:bg-brand-paper transition-colors cursor-pointer">
                        <span>Apakah bisa konfirmasi pesanan langsung lewat WhatsApp?</span>
                        <svg class="size-4 text-brand-orange shrink-0 transition-transform duration-200" :class="activeFaq === 3 ? 'rotate-180' : ''" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div x-show="activeFaq === 3" x-collapse class="px-5 pb-4 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                        Bisa! Di jendela checkout kami menyediakan tombol <strong>Kirim &amp; Simpan di Web</strong> maupun tombol <strong>Checkout Cepat via WhatsApp</strong> yang otomatis menyusun teks pesananmu secara rapi.
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 6. FLOATING THUMB-FRIENDLY CART DOCK -->
    <div x-show="totalPortions > 0"
         x-cloak
         x-transition:enter="transition ease-out duration-250 transform"
         x-transition:enter-start="translate-y-24 opacity-0"
         x-transition:enter-end="translate-y-0 opacity-100"
         class="fixed bottom-4 inset-x-4 z-40 max-w-2xl mx-auto">

        <div class="bg-brand-dark text-white rounded-3xl p-3.5 sm:p-4 shadow-floating border border-brand-charcoal flex items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
                <div class="size-12 rounded-2xl bg-brand-orange flex items-center justify-center text-white font-heading font-extrabold text-xl shadow-brand shrink-0"
                     x-text="totalPortions"
                     aria-live="polite"></div>
                <div>
                    <span class="text-[11px] font-medium text-zinc-400 block leading-tight" x-text="batchName"></span>
                    <span class="font-heading font-extrabold text-lg sm:text-xl text-brand-amber" x-text="formatRupiah(totalPrice)"></span>
                </div>
            </div>

            <button type="button"
                    @click="drawerOpen = true; haptic()"
                    class="btn-tactile px-6 py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white font-heading font-bold text-sm sm:text-base shadow-brand flex items-center gap-2 cursor-pointer min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                <span>Checkout Sekarang</span>
                <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
        </div>
    </div>

    <!-- 7. DUAL-MODE CHECKOUT DRAWER (DATABASE + DIRECT WHATSAPP VERCEL-READY) -->
    <div x-show="drawerOpen"
         x-cloak
         role="dialog"
         aria-modal="true"
         aria-labelledby="modal-checkout-title"
         class="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">

        <div @click.away="drawerOpen = false"
             x-show="drawerOpen"
             x-transition:enter="transition ease-out duration-250 transform"
             x-transition:enter-start="translate-y-full sm:translate-y-8 opacity-0"
             x-transition:enter-end="translate-y-0 opacity-100"
             class="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-brand-border overflow-hidden max-h-[92dvh] flex flex-col">

            <!-- Modal Header -->
            <div class="px-6 py-4 bg-brand-dark text-white flex items-center justify-between shrink-0">
                <div>
                    <span class="text-[10px] uppercase tracking-widest text-brand-amber font-extrabold block">Konfirmasi Pre-Order</span>
                    <h3 id="modal-checkout-title" class="font-heading font-extrabold text-lg sm:text-xl">Keranjang &amp; Pembayaran LiChick</h3>
                </div>
                <button type="button"
                        @click="drawerOpen = false"
                        aria-label="Tutup jendela checkout"
                        class="btn-tactile size-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer">
                    <svg class="size-5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <!-- Form Checkout -->
            <form action="{{ route('preorder.checkout') }}" method="POST" enctype="multipart/form-data" class="p-6 overflow-y-auto space-y-5">
                @csrf
                <input type="hidden" name="batch_id" :value="batchId">

                <!-- Ringkasan Item -->
                <div class="bg-brand-paper border border-brand-border rounded-2xl p-4 space-y-3">
                    <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                        <span>Rincian Pesanan</span>
                        <span class="text-brand-orange" x-text="batchName"></span>
                    </div>

                    <template x-for="(item, index) in items" :key="item.id">
                        <div x-show="item.qty > 0" class="flex items-center justify-between text-sm py-2 border-b border-brand-border/60 last:border-none">
                            <div>
                                <div class="flex items-center gap-1.5">
                                    <span class="font-bold text-brand-dark" x-text="item.name"></span>
                                    <span class="text-xs font-extrabold text-brand-orange px-2 py-0.5 rounded-md bg-orange-50" x-text="'x' + item.qty"></span>
                                </div>
                                <p class="text-[11px] font-medium text-zinc-500 mt-0.5"
                                   x-text="'Varian: ' + item.selectedFlavor + (item.notes ? ' • ' + item.notes : '')"></p>
                            </div>
                            <span class="font-heading font-bold text-brand-dark" x-text="formatRupiah(item.qty * item.price)"></span>

                            <input type="hidden" :name="`items[${index}][product_id]`" :value="item.id">
                            <input type="hidden" :name="`items[${index}][quantity]`" :value="item.qty">
                            <input type="hidden" :name="`items[${index}][item_notes]`" :value="item.selectedFlavor + (item.notes ? ' - ' + item.notes : '')">
                        </div>
                    </template>

                    <div class="pt-3 flex items-center justify-between border-t border-brand-border">
                        <span class="font-bold text-sm text-zinc-700">Total Pembayaran</span>
                        <span class="font-heading font-extrabold text-2xl text-brand-orange" x-text="formatRupiah(totalPrice)"></span>
                    </div>
                </div>

                <!-- Data Pemesan -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="customer_name" class="block text-xs font-bold text-zinc-700 mb-1.5">Nama Lengkap *</label>
                        <input type="text" id="customer_name" name="customer_name" x-model="customerName" autocomplete="name" required
                               placeholder="Cth: Farhan Rayhan"
                               class="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange">
                    </div>
                    <div>
                        <label for="customer_whatsapp" class="block text-xs font-bold text-zinc-700 mb-1.5">Nomor WhatsApp Aktif *</label>
                        <input type="tel" id="customer_whatsapp" name="customer_whatsapp" x-model="customerWhatsapp" inputmode="tel" autocomplete="tel" required
                               placeholder="Cth: 081234567890"
                               class="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange">
                    </div>
                </div>

                <!-- Metode Pengambilan & Slot Waktu -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <span class="block text-xs font-bold text-zinc-700 mb-1.5">Metode Pengambilan *</span>
                        <div class="grid grid-cols-2 gap-2">
                            <label class="cursor-pointer">
                                <input type="radio" name="delivery_method" value="pickup" x-model="deliveryMethod" class="peer sr-only">
                                <div class="h-11 rounded-xl border-2 border-zinc-200 peer-checked:border-brand-orange peer-checked:bg-orange-50 peer-checked:text-brand-orange flex items-center justify-center text-xs font-bold transition-colors">
                                    Ambil di Booth
                                </div>
                            </label>
                            <label class="cursor-pointer">
                                <input type="radio" name="delivery_method" value="delivery" x-model="deliveryMethod" class="peer sr-only">
                                <div class="h-11 rounded-xl border-2 border-zinc-200 peer-checked:border-brand-orange peer-checked:bg-orange-50 peer-checked:text-brand-orange flex items-center justify-center text-xs font-bold transition-colors">
                                    Kurir Kampus
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label for="pickup_time_slot" class="block text-xs font-bold text-zinc-700 mb-1.5">Jam Ambil / Kirim *</label>
                        <select id="pickup_time_slot" name="pickup_time_slot" x-model="pickupSlot"
                                class="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange">
                            <option value="11:30 - 12:15 WIB">11:30 - 12:15 WIB (Batch Siang 1)</option>
                            <option value="12:15 - 13:00 WIB">12:15 - 13:00 WIB (Batch Siang 2)</option>
                            <option value="15:30 - 16:15 WIB">15:30 - 16:15 WIB (Batch Sore 1)</option>
                            <option value="16:15 - 17:00 WIB">16:15 - 17:00 WIB (Batch Sore 2)</option>
                        </select>
                    </div>
                </div>

                <!-- Alamat Antar -->
                <div x-show="deliveryMethod === 'delivery'" x-transition>
                    <label for="delivery_address" class="block text-xs font-bold text-zinc-700 mb-1.5">Alamat Lengkap / Titik Temu Kampus *</label>
                    <textarea id="delivery_address" name="delivery_address" x-model="deliveryAddress" rows="2"
                              placeholder="Cth: Lobby Gedung Fasilkom / Kos Melati No. 14"
                              class="w-full p-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"></textarea>
                </div>

                <!-- Informasi Pembayaran & 1-Click Copy -->
                <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-amber-950 uppercase tracking-wide">Transfer Pembayaran Resmi</span>
                        <span class="text-[11px] font-bold text-brand-orange bg-white px-2.5 py-0.5 rounded-md border border-amber-200">
                            LUCUIH FOOD
                        </span>
                    </div>

                    <div class="bg-white p-3.5 rounded-xl border border-amber-300 flex items-center justify-between gap-2">
                        <div>
                            <span class="text-[10px] uppercase font-bold text-zinc-400 block">BCA / SeaBank / GoPay:</span>
                            <span class="font-mono font-extrabold text-base text-brand-dark">7810 9928 11</span>
                            <span class="text-xs text-zinc-500 block">a.n. LiChick LUCUIH FOOD</span>
                        </div>
                        <button type="button"
                                @click="copyAccount"
                                class="btn-tactile px-3.5 py-2.5 rounded-xl bg-brand-dark hover:bg-black text-white text-xs font-bold cursor-pointer shrink-0 min-h-[40px]">
                            <span x-text="copied ? 'Tersalin!' : 'Salin No. Rek'"></span>
                        </button>
                    </div>

                    <div>
                        <label for="payment_proof" class="block text-xs font-bold text-zinc-700 mb-1.5">
                            Upload Bukti Transfer (Opsional jika kirim via WhatsApp)
                        </label>
                        <input type="file" id="payment_proof" name="payment_proof" accept="image/*"
                               @change="handleFilePreview"
                               class="w-full text-xs text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-dark file:text-white hover:file:bg-black cursor-pointer">

                        <template x-if="proofPreview">
                            <div class="mt-3 flex items-center gap-3 p-2 rounded-xl bg-white border border-zinc-200">
                                <img :src="proofPreview" alt="Preview Bukti Transfer" class="size-16 rounded-lg object-cover border border-zinc-200">
                                <span class="text-xs font-semibold text-emerald-700">Bukti transfer siap dikirim!</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Confirmation Ticket Banner After Cloud Order -->
                <template x-if="lastCreatedTicket">
                    <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2.5 text-emerald-950">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Tiket Tercatat di Google Sheets</span>
                            <span class="font-mono font-extrabold text-sm bg-white px-2.5 py-1 rounded-lg border border-emerald-200" x-text="lastCreatedTicket"></span>
                        </div>
                        <p class="text-xs text-emerald-800 leading-relaxed">
                            Pesanan kamu sudah masuk ke rekap dapur &amp; jendela WhatsApp telah dibuka. Kamu juga bisa melacak status pesananmu kapan saja:
                        </p>
                        <a :href="'{{ route('preorder.track') }}?order_number=' + lastCreatedTicket"
                           class="btn-tactile w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                            <span>Lacak Status Tiket <span class="font-mono" x-text="lastCreatedTicket"></span></span>
                            <svg class="size-3.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </a>
                    </div>
                </template>

                <!-- Primary Action CTA: Kombinasi WhatsApp + Google Sheets (Serverless Ready for Vercel) -->
                <div class="space-y-2.5 pt-1">
                    <button type="button"
                            @click="checkoutViaWhatsApp"
                            :disabled="isSubmittingCloud"
                            class="btn-tactile w-full py-4 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-60 text-white font-heading font-bold text-sm sm:text-base shadow-brand cursor-pointer min-h-[54px] flex items-center justify-center gap-2.5">
                        <svg class="size-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span x-text="isSubmittingCloud ? 'Mencatat ke Google Sheets...' : 'Pesan Sekarang (Otomatis Google Sheets + WhatsApp)'"></span>
                    </button>

                    <button type="submit"
                            x-show="proofPreview"
                            x-cloak
                            class="btn-tactile w-full py-3 rounded-2xl bg-brand-dark hover:bg-black text-white font-heading font-bold text-xs cursor-pointer min-h-[44px] flex items-center justify-center gap-2">
                        <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Simpan Juga Bukti Transfer ke Server Lokal</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

</div>
@endsection
