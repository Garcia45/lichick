import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { isAdminAuthenticated, verifyAdminSlug } from "@/lib/admin-auth";
import { fetchAdminDashboardData } from "@/lib/sheets-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal Dapur | LiChick by LUCUIH",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function PrivateAdminPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!verifyAdminSlug(slug)) {
    notFound();
  }

  const initialAuthenticated = await isAdminAuthenticated();
  const initialData = initialAuthenticated
    ? await fetchAdminDashboardData().catch(() => null)
    : null;

  return (
    <AdminDashboardClient
      initialAuthenticated={initialAuthenticated}
      initialData={initialData}
    />
  );
}
