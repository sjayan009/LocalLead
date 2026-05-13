import { z } from "zod";

export const businessInputSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(180),
  category: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().email().or(z.literal("")).optional().nullable(),
  existing_website_url: z.string().trim().max(300).optional().nullable(),
  source_url: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type BusinessInput = z.infer<typeof businessInputSchema>;

export const csvColumns = [
  "name",
  "category",
  "address",
  "city",
  "state",
  "phone",
  "email",
  "existing_website_url",
  "source_url",
  "notes",
] as const;

export function emptyToNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeBusinessInput(input: Record<string, unknown>): BusinessInput {
  return businessInputSchema.parse({
    name: String(input.name ?? "").trim(),
    category: emptyToNull(input.category),
    address: emptyToNull(input.address),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    phone: emptyToNull(input.phone),
    email: emptyToNull(input.email) ?? "",
    existing_website_url: normalizeOptionalHttpUrl(input.existing_website_url, "Existing website URL"),
    source_url: normalizeOptionalHttpUrl(input.source_url, "Source URL"),
    notes: emptyToNull(input.notes),
  });
}

export function normalizeOptionalHttpUrl(value: unknown, label: string) {
  const raw = emptyToNull(value);
  if (!raw) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error(`${label} must be a valid http or https URL.`);
  }
}

export function duplicateKey(input: Pick<BusinessInput, "name" | "city" | "phone">) {
  return [
    input.name.trim().toLowerCase().replace(/\s+/g, " "),
    (input.city ?? "").trim().toLowerCase().replace(/\s+/g, " "),
    (input.phone ?? "").replace(/\D/g, ""),
  ].join("|");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
