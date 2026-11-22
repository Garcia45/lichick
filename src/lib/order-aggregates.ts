import { getBaseTypeForProductId } from "@/config/store";
import type {
  AdminSummary,
  MenuBaseType,
  MenuBreakdownItem,
  OrderRecord,
  OrderStatus,
} from "@/types/order";

export interface OrderAggregates {
  summary: AdminSummary;
  menu_breakdown: MenuBreakdownItem[];
  sold_today: Record<string, number>;
  sold_by_base: Record<MenuBaseType, number>;
  total_sold: number;
}

export function computeOrderAggregates(
  orders: OrderRecord[],
  today: string
): OrderAggregates {
  const soldToday: Record<string, number> = {};
  const soldByBase: Record<MenuBaseType, number> = { mac: 0, fries: 0 };
  const menuMap: Record<string, MenuBreakdownItem> = {};
  const statusCounts: Record<OrderStatus, number> = {
    belum_dibuat: 0,
    sedang_dibuat: 0,
    siap_diantar: 0,
    selesai: 0,
    dibatalkan: 0,
  };

  let grossRevenue = 0;
  let verifiedRevenue = 0;
  let totalPortionsSold = 0;
  let pendingPayments = 0;

  for (const order of orders) {
    statusCounts[order.order_status] =
      (statusCounts[order.order_status] || 0) + 1;

    if (order.order_status !== "dibatalkan") {
      grossRevenue += order.total_amount;
      totalPortionsSold += order.total_portions;

      if (order.payment_status === "tervalidasi") {
        verifiedRevenue += order.total_amount;
      } else if (order.payment_status === "menunggu_validasi") {
        pendingPayments += 1;
      }

      if (order.order_date === today || !order.order_date) {
        for (const item of order.items) {
          soldToday[item.product_id] =
            (soldToday[item.product_id] || 0) + item.quantity;
        }
      }

      for (const item of order.items) {
        const base = getBaseTypeForProductId(item.product_id);
        soldByBase[base] = (soldByBase[base] || 0) + item.quantity;

        if (!menuMap[item.name]) {
          menuMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        menuMap[item.name].quantity += item.quantity;
        menuMap[item.name].revenue += item.subtotal;
      }
    }
  }

  return {
    summary: {
      total_orders: orders.length,
      active_orders: orders.length - (statusCounts.dibatalkan || 0),
      gross_revenue: grossRevenue,
      verified_revenue: verifiedRevenue,
      total_portions_sold: totalPortionsSold,
      pending_payments: pendingPayments,
      status_counts: statusCounts,
    },
    menu_breakdown: Object.values(menuMap),
    sold_today: soldToday,
    sold_by_base: soldByBase,
    total_sold: totalPortionsSold,
  };
}

export function maskPublicWhatsapp(raw: string): string {
  const clean = String(raw || "").trim();
  if (!clean || clean === "-") return "-";
  if (clean.length <= 6) return "****";
  return `${clean.slice(0, 4)}****${clean.slice(-3)}`;
}

export function maskPublicAddress(raw: string): string {
  const clean = String(raw || "").trim();
  if (!clean || clean === "-") return "-";
  if (clean.length <= 20) return clean;
  return `${clean.slice(0, 18)}...`;
}

export function sanitizeOrderForPublicTrack(order: OrderRecord): OrderRecord {
  return {
    ...order,
    customer_whatsapp: maskPublicWhatsapp(order.customer_whatsapp),
    delivery_address: maskPublicAddress(order.delivery_address),
    payment_proof_url: "",
  };
}
