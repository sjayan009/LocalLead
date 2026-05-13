"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";

import { generateSearchIdeasAction, type SearchIdeasResult } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AiSearchPlanner({
  hasOpenAIKey,
  defaultCity,
  defaultState,
}: {
  hasOpenAIKey: boolean;
  defaultCity: string;
  defaultState: string;
}) {
  const [result, formAction, isPending] = useActionState<SearchIdeasResult | null, FormData>(
    generateSearchIdeasAction,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Search ideas
        </CardTitle>
        <CardDescription>
          Describe the market once; AI or curated fallback suggestions create category and city searches.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasOpenAIKey ? (
          <Alert>
            <AlertTitle>OpenAI is not configured</AlertTitle>
            <AlertDescription>Curated fallback suggestions will be used until OPENAI_API_KEY is configured.</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="homeCity" label="Anchor city" defaultValue={defaultCity} placeholder="Atlanta" />
            <Field name="homeState" label="State" defaultValue={defaultState} placeholder="GA" />
          </div>
          <Field
            name="targetArea"
            label="Target area"
            defaultValue={defaultCity && defaultState ? `${defaultCity}, ${defaultState} and nearby cities` : ""}
            placeholder="Atlanta, GA and nearby suburbs"
          />
          <div className="grid gap-2">
            <Label htmlFor="preferences">Preferences</Label>
            <Textarea
              id="preferences"
              name="preferences"
              rows={3}
              placeholder="Prioritize small service businesses that likely benefit from simple quote/contact pages."
            />
          </div>
          <Button type="submit" className="w-fit" disabled={isPending}>
            {isPending ? "Generating..." : "Generate ideas"}
          </Button>
        </form>

        {result?.error ? (
          <Alert>
            <AlertTitle>{result.source === "fallback" ? "Using curated fallback suggestions" : "Planner note"}</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        ) : null}

        {result?.ideas.length ? (
          <div className="grid gap-3">
            {result.ideas.map((idea) => (
              <div key={`${idea.category}-${idea.city}-${idea.state}`} className="rounded-md border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">
                      {idea.category} in {idea.city}, {idea.state}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">{idea.rationale}</p>
                    <p className="text-muted-foreground mt-2 text-xs uppercase tracking-wide">
                      Priority: {idea.priority} - Source: {result.source === "fallback" ? "Curated fallback" : "AI"}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/dashboard/discover?category=${encodeURIComponent(idea.category)}&city=${encodeURIComponent(idea.city)}&state=${encodeURIComponent(idea.state)}&max=20`}
                    >
                      Run search
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} required />
    </div>
  );
}
