import { StorefrontClient } from "@/components/StorefrontClient";
import { fetchPublicQuotas } from "@/lib/sheets-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialQuota = await fetchPublicQuotas().catch(() => null);
  return <StorefrontClient initialQuota={initialQuota} />;
}
