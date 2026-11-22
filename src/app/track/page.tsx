import { Suspense } from "react";
import { TrackOrderClient } from "@/components/TrackOrderClient";

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto py-12 text-center text-sm text-brand-muted font-semibold">
          Memuat pelacak pesanan...
        </div>
      }
    >
      <TrackOrderClient />
    </Suspense>
  );
}
