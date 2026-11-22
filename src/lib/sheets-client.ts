import {
  DEFAULT_QUOTAS,
  DEFAULT_TOTAL_QUOTA,
  STORE_CONFIG,
} from "@/config/store";
import { computeOrderAggregates } from "@/lib/order-aggregates";
import type {
  AdminDashboardResponse,
  OrderItem,
  OrderRecord,
  OrderStatus,
  PaymentStatus,
  PublicQuotaResponse,
  StoreQuotaConfig,
} from "@/types/order";

function normalizeTotalQuotas(raw: unknown): Record<string, number> {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const totalRaw = Number(obj.total);
  return {
    total:
      Number.isFinite(totalRaw) && totalRaw >= 0
        ? Math.floor(totalRaw)
        : DEFAULT_TOTAL_QUOTA,
  };
}

function getWebhookUrl(): string {
  return (process.env.GOOGLE_SHEETS_WEBHOOK_URL || "").trim();
}

function getApiSecret(): string {
  return (process.env.GOOGLE_SHEETS_API_SECRET || "").trim();
}

function getTodayWib(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getNowWib(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function stripLeadingQuote(val: unknown): string {
  return String(val ?? "").replace(/^'+/, "").trim();
}

function escapeSheetFormula(val: string): string {
  const clean = val.trim();
  if (!clean) return "-";
  if (/^[=+\-@\t\r]/.test(clean) && clean !== "-") {
    return `'${clean}`;
  }
  return clean;
}

function normalizePhoneDisplay(raw: unknown): string {
  const s = stripLeadingQuote(raw);
  if (!s || s === "-") return "-";
  if (/^8[0-9]{8,13}$/.test(s)) {
    return `0${s}`;
  }
  return s;
}

function normalizeSheetDateTime(raw: unknown, dateOnly = false): string {
  const s = stripLeadingQuote(raw);
  if (!s) return "";
  if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (!dateOnly && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(s)) return s;

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return s;

  if (dateOnly) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(parsed);
}

const VALID_ORDER_STATUSES: OrderStatus[] = [
  "belum_dibuat",
  "sedang_dibuat",
  "siap_diantar",
  "selesai",
  "dibatalkan",
];

const VALID_PAYMENT_STATUSES: PaymentStatus[] = [
  "menunggu_validasi",
  "tervalidasi",
  "ditolak",
];

function normalizeOrderRecord(raw: OrderRecord): OrderRecord {
  const orderStatus = VALID_ORDER_STATUSES.includes(raw.order_status)
    ? raw.order_status
    : "belum_dibuat";
  const paymentStatus = VALID_PAYMENT_STATUSES.includes(raw.payment_status)
    ? raw.payment_status
    : "menunggu_validasi";

  return {
    ...raw,
    timestamp: normalizeSheetDateTime(raw.timestamp, false),
    order_number: stripLeadingQuote(raw.order_number).toUpperCase(),
    order_date: normalizeSheetDateTime(raw.order_date, true),
    pickup_day: stripLeadingQuote(raw.pickup_day) || STORE_CONFIG.pickupDays[0],
    pickup_slot: stripLeadingQuote(raw.pickup_slot) || "-",
    customer_name: stripLeadingQuote(raw.customer_name) || "-",
    customer_whatsapp: normalizePhoneDisplay(raw.customer_whatsapp),
    delivery_method: raw.delivery_method === "delivery" ? "delivery" : "pickup",
    delivery_address: stripLeadingQuote(raw.delivery_address) || "-",
    items_summary: stripLeadingQuote(raw.items_summary),
    items: Array.isArray(raw.items) ? raw.items : [],
    total_portions: Number(raw.total_portions) || 0,
    total_amount: Number(raw.total_amount) || 0,
    order_status: orderStatus,
    payment_status: paymentStatus,
    payment_proof_url: stripLeadingQuote(raw.payment_proof_url),
    notes: stripLeadingQuote(raw.notes) || "-",
    updated_at: normalizeSheetDateTime(raw.updated_at || raw.timestamp, false),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseWebhookJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Respon Google Sheets tidak valid (HTTP ${res.status}). Coba ulangi beberapa saat lagi.`
    );
  }
}

// ============================================================================
// WRITE-THROUGH SNAPSHOT CACHE + REQUEST COALESCING (SWR)
// Menghilangkan delay 2-5 detik saat refresh, tracking, dan update status
// ============================================================================

interface SheetSnapshot {
  orders: OrderRecord[];
  storeConfig: StoreQuotaConfig;
  today: string;
  fetchedAt: number;
}

interface RecentOrderEntry {
  order: OrderRecord;
  savedAt: number;
}

interface SheetCacheState {
  webhookUrl: string;
  snapshot: SheetSnapshot | null;
  inflight: Promise<SheetSnapshot> | null;
  mutationVersion: number;
  recentOrders: Map<string, RecentOrderEntry>;
}

const SNAPSHOT_FRESH_MS = 12_000; // <12s: langsung pakai memori (~0ms)
const SNAPSHOT_STALE_MS = 90_000; // 12-90s: langsung pakai memori + sync diam-diam di background
const TRACK_FRESH_MS = 6_000; // khusus pelacakan: revalidasi background setelah 6s
const RECENT_ORDER_TTL_MS = 45_000; // pesanan baru/baru diupdate langsung siap di /track

const globalForSheetCache = globalThis as unknown as {
  __lichickSheetCacheV1?: SheetCacheState;
};

function getSheetCache(webhook: string): SheetCacheState {
  if (
    !globalForSheetCache.__lichickSheetCacheV1 ||
    globalForSheetCache.__lichickSheetCacheV1.webhookUrl !== webhook
  ) {
    globalForSheetCache.__lichickSheetCacheV1 = {
      webhookUrl: webhook,
      snapshot: null,
      inflight: null,
      mutationVersion: 0,
      recentOrders: new Map(),
    };
  }
  return globalForSheetCache.__lichickSheetCacheV1;
}

function rememberRecentOrder(cache: SheetCacheState, order: OrderRecord) {
  const code = order.order_number.toUpperCase();
  if (!code) return;
  if (cache.recentOrders.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache.recentOrders.entries()) {
      if (now - v.savedAt > RECENT_ORDER_TTL_MS) {
        cache.recentOrders.delete(k);
      }
    }
  }
  cache.recentOrders.set(code, { order, savedAt: Date.now() });
}

function fetchFreshSnapshotFromAppsScript(webhook: string): Promise<SheetSnapshot> {
  const cache = getSheetCache(webhook);
  if (cache.inflight) {
    return cache.inflight;
  }

  const startedVersion = cache.mutationVersion;
  const todayFallback = getTodayWib();
  const secret = getApiSecret();
  const url = `${webhook}${
    webhook.includes("?") ? "&" : "?"
  }action=admin${secret ? `&secret=${encodeURIComponent(secret)}` : ""}`;

  const reqPromise = (async (): Promise<SheetSnapshot> => {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(18_000),
    });
    const data = await parseWebhookJson(res);
    if (!data.ok) {
      throw new Error(data.error || "Gagal mengambil data dari Google Sheets");
    }

    const normalizedOrders: OrderRecord[] = Array.isArray(data.orders)
      ? data.orders.map((o: OrderRecord) => normalizeOrderRecord(o))
      : [];

    const freshSnapshot: SheetSnapshot = {
      orders: normalizedOrders,
      storeConfig: {
        store_open: data.store_config?.store_open !== false,
        quotas: normalizeTotalQuotas(data.store_config?.quotas),
      },
      today: data.today || todayFallback,
      fetchedAt: Date.now(),
    };

    // Hanya timpa cache jika tidak ada mutasi (create/update/delete) yang terjadi
    // selama GET ini berlangsung (mencegah data lama menimpa update terbaru)
    if (cache.mutationVersion === startedVersion) {
      cache.snapshot = freshSnapshot;
      return freshSnapshot;
    }

    return cache.snapshot || freshSnapshot;
  })().finally(() => {
    if (cache.inflight === reqPromise) {
      cache.inflight = null;
    }
  });

  cache.inflight = reqPromise;
  return reqPromise;
}

async function getSheetSnapshot(
  webhook: string,
  opts?: { forceRefresh?: boolean; freshMs?: number }
): Promise<SheetSnapshot> {
  const cache = getSheetCache(webhook);
  const freshMs = opts?.freshMs ?? SNAPSHOT_FRESH_MS;

  if (!opts?.forceRefresh && cache.snapshot) {
    const age = Date.now() - cache.snapshot.fetchedAt;
    if (age <= freshMs) {
      return cache.snapshot;
    }
    if (age <= SNAPSHOT_STALE_MS) {
      // Stale-While-Revalidate: kembalikan snapshot langsung (<1ms) sambil sync diam-diam
      fetchFreshSnapshotFromAppsScript(webhook).catch(() => {
        // Abaikan error background refresh; snapshot sebelumnya tetap berlaku
      });
      return cache.snapshot;
    }
  }

  try {
    return await fetchFreshSnapshotFromAppsScript(webhook);
  } catch (err) {
    // Jika upstream sementara timeout tapi snapshot lama masih tersedia, tetap layani agar tidak blank
    if (!opts?.forceRefresh && cache.snapshot) {
      return cache.snapshot;
    }
    throw err;
  }
}

interface DemoStoreState {
  orders: OrderRecord[];
  storeConfig: StoreQuotaConfig;
}

const globalForDemo = globalThis as unknown as {
  __lichickDemoStoreV4?: DemoStoreState;
};

function getDemoStore(): DemoStoreState {
  if (!globalForDemo.__lichickDemoStoreV4) {
    const today = getTodayWib();
    const now = getNowWib();
    globalForDemo.__lichickDemoStoreV4 = {
      orders: [
        {
          timestamp: now,
          order_number: "LCK-DEMO-1001",
          order_date: today,
          pickup_day: "Senin, 30 November",
          pickup_slot: "-",
          customer_name: "Nadia Putri (Contoh)",
          customer_whatsapp: "081234567891",
          delivery_method: "pickup",
          delivery_address: "-",
          items_summary: "2x Macmoy Gerah",
          items: [
            {
              product_id: "macmoy-gerah",
              name: "Macmoy Gerah",
              variant: "",
              quantity: 2,
              unit_price: 20000,
              subtotal: 40000,
            },
          ],
          total_portions: 2,
          total_amount: 40000,
          order_status: "belum_dibuat",
          payment_status: "menunggu_validasi",
          payment_proof_url: "/images/qris-lichick.jpg",
          notes: "Tolong sendok 2 buah",
          updated_at: now,
        },
        {
          timestamp: now,
          order_number: "LCK-DEMO-1002",
          order_date: today,
          pickup_day: "Senin, 30 November",
          pickup_slot: "-",
          customer_name: "Raka Pratama (Contoh)",
          customer_whatsapp: "081234567892",
          delivery_method: "delivery",
          delivery_address: "Lobby Fakultas Teknik",
          items_summary: "1x Friesmoy Gerah, 1x Macmoy Original",
          items: [
            {
              product_id: "friesmoy-gerah",
              name: "Friesmoy Gerah",
              variant: "",
              quantity: 1,
              unit_price: 18000,
              subtotal: 18000,
            },
            {
              product_id: "macmoy-original",
              name: "Macmoy Original",
              variant: "",
              quantity: 1,
              unit_price: 20000,
              subtotal: 20000,
            },
          ],
          total_portions: 2,
          total_amount: 38000,
          order_status: "sedang_dibuat",
          payment_status: "tervalidasi",
          payment_proof_url: "/images/qris-lichick.jpg",
          notes: "Tolong sendok 2 buah",
          updated_at: now,
        },
        {
          timestamp: now,
          order_number: "LCK-DEMO-1003",
          order_date: today,
          pickup_day: "Senin, 30 November",
          pickup_slot: "-",
          customer_name: "Alya Zahra (Contoh)",
          customer_whatsapp: "081234567893",
          delivery_method: "pickup",
          delivery_address: "-",
          items_summary: "3x Friesmoy Original",
          items: [
            {
              product_id: "friesmoy-original",
              name: "Friesmoy Original",
              variant: "",
              quantity: 3,
              unit_price: 18000,
              subtotal: 54000,
            },
          ],
          total_portions: 3,
          total_amount: 54000,
          order_status: "selesai",
          payment_status: "tervalidasi",
          payment_proof_url: "/images/qris-lichick.jpg",
          notes: "-",
          updated_at: now,
        },
      ],
      storeConfig: {
        store_open: true,
        quotas: { ...DEFAULT_QUOTAS },
      },
    };
  }
  return globalForDemo.__lichickDemoStoreV4;
}

export async function fetchPublicQuotas(opts?: {
  forceRefresh?: boolean;
}): Promise<PublicQuotaResponse> {
  const webhook = getWebhookUrl();
  const today = getTodayWib();

  if (!webhook) {
    const store = getDemoStore();
    const agg = computeOrderAggregates(store.orders, today);
    return {
      ok: true,
      mode: "demo",
      today,
      sold_today: agg.sold_today,
      sold_by_base: agg.sold_by_base,
      total_sold: agg.total_sold,
      store_config: {
        store_open: store.storeConfig.store_open,
        quotas: normalizeTotalQuotas(store.storeConfig.quotas),
      },
    };
  }

  // Ambil snapshot tercache di sisi server agar stok global PO (25 porsi semua menu)
  // terakumulasi lintas hari dan respon instan (~0ms saat cache hangat).
  // Data pribadi pembeli TIDAK pernah dikirim ke klien.
  const snap = await getSheetSnapshot(webhook, {
    forceRefresh: opts?.forceRefresh,
  });
  const agg = computeOrderAggregates(snap.orders, snap.today || today);

  return {
    ok: true,
    mode: "google_sheets",
    today: snap.today || today,
    sold_today: agg.sold_today,
    sold_by_base: agg.sold_by_base,
    total_sold: agg.total_sold,
    store_config: {
      store_open: snap.storeConfig.store_open !== false,
      quotas: normalizeTotalQuotas(snap.storeConfig.quotas),
    },
  };
}

export async function createOrderRecord(input: {
  order_number: string;
  pickup_day: string;
  pickup_slot: string;
  customer_name: string;
  customer_whatsapp: string;
  delivery_method: "pickup" | "delivery";
  delivery_address: string;
  items: OrderItem[];
  total_portions: number;
  total_amount: number;
  payment_proof_base64: string;
  notes?: string;
}): Promise<{
  ok: boolean;
  mode: "google_sheets" | "demo";
  order?: OrderRecord;
  error?: string;
}> {
  const webhook = getWebhookUrl();
  const today = getTodayWib();
  const now = getNowWib();

  const itemsSummary = input.items
    .map((it) => {
      const extra = [it.variant, it.notes].filter(Boolean).join(" / ");
      return `${it.quantity}x ${it.name}${extra ? ` (${extra})` : ""}`;
    })
    .join(", ");

  const cleanPhone = normalizePhoneDisplay(input.customer_whatsapp);

  const record: OrderRecord = {
    timestamp: now,
    order_number: input.order_number.toUpperCase(),
    order_date: today,
    pickup_day: input.pickup_day || STORE_CONFIG.pickupDays[0],
    pickup_slot: input.pickup_slot || "-",
    customer_name: input.customer_name,
    customer_whatsapp: cleanPhone,
    delivery_method: input.delivery_method,
    delivery_address:
      input.delivery_method === "delivery" ? input.delivery_address || "-" : "-",
    items_summary: itemsSummary,
    items: input.items,
    total_portions: input.total_portions,
    total_amount: input.total_amount,
    order_status: "belum_dibuat",
    payment_status: "menunggu_validasi",
    payment_proof_url: input.payment_proof_base64 || "",
    notes: input.notes && input.notes.trim() ? input.notes.trim() : "-",
    updated_at: now,
  };

  if (!webhook) {
    const store = getDemoStore();
    store.orders.unshift(record);
    return { ok: true, mode: "demo", order: record };
  }

  // Prefix tanda petik tunggal (') pada order_date dan nomor WA agar Google Sheets
  // menyimpannya sebagai teks murni (tidak mengubah tanggal jadi Date object & tidak menghapus angka 0 di depan WA)
  const res = await fetch(webhook, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      action: "create_order",
      ...record,
      order_date: `'${today}`,
      customer_name: escapeSheetFormula(record.customer_name),
      customer_whatsapp: `'${cleanPhone}`,
      delivery_address: escapeSheetFormula(record.delivery_address),
      notes: escapeSheetFormula(record.notes),
      payment_proof_base64: input.payment_proof_base64,
    }),
  });

  const data = await parseWebhookJson(res);
  if (!data.ok) {
    return {
      ok: false,
      mode: "google_sheets",
      error: data.error || "Gagal menyimpan ke Google Sheets",
    };
  }

  const savedOrder = data.order ? normalizeOrderRecord(data.order) : record;

  // Write-through cache: langsung masukkan pesanan baru ke memori agar
  // kuota (/), halaman /track, dan Portal Admin langsung akurat tanpa tunggu roundtrip ulang
  const cache = getSheetCache(webhook);
  cache.mutationVersion += 1;
  rememberRecentOrder(cache, savedOrder);
  if (cache.snapshot) {
    const deduped = cache.snapshot.orders.filter(
      (o) => o.order_number.toUpperCase() !== savedOrder.order_number.toUpperCase()
    );
    cache.snapshot = {
      ...cache.snapshot,
      orders: [savedOrder, ...deduped],
      fetchedAt: Date.now(),
    };
  }

  return {
    ok: true,
    mode: "google_sheets",
    order: savedOrder,
  };
}

