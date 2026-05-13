# LocalLead MVP Agent Notes

## Project Goal

Build a Vercel-compatible Next.js MVP for finding local business leads, generating unofficial demo landing pages, managing human-reviewed outreach, and creating Stripe setup payment links after approval.

## Coding Conventions

- Use Next.js App Router with TypeScript.
- Keep data access in server-only modules under `src/lib`.
- Use Supabase SQL migrations and typed Supabase clients.
- Dashboard mutations require an approved `admin_users` row, not merely a signed-in Supabase user.
- Use shadcn/ui and Tailwind theme tokens for dashboard UI.
- Keep external SDK clients lazy; do not initialize Supabase service-role or Stripe clients in browser code.
- Keep Google Places API calls server-only and store only manually approved normalized lead fields.
- Keep OpenAI API calls server-only and use AI only to suggest search ideas, not to import leads or contact businesses.
- Provide deterministic fallback suggestions when OpenAI is missing, unavailable, or out of quota.
- Prefer small, focused changes and preserve the compliance guardrails in UI copy.

## Safety Constraints

- Never bypass human approval for outreach.
- Never auto-send email, SMS, or social messages.
- Never scrape platforms in ways that violate terms of service.
- Never use copyrighted images from Google, Yelp, Facebook, Instagram, or similar sources unless rights are explicit.
- Never impersonate a business or publish a live site as official without owner consent.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` to client code.
- Never expose `GOOGLE_PLACES_API_KEY` to client code.
- Never expose `OPENAI_API_KEY` to client code.
- Never store raw Google Places payloads, photos, ratings, reviews, or review counts.
- Use Stripe Payment Links or Checkout only for this service fee; do not automate merchant onboarding for the business.
- Deactivate/archive payment links instead of hard-deleting payment history.
- Archive unwanted leads instead of hard-deleting lead, demo, outreach, or payment history.

## Commands

```bash
npm run lint
npm run build
npm run dev
```

## Review Checklist

- Dashboard routes require Supabase Auth.
- Dashboard data access requires admin approval through `admin_users`.
- Demo routes remain public, noindexed, and clearly unofficial.
- Demo routes for archived businesses must not render publicly.
- Demo pages must use safe concept language and remain compatible with older stored demo JSON.
- Outreach messages stay draft/manual unless a future change explicitly adds a reviewed send workflow.
- Website scoring remains conservative and based on objective technical signals only.
- Lead discovery must remain no-website-only, preview-first, and manual import; no background discovery jobs.
- AI planning must remain suggestions-only; Google Places searches and imports require explicit user clicks.
