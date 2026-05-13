import { getAppUrl } from "@/lib/env";
import { slugify } from "@/lib/business";
import type { Business } from "@/lib/types";

export type DemoContent = {
  heroHeadline: string;
  subheadline: string;
  services: string[];
  serviceDetails: Array<{
    title: string;
    description: string;
  }>;
  trustSignals: string[];
  processSteps: Array<{
    title: string;
    description: string;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  aboutText: string;
  callToAction: string;
  finalCta: string;
  accentTheme: "teal" | "blue" | "emerald" | "amber" | "slate";
  contactPhone: string | null;
  contactEmail: string | null;
};

export function buildDemoSlug(business: Business) {
  const base = slugify([business.name, business.city].filter(Boolean).join(" ")) || `business-${business.id.slice(0, 8)}`;
  return base;
}

export function generateDemoContent(business: Business): DemoContent {
  const category = business.category || "local service";
  const location = [business.city, business.state].filter(Boolean).join(", ");
  const profile = categoryProfile(category);
  const serviceDetails = profile.services.map((service) => ({
    title: service,
    description: `Owner-approved copy could explain ${service.toLowerCase()}, timing, service areas, and what a customer should expect before requesting help.`,
  }));

  return {
    heroHeadline: `${business.name} could have a clean, conversion-focused website`,
    subheadline: `Unofficial demo concept for a ${category}${location ? ` in ${location}` : ""}, built around clear services, fast contact, and owner-approved details.`,
    services: profile.services,
    serviceDetails,
    trustSignals: profile.trustSignals,
    processSteps: [
      {
        title: "Choose a service",
        description: "Visitors can quickly understand what is offered without digging through social profiles or directory listings.",
      },
      {
        title: "Request a call",
        description: "The page can route motivated customers to phone, email, or a future quote form once the owner approves the workflow.",
      },
      {
        title: "Confirm details",
        description: "Owner-approved hours, service areas, pricing notes, and policies can be added before anything is published as official.",
      },
    ],
    faq: [
      {
        question: "Is this the official website?",
        answer: "No. This is an unofficial concept page created for review and should only become official after owner approval.",
      },
      {
        question: "What details should be customized?",
        answer: "Services, service area, hours, pricing notes, photos, testimonials, and booking preferences should be confirmed by the business owner.",
      },
      {
        question: "Can this support booking or payments?",
        answer: "Yes, a final owner-approved version could add booking requests, quote forms, maintenance plans, or payment links if appropriate.",
      },
    ],
    aboutText:
      `${business.name} could use this page as a polished starting point for explaining services, sharing accurate contact details, and giving customers a simple way to get in touch.` +
      " Final copy, photos, hours, and policies should be reviewed and approved by the owner before publication.",
    callToAction: profile.callToAction,
    finalCta: `Ready to turn this concept into an owner-approved website for ${business.name}?`,
    accentTheme: profile.accentTheme,
    contactPhone: business.phone,
    contactEmail: business.email,
  };
}

function categoryProfile(category: string): Pick<DemoContent, "services" | "trustSignals" | "accentTheme" | "callToAction"> {
  const normalized = category.toLowerCase();

  if (matches(normalized, ["roof", "plumb", "electric", "hvac", "contractor", "handyman", "landscap"])) {
    return {
      services: ["Project estimates", "Repair requests", "Service area coverage"],
      trustSignals: ["Licensed and insured details can be added", "Fast estimate request path", "Before-and-after project gallery placeholder"],
      accentTheme: "blue",
      callToAction: "Request an estimate",
    };
  }

  if (matches(normalized, ["mechanic", "auto", "detail", "repair", "appliance"])) {
    return {
      services: ["Diagnostics", "Repair scheduling", "Maintenance inquiries"],
      trustSignals: ["Clear issue intake", "Mobile-friendly contact", "Service notes ready for owner review"],
      accentTheme: "slate",
      callToAction: "Request service",
    };
  }

  if (matches(normalized, ["clean", "pressure", "pest"])) {
    return {
      services: ["One-time service requests", "Recurring service options", "Quote and availability requests"],
      trustSignals: ["Simple quote flow", "Service-area clarity", "Owner-approved package details"],
      accentTheme: "emerald",
      callToAction: "Get a quote",
    };
  }

  if (matches(normalized, ["barber", "salon", "beauty", "groom", "spa"])) {
    return {
      services: ["Appointments", "Service menu", "New client questions"],
      trustSignals: ["Easy appointment path", "Service menu placeholder", "Customer photo gallery placeholder"],
      accentTheme: "amber",
      callToAction: "Request an appointment",
    };
  }

  return {
    services: [`${category} inquiries`, "Fast contact requests", "Service details and customer questions"],
    trustSignals: ["Clear contact options", "Owner-approved service copy", "Mobile-first customer experience"],
    accentTheme: "teal",
    callToAction: "Request a call",
  };
}

function matches(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function generateOutreachDraft(business: Business, slug: string) {
  const demoLink = `${getAppUrl().replace(/\/$/, "")}/demo/${slug}`;
  const ownerOrBusinessName = business.name;

  return {
    subject: `Quick website demo for ${business.name}`,
    body: `Hi ${ownerOrBusinessName},

I noticed ${business.name} may not have a full website listed online, so I put together a simple unofficial demo concept showing what a clean booking/contact page could look like for your business:

${demoLink}

No pressure - I have not published this as your official site. It is just a preview. If you like it, I can launch a customized version with your real services, contact info, and optional booking/payment features.

Best,
Jayan`,
  };
}
