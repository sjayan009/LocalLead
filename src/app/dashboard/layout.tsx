import type { ReactNode } from "react";

import { DashboardNav } from "@/components/dashboard-nav";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="bg-background grid min-h-svh md:grid-cols-[16rem_1fr]">
      <DashboardNav />
      <main className="min-w-0 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
