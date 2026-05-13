import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck, CheckCircle2, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { DemoContent } from "@/lib/demo-generator";
import type { Business, DemoSite } from "@/lib/types";

type DemoPageProps = {
  params: Promise<{ slug: string }>;
};

type Theme = NonNullable<DemoContent["accentTheme"]>;

const themes: Record<Theme, { hero: string; accent: string; soft: string; button: string }> = {
  teal: {
    hero: "from-teal-50 via-white to-cyan-50",
    accent: "text-teal-700",
    soft: "bg-teal-50 text-teal-950 border-teal-200",
    button: "bg-teal-700 text-white hover:bg-teal-800",
  },
  blue: {
    hero: "from-blue-50 via-white to-sky-50",
    accent: "text-blue-700",
    soft: "bg-blue-50 text-blue-950 border-blue-200",
    button: "bg-blue-700 text-white hover:bg-blue-800",
  },
  emerald: {
    hero: "from-emerald-50 via-white to-lime-50",
    accent: "text-emerald-700",
    soft: "bg-emerald-50 text-emerald-950 border-emerald-200",
    button: "bg-emerald-700 text-white hover:bg-emerald-800",
  },
  amber: {
    hero: "from-amber-50 via-white to-orange-50",
    accent: "text-amber-700",
    soft: "bg-amber-50 text-amber-950 border-amber-200",
    button: "bg-amber-700 text-white hover:bg-amber-800",
  },
  slate: {
    hero: "from-slate-100 via-white to-zinc-100",
    accent: "text-slate-700",
    soft: "bg-slate-100 text-slate-950 border-slate-200",
    button: "bg-slate-900 text-white hover:bg-slate-800",
  },
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function DemoPage({ params }: DemoPageProps) {
  const { slug } = await params;
  const db = createServiceRoleClient();
  const { data: demo } = await db
    .from("demo_sites")
    .select(
      "id,business_id,slug,hero_headline,subheadline,services_json,about_text,call_to_action,contact_phone,contact_email,generated_html_or_json,status,created_at,updated_at",
    )
    .eq("slug", slug)
    .neq("status", "archived")
    .maybeSingle();

  if (!demo) {
    notFound();
  }

  const { data: business } = await db
    .from("businesses")
    .select(
      "id,name,category,address,city,state,phone,email,existing_website_url,source_url,external_place_id,notes,website_status,lead_score,archived_at,archive_reason,created_at,updated_at",
    )
    .eq("id", demo.business_id)
    .single();

  if (!business || business.archived_at) {
    notFound();
  }

  const content = normalizeDemoContent(demo, business);
  const theme = themes[content.accentTheme];
  const phoneHref = demo.contact_phone ? `tel:${demo.contact_phone.replace(/[^\d+]/g, "")}` : null;
  const emailHref = demo.contact_email ? `mailto:${demo.contact_email}` : null;

  return (
    <main className="min-h-svh bg-white text-slate-950">
      <div className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">
        Unofficial demo concept created for review. Not affiliated with this business unless approved by owner.
      </div>

      <section className={`relative overflow-hidden bg-linear-to-br ${theme.hero} px-4 py-16 sm:py-20`}>
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${theme.soft}`}>
              <Sparkles className="h-4 w-4" />
              Owner-review website concept
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-6xl">{content.heroHeadline}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">{content.subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {phoneHref ? (
                <Button asChild size="lg" className={theme.button}>
                  <a href={phoneHref}>
                    <Phone className="h-4 w-4" />
                    {content.callToAction}
                  </a>
                </Button>
              ) : emailHref ? (
                <Button asChild size="lg" className={theme.button}>
                  <a href={emailHref}>
                    <Mail className="h-4 w-4" />
                    {content.callToAction}
                  </a>
                </Button>
              ) : (
                <Button size="lg" className={theme.button}>
                  {content.callToAction}
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <a href="#services">
                  View services
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Business snapshot</p>
            <h2 className="mt-3 text-2xl font-semibold">{business.name}</h2>
            <p className="mt-2 text-slate-600">{[business.category, business.city, business.state].filter(Boolean).join(" - ")}</p>
            <div className="mt-6 grid gap-3 text-sm">
              {business.phone ? <ContactLine icon={Phone} label={business.phone} /> : null}
              {business.email ? <ContactLine icon={Mail} label={business.email} /> : null}
              {business.address ? (
                <ContactLine icon={MapPin} label={[business.address, business.city, business.state].filter(Boolean).join(", ")} />
              ) : null}
            </div>
            <div className="mt-6 grid gap-2">
              {content.trustSignals.slice(0, 3).map((signal) => (
                <div key={signal} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 ${theme.accent}`} />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-5">
        <div className="mx-auto grid max-w-6xl gap-3 text-sm text-slate-700 md:grid-cols-3">
          <Pill icon={Phone} text="Mobile-friendly contact" />
          <Pill icon={CalendarCheck} text="Quote or appointment ready" />
          <Pill icon={ShieldCheck} text="Owner-approved before launch" />
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <p className={`text-sm font-medium uppercase tracking-wide ${theme.accent}`}>Services</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">Clear paths for customers to take action</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {content.serviceDetails.map((service) => (
            <div key={service.title} className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold">{service.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className={`text-sm font-medium uppercase tracking-wide ${theme.accent}`}>Why this works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">A focused page beats scattered directory listings</h2>
            <p className="mt-4 leading-7 text-slate-700">{content.aboutText}</p>
          </div>
          <div className="grid gap-4">
            {content.processSteps.map((step, index) => (
              <div key={step.title} className="rounded-md border border-slate-200 bg-white p-5">
                <p className={`text-sm font-semibold ${theme.accent}`}>Step {index + 1}</p>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className={`text-sm font-medium uppercase tracking-wide ${theme.accent}`}>Questions</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">FAQ for the review stage</h2>
          <div className="mt-6 grid gap-4">
            {content.faq.map((item) => (
              <div key={item.question} className="rounded-md border border-slate-200 p-5">
                <h3 className="font-semibold">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={`rounded-lg border p-6 ${theme.soft}`}>
          <h2 className="text-2xl font-semibold">Contact concept</h2>
          <p className="mt-3 text-sm leading-6">
            This area can become an owner-approved quote form, booking link, phone-first CTA, or simple contact card.
          </p>
          <div className="mt-6 grid gap-3 text-sm">
            {demo.contact_phone ? <ContactLine icon={Phone} label={demo.contact_phone} /> : null}
            {demo.contact_email ? <ContactLine icon={Mail} label={demo.contact_email} /> : null}
            <ContactLine icon={MapPin} label={[business.city, business.state].filter(Boolean).join(", ") || "Service area to be confirmed"} />
          </div>
        </div>
      </section>

      <section className={`px-4 py-16 ${theme.soft}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">{content.finalCta}</h2>
            <p className="mt-2 text-sm">Final launch should only happen after owner review, copy approval, and contact confirmation.</p>
          </div>
          <Button size="lg" className={theme.button}>
            {content.callToAction}
          </Button>
        </div>
      </section>
    </main>
  );
}

function normalizeDemoContent(demo: DemoSite, business: Business): DemoContent {
  const generated = demo.generated_html_or_json as Partial<DemoContent> | null;
  const services = Array.isArray(demo.services_json) ? demo.services_json.map(String) : generated?.services ?? [];

  return {
    heroHeadline: demo.hero_headline,
    subheadline: demo.subheadline ?? `Unofficial concept page for ${business.name}.`,
    services,
    serviceDetails:
      generated?.serviceDetails ??
      services.map((service) => ({
        title: service,
        description: "Owner-approved details can be added here before launch.",
      })),
    trustSignals: generated?.trustSignals ?? ["Owner-approved service copy", "Mobile-first customer experience", "Clear contact options"],
    processSteps: generated?.processSteps ?? [
      { title: "Review the concept", description: "Confirm that the page structure fits the business." },
      { title: "Approve details", description: "Add owner-approved services, hours, and contact preferences." },
      { title: "Launch when ready", description: "Publish only after the owner approves the final version." },
    ],
    faq: generated?.faq ?? [
      {
        question: "Is this official?",
        answer: "No. This is an unofficial demo concept created for review.",
      },
    ],
    aboutText: demo.about_text ?? generated?.aboutText ?? `${business.name} can use this page as a polished starting point.`,
    callToAction: demo.call_to_action ?? generated?.callToAction ?? "Request a call",
    finalCta: generated?.finalCta ?? `Ready to customize this concept for ${business.name}?`,
    accentTheme: generated?.accentTheme ?? "teal",
    contactPhone: demo.contact_phone,
    contactEmail: demo.contact_email,
  };
}

function ContactLine({ icon: Icon, label }: { icon: typeof Phone; label: string }) {
  return (
    <p className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4" />
      <span>{label}</span>
    </p>
  );
}

function Pill({ icon: Icon, text }: { icon: typeof Phone; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </div>
  );
}
