import { Suspense } from "react";
import { TrackOrderClient } from "@/components/TrackOrderClient";
import { sanitizeOrderForPublicTrack } from "@/lib/order-aggregates";
import { trackOrderByNumber } from "@/lib/sheets-client";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ order_number?: string; ordered?: string }>;
}) {
  const resolved = await searchParams;
  const ticket = String(resolved.order_number || "")
    .trim()
    .toUpperCase();

  let initialOrder = null;
  let initialSearched = false;

  if (ticket && ticket.length <= 40) {
    initialSearched = true;
    try {
      const res = await trackOrderByNumber(ticket);
      if (res.ok && res.order) {
        initialOrder = sanitizeOrderForPublicTrack(res.order);
      }
    } catch {
      // Fallback ke fetch di sisi klien jika upstream sementara gagal
      initialSearched = false;
    }
  }

  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto py-12 text-center text-sm text-brand-muted font-semibold">
          Memuat pelacak pesanan...
        </div>
      }
    >
      <TrackOrderClient
        initialTicket={ticket}
        initialOrder={initialOrder}
        initialSearched={initialSearched}
      />
    </Suspense>
  );
}
