import { AlertCircle, Search } from "lucide-react";

import { AiSearchPlanner } from "@/app/dashboard/discover/ai-search-planner";
import { DiscoverImportForm, type CandidateWithDuplicate } from "@/app/dashboard/discover/discover-import-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { duplicateKey } from "@/lib/business";
import { hasGooglePlacesEnv, hasOpenAIEnv } from "@/lib/env";
import { searchGooglePlaces } from "@/lib/google-places";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

type DiscoverPageProps = {
  searchParams: Promise<{
    category?: string;
    city?: string;
    state?: string;
    max?: string;
  }>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  const category = params.category?.trim() ?? "";
  const city = params.city?.trim() ?? "";
  const state = params.state?.trim() ?? "";
  const maxResults = clampMaxResults(Number(params.max ?? 10));
  const canSearch = Boolean(category && city && state);
  const hasKey = hasGooglePlacesEnv();
  const hasOpenAIKey = hasOpenAIEnv();
  let candidates: CandidateWithDuplicate[] = [];
  let searchError: string | null = null;

  if (canSearch && hasKey) {
    try {
      const db = createServiceRoleClient();
      const [{ data: existingBusinesses }, places] = await Promise.all([
        db.from("businesses").select("id,name,city,phone,external_place_id"),
        searchGooglePlaces({ category, city, state, maxResults }),
      ]);
      const existing = (existingBusinesses ?? []) as Pick<Business, "id" | "name" | "city" | "phone" | "external_place_id">[];
      const duplicateKeys = new Set(existing.map((business) => duplicateKey(business)));
      const existingPlaceIds = new Set(existing.map((business) => business.external_place_id).filter(Boolean));

      candidates = places
        .filter((place) => !place.websiteUrl)
        .map((place) => {
          const key = duplicateKey({
            name: place.name,
            city,
            phone: place.phone,
          });
          const placeMatch = existingPlaceIds.has(place.placeId);
          const keyMatch = duplicateKeys.has(key);

          return {
            ...place,
            isDuplicate: placeMatch || keyMatch,
            duplicateReason: placeMatch ? "Existing place ID" : keyMatch ? "Name/city/phone match" : null,
          };
        });
    } catch (error) {
      searchError = error instanceof Error ? error.message : "Google Places search failed.";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Discover Leads</h1>
        <p className="text-muted-foreground text-sm">
          Search Google Places for candidate businesses with no website returned, then import only the leads you approve.
        </p>
      </div>

      <AiSearchPlanner hasOpenAIKey={hasOpenAIKey} defaultCity={city} defaultState={state} />

      <Card>
        <CardHeader>
          <CardTitle>City and category search</CardTitle>
          <CardDescription>Only candidates without a website returned by Google Places are shown.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_0.7fr_0.5fr_auto] md:items-end">
            <Field name="category" label="Category" defaultValue={category} placeholder="dentists" />
            <Field name="city" label="City" defaultValue={city} placeholder="Atlanta" />
            <Field name="state" label="State" defaultValue={state} placeholder="GA" />
            <Field name="max" label="Max" defaultValue={String(maxResults)} type="number" min="1" max="20" />
            <Button type="submit">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {!hasKey ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Google Places is not configured</AlertTitle>
          <AlertDescription>Add GOOGLE_PLACES_API_KEY to .env.local and restart the dev server.</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <AlertTitle>Google Places preview rules</AlertTitle>
        <AlertDescription>
          This screen uses Google Places for no-website candidate discovery only. Do not store raw Places responses,
          photos, ratings, reviews, or review counts. Import only selected leads after manual review.
        </AlertDescription>
      </Alert>

      {searchError ? (
        <Alert variant="destructive">
          <AlertTitle>Search failed</AlertTitle>
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      ) : null}

      {canSearch && hasKey && !searchError ? (
        <Card>
          <CardHeader>
            <CardTitle>Candidate results</CardTitle>
            <CardDescription>
              Powered by Google. Results with an existing website are hidden, and duplicates are disabled before import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidates.length ? (
              <DiscoverImportForm candidates={candidates} city={city} state={state} />
            ) : (
              <p className="text-muted-foreground text-sm">
                No no-website candidates returned for this search. Try a broader category or larger result limit.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} type={type} min={min} max={max} required />
    </div>
  );
}

function clampMaxResults(value: number) {
  if (!Number.isFinite(value)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 20);
}
