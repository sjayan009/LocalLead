export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function isLocalAppUrl() {
  try {
    const url = new URL(getAppUrl());
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return true;
  }
}

export function hasSupabasePublicEnv() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export function hasSupabaseServiceEnv() {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabasePublicEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  }

  return { url, anonKey };
}

export function getSupabaseServiceEnv() {
  const { url, anonKey } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, anonKey, serviceRoleKey };
}

export function hasStripeEnv() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return secretKey;
}

export function hasGooglePlacesEnv() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export function getGooglePlacesApiKey() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY.");
  }

  return apiKey;
}

export function hasOpenAIEnv() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIEnv() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  };
}
