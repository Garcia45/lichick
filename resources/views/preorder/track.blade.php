@extends('layouts.app')

@section('title', 'Lacak Status Pesanan — LiChick by LUCUIH')

@section('content')
@php
    $serverOrderData = null;
    if ($order) {
        $serverOrderData = [
            'order_number'      => $order->order_number,
            'customer_name'     => $order->customer_name,
            'customer_whatsapp' => $order->customer_whatsapp,
            'batch_name'        => $order->batch?->name ?? 'Batch Harian',
            'pickup_time_slot'  => $order->pickup_time_slot,
            'delivery_method'   => $order->delivery_method,
            'delivery_address'  => $order->delivery_address,
            'total_amount'      => $order->total_amount,
            'order_status'      => $order->order_status,
            'details'           => $order->details->map(fn($d) => [
                'product_name_snapshot' => $d->product_name_snapshot,
                'quantity'              => $d->quantity,
                'subtotal'              => $d->subtotal,
                'item_notes'            => $d->item_notes,
            ])->values()->all(),
        ];
    }
@endphp

<div x-data="{
        query: {{ Js::from($queryNumber ?? '') }},
        loading: false,
        copied: false,
        activeOrder: {{ Js::from($serverOrderData) }},
        steps: [
            { key: 'waiting_payment', label: 'Verifikasi Bukti Transfer', desc: 'Kasir dapur sedang mencocokkan mutasi pembayaran dengan tiket pesananmu.' },
            { key: 'processing',      label: 'Sedang Dimasak Dapur',      desc: 'Ayam crispy baru digoreng hangat & saus keju lumer sedang diracik.' },
            { key: 'ready_pickup',    label: 'Siap Diambil / Dikirim Kurir', desc: 'Box Gemoy sudah dikemas rapi sesuai slot batch pengambilanmu.' },
            { key: 'completed',       label: 'Pesanan Selesai Dinikmati', desc: 'Terima kasih sudah memesan Mac Gemoy & Fries Gemoy hari ini!' }
        ],

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            const paramNo = urlParams.get('order_number');
            if (paramNo && !this.query) {
                this.query = paramNo.trim().toUpperCase();
            }
            if (this.query && !this.activeOrder) {
                await this.searchOrder();
            }
        },

        async searchOrder() {
            const code = (this.query || '').trim().toUpperCase();
            if (!code) return;
            this.query = code;
            this.loading = true;

            // 1. Cek di Browser Cache (Local Orders) terlebih dahulu agar instan
            if (window.LICHICK_CLOUD) {
                const localMatch = window.LICHICK_CLOUD.getLocalOrders().find(
                    o => String(o.order_number || '').toUpperCase() === code
                );
                if (localMatch) {
                    this.activeOrder = this.normalizeCloudOrder(localMatch);
                }

                // 2. Cek status terbaru secara live dari Google Sheets
                const cloudData = await window.LICHICK_CLOUD.fetchSheetsData(code);
                if (cloudData && cloudData.ok && cloudData.tracked_order) {
                    this.activeOrder = this.normalizeCloudOrder(cloudData.tracked_order);
                }
            }

            this.loading = false;
        },

        normalizeCloudOrder(raw) {
            let details = raw.details || [];
            if (!details.length) {
                if (Number(raw.mac_qty || 0) > 0) {
                    details.push({
                        product_name_snapshot: 'Mac Gemoy',
                        quantity: Number(raw.mac_qty),
                        subtotal: Number(raw.mac_qty) * 18000,
                        item_notes: raw.mac_flavor || ''
                    });
                }
                if (Number(raw.fries_qty || 0) > 0) {
                    details.push({
                        product_name_snapshot: 'Fries Gemoy',
                        quantity: Number(raw.fries_qty),
                        subtotal: Number(raw.fries_qty) * 18000,
                        item_notes: raw.fries_flavor || ''
                    });
                }
            }
            return {
                order_number: raw.order_number,
                customer_name: raw.customer_name || '-',
                customer_whatsapp: raw.customer_whatsapp || '-',
                batch_name: raw.batch_name || 'Batch Harian LiChick',
                pickup_time_slot: raw.pickup_time_slot || raw.pickup_slot || '-',
                delivery_method: raw.delivery_method || 'pickup',
                delivery_address: raw.delivery_address && raw.delivery_address !== '-' ? raw.delivery_address : null,
                total_amount: Number(raw.total_amount || 0),
                order_status: raw.order_status || 'waiting_payment',
                details: details
            };
        },

        get currentStepIndex() {
            if (!this.activeOrder) return -1;
            return this.steps.findIndex(s => s.key === this.activeOrder.order_status);
        },

        get progressPct() {
            const idx = this.currentStepIndex;
            return idx >= 0 ? Math.round(((idx + 1) / this.steps.length) * 100) : 25;
        },

        get statusLabel() {
            if (!this.activeOrder) return '';
            const map = {
                waiting_payment: 'Menunggu Verifikasi Pembayaran',
                processing: 'Diproses Dapur',
                ready_pickup: 'Siap Diambil / Dikirim',
                completed: 'Pesanan Selesai',
                cancelled: 'Dibatalkan'
            };
            return map[this.activeOrder.order_status] || this.activeOrder.order_status;
        },

        formatRupiah(num) {
            return 'Rp' + new Intl.NumberFormat('id-ID').format(Number(num || 0));
        },

        get waTrackUrl() {
            if (!this.activeOrder) return '#';
            const adminWa = window.LICHICK_CLOUD ? window.LICHICK_CLOUD.getAdminWa() : '6281234567890';
            const msg = `Halo Admin Dapur LiChick! Saya ingin menanyakan status pesanan saya dengan nomor tiket *${this.activeOrder.order_number}* atas nama *${this.activeOrder.customer_name}*.`;
            return `https://wa.me/${adminWa}?text=${encodeURIComponent(msg)}`;
        }
     }"
     class="max-w-2xl mx-auto space-y-6 sm:space-y-8">

    <!-- SEARCH CARD -->
    <div class="bg-white rounded-[28px] p-6 sm:p-8 border border-brand-border shadow-card space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surface border border-brand-border text-[11px] font-extrabold uppercase tracking-widest text-brand-orange">
            <span class="size-2 rounded-full bg-brand-orange animate-pulse"></span>
            <span>Live Kitchen Tracker • Google Sheets &amp; WhatsApp Sync</span>
        </div>

        <div class="space-y-1">
            <h1 class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark tracking-tight">
                Lacak Status Pesanan LiChick
            </h1>
            <p class="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Masukkan kode tiket pre-order kamu (contoh: <code class="font-mono font-bold text-brand-dark">LCK-...</code>) untuk memantau progres penggorengan ayam crispy &amp; racikan saus keju lumer dari dapur kami.
            </p>
        </div>

        <form @submit.prevent="searchOrder" action="{{ route('preorder.track') }}" method="GET" class="pt-1 flex flex-col sm:flex-row gap-2.5">
            <div class="relative flex-1">
                <svg class="size-4 text-brand-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text"
                       name="order_number"
                       x-model="query"
                       placeholder="Contoh: LCK-261115-4821"
                       aria-label="Masukkan Nomor Tiket Pesanan"
                       required
                       class="w-full min-h-[48px] pl-11 pr-4 rounded-2xl border border-brand-border bg-brand-paper text-sm font-mono font-bold uppercase text-brand-dark placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-orange">
            </div>
            <button type="submit"
                    :disabled="loading"
                    class="btn-tactile min-h-[48px] px-7 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white font-heading font-bold text-sm shadow-brand transition-all cursor-pointer inline-flex items-center justify-center gap-2">
                <span x-text="loading ? 'Mencari...' : 'Lacak Tiket'"></span>
                <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
        </form>
    </div>

    <!-- ORDER DETAIL & TIMELINE (Supports Both Google Sheets Cloud Orders & Local DB Orders) -->
    <template x-if="activeOrder">
        <div class="bg-white rounded-[28px] p-6 sm:p-8 border border-brand-border shadow-card space-y-6">
            <!-- Order Header -->
            <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-brand-border">
                <div class="space-y-1">
                    <span class="text-[11px] font-extrabold text-brand-muted uppercase tracking-wider block">Nomor Tiket Pre-Order</span>
                    <div class="flex items-center gap-2">
                        <h2 class="font-mono font-extrabold text-2xl sm:text-3xl text-brand-dark tracking-tight" x-text="activeOrder.order_number"></h2>
                        <button type="button"
                                @click="navigator.clipboard.writeText(activeOrder.order_number); copied = true; setTimeout(() => copied = false, 2000)"
                                class="btn-tactile px-2.5 py-1 rounded-lg bg-brand-surface hover:bg-amber-200/80 border border-brand-border text-[11px] font-bold text-brand-dark cursor-pointer inline-flex items-center gap-1">
                            <span x-show="!copied">Salin</span>
                            <span x-show="copied" x-cloak class="text-emerald-700">Tersalin!</span>
                        </button>
                    </div>
                </div>

                <div class="px-4 py-2 rounded-2xl font-heading font-bold text-xs uppercase tracking-wider border"
                     :class="activeOrder.order_status === 'cancelled' ? 'bg-red-100 text-red-900 border-red-300' : 'bg-amber-100 text-amber-950 border-amber-300'"
                     x-text="statusLabel">
                </div>
            </div>

            <!-- Progress Percentage Gauge -->
            <template x-if="activeOrder.order_status !== 'cancelled'">
                <div class="space-y-1.5">
                    <div class="flex justify-between text-xs font-bold text-brand-muted tabular-nums">
                        <span>Progres Dapur LiChick</span>
                        <span class="text-brand-orange font-extrabold" x-text="progressPct + '% Selesai'"></span>
                    </div>
                    <div class="h-2.5 w-full rounded-full bg-amber-100 overflow-hidden">
                        <div class="h-full rounded-full bg-brand-orange transition-all duration-500" :style="'width: ' + progressPct + '%'"></div>
                    </div>
                </div>
            </template>

            <!-- Visual Vertical Timeline -->
            <div class="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-brand-border">
                <template x-for="(step, idx) in steps" :key="step.key">
                    <div class="relative flex items-start gap-4">
                        <div class="absolute -left-6 sm:-left-8 size-7 sm:size-8 rounded-full flex items-center justify-center font-heading font-bold text-xs transition-colors"
                             :class="currentStepIndex >= idx ? 'bg-brand-orange text-white shadow-brand' : 'bg-brand-surface text-brand-muted border border-brand-border'">
                            <template x-if="currentStepIndex >= idx">
                                <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                            </template>
                            <template x-if="currentStepIndex < idx">
                                <span x-text="idx + 1"></span>
                            </template>
                        </div>

                        <div class="pl-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <h3 class="font-heading font-bold text-base"
                                    :class="currentStepIndex >= idx ? 'text-brand-dark' : 'text-brand-muted'"
                                    x-text="step.label"></h3>
                                <template x-if="currentStepIndex === idx">
                                    <span class="px-2.5 py-0.5 rounded-full bg-brand-orange text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                        Tahap Saat Ini
                                    </span>
                                </template>
                            </div>
                            <p class="text-xs sm:text-sm text-brand-muted mt-0.5 leading-relaxed" x-text="step.desc"></p>
                        </div>
                    </div>
                </template>
            </div>

            <!-- Receipt Breakdown -->
            <div class="bg-brand-paper rounded-2xl p-5 border border-brand-border space-y-3 text-xs sm:text-sm">
                <div class="flex justify-between items-center text-brand-muted">
                    <span>Nama Pemesan:</span>
                    <strong class="text-brand-dark" x-text="activeOrder.customer_name + ' (' + activeOrder.customer_whatsapp + ')'"></strong>
                </div>
                <div class="flex justify-between items-center text-brand-muted">
                    <span>Batch &amp; Slot Waktu:</span>
                    <strong class="text-brand-orange" x-text="activeOrder.batch_name + ' • ' + activeOrder.pickup_time_slot"></strong>
                </div>
                <div class="flex justify-between items-center text-brand-muted">
                    <span>Metode Pengambilan:</span>
                    <strong class="text-brand-dark uppercase" x-text="activeOrder.delivery_method"></strong>
                </div>
                <template x-if="activeOrder.delivery_address">
                    <div class="flex justify-between items-start text-brand-muted pt-1">
                        <span class="shrink-0">Alamat Pengiriman:</span>
                        <span class="text-right text-brand-dark font-medium max-w-[280px]" x-text="activeOrder.delivery_address"></span>
                    </div>
                </template>

                <div class="pt-3 border-t border-brand-border space-y-2">
                    <template x-for="(detail, dIdx) in activeOrder.details" :key="dIdx">
                        <div class="space-y-0.5">
                            <div class="flex justify-between items-center">
                                <span class="text-brand-dark font-medium">
                                    <span x-text="detail.product_name_snapshot"></span>
                                    <strong class="px-1.5 py-0.5 rounded-md bg-brand-surface text-brand-orange text-xs ml-1 tabular-nums" x-text="'x' + detail.quantity"></strong>
                                </span>
                                <span class="font-heading font-bold text-brand-dark tabular-nums" x-text="formatRupiah(detail.subtotal)"></span>
                            </div>
                            <template x-if="detail.item_notes && detail.item_notes !== '-'">
                                <div class="text-[11px] text-brand-muted italic" x-text="'Varian/Catatan: ' + detail.item_notes"></div>
                            </template>
                        </div>
                    </template>
                </div>

                <div class="pt-3 border-t border-brand-border flex justify-between items-center text-base font-heading font-extrabold text-brand-dark">
                    <span>Total Pembayaran</span>
                    <span class="text-brand-orange text-xl tabular-nums" x-text="formatRupiah(activeOrder.total_amount)"></span>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <a href="{{ route('preorder.index') }}"
                   class="btn-tactile w-full sm:w-auto min-h-[44px] px-5 rounded-2xl bg-brand-paper hover:bg-amber-100/70 text-brand-dark border border-brand-border text-xs font-bold inline-flex items-center justify-center gap-2">
                    <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    <span>Pesan Lagi di Katalog</span>
                </a>

                <a :href="waTrackUrl"
                   target="_blank"
                   rel="noopener"
                   class="btn-tactile w-full sm:w-auto min-h-[44px] px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs">
                    <svg class="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    <span>Hubungi Dapur via WhatsApp</span>
                </a>
            </div>
        </div>
    </template>

    <template x-if="!activeOrder && query && !loading">
        <div class="bg-white rounded-[28px] p-8 border border-brand-border shadow-card text-center space-y-3">
            <div class="size-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <svg class="size-7" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 class="font-heading font-bold text-lg text-brand-dark">Tiket Pesanan Belum Ditemukan</h2>
            <p class="text-xs sm:text-sm text-brand-muted max-w-md mx-auto">
                Kode tiket <strong class="font-mono text-brand-dark" x-text="query"></strong> belum terdaftar. Pastikan kode tiket sesuai atau konfirmasi langsung ke WhatsApp Dapur LiChick.
            </p>
        </div>
    </template>

</div>
@endsection
