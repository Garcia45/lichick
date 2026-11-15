@extends('layouts.app')

@section('title', 'Kitchen Display & Admin Dashboard — LiChick by LUCUIH')

@section('content')
@php
    // Hitung proporsi penjualan Mac Gemoy vs Fries Gemoy dari kuota batch
    $macSold = 0;
    $macTotalQuota = 0;
    $friesSold = 0;
    $friesTotalQuota = 0;

    foreach ($batches as $b) {
        foreach ($b->productQuotas as $q) {
            if (str_contains(strtolower($q->product->name ?? ''), 'mac')) {
                $macSold += $q->sold_qty;
                $macTotalQuota += $q->initial_quota;
            } else {
                $friesSold += $q->sold_qty;
                $friesTotalQuota += $q->initial_quota;
            }
        }
    }

    $combinedSold = $macSold + $friesSold;
    $combinedQuota = max(1, $macTotalQuota + $friesTotalQuota);
    $macSharePct = $combinedSold > 0 ? round(($macSold / $combinedSold) * 100) : 50;
    $friesSharePct = $combinedSold > 0 ? (100 - $macSharePct) : 50;
    $capacityUtilizationPct = min(100, round(($combinedSold / $combinedQuota) * 100));
@endphp

<div x-data="{
        statusFilter: 'all',
        searchQuery: '',
        lightboxOpen: false,
        lightboxUrl: '',
        lightboxOrder: '',
        configOpen: false,
        webhookUrl: '',
        sheetUrl: '',
        adminWa: '6281234567890',
        syncNotice: '',
        cloudOrders: [],

        async init() {
            if (window.LICHICK_CLOUD) {
                this.webhookUrl = window.LICHICK_CLOUD.getWebhookUrl();
                this.sheetUrl = window.LICHICK_CLOUD.getSheetUrl();
                this.adminWa = window.LICHICK_CLOUD.getAdminWa();
                this.cloudOrders = window.LICHICK_CLOUD.getLocalOrders();
                const remote = await window.LICHICK_CLOUD.fetchSheetsData();
                if (remote && remote.ok && Array.isArray(remote.orders)) {
                    this.cloudOrders = remote.orders;
                }
            }
        },

        saveCloudConfig() {
            if (window.LICHICK_CLOUD) {
                window.LICHICK_CLOUD.saveConfig({
                    webhookUrl: this.webhookUrl,
                    sheetUrl: this.sheetUrl,
                    adminWa: this.adminWa
                });
                this.syncNotice = 'Konfigurasi Google Sheets & WhatsApp berhasil disimpan!';
                setTimeout(() => this.syncNotice = '', 3500);
            }
        },

        async sendTestRowToSheets() {
            if (!window.LICHICK_CLOUD) return;
            this.saveCloudConfig();
            this.syncNotice = 'Mengirim baris tes ke Google Sheets...';
            const testOrder = {
                timestamp: new Date().toISOString(),
                order_number: 'LCK-TEST-' + Math.floor(1000 + Math.random() * 9000),
                batch_date: '{{ $today }}',
                batch_name: 'Batch 1 — Makan Siang Kampus',
                pickup_slot: '11:30 - 13:00 WIB',
                customer_name: 'Tes Koneksi Dapur LiChick',
                customer_whatsapp: this.adminWa,
                delivery_method: 'pickup',
                delivery_address: '-',
                mac_qty: 1,
                mac_flavor: 'Original Cheese Lava',
                fries_qty: 1,
                fries_flavor: 'Original Cheese Dip',
                total_portions: 2,
                total_amount: 36000,
                order_status: 'waiting_payment',
                notes: 'Baris Pengujian Webhook'
            };
            await window.LICHICK_CLOUD.sendOrderToSheets(testOrder);
            this.cloudOrders = window.LICHICK_CLOUD.getLocalOrders();
            this.syncNotice = 'Berhasil! Silakan cek baris baru di Google Sheets Anda.';
            setTimeout(() => this.syncNotice = '', 4000);
        },

        formatRupiah(n) {
            return 'Rp' + new Intl.NumberFormat('id-ID').format(Number(n || 0));
        },

        openProof(url, orderNo) {
            this.lightboxUrl = url;
            this.lightboxOrder = orderNo;
            this.lightboxOpen = true;
        },
        matchesRow(status, paymentStatus, searchBlob) {
            const statusOk = this.statusFilter === 'all'
                || (this.statusFilter === 'unverified' && paymentStatus !== 'paid')
                || (this.statusFilter === status);
            const queryOk = this.searchQuery.trim() === ''
                || searchBlob.toLowerCase().includes(this.searchQuery.trim().toLowerCase());
            return statusOk && queryOk;
        }
     }"
     class="space-y-8">

    <!-- TOP ACTION BAR (KITCHEN OPERATING SYSTEM) -->
    <div class="bg-white p-6 sm:p-7 rounded-[28px] border border-brand-border shadow-card space-y-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-extrabold uppercase tracking-widest text-emerald-800">
                    <span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Kitchen Operating System • WhatsApp + Google Sheets Cloud</span>
                </div>
                <h1 class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark tracking-tight pt-1">
                    Dapur LiChick &amp; Kontrol Kuota Batch
                </h1>
                <p class="text-xs sm:text-sm text-brand-muted">
                    Pantau rekap pesanan otomatis dari <strong>Google Sheets + WhatsApp</strong> dan kontrol kuota <strong>50 porsi per menu</strong>.
                </p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
                <button type="button"
                        @click="configOpen = !configOpen"
                        class="btn-tactile min-h-[44px] px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2 shadow-xs">
                    <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                    <span>Integrasi Google Sheets &amp; WA</span>
                </button>

                <template x-if="sheetUrl">
                    <a :href="sheetUrl"
                       target="_blank"
                       rel="noopener"
                       class="btn-tactile min-h-[44px] px-4 rounded-2xl bg-brand-dark hover:bg-black text-white text-xs font-bold inline-flex items-center gap-1.5">
                        <span>Buka Tabel Google Sheets</span>
                        <svg class="size-3.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                </template>

                <a href="{{ route('preorder.index') }}"
                   class="btn-tactile min-h-[44px] px-4 rounded-2xl bg-brand-surface hover:bg-amber-200/70 text-brand-dark border border-brand-border text-xs font-bold inline-flex items-center gap-1.5">
                    <span>Lihat Katalog</span>
                    <svg class="size-3.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
            </div>
        </div>

        <!-- COLLAPSIBLE GOOGLE SHEETS & WHATSAPP WEBHOOK CONFIG PANEL -->
        <div x-show="configOpen" x-cloak x-transition class="pt-4 border-t border-brand-border space-y-4">
            <div class="p-4 rounded-2xl bg-brand-paper border border-brand-border space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-brand-orange block">Serverless Order Engine (Siap Deploy di Vercel)</span>
                        <h2 class="font-heading font-bold text-base text-brand-dark">Koneksi Otomatis WhatsApp + Google Sheets</h2>
                    </div>
                    <span class="text-xs font-semibold text-brand-muted">Kode Apps Script tersedia di file <code class="font-mono font-bold text-brand-dark">google-sheets-script.gs</code></span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                        <label class="block text-xs font-bold text-brand-dark mb-1">1. Google Apps Script Webhook URL (<code class="font-mono">/exec</code>)</label>
                        <input type="url"
                               x-model="webhookUrl"
                               placeholder="https://script.google.com/macros/s/.../exec"
                               class="w-full h-11 px-3.5 rounded-xl border border-brand-border bg-white text-xs font-mono text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-brand-dark mb-1">2. Link Tabel Google Sheets (Untuk Buka Cepat)</label>
                        <input type="url"
                               x-model="sheetUrl"
                               placeholder="https://docs.google.com/spreadsheets/d/..."
                               class="w-full h-11 px-3.5 rounded-xl border border-brand-border bg-white text-xs font-mono text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-brand-dark mb-1">3. Nomor WhatsApp Admin Dapur (Format 628...)</label>
                        <input type="tel"
                               x-model="adminWa"
                               placeholder="6281234567890"
                               class="w-full h-11 px-3.5 rounded-xl border border-brand-border bg-white text-xs font-mono font-bold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange">
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div class="text-xs font-bold text-emerald-700" x-text="syncNotice"></div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button"
                                @click="sendTestRowToSheets"
                                class="btn-tactile h-10 px-4 rounded-xl bg-brand-surface hover:bg-amber-200/80 text-brand-dark border border-brand-border text-xs font-bold cursor-pointer">
                            Test Kirim Baris ke Google Sheets
                        </button>
                        <button type="button"
                                @click="saveCloudConfig"
                                class="btn-tactile h-10 px-5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold cursor-pointer shadow-xs">
                            Simpan Konfigurasi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 1. BENTO KPI & MENU SHARE ANALYTICS ROW (ui-ux-pro-max charts.csv #2 & #18) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- KPI 1: Verified Revenue -->
        <div class="bg-white p-6 rounded-[24px] border border-brand-border shadow-card flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-brand-muted uppercase tracking-wider">Omset Terverifikasi (Lunas)</span>
                <span class="size-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                    <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </span>
            </div>
            <div>
                <div class="font-heading font-extrabold text-2xl sm:text-3xl text-emerald-600 tabular-nums tracking-tight">
                    Rp{{ number_format($dailySummary->verified_revenue ?? 0, 0, ',', '.') }}
                </div>
                <div class="flex items-center justify-between text-[11px] font-semibold text-brand-muted pt-1.5 border-t border-brand-border/60 mt-2">
                    <span>Gross Pipeline:</span>
                    <span class="font-bold text-brand-dark tabular-nums">Rp{{ number_format($dailySummary->gross_revenue ?? 0, 0, ',', '.') }}</span>
                </div>
            </div>
        </div>

        <!-- KPI 2: Total Portions Sold & Capacity Gauge -->
        <div class="bg-white p-6 rounded-[24px] border border-brand-border shadow-card flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-brand-muted uppercase tracking-wider">Total Box Gemoy Terjual</span>
                <span class="size-9 rounded-xl bg-orange-50 border border-orange-200 text-brand-orange flex items-center justify-center">
                    <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                </span>
            </div>
            <div>
                <div class="flex items-baseline gap-2">
                    <span class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-orange tabular-nums">
                        {{ $dailySummary->total_portions_sold ?? $combinedSold }}
                    </span>
                    <span class="text-xs font-bold text-brand-muted">/ {{ $combinedQuota }} Porsi Kapasitas</span>
                </div>
                <div class="mt-2.5 space-y-1">
                    <div class="h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                        <div class="h-full rounded-full bg-brand-orange transition-all duration-500" style="width: {{ $capacityUtilizationPct }}%"></div>
                    </div>
                    <div class="flex justify-between text-[10px] font-bold text-brand-muted tabular-nums">
                        <span>Utilisasi Dapur</span>
                        <span class="text-brand-dark">{{ $capacityUtilizationPct }}% Terisi</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- KPI 3: Total Order Tickets -->
        <div class="bg-white p-6 rounded-[24px] border border-brand-border shadow-card flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-brand-muted uppercase tracking-wider">Tiket Pesanan Masuk</span>
                <span class="size-9 rounded-xl bg-amber-100/80 border border-amber-300 text-brand-dark flex items-center justify-center">
                    <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </span>
            </div>
            <div>
                <div class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark tabular-nums">
                    {{ $dailySummary->total_orders ?? 0 }} <span class="text-sm font-semibold text-brand-muted">Tiket</span>
                </div>
                <div class="flex items-center justify-between text-[11px] font-semibold text-brand-muted pt-1.5 border-t border-brand-border/60 mt-2">
                    <span>Tanggal Aktif:</span>
                    <span class="font-mono font-bold text-brand-dark">{{ $today }}</span>
                </div>
            </div>
        </div>

        <!-- KPI 4: Menu Share Comparison Chart (charts.csv #2 Horizontal Proportion Bar) -->
        <div class="bg-white p-6 rounded-[24px] border border-brand-border shadow-card flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-brand-muted uppercase tracking-wider">Proporsi Menu Terlaris</span>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-brand-surface text-brand-orange border border-brand-border">Live Mix</span>
            </div>

            <div class="space-y-2">
                <!-- Stacked Horizontal Bar -->
                <div class="h-3 w-full rounded-full bg-amber-100 overflow-hidden flex p-0.5 gap-0.5">
                    <div class="h-full rounded-l-full bg-brand-orange transition-all duration-500"
                         style="width: {{ $macSharePct }}%"
                         title="Mac Gemoy: {{ $macSold }} porsi ({{ $macSharePct }}%)"></div>
                    <div class="h-full rounded-r-full bg-brand-yellow transition-all duration-500"
                         style="width: {{ $friesSharePct }}%"
                         title="Fries Gemoy: {{ $friesSold }} porsi ({{ $friesSharePct }}%)"></div>
                </div>

                <!-- Legend with Tabular Nums -->
                <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div class="flex items-center gap-1.5">
                        <span class="size-2.5 rounded-full bg-brand-orange shrink-0"></span>
                        <span class="font-bold text-brand-dark truncate">Mac:</span>
                        <span class="font-extrabold text-brand-orange tabular-nums">{{ $macSold }} ({{ $macSharePct }}%)</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="size-2.5 rounded-full bg-brand-yellow shrink-0"></span>
                        <span class="font-bold text-brand-dark truncate">Fries:</span>
                        <span class="font-extrabold text-amber-700 tabular-nums">{{ $friesSold }} ({{ $friesSharePct }}%)</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 2. BATCH QUOTA KITCHEN LIMIT CONTROL (50 PORSI PER MENU + BULLET GAUGES) -->
    <div class="bg-white rounded-[28px] p-6 sm:p-8 border border-brand-border shadow-card space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
                <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange">Capacity & Scarcity Engine</span>
                <h2 class="font-heading font-bold text-xl sm:text-2xl text-brand-dark">Kontrol Kuota Batch Dapur (Standar 50 Porsi / Menu)</h2>
            </div>
            <div class="inline-flex items-center gap-3 text-xs font-semibold text-brand-muted">
                <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-emerald-500"></span> Aman (&lt;60%)</span>
                <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-amber-500"></span> Ramai (60-85%)</span>
                <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-red-600"></span> Kritis (&gt;85%)</span>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            @foreach($batches as $batch)
                <div class="p-5 sm:p-6 rounded-2xl bg-brand-paper border border-brand-border space-y-5">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                                <svg class="size-3.5 text-brand-orange" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>Slot: {{ $batch->pickup_time_slot }}</span>
                            </div>
                            <h3 class="font-heading font-extrabold text-lg text-brand-dark mt-0.5">{{ $batch->name }}</h3>
                        </div>
                        <span class="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider {{ $batch->status === 'open' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300' }}">
                            {{ $batch->status }}
                        </span>
                    </div>

                    <div class="space-y-4 pt-3 border-t border-brand-border">
                        @foreach($batch->productQuotas as $quota)
                            @php
                                $initQ = max(1, $quota->initial_quota);
                                $soldQ = $quota->sold_qty;
                                $remQ  = $quota->remaining_quota;
                                $pctUsed = min(100, round(($soldQ / $initQ) * 100));
                                $barColor = $pctUsed > 85 ? 'bg-red-600' : ($pctUsed >= 60 ? 'bg-amber-500' : 'bg-emerald-500');
                            @endphp
                            <div class="p-4 rounded-2xl bg-white border border-brand-border/80 space-y-3">
                                <form action="{{ route('admin.quotas.update', $quota) }}" method="POST" class="flex flex-wrap items-center justify-between gap-3">
                                    @csrf
                                    @method('PATCH')
                                    <div class="space-y-0.5">
                                        <div class="flex items-center gap-2">
                                            <strong class="font-heading font-bold text-sm text-brand-dark">{{ $quota->product->name }}</strong>
                                            <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-surface text-brand-orange tabular-nums">
                                                Rp{{ number_format($quota->product->price, 0, ',', '.') }}
                                            </span>
                                        </div>
                                        <div class="text-xs font-medium text-brand-muted tabular-nums">
                                            Terjual: <strong class="text-brand-orange">{{ $soldQ }}</strong> •
                                            Sisa Kuota: <strong class="{{ $remQ <= 10 ? 'text-red-600' : 'text-emerald-700' }}">{{ $remQ }} porsi</strong>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <label for="quota-{{ $quota->id }}" class="text-[11px] font-bold text-brand-muted">Maks Kuota:</label>
                                        <input id="quota-{{ $quota->id }}"
                                               type="number"
                                               name="initial_quota"
                                               value="{{ $quota->initial_quota }}"
                                               min="{{ $quota->sold_qty }}"
                                               max="200"
                                               class="w-20 min-h-[40px] px-2.5 rounded-xl border border-brand-border text-center font-heading font-extrabold text-sm text-brand-dark bg-brand-paper tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-orange">
                                        <button type="submit"
                                                class="btn-tactile min-h-[40px] px-4 rounded-xl bg-brand-dark hover:bg-black text-white text-xs font-bold cursor-pointer">
                                            Simpan
                                        </button>
                                    </div>
                                </form>

                                <!-- Bullet Gauge Progress Bar -->
                                <div class="space-y-1">
                                    <div class="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                                        <div class="h-full rounded-full {{ $barColor }} transition-all duration-500" style="width: {{ $pctUsed }}%"></div>
                                    </div>
                                    <div class="flex justify-between text-[10px] font-bold text-brand-muted tabular-nums">
                                        <span>0 porsi</span>
                                        <span>{{ $pctUsed }}% Kuota Terpakai ({{ $soldQ }}/{{ $quota->initial_quota }})</span>
                                    </div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endforeach
        </div>
    </div>

    <!-- 3. ORDERS QUEUE, FILTER TABS & 1-CLICK VERIFICATION TABLE -->
    <div class="bg-white rounded-[28px] p-6 sm:p-8 border border-brand-border shadow-card space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
                <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange">Queue & Payment Verification</span>
                <h2 class="font-heading font-bold text-xl sm:text-2xl text-brand-dark">Antrean Pesanan & Approval Bukti Transfer</h2>
            </div>

            <!-- Instant Search Input -->
            <div class="relative w-full lg:w-72">
                <svg class="size-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="search"
                       x-model="searchQuery"
                       placeholder="Cari tiket, nama, atau WA..."
                       aria-label="Cari pesanan berdasarkan nomor tiket, nama, atau WhatsApp"
                       class="w-full min-h-[44px] pl-10 pr-4 rounded-2xl border border-brand-border bg-brand-paper text-xs font-semibold text-brand-dark placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-orange">
            </div>
        </div>

        <!-- Client-Side Filter Pills -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
            @php
                $filterTabs = [
                    ['key' => 'all',             'label' => 'Semua Tiket'],
                    ['key' => 'unverified',      'label' => 'Perlu Verifikasi TF'],
                    ['key' => 'processing',      'label' => 'Diproses Dapur'],
                    ['key' => 'ready_pickup',    'label' => 'Siap Diambil'],
                    ['key' => 'completed',       'label' => 'Selesai'],
                ];
            @endphp
            @foreach($filterTabs as $tab)
                <button type="button"
                        @click="statusFilter = '{{ $tab['key'] }}'"
                        :class="statusFilter === '{{ $tab['key'] }}'
                            ? 'bg-brand-orange text-white border-brand-orange shadow-xs'
                            : 'bg-brand-paper text-brand-muted border-brand-border hover:text-brand-dark'"
                        class="btn-tactile min-h-[40px] px-4 rounded-xl border text-xs font-bold whitespace-nowrap cursor-pointer transition-colors">
                    {{ $tab['label'] }}
                </button>
            @endforeach
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                    <tr class="border-b border-brand-border text-brand-muted uppercase text-[11px] font-extrabold tracking-wider">
                        <th class="py-3.5 px-3">Tiket & Slot Waktu</th>
                        <th class="py-3.5 px-3">Pelanggan & Kontak</th>
                        <th class="py-3.5 px-3">Detail Box Gemoy</th>
                        <th class="py-3.5 px-3">Nominal & Bukti TF</th>
                        <th class="py-3.5 px-3">Status Dapur & Aksi Cepat</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-brand-border/60">
                    <!-- CLOUD ORDERS (FROM GOOGLE SHEETS & WHATSAPP CHECKOUT) -->
                    <template x-for="co in cloudOrders" :key="co.order_number">
                        <tr x-show="matchesRow(co.order_status || 'waiting_payment', co.payment_status || 'pending_verification', (co.order_number + ' ' + co.customer_name + ' ' + co.customer_whatsapp))"
                            class="hover:bg-brand-paper/70 transition-colors bg-emerald-50/20">
                            <td class="py-4 px-3 align-top">
                                <a :href="'{{ route('preorder.track') }}?order_number=' + co.order_number"
                                   class="font-mono font-extrabold text-brand-dark hover:text-brand-orange underline decoration-dotted"
                                   x-text="co.order_number"></a>
                                <span class="block font-sans font-bold text-[11px] text-brand-orange mt-1"
                                      x-text="co.pickup_time_slot || co.pickup_slot"></span>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                                        Google Sheets
                                    </span>
                                    <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900"
                                          x-text="co.delivery_method || 'pickup'"></span>
                                </div>
                            </td>

                            <td class="py-4 px-3 align-top space-y-1">
                                <div class="font-heading font-bold text-brand-dark" x-text="co.customer_name"></div>
                                <div class="text-xs text-brand-muted font-mono" x-text="co.customer_whatsapp"></div>
                                <template x-if="co.delivery_address && co.delivery_address !== '-'">
                                    <p class="text-[11px] text-brand-muted max-w-[200px] leading-snug bg-brand-paper p-2 rounded-xl border border-brand-border/60"
                                       x-text="co.delivery_address"></p>
                                </template>
                            </td>

                            <td class="py-4 px-3 align-top space-y-1.5">
                                <template x-if="Number(co.mac_qty || 0) > 0">
                                    <div class="flex items-center justify-between gap-2 bg-brand-paper px-2.5 py-1.5 rounded-xl border border-brand-border/60">
                                        <span class="font-semibold text-brand-dark">Mac Gemoy</span>
                                        <strong class="px-2 py-0.5 rounded-md bg-brand-orange text-white text-xs tabular-nums" x-text="'x' + co.mac_qty"></strong>
                                    </div>
                                </template>
                                <template x-if="Number(co.fries_qty || 0) > 0">
                                    <div class="flex items-center justify-between gap-2 bg-brand-paper px-2.5 py-1.5 rounded-xl border border-brand-border/60">
                                        <span class="font-semibold text-brand-dark">Fries Gemoy</span>
                                        <strong class="px-2 py-0.5 rounded-md bg-brand-orange text-white text-xs tabular-nums" x-text="'x' + co.fries_qty"></strong>
                                    </div>
                                </template>
                            </td>

                            <td class="py-4 px-3 align-top space-y-1.5">
                                <div class="font-heading font-extrabold text-brand-orange text-base tabular-nums"
                                     x-text="formatRupiah(co.total_amount)"></div>
                                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wider">
                                    <span>Bukti via WA</span>
                                </span>
                            </td>

                            <td class="py-4 px-3 align-top">
                                <div class="flex flex-wrap items-center gap-2">
                                    <a :href="'https://wa.me/' + String(co.customer_whatsapp || '').replace(/[^0-9]/g, '').replace(/^0/, '62') + '?text=' + encodeURIComponent('Halo Kak ' + co.customer_name + '! Pesanan LiChick #' + co.order_number + ' sudah kami terima di Dapur LiChick dan sedang diproses ya!')"
                                       target="_blank"
                                       rel="noopener"
                                       class="btn-tactile min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
                                        <svg class="size-3.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                        <span>Balas &amp; Konfirmasi WA</span>
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </template>

                    @forelse($orders as $order)
                        @php
                            $cleanWa = preg_replace('/[^0-9]/', '', $order->customer_whatsapp);
                            if (str_starts_with($cleanWa, '0')) {
                                $cleanWa = '62' . substr($cleanWa, 1);
                            }
                            $waMessage = urlencode("Halo Kak {$order->customer_name}! Pesanan LiChick by LUCUIH dengan nomor tiket *{$order->order_number}* ({$order->formatted_total}) saat ini berstatus: *{$order->status_label}*. Terima kasih sudah pesan!");
                            $searchBlob = $order->order_number . ' ' . $order->customer_name . ' ' . $order->customer_whatsapp;
                        @endphp
                        <tr x-show="matchesRow('{{ $order->order_status }}', '{{ $order->payment_status }}', '{{ addslashes($searchBlob) }}')"
                            x-transition.opacity
                            class="hover:bg-brand-paper/70 transition-colors">
                            <td class="py-4 px-3 align-top">
                                <a href="{{ route('preorder.track', ['order_number' => $order->order_number]) }}"
                                   class="font-mono font-extrabold text-brand-dark hover:text-brand-orange underline decoration-dotted">
                                    {{ $order->order_number }}
                                </a>
                                <span class="block font-sans font-bold text-[11px] text-brand-orange mt-1">
                                    {{ $order->pickup_time_slot }}
                                </span>
                                <span class="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider {{ $order->delivery_method === 'pickup' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900' }}">
                                    {{ $order->delivery_method }}
                                </span>
                            </td>

                            <td class="py-4 px-3 align-top space-y-1">
                                <div class="font-heading font-bold text-brand-dark">{{ $order->customer_name }}</div>
                                <div class="text-xs text-brand-muted font-mono">{{ $order->customer_whatsapp }}</div>
                                @if($order->delivery_address)
                                    <p class="text-[11px] text-brand-muted max-w-[200px] leading-snug bg-brand-paper p-2 rounded-xl border border-brand-border/60">
                                        {{ $order->delivery_address }}
                                    </p>
                                @endif
                            </td>

                            <td class="py-4 px-3 align-top space-y-1.5">
                                @foreach($order->details as $detail)
                                    <div class="flex items-center justify-between gap-2 bg-brand-paper px-2.5 py-1.5 rounded-xl border border-brand-border/60">
                                        <span class="font-semibold text-brand-dark">{{ $detail->product_name_snapshot }}</span>
                                        <strong class="px-2 py-0.5 rounded-md bg-brand-orange text-white text-xs tabular-nums">x{{ $detail->quantity }}</strong>
                                    </div>
                                    @if($detail->item_notes)
                                        <div class="text-[11px] text-brand-muted italic pl-2">Catatan: {{ $detail->item_notes }}</div>
                                    @endif
                                @endforeach
                            </td>

                            <td class="py-4 px-3 align-top space-y-1.5">
                                <div class="font-heading font-extrabold text-brand-orange text-base tabular-nums">
                                    {{ $order->formatted_total }}
                                </div>

                                @if($order->payment_status === 'paid')
                                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wider">
                                        <svg class="size-3" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                                        <span>Lunas Terverifikasi</span>
                                    </span>
                                @else
                                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                                        <span>Menunggu Cek TF</span>
                                    </span>
                                @endif

                                @if($order->payment_proof_path)
                                    <div class="pt-1">
                                        <button type="button"
                                                @click="openProof('{{ asset('storage/' . $order->payment_proof_path) }}', '{{ $order->order_number }}')"
                                                class="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-amber-200/80 text-brand-dark border border-brand-border text-[11px] font-bold cursor-pointer">
                                            <svg class="size-3.5 text-brand-orange" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                            <span>Preview Bukti TF</span>
                                        </button>
                                    </div>
                                @endif
                            </td>

                            <td class="py-4 px-3 align-top">
                                <div class="flex flex-wrap items-center gap-2">
                                    @if($order->payment_status !== 'paid')
                                        <form action="{{ route('admin.orders.verify', $order) }}" method="POST">
                                            @csrf
                                            @method('PATCH')
                                            <button type="submit"
                                                    class="btn-tactile min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5">
                                                <svg class="size-3.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="20 6 9 17 4 12"/></svg>
                                                <span>Approve TF</span>
                                            </button>
                                        </form>
                                    @endif

                                    <form action="{{ route('admin.orders.status', $order) }}" method="POST">
                                        @csrf
                                        @method('PATCH')
                                        <label for="status-{{ $order->id }}" class="sr-only">Ubah Status Pesanan</label>
                                        <select id="status-{{ $order->id }}"
                                                name="order_status"
                                                onchange="this.form.submit()"
                                                class="min-h-[40px] px-3 rounded-xl border border-brand-border text-xs font-bold text-brand-dark bg-brand-paper focus:outline-none focus:ring-2 focus:ring-brand-orange cursor-pointer">
                                            <option value="waiting_payment" @selected($order->order_status === 'waiting_payment')>Menunggu Pembayaran</option>
                                            <option value="processing" @selected($order->order_status === 'processing')>Diproses Dapur</option>
                                            <option value="ready_pickup" @selected($order->order_status === 'ready_pickup')>Siap Diambil</option>
                                            <option value="completed" @selected($order->order_status === 'completed')>Selesai</option>
                                            <option value="cancelled" @selected($order->order_status === 'cancelled')>Batalkan (Kembalikan Kuota)</option>
                                        </select>
                                    </form>

                                    <!-- 1-Click WhatsApp Customer Notification -->
                                    <a href="https://wa.me/{{ $cleanWa }}?text={{ $waMessage }}"
                                       target="_blank"
                                       rel="noopener"
                                       title="Kirim update status ke WhatsApp pelanggan"
                                       class="btn-tactile min-h-[40px] px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5">
                                        <svg class="size-3.5 text-emerald-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                        <span>Kabari WA</span>
                                    </a>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="py-12 text-center space-y-2">
                                <div class="size-12 rounded-2xl bg-brand-surface text-brand-orange flex items-center justify-center mx-auto">
                                    <svg class="size-6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                </div>
                                <p class="font-heading font-bold text-base text-brand-dark">Belum ada tiket pesanan pada tanggal ini</p>
                                <p class="text-xs text-brand-muted">Pesanan pre-order yang masuk melalui website akan otomatis tampil di sini.</p>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if($orders->hasPages())
            <div class="pt-4 border-t border-brand-border">
                {{ $orders->withQueryString()->links() }}
            </div>
        @endif
    </div>

    <!-- LIGHTBOX MODAL UNTUK PREVIEW BUKTI TRANSFER -->
    <div x-show="lightboxOpen"
         x-cloak
         @keydown.escape.window="lightboxOpen = false"
         class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/75 backdrop-blur-xs">
        <div @click.outside="lightboxOpen = false"
             x-transition.scale.95.duration.200ms
             class="bg-white rounded-[28px] max-w-md w-full p-5 border border-brand-border shadow-floating space-y-4">
            <div class="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-brand-orange block">Bukti Pembayaran</span>
                    <h3 class="font-mono font-extrabold text-base text-brand-dark" x-text="lightboxOrder"></h3>
                </div>
                <button type="button"
                        @click="lightboxOpen = false"
                        aria-label="Tutup preview bukti transfer"
                        class="size-10 rounded-full bg-brand-paper hover:bg-amber-100 flex items-center justify-center text-brand-dark cursor-pointer">
                    <svg class="size-5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <div class="rounded-2xl overflow-hidden bg-brand-paper border border-brand-border max-h-[65vh] flex items-center justify-center">
                <img :src="lightboxUrl" :alt="'Bukti Transfer ' + lightboxOrder" class="max-h-[60vh] w-auto object-contain">
            </div>

            <div class="flex items-center justify-between gap-3 pt-1">
                <a :href="lightboxUrl"
                   target="_blank"
                   rel="noopener"
                   class="text-xs font-bold text-brand-orange hover:underline inline-flex items-center gap-1">
                    <span>Buka Resolusi Penuh</span>
                    <svg class="size-3.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                <button type="button"
                        @click="lightboxOpen = false"
                        class="btn-tactile min-h-[40px] px-5 rounded-xl bg-brand-dark text-white text-xs font-bold cursor-pointer">
                    Tutup
                </button>
            </div>
        </div>
    </div>

</div>
@endsection
