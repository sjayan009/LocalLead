"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { importDiscoveredBusinessesAction, type ImportResult } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlaceCandidate } from "@/lib/google-places";

export type CandidateWithDuplicate = PlaceCandidate & {
  isDuplicate: boolean;
  duplicateReason: string | null;
};

export function DiscoverImportForm({
  candidates,
  city,
  state,
}: {
  candidates: CandidateWithDuplicate[];
  city: string;
  state: string;
}) {
  const [result, formAction, isPending] = useActionState<ImportResult | null, FormData>(
    importDiscoveredBusinessesAction,
    null,
  );
  const importable = candidates.filter((candidate) => !candidate.isDuplicate);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="state" value={state} />
      <input type="hidden" name="candidates" value={JSON.stringify(importable)} />

      {result ? (
        <Alert variant={result.errors.length ? "destructive" : "default"}>
          <AlertTitle>Import result</AlertTitle>
          <AlertDescription>
            Created {result.created}, skipped {result.skipped}. {result.errors.join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Import</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow key={candidate.placeId}>
                <TableCell>
                  <input
                    aria-label={`Import ${candidate.name}`}
                    className="h-4 w-4"
                    type="checkbox"
                    name="selectedPlaceId"
                    value={candidate.placeId}
                    disabled={candidate.isDuplicate}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="grid gap-1">
                    <span>{candidate.name}</span>
                    {candidate.sourceUrl ? (
                      <Link
                        className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:underline"
                        href={candidate.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google Maps
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{candidate.category || "Unknown"}</TableCell>
                <TableCell className="min-w-56">{candidate.address || "Not returned"}</TableCell>
                <TableCell>{candidate.phone || "Not returned"}</TableCell>
                <TableCell>{candidate.isDuplicate ? candidate.duplicateReason : "Ready"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button type="submit" disabled={isPending || importable.length === 0}>
        {isPending ? "Importing..." : "Import selected"}
      </Button>
    </form>
  );
}