export async function trackOrderByNumber(
  orderNumber: string,
  opts?: { forceRefresh?: boolean }
): Promise<{
  ok: boolean;
  mode: "google_sheets" | "demo";
  order: OrderRecord | null;
}> {
  const code = orderNumber.trim().toUpperCase();
  const webhook = getWebhookUrl();

  if (!webhook) {
    const store = getDemoStore();
    const found =
      store.orders.find((o) => o.order_number.toUpperCase() === code) || null;
    return { ok: true, mode: "demo", order: found };
  }

  const cache = getSheetCache(webhook);

  if (!opts?.forceRefresh) {
    // 1. Cek cache pesanan baru / baru diupdate (<45s) -> respon <1ms
    const recent = cache.recentOrders.get(code);
    if (recent && Date.now() - recent.savedAt <= RECENT_ORDER_TTL_MS) {
      if (Date.now() - recent.savedAt > TRACK_FRESH_MS) {
        fetchFreshSnapshotFromAppsScript(webhook).catch(() => {});
      }
      return { ok: true, mode: "google_sheets", order: recent.order };
    }

    // 2. Cek snapshot global jika masih valid -> respon <1ms
    if (cache.snapshot) {
      const age = Date.now() - cache.snapshot.fetchedAt;
      if (age <= SNAPSHOT_STALE_MS) {
        const hit = cache.snapshot.orders.find(
          (o) => o.order_number.toUpperCase() === code
        );
        if (hit) {
          if (age > TRACK_FRESH_MS) {
            fetchFreshSnapshotFromAppsScript(webhook).catch(() => {});
          }
          return { ok: true, mode: "google_sheets", order: hit };
        }
        // Jika belum ketemu di snapshot (mis. baru dibuat di instance serverless lain),
        // lanjut query langsung ke Apps Script agar tidak pernah false "tidak ditemukan".
      }
    }
  }

  const url = `${webhook}${
    webhook.includes("?") ? "&" : "?"
  }order_number=${encodeURIComponent(code)}`;
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = await parseWebhookJson(res);
  const tracked = data.tracked_order
    ? normalizeOrderRecord(data.tracked_order)
    : null;

  if (tracked) {
    rememberRecentOrder(cache, tracked);
    if (cache.snapshot) {
      const idx = cache.snapshot.orders.findIndex(
        (o) => o.order_number.toUpperCase() === tracked.order_number.toUpperCase()
      );
      if (idx >= 0) {
        const nextOrders = [...cache.snapshot.orders];
        nextOrders[idx] = tracked;
        cache.snapshot = { ...cache.snapshot, orders: nextOrders };
      } else {
        cache.snapshot = {
          ...cache.snapshot,
          orders: [tracked, ...cache.snapshot.orders],
        };
      }
    } else {
      // Hangatkan snapshot global di background agar navigasi ke / atau Portal Admin ikut instan
      fetchFreshSnapshotFromAppsScript(webhook).catch(() => {});
    }
  }

  return {
    ok: Boolean(data.ok),
    mode: "google_sheets",
    order: tracked,
  };
}

