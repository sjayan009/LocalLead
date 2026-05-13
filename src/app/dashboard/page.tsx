import Link from "next/link";
import { ArrowRight, Building2, CreditCard, FileText, Gauge } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const db = createServiceRoleClient();
  const [{ count: businessCount }, { data: recent }, { data: demos }, { data: payments }] = await Promise.all([
    db.from("businesses").select("*", { count: "exact", head: true }).is("archived_at", null),
    db.from("businesses").select("*").is("archived_at", null).order("created_at", { ascending: false }).limit(5),
    db.from("demo_sites").select("id,status"),
    db.from("payments").select("id,status,is_active"),
  ]);

  const draftDemos = demos?.filter((demo) => demo.status === "draft").length ?? 0;
  const paymentLinks = payments?.filter((payment) => payment.is_active).length ?? 0;
  const highScore = recent?.filter((business) => business.lead_score >= 70).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Lead Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Review local leads, generate compliant demos, and keep outreach human-approved.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/businesses/new">Add lead</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Businesses" value={businessCount ?? 0} icon={Building2} />
        <Metric title="High-score leads" value={highScore} icon={Gauge} />
        <Metric title="Draft demos" value={draftDemos} icon={FileText} />
        <Metric title="Payment links" value={paymentLinks} icon={CreditCard} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent leads</CardTitle>
            <CardDescription>Newest businesses added to the workspace.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/businesses">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {recent?.length ? (
            recent.map((business) => (
              <Link
                href={`/dashboard/businesses/${business.id}`}
                key={business.id}
                className="hover:bg-muted/60 grid gap-2 rounded-md border p-4 transition-colors md:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <p className="font-medium">{business.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {[business.category, business.city, business.state].filter(Boolean).join(" - ") || "No location yet"}
                  </p>
                </div>
                <StatusBadge status={business.website_status} />
                <span className="text-muted-foreground text-sm">Score {business.lead_score}</span>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No businesses yet. Add one manually or import a CSV.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof Building2;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
