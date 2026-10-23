import React from "react";
import { constructMetadata } from "@/lib/metadata";
import { SubPageHeader } from "@/components/more/SubPageHeader";
import { AdminDashboardClient } from "@/app/admin/AdminDashboardClient";

export const runtime = "edge";

export const metadata = constructMetadata({
  title: "Admin Dashboard | a1score",
  description: "Native site control and monitoring dashboard for a1score.",
  path: "/admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <div className="max-w-[840px] mx-auto space-y-6 pb-12">
      <SubPageHeader
        title="Admin Control"
        backHref="/more"
        backLabel="Back to More"
      />
      <AdminDashboardClient />
    </div>
  );
}
