import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Archive, Check, CreditCard, ExternalLink, FileText, Mail, Phone, RotateCcw, SearchCheck, X } from "lucide-react";

import {
  approveDemoAction,
  archiveBusinessAction,
  checkWebsiteAction,
  createPaymentLinkAction,
  deactivatePaymentLinkAction,
  generateDemoAndOutreachAction,
  restoreBusinessAction,
  updateOutreachStatusAction,
} from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAppUrl, hasStripeEnv, isLocalAppUrl } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/server";

type BusinessDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
};

export default async function BusinessDetailPage({ params, searchParams }: BusinessDetailPageProps) {
  const { id } = await params;
  const { notice } = await searchParams;
  const db = createServiceRoleClient();
  const [{ data: business }, { data: demo }, { data: outreach }, { data: payments }] = await Promise.all([
    db.from("businesses").select("*").eq("id", id).single(),
    db.from("demo_sites").select("*").eq("business_id", id).maybeSingle(),
    db.from("outreach_messages").select("*").eq("business_id", id).maybeSingle(),
    db.from("payments").select("*").eq("business_id", id).order("created_at", { ascending: false }),
  ]);

  if (!business) {
    notFound();
  }

  const archived = Boolean(business.archived_at);
  const appUrl = getAppUrl().replace(/\/$/, "");
  const appUrlIsLocal = isLocalAppUrl();
  const demoUrl = demo ? `${appUrl}/demo/${demo.slug}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{business.name}</h1>
          <p className="text-muted-foreground text-sm">
            {[business.category, business.city, business.state].filter(Boolean).join(" - ") || "Lead details"}
            {archived ? " - Archived" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={business.website_status} />
          <span className="border-border rounded-md border px-3 py-1 text-sm">Lead score {business.lead_score}</span>
        </div>
      </div>

      {notice === "duplicate" ? (
        <Alert>
          <AlertTitle>Duplicate detected</AlertTitle>
          <AlertDescription>A lead with the same name, city, and phone already exists.</AlertDescription>
        </Alert>
      ) : null}

      {archived ? (
        <Alert>
          <Archive className="h-4 w-4" />
          <AlertTitle>Lead archived</AlertTitle>
          <AlertDescription>
            This lead is hidden from active dashboard views and public demo links are unavailable while it stays archived.
            {business.archive_reason ? ` Reason: ${business.archive_reason}` : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      {appUrlIsLocal ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Demo links are still local</AlertTitle>
          <AlertDescription>
            Outreach drafts currently use {appUrl}. Before emailing a business, deploy the app and set NEXT_PUBLIC_APP_URL
            to your public domain, then regenerate the outreach draft.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Business info</CardTitle>
            <CardDescription>Review source details before creating outreach or payment links.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <Info label="Address" value={[business.address, business.city, business.state].filter(Boolean).join(", ")} />
            <Info label="Phone" value={business.phone} icon={Phone} />
            <Info label="Email" value={business.email} icon={Mail} />
            <Info label="Existing website" value={business.existing_website_url} link />
            <Info label="Source" value={business.source_url} link />
            <Separator />
            <div>
              <p className="text-muted-foreground mb-1">Notes</p>
              <p className="whitespace-pre-wrap">{business.notes || "No notes yet."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
            <CardDescription>Actions stay behind manual review.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {archived ? (
              <p className="text-muted-foreground text-sm">Restore this lead before running website checks, creating demos, approving outreach, or creating payment links.</p>
            ) : (
              <>
                <form action={checkWebsiteAction}>
                  <input type="hidden" name="businessId" value={business.id} />
                  <SubmitButton variant="outline" className="w-full justify-start">
                    <SearchCheck className="h-4 w-4" />
                    Check website status
                  </SubmitButton>
                </form>
                <form action={generateDemoAndOutreachAction}>
                  <input type="hidden" name="businessId" value={business.id} />
                  <SubmitButton variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4" />
                    {demo || outreach ? "Regenerate demo and outreach draft" : "Generate demo and outreach draft"}
                  </SubmitButton>
                </form>
                {demo ? (
                  <form action={approveDemoAction}>
                    <input type="hidden" name="businessId" value={business.id} />
                    <SubmitButton variant="outline" className="w-full justify-start">
                      <Check className="h-4 w-4" />
                      Approve demo
                    </SubmitButton>
                  </form>
                ) : null}
                {hasStripeEnv() ? (
                  <div className="grid gap-2">
                    <form action={createPaymentLinkAction}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <input type="hidden" name="paymentType" value="setup" />
                      <SubmitButton className="w-full justify-start">
                        <CreditCard className="h-4 w-4" />
                        Create $299 setup link
                      </SubmitButton>
                    </form>
                    <form action={createPaymentLinkAction}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <input type="hidden" name="paymentType" value="maintenance" />
                      <SubmitButton variant="outline" className="w-full justify-start">
                        <CreditCard className="h-4 w-4" />
                        Create $49/month maintenance link
                      </SubmitButton>
                    </form>
                  </div>
                ) : (
                  <Alert>
                    <AlertTitle>Stripe not configured</AlertTitle>
                    <AlertDescription>Add STRIPE_SECRET_KEY before creating payment links.</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demo site</CardTitle>
            <CardDescription>Unofficial preview only. Do not present it as the official business site.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demo ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={demo.status} />
                  <Button asChild variant="outline" size="sm">
                    <Link href={demoUrl ?? `/demo/${demo.slug}`} target="_blank" rel="noopener noreferrer">
                      Open demo
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                {demoUrl ? (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <p className="text-muted-foreground mb-1">Shareable demo URL</p>
                    <p className="break-all font-medium">{demoUrl}</p>
                  </div>
                ) : null}
                <div>
                  <p className="font-medium">{demo.hero_headline}</p>
                  <p className="text-muted-foreground text-sm">{demo.subheadline}</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No demo generated yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outreach draft</CardTitle>
            <CardDescription>No email or SMS is sent automatically. TODO: wire future provider send behind manual approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outreach ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={outreach.status} />
                  <OutreachButton businessId={business.id} status="approved" label="Approve Draft" icon={Check} />
                  <OutreachButton businessId={business.id} status="rejected" label="Reject Draft" icon={X} />
                  <OutreachButton businessId={business.id} status="sent" label="Mark Contacted" icon={Mail} />
                </div>
                <div className="rounded-md border p-4">
                  <p className="font-medium">{outreach.subject}</p>
                  <pre className="text-muted-foreground mt-3 whitespace-pre-wrap font-sans text-sm">{outreach.body}</pre>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No outreach draft generated yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            Setup is charged once. Maintenance creates a monthly Stripe subscription that renews until canceled in
            Stripe. These payments are for your website service only; this does not onboard the business as a merchant.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {payments?.length ? (
            payments.map((payment) => (
              <div key={payment.id} className="flex flex-col gap-2 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">
                    ${(payment.amount / 100).toFixed(2)}
                    {payment.payment_type === "maintenance" ? "/month maintenance" : " setup fee"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {payment.is_active ? "Active" : "Inactive"} - {payment.status}
                    {payment.deactivation_reason ? ` - ${payment.deactivation_reason}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {payment.is_active && safeHttpHref(payment.stripe_payment_link) ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={safeHttpHref(payment.stripe_payment_link) ?? "#"} target="_blank" rel="noopener noreferrer">
                        Open payment link
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  {payment.is_active ? (
                    <form action={deactivatePaymentLinkAction}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <input
                        type="hidden"
                        name="reason"
                        value={payment.stripe_payment_link_id ? "Deactivated duplicate or unused payment link." : "Archived legacy payment link locally."}
                      />
                      <SubmitButton variant="outline" size="sm">
                        <Archive className="h-4 w-4" />
                        {payment.stripe_payment_link_id ? "Deactivate" : "Archive locally"}
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No payment links yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead management</CardTitle>
          <CardDescription>
            Archive leads you do not want to pursue. This hides them from active views without deleting outreach, demo, or payment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archived ? (
            <form action={restoreBusinessAction}>
              <input type="hidden" name="businessId" value={business.id} />
              <SubmitButton variant="outline">
                <RotateCcw className="h-4 w-4" />
                Restore lead
              </SubmitButton>
            </form>
          ) : (
            <form action={archiveBusinessAction}>
              <input type="hidden" name="businessId" value={business.id} />
              <input type="hidden" name="archiveReason" value="Not pursuing this lead." />
              <SubmitButton variant="outline">
                <Archive className="h-4 w-4" />
                Archive lead
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({
  label,
  value,
  link = false,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  link?: boolean;
  icon?: typeof Phone;
}) {
  const display = value || "Not provided";
  const href = link ? safeHttpHref(value) : null;
  return (
    <div>
      <p className="text-muted-foreground mb-1">{label}</p>
      {href ? (
        <Link className="break-all hover:underline" href={href} target="_blank" rel="noopener noreferrer">
          {display}
        </Link>
      ) : (
        <p className="flex items-center gap-2">
          {Icon ? <Icon className="text-muted-foreground h-4 w-4" /> : null}
          {display}
        </p>
      )}
    </div>
  );
}

function safeHttpHref(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function OutreachButton({
  businessId,
  status,
  label,
  icon: Icon,
}: {
  businessId: string;
  status: string;
  label: string;
  icon: typeof Check;
}) {
  return (
    <form action={updateOutreachStatusAction}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant="outline" size="sm">
        <Icon className="h-4 w-4" />
        {label}
      </SubmitButton>
    </form>
  );
}