export async function fetchAdminDashboardData(opts?: {
  forceRefresh?: boolean;
}): Promise<AdminDashboardResponse> {
  const webhook = getWebhookUrl();
  const today = getTodayWib();
  const sheetUrl = (process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL || "").trim();

  if (!webhook) {
    const store = getDemoStore();
    const agg = computeOrderAggregates(store.orders, today);
    return {
      ok: true,
      mode: "demo",
      today,
      summary: agg.summary,
      menu_breakdown: agg.menu_breakdown,
      sold_today: agg.sold_today,
      sold_by_base: agg.sold_by_base,
      total_sold: agg.total_sold,
      store_config: {
        store_open: store.storeConfig.store_open,
        quotas: normalizeTotalQuotas(store.storeConfig.quotas),
      },
      orders: store.orders,
      sheet_url: sheetUrl || undefined,
    };
  }

  const snap = await getSheetSnapshot(webhook, {
    forceRefresh: opts?.forceRefresh,
  });
  const agg = computeOrderAggregates(snap.orders, snap.today || today);

  return {
    ok: true,
    mode: "google_sheets",
    today: snap.today || today,
    summary: agg.summary,
    menu_breakdown: agg.menu_breakdown,
    sold_today: agg.sold_today,
    sold_by_base: agg.sold_by_base,
    total_sold: agg.total_sold,
    store_config: {
      store_open: snap.storeConfig.store_open !== false,
      quotas: normalizeTotalQuotas(snap.storeConfig.quotas),
    },
    orders: snap.orders,
    sheet_url: sheetUrl || undefined,
  };
}

