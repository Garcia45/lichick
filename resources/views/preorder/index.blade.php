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
            'tagline'      => $isMac ? 'Makaroni Lembut + Ayam Crispy + Saus Keju Lumer' : 'Kentang Goreng Renyah + Ayam Crispy + Bumbu Rahasia',
            'description'  => $product->description,
            'badge'        => $product->ingredients_badge,
            'price'        => $product->price,
            'initialQuota' => $initialQuota,
            'soldQty'      => $soldQty,
            'remaining'    => $remaining,
            'qty'          => 0,
            'notes'        => '',
            'highlights'   => $isMac 
                ? ['Makaroni Al-Dente', '100% Ayam Crispy Juicy', 'Saus Keju Melimpah', 'Kemasan Box 450ml']
                : ['Golden French Fries', 'Crispy Chicken Popcorn', 'Bumbu Gurih Rahasia', 'Cocolan Saus Keju'],
            'taste'        => $isMac ? 'Savory & Extra Cheesy' : 'Crunchy & Umami Kick',
        ];
    })->values();
@endphp

<div x-data="{
    batchId: {{ $activeBatch?->id ?? 'null' }},
    pickupSlot: '{{ $activeBatch?->pickup_time_slot ?? '11:30 - 13:00 WIB' }}',
    deliveryMethod: 'pickup',
    drawerOpen: false,
    copied: false,
    proofPreview: null,
    items: {{ Js::from($catalogItems) }},

    increment(index) {
        if (this.items[index].qty < this.items[index].remaining) {
            this.items[index].qty++;
        }
    },
    decrement(index) {
        if (this.items[index].qty > 0) {
            this.items[index].qty--;
        }
    },
    get totalPortions() {
        return this.items.reduce((sum, item) => sum + item.qty, 0);
    },
    get totalPrice() {
        return this.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    },
    formatRupiah(number) {
        return 'Rp' + new Intl.NumberFormat('id-ID').format(number);
    },
    copyAccount() {
        navigator.clipboard.writeText('7810992811');
        this.copied = true;
        setTimeout(() => this.copied = false, 2500);
    },
    handleFilePreview(e) {
        const file = e.target.files[0];
        if (file) {
            this.proofPreview = URL.createObjectURL(file);
        }
    }
}">

    <!-- 1. EDITORIAL CULINARY HERO SECTION -->
    <section class="mb-10 sm:mb-14">
        <div class="relative bg-brand-creamy border border-brand-border rounded-3xl p-6 sm:p-10 lg:p-12 shadow-card overflow-hidden">
            <!-- Decorative Accent Elements -->
            <div class="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-100/60 to-transparent rounded-bl-full pointer-events-none"></div>

            <div class="relative z-10 max-w-2xl space-y-5">
                <!-- Drop Badge -->
                <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-900 text-xs font-bold">
                    <span class="flex size-2 rounded-full bg-brand-orange animate-ping"></span>
                    <span>DAILY PRE-ORDER BATCH • BUKA HARI INI</span>
                </div>

                <!-- Headline -->
                <h1 class="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl text-brand-dark tracking-tight leading-[1.08]">
                    Ayam Crispy.<br>
                    Saus Keju Lumer.<br>
                    <span class="text-brand-orange underline decoration-brand-amber decoration-4 underline-offset-4">Tanpa Kompromi.</span>
                </h1>

                <!-- Brand Subtitle -->
                <p class="text-zinc-600 text-sm sm:text-base lg:text-lg leading-relaxed font-normal">
                    Menu andalan anak muda & mahasiswa dari <strong class="text-brand-dark">LiChick by LUCUIH</strong>. Dibuat dari potongan ayam crispy boneless premium dengan siraman saus keju gurih melimpah. Dimasak fresh per-slot jam pengambilan.
                </p>

                <!-- Value Proposition Grid (Culinary Proof Points) -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div class="bg-white/80 border border-brand-border rounded-2xl p-3 text-center shadow-xs">
                        <span class="block font-heading font-bold text-lg sm:text-xl text-brand-orange">Rp18K</span>
                        <span class="text-[11px] font-semibold text-zinc-500">Harga Flat Bersahabat</span>
                    </div>
                    <div class="bg-white/80 border border-brand-border rounded-2xl p-3 text-center shadow-xs">
                        <span class="block font-heading font-bold text-lg sm:text-xl text-brand-dark">25 Porsi</span>
                        <span class="text-[11px] font-semibold text-zinc-500">Kuota / Menu / Batch</span>
                    </div>
                    <div class="bg-white/80 border border-brand-border rounded-2xl p-3 text-center shadow-xs">
                        <span class="block font-heading font-bold text-lg sm:text-xl text-emerald-600">Fresh Warm</span>
                        <span class="text-[11px] font-semibold text-zinc-500">Dimasak Pas Jam Slot</span>
                    </div>
                    <div class="bg-white/80 border border-brand-border rounded-2xl p-3 text-center shadow-xs">
                        <span class="block font-heading font-bold text-lg sm:text-xl text-amber-600">100% Halal</span>
                        <span class="text-[11px] font-semibold text-zinc-500">Bahan Baku Higienis</span>
                    </div>
                </div>

                <div class="pt-2 flex flex-wrap items-center gap-3">
                    <a href="#katalog-menu"
                       class="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white font-heading font-bold text-sm sm:text-base shadow-brand transition-transform hover:-translate-y-0.5 cursor-pointer min-h-[48px]">
                        <span>Pilih Menu & Amankan Kuota</span>
                        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </a>
                    <span class="text-xs text-zinc-500 font-medium">
                        *Slot dapur dikontrol ketat agar rasa tetap maksimal.
                    </span>
                </div>
            </div>
        </div>
    </section>

    <!-- 2. BATCH & TIME SLOT SELECTOR (TICKET PASS DESIGN) -->
    <section class="mb-12">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
            <div>
                <span class="text-[11px] font-extrabold uppercase tracking-widest text-brand-orange block">Langkah 01</span>
                <h2 class="font-heading font-bold text-2xl text-brand-dark">Pilih Jadwal Batch Pengambilan</h2>
            </div>
            <p class="text-xs text-zinc-500">Pilih waktu yang cocok dengan jadwal kuliah atau istirahatmu.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @forelse($batches as $batch)
                @php
                    $isSelected = $activeBatch && $activeBatch->id === $batch->id;
                @endphp
                <a href="{{ route('preorder.index', ['batch_id' => $batch->id]) }}"
                   class="group relative rounded-3xl p-5 border-2 transition-all duration-200 cursor-pointer {{ $isSelected ? 'bg-amber-50/50 border-brand-orange shadow-brand' : 'bg-white border-brand-border hover:border-zinc-300 shadow-card' }}">
                    
                    <div class="flex items-start justify-between gap-3">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2">
                                <span class="size-2 rounded-full {{ $isSelected ? 'bg-brand-orange animate-pulse' : 'bg-emerald-500' }}"></span>
                                <h3 class="font-heading font-bold text-lg text-brand-dark">{{ $batch->name }}</h3>
                            </div>
                            <div class="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                                <svg class="size-4 text-brand-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span>Jam Siap: <strong class="text-brand-dark">{{ $batch->pickup_time_slot }}</strong></span>
                            </div>
                        </div>

                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide {{ $isSelected ? 'bg-brand-orange text-white' : 'bg-zinc-100 text-zinc-700 group-hover:bg-amber-100 group-hover:text-amber-900' }}">
                            {{ $isSelected ? 'Batch Aktif' : 'Pilih Slot' }}
                        </span>
                    </div>

                    <!-- Quota Overview per batch -->
                    <div class="mt-4 pt-3 border-t border-dashed border-zinc-200 flex items-center justify-between text-xs">
                        <span class="text-zinc-500 font-medium">Tanggal: {{ \Carbon\Carbon::parse($batch->batch_date)->translatedFormat('l, d M Y') }}</span>
                        <span class="font-bold text-brand-dark">Maksimal 25 Porsi/Menu</span>
                    </div>
                </a>
            @empty
                <div class="col-span-2 p-8 rounded-3xl bg-white border border-brand-border text-center text-zinc-500 text-sm">
                    Belum ada batch pre-order aktif untuk hari ini. Silakan hubungi admin.
                </div>
            @endforelse
        </div>
    </section>

    <!-- 3. PRODUCT CATALOG (MAC GEMOY & FRIES GEMOY) -->
    <section id="katalog-menu" class="mb-14 scroll-mt-24">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
                <span class="text-[11px] font-extrabold uppercase tracking-widest text-brand-orange block">Langkah 02</span>
                <h2 class="font-heading font-bold text-2xl sm:text-3xl text-brand-dark">Pilih Menu LiChick (Rp18.000 / Box)</h2>
            </div>
            <div class="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-100/90 border border-amber-300/60 px-3 py-1.5 rounded-xl">
                <span>⚡ Kuota otomatis terkunci saat checkout</span>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <template x-for="(item, index) in items" :key="item.id">
                <article class="bg-white rounded-3xl border border-brand-border shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between overflow-hidden group">
                    <div>
                        <!-- Tactile Culinary Visual Showcase (Macaroni & Fries Presentation) -->
                        <div class="relative h-64 sm:h-72 p-6 flex flex-col justify-between overflow-hidden"
                             :class="item.slug === 'mac-gemoy' ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600' : 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600'">
                            
                            <!-- Texture pattern overlay -->
                            <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

                            <!-- Top Badges -->
                            <div class="relative z-10 flex items-center justify-between">
                                <span class="px-3.5 py-1.5 rounded-full bg-brand-dark text-white font-heading font-bold text-xs tracking-wider uppercase shadow-md flex items-center gap-1.5">
                                    <span class="size-2 rounded-full bg-brand-amber"></span>
                                    <span x-text="item.taste"></span>
                                </span>

                                <span class="px-3.5 py-1.5 rounded-full font-bold text-xs shadow-md"
                                      :class="item.remaining <= 7 ? 'bg-red-600 text-white animate-pulse' : 'bg-white/95 text-brand-dark'"
                                      x-text="item.remaining > 0 ? 'Sisa ' + item.remaining + ' Porsi' : 'Kuota Habis'">
                                </span>
                            </div>

                            <!-- Central Graphic Food Emblems with Layered Depth -->
                            <div class="relative z-10 my-auto text-center transform group-hover:scale-105 transition-transform duration-300">
                                <template x-if="item.slug === 'mac-gemoy'">
                                    <div class="space-y-2">
                                        <div class="inline-flex size-24 sm:size-28 rounded-3xl bg-brand-dark/20 backdrop-blur-md border border-white/30 text-white items-center justify-center shadow-2xl mx-auto">
                                            <!-- Macaroni & Cheese Bowl Icon -->
                                            <svg class="size-14 sm:size-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M4 11h16a1 1 0 0 1 1 1v.5a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8V12a1 1 0 0 1 1-1Z"/>
                                                <path d="M6 11c0-3 2.5-5 6-5s6 2 6 5"/>
                                                <path d="M9 6V3"/><path d="M15 6V3"/><path d="M12 6V2"/>
                                            </svg>
                                        </div>
                                        <div class="inline-block px-3 py-1 rounded-full bg-brand-dark/40 backdrop-blur-sm text-white font-heading font-bold text-xs">
                                            🧀 EXTRA MELTED CHEESE SAUCE
                                        </div>
                                    </div>
                                </template>

                                <template x-if="item.slug !== 'mac-gemoy'">
                                    <div class="space-y-2">
                                        <div class="inline-flex size-24 sm:size-28 rounded-3xl bg-brand-dark/20 backdrop-blur-md border border-white/30 text-white items-center justify-center shadow-2xl mx-auto">
                                            <!-- French Fries & Chicken Icon -->
                                            <svg class="size-14 sm:size-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M5 10h14l-1.5 10a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 10Z"/>
                                                <path d="M7 10V5a1 1 0 0 1 2 0v5"/><path d="M11 10V3a1 1 0 0 1 2 0v7"/><path d="M15 10V6a1 1 0 0 1 2 0v4"/>
                                            </svg>
                                        </div>
                                        <div class="inline-block px-3 py-1 rounded-full bg-brand-dark/40 backdrop-blur-sm text-white font-heading font-bold text-xs">
                                            🍟 CRISPY POTATO & TENDERS
                                        </div>
                                    </div>
                                </template>
                            </div>

                            <!-- Bottom Floating Price Banner -->
                            <div class="relative z-10 flex items-center justify-between text-white">
                                <div>
                                    <span class="text-[10px] uppercase font-bold tracking-wider opacity-90 block">Harga Spesial PO</span>
                                    <div class="font-heading font-extrabold text-2xl text-white">
                                        Rp18.000 <span class="text-xs font-normal opacity-80">/ porsi</span>
                                    </div>
                                </div>
                                <span class="px-2.5 py-1 rounded-lg bg-black/20 text-[11px] font-semibold backdrop-blur-sm">
                                    Box 450ml Kenyang
                                </span>
                            </div>
                        </div>

                        <!-- Card Body (Description & Bento Ingredients) -->
                        <div class="p-6 space-y-4">
                            <div>
                                <h3 class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark" x-text="item.name"></h3>
                                <p class="text-xs font-bold text-brand-orange mt-0.5" x-text="item.tagline"></p>
                                <p class="text-zinc-600 text-sm leading-relaxed mt-2" x-text="item.description"></p>
                            </div>

                            <!-- Ingredient Pill Badges -->
                            <div class="space-y-1.5">
                                <span class="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block">Komponen Sajian:</span>
                                <div class="flex flex-wrap gap-1.5">
                                    <template x-for="h in item.highlights" :key="h">
                                        <span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-paper border border-brand-border text-zinc-700" x-text="h"></span>
                                    </template>
                                </div>
                            </div>

                            <!-- Real-Time Quota Progress Bar -->
                            <div class="bg-brand-paper p-3.5 rounded-2xl border border-brand-border space-y-2">
                                <div class="flex items-center justify-between text-xs">
                                    <span class="font-bold text-zinc-600">Sisa Kuota Batch Ini</span>
                                    <span class="font-heading font-bold"
                                          :class="item.remaining <= 7 ? 'text-red-600' : 'text-brand-dark'"
                                          x-text="item.remaining + ' dari ' + item.initialQuota + ' Porsi'"></span>
                                </div>
                                <div class="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                                    <div class="h-full rounded-full transition-all duration-300"
                                         :class="item.remaining <= 7 ? 'bg-red-500' : 'bg-brand-orange'"
                                         :style="'width: ' + Math.min(100, Math.round(((item.soldQty + item.qty) / item.initialQuota) * 100)) + '%'"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Card Actions (Thumb-Friendly Bottom Controls) -->
                    <div class="p-6 pt-0">
                        <div class="pt-4 border-t border-brand-border flex items-center justify-between gap-3">
                            <div>
                                <span class="text-[11px] font-semibold text-zinc-400 block">Subtotal</span>
                                <span class="font-heading font-extrabold text-xl text-brand-dark"
                                      x-text="item.qty > 0 ? formatRupiah(item.qty * item.price) : 'Rp18.000'"></span>
                            </div>

                            <!-- Button Pesan Sekarang (Jika Qty == 0) -->
                            <template x-if="item.qty === 0">
                                <button type="button"
                                        @click="increment(index)"
                                        :disabled="item.remaining === 0"
                                        class="px-6 py-3.5 rounded-2xl font-heading font-bold text-sm text-white bg-brand-orange hover:bg-brand-orange-hover disabled:bg-zinc-300 disabled:cursor-not-allowed shadow-brand transition-all cursor-pointer min-h-[46px] flex items-center gap-2">
                                    <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    <span x-text="item.remaining > 0 ? 'Pesan Sekarang' : 'Habis'"></span>
                                </button>
                            </template>

                            <!-- Stepper Qty (Jika Qty > 0) -->
                            <template x-if="item.qty > 0">
                                <div class="flex items-center gap-1.5 bg-amber-50 border border-brand-orange/40 rounded-2xl p-1 shadow-sm">
                                    <button type="button"
                                            @click="decrement(index)"
                                            class="size-11 rounded-xl bg-white hover:bg-zinc-100 text-brand-dark font-extrabold flex items-center justify-center shadow-xs transition-colors cursor-pointer">
                                        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    </button>
                                    <span class="w-10 text-center font-heading font-extrabold text-lg text-brand-dark" x-text="item.qty"></span>
                                    <button type="button"
                                            @click="increment(index)"
                                            :disabled="item.qty >= item.remaining"
                                            class="size-11 rounded-xl bg-brand-orange hover:bg-brand-orange-hover disabled:bg-zinc-300 text-white font-extrabold flex items-center justify-center shadow-xs transition-colors cursor-pointer">
                                        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    </button>
                                </div>
                            </template>
                        </div>

                        <!-- Notes Field for portion customization -->
                        <div x-show="item.qty > 0" x-transition class="mt-3">
                            <input type="text"
                                   x-model="item.notes"
                                   placeholder="Catatan pesanan (cth: saus dipisah, ekstra pedas)..."
                                   class="w-full h-10 px-3.5 rounded-xl bg-brand-paper border border-brand-border text-xs text-brand-dark placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-orange">
                        </div>
                    </div>
                </article>
            </template>
        </div>
    </section>

    <!-- 4. FLOATING APP-LIKE CART DOCK (THUMB ZONE) -->
    <div x-show="totalPortions > 0"
         x-cloak
         x-transition:enter="transition ease-out duration-300 transform"
         x-transition:enter-start="translate-y-24 opacity-0"
         x-transition:enter-end="translate-y-0 opacity-100"
         class="fixed bottom-4 inset-x-4 z-40 max-w-2xl mx-auto">
        
        <div class="bg-brand-dark text-white rounded-3xl p-3.5 sm:p-4 shadow-floating border border-brand-charcoal flex items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
                <div class="size-12 rounded-2xl bg-brand-orange flex items-center justify-center text-white font-heading font-extrabold text-xl shadow-brand shrink-0"
                     x-text="totalPortions"></div>
                <div>
                    <span class="text-[11px] font-semibold text-zinc-400 block leading-tight">Total Pre-Order:</span>
                    <span class="font-heading font-extrabold text-xl text-brand-amber" x-text="formatRupiah(totalPrice)"></span>
                </div>
            </div>

            <button type="button"
                    @click="drawerOpen = true"
                    class="px-6 py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white font-heading font-bold text-sm sm:text-base shadow-brand flex items-center gap-2 transition-all cursor-pointer min-h-[48px]">
                <span>Lanjut Checkout</span>
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
        </div>
    </div>

    <!-- 5. CHECKOUT DRAWER & PAYMENT SHEET -->
    <div x-show="drawerOpen"
         x-cloak
         class="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">

        <div @click.away="drawerOpen = false"
             x-show="drawerOpen"
             x-transition:enter="transition ease-out duration-250 transform"
             x-transition:enter-start="translate-y-full sm:translate-y-8 opacity-0"
             x-transition:enter-end="translate-y-0 opacity-100"
             class="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-brand-border overflow-hidden max-h-[92vh] flex flex-col">

            <!-- Sheet Header -->
            <div class="px-6 py-4 bg-brand-dark text-white flex items-center justify-between shrink-0">
                <div>
                    <span class="text-[10px] uppercase tracking-widest text-brand-amber font-extrabold block">Checkout Pre-Order</span>
                    <h3 class="font-heading font-extrabold text-xl">Rincian & Pembayaran</h3>
                </div>
                <button type="button"
                        @click="drawerOpen = false"
                        aria-label="Tutup keranjang"
                        class="size-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
                    <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <!-- Checkout Form -->
            <form action="{{ route('preorder.checkout') }}" method="POST" enctype="multipart/form-data" class="p-6 overflow-y-auto space-y-6">
                @csrf
                <input type="hidden" name="batch_id" :value="batchId">

                <!-- Order Item Summary -->
                <div class="bg-brand-paper border border-brand-border rounded-2xl p-4 space-y-3">
                    <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                        <span>Ringkasan Menu</span>
                        <span class="text-brand-orange">{{ $activeBatch?->name }}</span>
                    </div>

                    <template x-for="(item, index) in items" :key="item.id">
                        <div x-show="item.qty > 0" class="flex items-center justify-between text-sm py-2 border-b border-brand-border/60 last:border-none">
                            <div>
                                <span class="font-bold text-brand-dark" x-text="item.name"></span>
                                <span class="text-xs font-bold text-brand-orange ml-1" x-text="'x' + item.qty"></span>
                                <p x-show="item.notes" class="text-[11px] text-zinc-500 italic" x-text="'Catatan: ' + item.notes"></p>
                            </div>
                            <span class="font-heading font-bold text-brand-dark" x-text="formatRupiah(item.qty * item.price)"></span>

                            <input type="hidden" :name="`items[${index}][product_id]`" :value="item.id">
                            <input type="hidden" :name="`items[${index}][quantity]`" :value="item.qty">
                            <input type="hidden" :name="`items[${index}][item_notes]`" :value="item.notes">
                        </div>
                    </template>

                    <div class="pt-3 flex items-center justify-between border-t border-brand-border">
                        <span class="font-bold text-sm text-zinc-600">Total Tagihan</span>
                        <span class="font-heading font-extrabold text-2xl text-brand-orange" x-text="formatRupiah(totalPrice)"></span>
                    </div>
                </div>

                <!-- Customer Details -->
                <div class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="customer_name" class="block text-xs font-bold text-zinc-700 mb-1">Nama Lengkap *</label>
                            <input type="text" id="customer_name" name="customer_name" required
                                   placeholder="Cth: Farhan Rayhan"
                                   class="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange">
                        </div>
                        <div>
                            <label for="customer_whatsapp" class="block text-xs font-bold text-zinc-700 mb-1">Nomor WhatsApp *</label>
                            <input type="tel" id="customer_whatsapp" name="customer_whatsapp" required
                                   placeholder="Cth: 081234567890"
                                   class="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange">
                        </div>
                    </div>

                    <!-- Pickup / Delivery Options -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-zinc-700 mb-1">Metode Pengambilan *</label>
                            <div class="grid grid-cols-2 gap-2">
                                <label class="cursor-pointer">
                                    <input type="radio" name="delivery_method" value="pickup" x-model="deliveryMethod" class="peer sr-only">
                                    <div class="h-11 rounded-xl border-2 border-zinc-200 peer-checked:border-brand-orange peer-checked:bg-amber-50 peer-checked:text-brand-dark flex items-center justify-center text-xs font-bold transition-all">
                                        Ambil di Booth
                                    </div>
                                </label>
                                <label class="cursor-pointer">
                                    <input type="radio" name="delivery_method" value="delivery" x-model="deliveryMethod" class="peer sr-only">
                                    <div class="h-11 rounded-xl border-2 border-zinc-200 peer-checked:border-brand-orange peer-checked:bg-amber-50 peer-checked:text-brand-dark flex items-center justify-center text-xs font-bold transition-all">
                                        Kurir Kampus
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label for="pickup_time_slot" class="block text-xs font-bold text-zinc-700 mb-1">Slot Waktu *</label>
                            <select id="pickup_time_slot" name="pickup_time_slot" x-model="pickupSlot"
                                    class="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange">
                                <option value="11:30 - 12:15 WIB">11:30 - 12:15 WIB (Batch Siang 1)</option>
                                <option value="12:15 - 13:00 WIB">12:15 - 13:00 WIB (Batch Siang 2)</option>
                                <option value="15:30 - 16:15 WIB">15:30 - 16:15 WIB (Batch Sore 1)</option>
                                <option value="16:15 - 17:00 WIB">16:15 - 17:00 WIB (Batch Sore 2)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Delivery Address (If courier selected) -->
                    <div x-show="deliveryMethod === 'delivery'" x-transition>
                        <label for="delivery_address" class="block text-xs font-bold text-zinc-700 mb-1">Alamat Antar / Titik Temu Kampus *</label>
                        <textarea id="delivery_address" name="delivery_address" rows="2"
                                  placeholder="Cth: Gedung Fasilkom, Lobby Utama / Kos Orange No. 14"
                                  class="w-full p-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"></textarea>
                    </div>
                </div>

                <!-- Payment Details Card (1-Click Copy) -->
                <div class="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-amber-950 uppercase tracking-wide">Rekening Pembayaran Resmi</span>
                        <span class="text-[11px] font-bold text-brand-orange bg-white px-2 py-0.5 rounded-md border border-amber-200">
                            LUCUIH FOOD
                        </span>
                    </div>

                    <!-- Copy Box -->
                    <div class="bg-white p-3 rounded-xl border border-amber-300 flex items-center justify-between gap-2">
                        <div>
                            <span class="text-[10px] uppercase font-bold text-zinc-400 block">BCA / SeaBank / GoPay:</span>
                            <span class="font-mono font-extrabold text-base text-brand-dark">7810 9928 11</span>
                            <span class="text-xs text-zinc-500 block">a.n. LiChick LUCUIH FOOD</span>
                        </div>
                        <button type="button"
                                @click="copyAccount"
                                class="px-3.5 py-2 rounded-lg bg-brand-dark hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shrink-0">
                            <span x-text="copied ? 'Tersalin!' : 'Salin No Rek'"></span>
                        </button>
                    </div>

                    <!-- File Upload with Live Preview -->
                    <div>
                        <label for="payment_proof" class="block text-xs font-bold text-zinc-700 mb-1.5">
                            Upload Bukti Transfer Pembayaran *
                        </label>
                        <input type="file" id="payment_proof" name="payment_proof" accept="image/*" required
                               @change="handleFilePreview"
                               class="w-full text-xs text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-dark file:text-white hover:file:bg-black cursor-pointer">

                        <!-- Preview Container -->
                        <template x-if="proofPreview">
                            <div class="mt-3 relative size-20 rounded-xl overflow-hidden border border-zinc-300 shadow-sm">
                                <img :src="proofPreview" alt="Preview Bukti Transfer" class="w-full h-full object-cover">
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Submit CTA -->
                <button type="submit"
                        class="w-full py-4 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white font-heading font-bold text-base shadow-brand transition-all cursor-pointer min-h-[52px] flex items-center justify-center gap-2">
                    <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Kirim Pesanan Sekarang</span>
                </button>
            </form>
        </div>
    </div>

</div>
@endsection
