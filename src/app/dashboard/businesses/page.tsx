import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { createServiceRoleClient } from "@/lib/supabase/server";

type BusinessesPageProps = {
  searchParams: Promise<{ q?: string; archived?: string }>;
};

export default async function BusinessesPage({ searchParams }: BusinessesPageProps) {
  const { q, archived } = await searchParams;
  const showArchived = archived === "1";
  const db = createServiceRoleClient();
  let query = db.from("businesses").select("*").order("lead_score", { ascending: false }).order("created_at", { ascending: false });
  query = showArchived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const normalizedQuery = q?.trim().toLowerCase();
  const businesses = normalizedQuery
    ? data?.filter((business) =>
        [business.name, business.city, business.category].some((value) => value?.toLowerCase().includes(normalizedQuery)),
      )
    : data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Businesses</h1>
          <p className="text-muted-foreground text-sm">
            {showArchived ? "Review removed leads and restore anything you want back in the active workflow." : "Manage active leads, scores, demos, and manual outreach state."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={showArchived ? "/dashboard/businesses" : "/dashboard/businesses?archived=1"}>
              {showArchived ? "View active" : "View archived"}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/businesses/new">
              <Plus className="h-4 w-4" />
              Add lead
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{showArchived ? "Archived leads" : "Lead list"}</CardTitle>
          <CardDescription>Duplicate detection is based on name, city, and phone. Archived leads are hidden from normal workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-4 flex max-w-md gap-2">
            {showArchived ? <input type="hidden" name="archived" value="1" /> : null}
            <Input name="q" defaultValue={q} placeholder="Search name, city, or category" />
            <Button type="submit" variant="outline">Search</Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  {showArchived ? <TableHead>Archived</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses?.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/dashboard/businesses/${business.id}`}>
                        {business.name}
                      </Link>
                    </TableCell>
                    <TableCell>{business.category || "Unknown"}</TableCell>
                    <TableCell>{[business.city, business.state].filter(Boolean).join(", ") || "Unknown"}</TableCell>
                    <TableCell><StatusBadge status={business.website_status} /></TableCell>
                    <TableCell className="text-right">{business.lead_score}</TableCell>
                    {showArchived ? <TableCell>{business.archived_at ? new Date(business.archived_at).toLocaleDateString() : "Unknown"}</TableCell> : null}
                  </TableRow>
                ))}
                {!businesses?.length ? (
                  <TableRow>
                    <TableCell colSpan={showArchived ? 6 : 5} className="text-muted-foreground py-8 text-center">
                      No businesses found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
