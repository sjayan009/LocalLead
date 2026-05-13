import "server-only";

import { z } from "zod";

import { getOpenAIEnv, hasOpenAIEnv } from "@/lib/env";

export type SearchIdea = {
  category: string;
  city: string;
  state: string;
  rationale: string;
  priority: "high" | "medium" | "low";
};

export type SearchIdeaRequest = {
  targetArea: string;
  homeCity: string;
  homeState: string;
  preferences: string;
};

const searchIdeaSchema = z.object({
  ideas: z
    .array(
      z.object({
        category: z.string().trim().min(2).max(80),
        city: z.string().trim().min(2).max(80),
        state: z.string().trim().min(2).max(30),
        rationale: z.string().trim().min(8).max(220),
        priority: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1)
    .max(8),
});

const curatedCategories = [
  "pressure washing services",
  "mobile mechanics",
  "barbershops",
  "landscapers",
  "appliance repair",
  "cleaning services",
  "roofing contractors",
  "pest control",
  "locksmiths",
  "handyman services",
  "auto detailers",
  "HVAC contractors",
  "plumbers",
  "electricians",
  "pet groomers",
];

export async function generateSearchIdeas(request: SearchIdeaRequest): Promise<SearchIdea[]> {
  if (!hasOpenAIEnv()) {
    return generateFallbackSearchIdeas(request);
  }

  const { apiKey, model } = getOpenAIEnv();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You generate compliant Google Places search ideas for a local-business website sales dashboard. Suggest searches only. Do not claim any specific business lacks a website. Favor small local service categories that often benefit from simple contact/booking websites. Avoid spam, scraping, sensitive personal data, and high-risk or exploitative categories.",
        },
        {
          role: "user",
          content: JSON.stringify({
            goal: "Suggest city/category searches likely to produce useful no-website candidates after Google Places filtering.",
            targetArea: request.targetArea,
            homeCity: request.homeCity,
            homeState: request.homeState,
            preferences: request.preferences,
            allowedCategoryExamples: curatedCategories,
            constraints: [
              "Return categories that are plausible Google Places text-search categories.",
              "Use nearby cities/neighborhoods when helpful.",
              "Keep city and state concrete.",
              "Do not include business names.",
              "Do not recommend outreach automation.",
            ],
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "search_ideas",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              ideas: {
                type: "array",
                minItems: 1,
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    category: { type: "string" },
                    city: { type: "string" },
                    state: { type: "string" },
                    rationale: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["category", "city", "state", "rationale", "priority"],
                },
              },
            },
            required: ["ideas"],
          },
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenAI search planner failed with status ${response.status}. Curated suggestions can be used instead.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI search planner returned no content.");
  }

  const ideas = searchIdeaSchema.parse(JSON.parse(content)).ideas;
  return ideas.length ? ideas : generateFallbackSearchIdeas(request);
}

export function generateFallbackSearchIdeas(request: SearchIdeaRequest): SearchIdea[] {
  const fallbackCities = buildFallbackCities(request);
  const normalizedPreferences = request.preferences.toLowerCase();
  const preferredCategories = curatedCategories
    .map((category) => ({
      category,
      score: categoryPreferenceScore(category, normalizedPreferences),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.category);

  return preferredCategories.slice(0, 8).map((category, index) => {
    const city = fallbackCities[index % fallbackCities.length];
    const priority = index < 3 ? "high" : index < 6 ? "medium" : "low";

    return {
      category,
      city: city.city,
      state: city.state,
      priority,
      rationale: `Curated fallback: ${category} are local-intent searches where a simple contact and quote page can be valuable.`,
    };
  });
}

function buildFallbackCities(request: SearchIdeaRequest) {
  const state = request.homeState || inferState(request.targetArea) || "";
  const primaryCity = request.homeCity || inferCity(request.targetArea) || "Atlanta";
  const targetParts = request.targetArea
    .split(/,|and|nearby|suburbs/gi)
    .map((part) => part.trim())
    .filter((part) => part && !part.match(/^[A-Z]{2}$/i) && part.toLowerCase() !== primaryCity.toLowerCase());
  const cities = [primaryCity, ...targetParts].slice(0, 4);

  return cities.map((city) => ({ city, state }));
}

function inferCity(targetArea: string) {
  return targetArea.split(",")[0]?.trim();
}

function inferState(targetArea: string) {
  return targetArea.match(/\b[A-Z]{2}\b/)?.[0] ?? "";
}

function categoryPreferenceScore(category: string, preferences: string) {
  if (!preferences) {
    return 0;
  }

  return category
    .split(" ")
    .filter((word) => preferences.includes(word.toLowerCase()))
    .length;
}