export async function updateOrderStatusRecord(params: {
  orderNumber: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
}): Promise<{
  ok: boolean;
  mode: "google_sheets" | "demo";
  order?: OrderRecord;
  error?: string;
}> {
  const code = params.orderNumber.trim().toUpperCase();
  const webhook = getWebhookUrl();

  if (!webhook) {
    const store = getDemoStore();
    const target = store.orders.find(
      (o) => o.order_number.toUpperCase() === code
    );
    if (!target) {
      return { ok: false, mode: "demo", error: "Pesanan tidak ditemukan" };
    }
    if (params.orderStatus) target.order_status = params.orderStatus;
    if (params.paymentStatus) target.payment_status = params.paymentStatus;
    target.updated_at = getNowWib();
    return { ok: true, mode: "demo", order: target };
  }

  const res = await fetch(webhook, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      action: "update_status",
      secret: getApiSecret(),
      order_number: code,
      order_status: params.orderStatus || "",
      payment_status: params.paymentStatus || "",
    }),
  });

  const data = await parseWebhookJson(res);
  if (!data.ok) {
    return {
      ok: false,
      mode: "google_sheets",
      error: data.error || "Gagal mengubah status di Google Sheets",
    };
  }

  const updatedOrder = data.order ? normalizeOrderRecord(data.order) : undefined;

  // Write-through cache: status baru langsung aktif di /track & dashboard dalam <1ms
  const cache = getSheetCache(webhook);
  cache.mutationVersion += 1;
  if (updatedOrder) {
    rememberRecentOrder(cache, updatedOrder);
  }
  if (cache.snapshot) {
    const nowText = getNowWib();
    const nextOrders = cache.snapshot.orders.map((o) => {
      if (o.order_number.toUpperCase() !== code) return o;
      if (updatedOrder) return updatedOrder;
      return {
        ...o,
        order_status: params.orderStatus || o.order_status,
        payment_status: params.paymentStatus || o.payment_status,
        updated_at: nowText,
      };
    });
    cache.snapshot = {
      ...cache.snapshot,
      orders: nextOrders,
      fetchedAt: Date.now(),
    };
    const matched = nextOrders.find((o) => o.order_number.toUpperCase() === code);
    if (matched) rememberRecentOrder(cache, matched);
  }

  return {
    ok: true,
    mode: "google_sheets",
    order: updatedOrder,
  };
}

