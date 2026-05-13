import "server-only";

import { getGooglePlacesApiKey } from "@/lib/env";

export type PlaceCandidate = {
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  sourceUrl: string | null;
};

type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryType?: string;
  primaryTypeDisplayName?: {
    text?: string;
  };
};

type SearchTextResponse = {
  places?: GooglePlace[];
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.primaryType",
  "places.primaryTypeDisplayName",
].join(",");

export async function searchGooglePlaces({
  category,
  city,
  state,
  maxResults,
}: {
  category: string;
  city: string;
  state: string;
  maxResults: number;
}) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGooglePlacesApiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${category} in ${city}, ${state}`,
      pageSize: Math.min(Math.max(maxResults, 1), 20),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google Places search failed with status ${response.status}. Check API key, billing, and Places API access.`);
  }

  const payload = (await response.json()) as SearchTextResponse;

  return (payload.places ?? [])
    .map(mapPlace)
    .filter((place): place is PlaceCandidate => Boolean(place?.placeId && place.name));
}

function mapPlace(place: GooglePlace): PlaceCandidate | null {
  if (!place.id || !place.displayName?.text) {
    return null;
  }

  return {
    placeId: place.id,
    name: place.displayName.text,
    category: place.primaryTypeDisplayName?.text ?? formatType(place.primaryType),
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    websiteUrl: place.websiteUri ?? null,
    sourceUrl: place.googleMapsUri ?? null,
  };
}

function formatType(type: string | undefined) {
  return type ? type.replaceAll("_", " ") : null;
}
