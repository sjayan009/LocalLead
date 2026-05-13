"use client";

import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { Upload } from "lucide-react";

import { importBusinessesAction, type ImportResult } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { csvColumns, duplicateKey, normalizeBusinessInput } from "@/lib/business";

export function ImportClient() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const preview = useMemo(() => {
    const seen = new Set<string>();
    return rows.map((row, index) => {
      try {
        const parsed = normalizeBusinessInput(row);
        const key = duplicateKey(parsed);
        const duplicateInFile = seen.has(key);
        seen.add(key);
        return { index, row, valid: true, duplicateInFile };
      } catch (error) {
        return {
          index,
          row,
          valid: false,
          duplicateInFile: false,
          error: error instanceof Error ? error.message : "Invalid row",
        };
      }
    });
  }, [rows]);

  function handleFile(file: File | null) {
    setResult(null);
    if (!file) {
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(parseResult) {
        const missing = csvColumns.filter((column) => !parseResult.meta.fields?.includes(column));
        setErrors(missing.length ? [`Missing columns: ${missing.join(", ")}`] : []);
        setRows(parseResult.data);
      },
      error(error) {
        setErrors([error.message]);
      },
    });
  }

  function importRows() {
    const validRows = preview.filter((item) => item.valid && !item.duplicateInFile).map((item) => item.row);
    startTransition(async () => {
      setResult(await importBusinessesAction(validRows));
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CSV upload</CardTitle>
          <CardDescription>Expected columns: {csvColumns.join(", ")}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="border-border hover:bg-muted/50 flex cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed p-8 text-sm transition-colors">
            <Upload className="h-4 w-4" />
            <span>Select CSV file</span>
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
          </label>
          {errors.length ? (
            <Alert variant="destructive">
              <AlertTitle>Import issue</AlertTitle>
              <AlertDescription>{errors.join(" ")}</AlertDescription>
            </Alert>
          ) : null}
          {result ? (
            <Alert>
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                Created {result.created}, skipped {result.skipped}. {result.errors.length ? result.errors.join(" ") : ""}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {rows.length ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Rows marked invalid or duplicate-in-file will not be imported.</CardDescription>
            </div>
            <Button onClick={importRows} disabled={isPending || Boolean(errors.length)}>
              {isPending ? "Importing..." : "Import valid rows"}
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((item) => (
                  <TableRow key={item.index}>
                    <TableCell>{item.row.name}</TableCell>
                    <TableCell>{item.row.city}</TableCell>
                    <TableCell>{item.row.phone}</TableCell>
                    <TableCell>
                      {!item.valid ? item.error : item.duplicateInFile ? "Duplicate in file" : "Ready"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
