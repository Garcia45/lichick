<!DOCTYPE html>
<html lang="id" class="scroll-smooth antialiased">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'LiChick by LUCUIH — Pre-Order Mac Gemoy & Fries Gemoy Rp18.000')</title>

    <!-- Preconnect & Google Fonts: Poppins (Unified UI/UX Pro Max Typography) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">

    <!-- Tailwind CSS CDN & UI/UX Pro Max Design System Tokens -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        heading: ['"Poppins"', 'sans-serif'],
                        sans: ['"Poppins"', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            orange: '#FF5500',
                            'orange-hover': '#E04800',
                            amber: '#FFB800',
                            yellow: '#FACC15',
                            surface: '#FEF3C7',
                            creamy: '#FFFDF9',
                            paper: '#F8F6F0',
                            dark: '#141416',
                            charcoal: '#222227',
                            muted: '#57534E',
                            border: '#EBE7DF',
                        }
                    },
                    boxShadow: {
                        'brand': '0 10px 25px -5px rgba(255, 85, 0, 0.3)',
                        'tactile': '0 4px 0 0 #C23B00',
                        'card': '0 4px 20px -2px rgba(20, 20, 22, 0.05), 0 1px 3px rgba(20, 20, 22, 0.03)',
                        'card-hover': '0 20px 35px -10px rgba(20, 20, 22, 0.1), 0 2px 6px rgba(20, 20, 22, 0.04)',
                        'floating': '0 24px 48px -12px rgba(20, 20, 22, 0.35)',
                    }
                }
            }
        }
    </script>

    <!-- Global WhatsApp + Google Sheets Serverless Cloud Engine -->
    <script>
        window.LICHICK_CLOUD = {
            defaultWebhookUrl: @json(env('GOOGLE_SHEETS_WEBHOOK_URL', '')),
            defaultSheetUrl: @json(env('GOOGLE_SHEETS_VIEW_URL', '')),
            defaultAdminWa: @json(env('ADMIN_WHATSAPP_NUMBER', '6281234567890')),

            getWebhookUrl() {
                return (localStorage.getItem('lichick_sheets_webhook_url') || this.defaultWebhookUrl || '').trim();
            },
            getSheetUrl() {
                return (localStorage.getItem('lichick_sheets_view_url') || this.defaultSheetUrl || '').trim();
            },
            getAdminWa() {
                const raw = (localStorage.getItem('lichick_admin_wa') || this.defaultAdminWa || '6281234567890').replace(/[^0-9]/g, '');
                return raw.startsWith('0') ? '62' + raw.slice(1) : raw;
            },
            saveConfig({ webhookUrl, sheetUrl, adminWa }) {
                if (typeof webhookUrl === 'string') localStorage.setItem('lichick_sheets_webhook_url', webhookUrl.trim());
                if (typeof sheetUrl === 'string') localStorage.setItem('lichick_sheets_view_url', sheetUrl.trim());
                if (typeof adminWa === 'string') localStorage.setItem('lichick_admin_wa', adminWa.trim());
            },
            getLocalOrders() {
                try {
                    return JSON.parse(localStorage.getItem('lichick_orders_history') || '[]');
                } catch (e) {
                    return [];
                }
            },
            saveLocalOrder(orderObj) {
                const list = this.getLocalOrders().filter(o => o.order_number !== orderObj.order_number);
                list.unshift(orderObj);
                localStorage.setItem('lichick_orders_history', JSON.stringify(list.slice(0, 100)));
            },
            async sendOrderToSheets(orderObj) {
                this.saveLocalOrder(orderObj);
                const webhook = this.getWebhookUrl();
                if (!webhook) {
                    return { ok: true, mode: 'local_only' };
                }
                try {
                    const response = await fetch(webhook, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(orderObj),
                    });
                    const data = await response.json().catch(() => ({ ok: true }));
                    return { ok: true, mode: 'google_sheets', data };
                } catch (err) {
                    try {
                        await fetch(webhook, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify(orderObj),
                        });
                        return { ok: true, mode: 'google_sheets_nocors' };
                    } catch (e2) {
                        return { ok: false, mode: 'local_fallback', error: e2.message };
                    }
                }
            },
            async fetchSheetsData(orderNumber = null) {
                const webhook = this.getWebhookUrl();
                if (!webhook) return null;
                try {
                    const url = orderNumber
                        ? `${webhook}${webhook.includes('?') ? '&' : '?'}order_number=${encodeURIComponent(orderNumber)}`
                        : webhook;
                    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
                    return await res.json();
                } catch (e) {
                    return null;
                }
            }
        };
    </script>

    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

    <style>
        [x-cloak] { display: none !important; }
        body, button, input, select, textarea {
            font-family: 'Poppins', sans-serif;
            touch-action: manipulation;
        }
        /* Tactile Spring Physics (UI/UX Pro Max Style #60) */
        .btn-tactile {
            transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 150ms ease, box-shadow 150ms ease;
        }
        .btn-tactile:active:not(:disabled) {
            transform: scale(0.96);
        }
        /* Respect Reduced Motion (UI/UX Pro Max Guideline #9 & #99) */
        @media (prefers-reduced-motion: reduce) {
            *, ::before, ::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #F8F6F0; }
        ::-webkit-scrollbar-thumb { background: #D9D4C7; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #FF5500; }
    </style>
</head>
<body class="bg-brand-paper text-brand-dark font-sans selection:bg-brand-orange selection:text-white pb-32 sm:pb-24">

    <!-- Accessibility Skip Link (ux-guidelines.csv #45) -->
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-brand-orange focus:text-white focus:rounded-xl focus:font-bold focus:shadow-lg">
        Langsung ke Konten Utama
    </a>

    <!-- Top Live Batch Scarcity Bar -->
    <div class="bg-brand-dark text-white py-2 px-4 border-b border-brand-charcoal text-xs font-medium">
        <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                <span class="inline-flex size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" aria-hidden="true"></span>
                <span class="text-brand-amber font-bold uppercase tracking-wider">DROP HARIAN AKTIF</span>
                <span class="text-zinc-300 truncate">Kuota Terbatas: Maks. 50 Porsi Mac Gemoy &amp; 50 Porsi Fries Gemoy / Batch!</span>
            </div>
            <div class="hidden md:flex items-center gap-4 shrink-0 text-[11px] text-zinc-300">
                <span class="flex items-center gap-1">
                    <svg class="size-3.5 text-brand-amber" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    100% Halal &amp; Higienis
                </span>
                <span class="text-zinc-600">•</span>
                <a href="{{ route('preorder.track') }}" class="text-white hover:text-brand-amber font-semibold underline decoration-zinc-600 transition-colors duration-150">
                    Lacak Status Dapur →
                </a>
            </div>
        </div>
    </div>

    <!-- Floating Glassmorphic Navbar (UI/UX Pro Max Layout Rule: top-3 spacing from edge) -->
    <header class="sticky top-3 z-40 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mt-3">
        <nav aria-label="Navigasi Utama" class="bg-white/90 backdrop-blur-md border border-brand-border shadow-card rounded-2xl px-4 sm:px-5 py-3 flex items-center justify-between">
            <!-- Brand Logo -->
            <a href="{{ route('preorder.index') }}" class="flex items-center gap-3 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-xl">
                <div class="size-11 rounded-2xl bg-brand-orange flex items-center justify-center text-white shadow-brand group-hover:bg-brand-orange-hover transition-colors duration-200">
                    <svg class="size-6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11Z"/>
                        <circle cx="12" cy="14" r="2" fill="currentColor"/>
                    </svg>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-heading font-extrabold text-xl tracking-tight text-brand-dark leading-none">
                            LiChick<span class="text-brand-orange">.</span>
                        </span>
                        <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                            by LUCUIH
                        </span>
                    </div>
                    <p class="text-[11px] font-medium text-zinc-500 mt-0.5 leading-none">LUCUIH FOOD • Pre-Order Box</p>
                </div>
            </a>

            <!-- Navigation Actions (Min 44px Touch Targets) -->
            <div class="flex items-center gap-2 sm:gap-2.5">
                <a href="{{ route('preorder.index') }}#katalog-menu"
                   class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 hover:text-brand-orange hover:bg-orange-50/60 transition-colors duration-150 min-h-[44px] cursor-pointer">
                    <span>Menu Gemoy</span>
                </a>

                <a href="{{ route('preorder.track') }}"
                   class="btn-tactile inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-brand-dark bg-brand-paper border border-brand-border hover:border-brand-orange hover:text-brand-orange transition-colors duration-150 min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">
                    <svg class="size-4 text-brand-orange shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                    <span>Lacak Order</span>
                </a>

                <a href="{{ route('admin.dashboard') }}"
                   class="btn-tactile inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-brand-dark hover:text-white transition-colors duration-150 min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                   title="Buka Dashboard Admin Dapur">
                    <svg class="size-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
                    </svg>
                    <span class="hidden sm:inline">Dapur Admin</span>
                </a>
            </div>
        </nav>
    </header>

    <!-- Main Container -->
    <main id="main-content" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        @if(session('success'))
            <div role="alert" aria-live="polite" class="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-sm">
                <svg class="size-5 text-emerald-600 shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <div class="text-sm font-semibold">{{ session('success') }}</div>
            </div>
        @endif

        @if($errors->any())
            <div role="alert" aria-live="assertive" class="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 shadow-sm">
                <div class="flex items-center gap-2 font-bold text-sm mb-1.5">
                    <svg class="size-5 text-red-600 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>Mohon periksa kembali isian pesanan kamu:</span>
                </div>
                <ul class="list-disc list-inside text-xs sm:text-sm space-y-1 text-red-800">
                    @foreach($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        @yield('content')
    </main>

    <!-- Footer Minimalist -->
    <footer class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-brand-border text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
            <span class="font-bold text-brand-dark">LiChick by LUCUIH</span>
            <span>•</span>
            <span>LUCUIH FOOD Culinary Pre-Order System</span>
        </div>
        <div>
            <span>Dimasak hangat setiap hari • Harga Flat Rp18.000/porsi</span>
        </div>
    </footer>

</body>
</html>