export async function deleteOrderRecord(
  orderNumber: string
): Promise<{ ok: boolean; error?: string }> {
  const code = orderNumber.trim().toUpperCase();
  const webhook = getWebhookUrl();

  if (!webhook) {
    const store = getDemoStore();
    const idx = store.orders.findIndex(
      (o) => o.order_number.toUpperCase() === code
    );
    if (idx === -1) return { ok: false, error: "Pesanan tidak ditemukan" };
    store.orders.splice(idx, 1);
    return { ok: true };
  }

  const res = await fetch(webhook, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      action: "delete_order",
      secret: getApiSecret(),
      order_number: code,
    }),
  });
  const data = await parseWebhookJson(res);
  if (data.ok) {
    const cache = getSheetCache(webhook);
    cache.mutationVersion += 1;
    cache.recentOrders.delete(code);
    if (cache.snapshot) {
      cache.snapshot = {
        ...cache.snapshot,
        orders: cache.snapshot.orders.filter(
          (o) => o.order_number.toUpperCase() !== code
        ),
        fetchedAt: Date.now(),
      };
    }
  }
  return { ok: Boolean(data.ok), error: data.error };
}

export async function updateStoreConfigRecord(input: {
  store_open: boolean;
  quotas: Record<string, number>;
}): Promise<{ ok: boolean; error?: string }> {
  const webhook = getWebhookUrl();

  if (!webhook) {
    const store = getDemoStore();
    store.storeConfig = {
      store_open: input.store_open,
      quotas: { ...DEFAULT_QUOTAS, ...input.quotas },
    };
    return { ok: true };
  }

  const res = await fetch(webhook, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      action: "update_config",
      secret: getApiSecret(),
      store_open: input.store_open,
      quotas: input.quotas,
    }),
  });
  const data = await parseWebhookJson(res);
  if (data.ok) {
    const cache = getSheetCache(webhook);
    cache.mutationVersion += 1;
    if (cache.snapshot) {
      cache.snapshot = {
        ...cache.snapshot,
        storeConfig: {
          store_open: input.store_open,
          quotas: normalizeTotalQuotas(input.quotas),
        },
        fetchedAt: Date.now(),
      };
    }
  }
  return { ok: Boolean(data.ok), error: data.error };
}
