# LocalLead MVP

A human-reviewed local-business website generation and lead-management MVP. The app helps you add or import local leads, conservatively check website status, generate unofficial demo landing pages, draft respectful outreach, and create Stripe setup payment links only after review.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS and shadcn/ui
- Supabase Auth and Postgres
- Stripe Payment Links
- Vercel-compatible deployment

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
GOOGLE_PLACES_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` as `NEXT_PUBLIC_*`.

`NEXT_PUBLIC_APP_URL` controls the demo links inserted into outreach drafts. Keep it as localhost for local development, but set it to your real production domain before sending emails.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260512155000_initial_schema.sql` in the SQL editor or through the Supabase CLI.
3. Run the later migrations in `supabase/migrations/` in filename order.
4. Create at least one Supabase Auth user for dashboard access.
5. Add approved dashboard users to `admin_users`.
6. Copy the project URL, anon key, and service role key into `.env.local`.

Example admin grant:

```sql
insert into public.admin_users (user_id, email)
values ('AUTH_USER_UUID_HERE', 'you@example.com')
on conflict (user_id) do update set email = excluded.email;
```

All public tables have RLS enabled. Only approved admin users can manage dashboard data. Public demo pages are rendered server-side and do not expose service-role credentials to the browser.

## Lead Archiving

Business leads can be archived from the business detail page. Archiving is a soft remove: the lead disappears from normal dashboard views, related demo pages return not found while archived, and outreach/payment history is preserved for auditability. Use the `View archived` filter on `/dashboard/businesses` to find and restore archived leads.

## Production Deployment

For real outreach, deploy the app to a public domain such as Vercel. Do not send localhost demo links to businesses.

1. Deploy the Next.js app.
2. Add the same environment variables in the hosting provider.
3. Set `NEXT_PUBLIC_APP_URL` to the public app URL, for example `https://yourdomain.com`.
4. Add the production domain to Supabase Auth site URL / redirect URL settings.
5. Regenerate demo and outreach drafts for any leads created while the app URL was localhost.

Dashboard pages remain auth/admin protected. Demo pages stay public, noindexed, and clearly labeled as unofficial concepts.

## Stripe Setup

1. Create a Stripe account and use a test-mode secret key locally.
2. Add `STRIPE_SECRET_KEY` to `.env.local`.
3. From a business detail page, create either the setup or maintenance payment link after review.

The payment panel supports:

- `$299 setup`: a one-time Stripe Payment Link for your website setup service.
- `$49/month maintenance`: a recurring Stripe subscription Payment Link for ongoing support.

Creating the same payment type twice reuses the active link instead of making duplicates. Deactivate old links from the dashboard; Stripe-backed links are deactivated in Stripe, while legacy rows without a stored Stripe ID can be archived locally.

## Google Places Lead Discovery

1. Create a Google Maps Platform API key with Places API enabled.
2. Add `GOOGLE_PLACES_API_KEY` to `.env.local`.
3. Restart `npm run dev`.
4. Use `/dashboard/discover` to search by city, state, and category.

Discovery results are a transient preview and only show candidates where Google Places did not return a website URI. The app imports only selected candidates after manual approval, stores only normalized lead fields plus the Google place ID, and does not store raw Places responses, photos, ratings, reviews, or review counts.

## Search Ideas

1. Use the search ideas panel on `/dashboard/discover`.
2. Add `OPENAI_API_KEY` to `.env.local` for AI-ranked ideas.
3. Optionally set `OPENAI_MODEL`; the default is `gpt-5.4-mini`.

If OpenAI is not configured or quota is unavailable, the app falls back to curated deterministic suggestions. Search ideas do not run searches, import leads, generate outreach, or send messages without your manual action.

## Commands

```bash
npm run dev
npm run lint
npm run build
```

## Safety And Compliance Notes

- No spam automation is included.
- Outreach is draft-only and requires manual approval.
- The `Mark Contacted` button records a human action; it does not send email or SMS.
- Demo pages always show: "Unofficial demo concept created for review. Not affiliated with this business unless approved by owner."
- Demo pages use generated layout, gradients, placeholders, and icons only. They do not scrape or reuse copyrighted images.
- Demo pages are richer concept pages with safe, owner-review copy and no fake claims.
- The website checker performs conservative technical checks only: missing URL, resolution failures, HTTPS, title, and mobile viewport metadata.
- Do not impersonate businesses or publish a demo as official without owner consent.
- Do not scrape third-party platforms in ways that violate their terms.
- Use Google Places only through the official API, keep attribution visible in discovery results, and respect Places storage restrictions.
- Use AI only to suggest search ideas; discovery, import, demo generation, outreach, and payment actions remain manually reviewed.

## Intentionally Not Automated Yet

- No email/SMS sending through Resend, SendGrid, or carriers.
- No web scraping integrations or automated lead scraping.
- No business merchant-account onboarding.
- No direct Stripe customer portal or subscription cancellation UI; manage active subscriptions in Stripe.
- No automatic publication of official business websites.
