export type OrderStatus =
  | "belum_dibuat"
  | "sedang_dibuat"
  | "siap_diantar"
  | "selesai"
  | "dibatalkan";

export type PaymentStatus =
  | "menunggu_validasi"
  | "tervalidasi"
  | "ditolak";

export type DeliveryMethod = "pickup" | "delivery";

export interface OrderItem {
  product_id: string;
  name: string;
  variant: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

export interface OrderRecord {
  timestamp: string;
  order_number: string;
  order_date: string;
  pickup_day: string;
  pickup_slot: string;
  customer_name: string;
  customer_whatsapp: string;
  delivery_method: DeliveryMethod;
  delivery_address: string;
  items_summary: string;
  items: OrderItem[];
  total_portions: number;
  total_amount: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  payment_proof_url: string;
  notes: string;
  updated_at: string;
}

export interface MenuProduct {
  id: string;
  name: string;
  baseTitle: string;
  edition: "GERAH" | "ORIGINAL";
  baseType: "fries" | "mac";
  priceShort: string;
  tagline: string;
  description: string;
  price: number;
  defaultQuota: number;
  badge: string;
  variants: string[];
  imageUrl: string;
}

export interface MenuBreakdownItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface AdminSummary {
  total_orders: number;
  active_orders: number;
  gross_revenue: number;
  verified_revenue: number;
  total_portions_sold: number;
  pending_payments: number;
  status_counts: Record<OrderStatus, number>;
}

export interface StoreQuotaConfig {
  store_open: boolean;
  quotas: Record<string, number>;
}

export interface AdminDashboardResponse {
  ok: boolean;
  mode: "google_sheets" | "demo";
  today: string;
  summary: AdminSummary;
  menu_breakdown: MenuBreakdownItem[];
  sold_today: Record<string, number>;
  store_config: StoreQuotaConfig;
  orders: OrderRecord[];
  sheet_url?: string;
  error?: string;
}

export interface PublicQuotaResponse {
  ok: boolean;
  mode: "google_sheets" | "demo";
  today: string;
  sold_today: Record<string, number>;
  store_config: StoreQuotaConfig;
}
