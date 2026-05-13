"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { duplicateKey, normalizeBusinessInput } from "@/lib/business";
import { generateDemoContent, generateOutreachDraft, buildDemoSlug } from "@/lib/demo-generator";
import { hasStripeEnv } from "@/lib/env";
import { createServicePaymentLink, deactivateStripePaymentLink } from "@/lib/payments";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkWebsiteStatus } from "@/lib/website-checker";
import { requireAdmin } from "@/lib/auth";
import type { PlaceCandidate } from "@/lib/google-places";
import { generateFallbackSearchIdeas, generateSearchIdeas, type SearchIdea } from "@/lib/search-ideas";
import type { Business, OutreachMessage, PaymentType } from "@/lib/types";

export type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};

export type SearchIdeasResult = {
  ideas: SearchIdea[];
  error: string | null;
  source: "ai" | "fallback";
};

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next.startsWith("/dashboard") ? next : "/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${next.startsWith("/dashboard") ? next : "/dashboard"}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&mode=signup`);
  }

  redirect("/login?message=Account created. Check your email if confirmation is enabled, then sign in.");
}

export async function signOutAction() {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createBusinessAction(formData: FormData) {
  await requireAdmin();
  const input = normalizeBusinessInput(Object.fromEntries(formData.entries()));
  const db = createServiceRoleClient();

  const { data: existingBusinesses } = await db.from("businesses").select("id,name,city,phone");
  const existing = (existingBusinesses ?? []) as Pick<Business, "id" | "name" | "city" | "phone">[];
  const key = duplicateKey(input);
  const duplicate = existing?.find((business) => duplicateKey(business) === key);

  if (duplicate) {
    redirect(`/dashboard/businesses/${duplicate.id}?notice=duplicate`);
  }

  const { data, error } = await db
    .from("businesses")
    .insert({
      ...input,
      email: input.email || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/businesses/${data.id}`);
}

export async function importBusinessesAction(rows: Record<string, unknown>[]): Promise<ImportResult> {
  await requireAdmin();
  const db = createServiceRoleClient();
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };
  const { data: existingBusinesses } = await db.from("businesses").select("id,name,city,phone");
  const existing = (existingBusinesses ?? []) as Pick<Business, "id" | "name" | "city" | "phone">[];
  const seen = new Set(existing.map((business) => duplicateKey(business)));

  for (const [index, row] of rows.entries()) {
    try {
      const input = normalizeBusinessInput(row);
      const key = duplicateKey(input);

      if (seen.has(key)) {
        result.skipped += 1;
        continue;
      }

      const { error } = await db.from("businesses").insert({
        ...input,
        email: input.email || null,
      });

      if (error) {
        result.errors.push(`Row ${index + 2}: ${error.message}`);
        continue;
      }

      seen.add(key);
      result.created += 1;
    } catch (error) {
      result.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : "Invalid row"}`);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/businesses");
  return result;
}

export async function importDiscoveredBusinessesAction(
  _previousState: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  await requireAdmin();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const selectedPlaceIds = new Set(formData.getAll("selectedPlaceId").map(String));
  const candidatesJson = String(formData.get("candidates") ?? "[]");
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  if (!selectedPlaceIds.size) {
    return { created: 0, skipped: 0, errors: ["Select at least one candidate to import."] };
  }

  let candidates: PlaceCandidate[];
  try {
    candidates = JSON.parse(candidatesJson) as PlaceCandidate[];
  } catch {
    return { created: 0, skipped: 0, errors: ["Could not read selected candidates. Please search again."] };
  }

  const db = createServiceRoleClient();
  const { data: existingBusinesses } = await db.from("businesses").select("id,name,city,phone,external_place_id");
  const existing = (existingBusinesses ?? []) as Pick<Business, "id" | "name" | "city" | "phone" | "external_place_id">[];
  const duplicateKeys = new Set(existing.map((business) => duplicateKey(business)));
  const existingPlaceIds = new Set(existing.map((business) => business.external_place_id).filter(Boolean));

  for (const candidate of candidates) {
    if (!selectedPlaceIds.has(candidate.placeId)) {
      continue;
    }

    if (!candidate.placeId || !candidate.name) {
      result.errors.push("Skipped a candidate with missing place ID or name.");
      continue;
    }

    const candidateInput = {
      name: candidate.name,
      category: candidate.category,
      address: candidate.address,
      city,
      state,
      phone: candidate.phone,
      email: null,
      existing_website_url: candidate.websiteUrl,
      source_url: candidate.sourceUrl,
      notes: "Imported from Google Places preview after manual approval.",
    };
    const candidateKey = duplicateKey(candidateInput);

    if (existingPlaceIds.has(candidate.placeId) || duplicateKeys.has(candidateKey)) {
      result.skipped += 1;
      continue;
    }

    const { error } = await db.from("businesses").insert({
      ...candidateInput,
      external_place_id: candidate.placeId,
      website_status: "unknown",
      lead_score: 0,
    });

    if (error) {
      result.errors.push(`${candidate.name}: ${error.message}`);
      continue;
    }

    existingPlaceIds.add(candidate.placeId);
    duplicateKeys.add(candidateKey);
    result.created += 1;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/businesses");
  revalidatePath("/dashboard/discover");
  return result;
}

export async function generateSearchIdeasAction(
  _previousState: SearchIdeasResult | null,
  formData: FormData,
): Promise<SearchIdeasResult> {
  await requireAdmin();

  try {
    const ideas = await generateSearchIdeas({
      targetArea: String(formData.get("targetArea") ?? "").trim(),
      homeCity: String(formData.get("homeCity") ?? "").trim(),
      homeState: String(formData.get("homeState") ?? "").trim(),
      preferences: String(formData.get("preferences") ?? "").trim(),
    });

    return { ideas, error: null, source: "ai" };
  } catch (error) {
    const fallbackIdeas = generateFallbackSearchIdeas({
      targetArea: String(formData.get("targetArea") ?? "").trim(),
      homeCity: String(formData.get("homeCity") ?? "").trim(),
      homeState: String(formData.get("homeState") ?? "").trim(),
      preferences: String(formData.get("preferences") ?? "").trim(),
    });

    return {
      ideas: fallbackIdeas,
      error: error instanceof Error ? `Using curated fallback suggestions. ${error.message}` : "Using curated fallback suggestions.",
      source: "fallback",
    };
  }
}

export async function checkWebsiteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("businessId") ?? "");
  const db = createServiceRoleClient();
  const { data: business, error } = await db.from("businesses").select("*").eq("id", id).single();

  if (error || !business) {
    throw new Error(error?.message ?? "Business not found.");
  }
  assertActiveBusiness(business);

  const result = await checkWebsiteStatus(business.existing_website_url);
  const notes = [
    business.notes,
    `Website check: ${result.issues.join(" ")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  await db
    .from("businesses")
    .update({
      website_status: result.status,
      lead_score: result.leadScore,
      existing_website_url: result.normalizedUrl ?? business.existing_website_url,
      notes,
    })
    .eq("id", business.id);

  revalidatePath(`/dashboard/businesses/${business.id}`);
  revalidatePath("/dashboard/businesses");
}

export async function generateDemoAndOutreachAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("businessId") ?? "");
  const db = createServiceRoleClient();
  const { data: business, error } = await db.from("businesses").select("*").eq("id", id).single();

  if (error || !business) {
    throw new Error(error?.message ?? "Business not found.");
  }
  assertActiveBusiness(business);

  const { data: existingDemo } = await db.from("demo_sites").select("*").eq("business_id", id).maybeSingle();
  const slug = existingDemo?.slug ?? (await uniqueSlug(db, buildDemoSlug(business)));
  const demo = generateDemoContent(business);

  await db.from("demo_sites").upsert(
    {
      business_id: business.id,
      slug,
      hero_headline: demo.heroHeadline,
      subheadline: demo.subheadline,
      services_json: demo.services,
      about_text: demo.aboutText,
      call_to_action: demo.callToAction,
      contact_phone: demo.contactPhone,
      contact_email: demo.contactEmail,
      generated_html_or_json: demo,
      status: existingDemo?.status ?? "draft",
    },
    { onConflict: "business_id" },
  );

  const outreach = generateOutreachDraft(business, slug);
  await db.from("outreach_messages").upsert(
    {
      business_id: business.id,
      subject: outreach.subject,
      body: outreach.body,
      status: "draft",
    },
    { onConflict: "business_id" },
  );

  revalidatePath(`/dashboard/businesses/${business.id}`);
  revalidatePath(`/demo/${slug}`);
}

export async function updateOutreachStatusAction(formData: FormData) {
  await requireAdmin();
  const businessId = String(formData.get("businessId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!["approved", "rejected", "sent"].includes(status)) {
    throw new Error("Unsupported outreach status.");
  }

  const db = createServiceRoleClient();
  const { data: business } = await db.from("businesses").select("id,archived_at").eq("id", businessId).single();
  assertActiveBusiness(business);

  await db
    .from("outreach_messages")
    .update({ status: status as OutreachMessage["status"] })
    .eq("business_id", businessId);

  revalidatePath(`/dashboard/businesses/${businessId}`);
  revalidatePath("/dashboard/businesses");
}

export async function approveDemoAction(formData: FormData) {
  await requireAdmin();
  const businessId = String(formData.get("businessId") ?? "");
  const db = createServiceRoleClient();
  const { data: business } = await db.from("businesses").select("id,archived_at").eq("id", businessId).single();
  assertActiveBusiness(business);

  await db.from("demo_sites").update({ status: "approved" }).eq("business_id", businessId);
  revalidatePath(`/dashboard/businesses/${businessId}`);
}

export async function archiveBusinessAction(formData: FormData) {
  await requireAdmin();
  const businessId = String(formData.get("businessId") ?? "");
  const reason = String(formData.get("archiveReason") ?? "Archived from dashboard.").trim().slice(0, 240);
  const db = createServiceRoleClient();

  const { error } = await db
    .from("businesses")
    .update({
      archived_at: new Date().toISOString(),
      archive_reason: reason || "Archived from dashboard.",
    })
    .eq("id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/businesses");
  revalidatePath(`/dashboard/businesses/${businessId}`);
  redirect("/dashboard/businesses");
}

export async function restoreBusinessAction(formData: FormData) {
  await requireAdmin();
  const businessId = String(formData.get("businessId") ?? "");
  const db = createServiceRoleClient();

  const { error } = await db
    .from("businesses")
    .update({
      archived_at: null,
      archive_reason: null,
    })
    .eq("id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/businesses");
  revalidatePath(`/dashboard/businesses/${businessId}`);
}

export async function createPaymentLinkAction(formData: FormData) {
  await requireAdmin();
  const businessId = String(formData.get("businessId") ?? "");
  const paymentType = parsePaymentType(String(formData.get("paymentType") ?? "setup"));

  if (!hasStripeEnv()) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  const db = createServiceRoleClient();
  const [{ data: business, error }, { data: existingPayment }] = await Promise.all([
    db.from("businesses").select("*").eq("id", businessId).single(),
    db
      .from("payments")
      .select("*")
      .eq("business_id", businessId)
      .eq("payment_type", paymentType)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error || !business) {
    throw new Error(error?.message ?? "Business not found.");
  }
  assertActiveBusiness(business);

  if (existingPayment) {
    revalidatePath(`/dashboard/businesses/${business.id}`);
    return;
  }

  let link: Awaited<ReturnType<typeof createServicePaymentLink>>;
  try {
    link = await createServicePaymentLink(business, paymentType);
  } catch {
    throw new Error("Stripe could not create the payment link. Check Stripe configuration and try again.");
  }
  await db.from("payments").insert({
    business_id: business.id,
    stripe_payment_link: link.url,
    stripe_payment_link_id: link.paymentLinkId,
    stripe_product_id: link.productId,
    stripe_price_id: link.priceId,
    amount: link.amount,
    payment_type: link.paymentType,
    is_active: true,
    status: "created",
  });

  revalidatePath(`/dashboard/businesses/${business.id}`);
}

export async function deactivatePaymentLinkAction(formData: FormData) {
  await requireAdmin();
  const businessId = String(formData.get("businessId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "Deactivated from dashboard.").slice(0, 240);
  const db = createServiceRoleClient();
  const { data: payment, error } = await db
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("business_id", businessId)
    .single();

  if (error || !payment) {
    throw new Error(error?.message ?? "Payment link not found.");
  }

  if (payment.stripe_payment_link_id && hasStripeEnv()) {
    try {
      await deactivateStripePaymentLink(payment.stripe_payment_link_id);
    } catch {
      throw new Error("Stripe could not deactivate the payment link. Check Stripe configuration and try again.");
    }
  }

  await db
    .from("payments")
    .update({
      is_active: false,
      status: payment.stripe_payment_link_id ? "deactivated" : "archived",
      deactivated_at: new Date().toISOString(),
      deactivation_reason: reason,
    })
    .eq("id", payment.id);

  revalidatePath(`/dashboard/businesses/${businessId}`);
  revalidatePath("/dashboard");
}

async function uniqueSlug(db: ReturnType<typeof createServiceRoleClient>, baseSlug: string) {
  let slug = baseSlug || `demo-${Date.now()}`;
  let suffix = 1;

  while (true) {
    const { data } = await db.from("demo_sites").select("id").eq("slug", slug).maybeSingle();
    if (!data) {
      return slug;
    }

    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

function parsePaymentType(value: string): PaymentType {
  return value === "maintenance" ? "maintenance" : "setup";
}

function assertActiveBusiness(business: Pick<Business, "archived_at"> | null) {
  if (!business) {
    throw new Error("Business not found.");
  }

  if (business.archived_at) {
    throw new Error("Restore this lead before changing its workflow.");
  }
}
