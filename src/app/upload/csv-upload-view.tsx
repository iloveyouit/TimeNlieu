"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseFile, type ParsedEntry } from "@/lib/csv-excel-parser";
import { importTimesheetEntries, type ImportResult } from "@/lib/csv-import-actions";

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function CSVUploadView() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) return;
    setFile(nextFile);
    setParsedEntries([]);
    setParseErrors([]);
    setImportResult(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) handleFile(nextFile);
  };

  const handleParse = async () => {
    if (!file) return;
    
    startTransition(async () => {
      const result = await parseFile(file);
      setParsedEntries(result.entries);
      setParseErrors(result.errors);
    });
  };

  const handleImport = async () => {
    if (parsedEntries.length === 0) return;
    
    startTransition(async () => {
      // Convert Date objects to serializable format for server action
      const entriesToImport = parsedEntries.map(e => ({
        date: e.date,
        hours: e.hours,
      }));
      const result = await importTimesheetEntries(entriesToImport);
      setImportResult(result);
      if (result.success) {
        setParsedEntries([]);
        setFile(null);
      }
    });
  };

  const totalHours = parsedEntries.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Import from CSV/Excel</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file with timesheet data. Required columns: date (or entry_date), hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div
            className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <p className="text-sm text-muted-foreground">
              Drag & drop your CSV or Excel file here, or choose a file.
            </p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-sm font-medium">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <Button onClick={handleParse} disabled={!file || isPending}>
              {isPending ? "Processing..." : "Parse File"}
            </Button>
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="font-medium text-destructive">Parse Errors:</p>
              <ul className="mt-2 list-inside list-disc text-sm text-destructive">
                {parseErrors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
                {parseErrors.length > 10 && (
                  <li>...and {parseErrors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}

          {importResult && (
            <div
              className={`rounded-lg border p-4 ${
                importResult.success
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-yellow-500/50 bg-yellow-500/10"
              }`}
            >
              <p className="font-medium">
                {importResult.success ? "✓ Import Complete" : "⚠ Import Completed with Issues"}
              </p>
              <p className="text-sm mt-1">
                Imported: {importResult.importedCount} entries
                {importResult.skippedCount > 0 && `, Skipped: ${importResult.skippedCount}`}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                  {importResult.errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {parsedEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Parsed Entries</CardTitle>
            <CardDescription>
              {parsedEntries.length} entries found • Total: {totalHours.toFixed(2)} hours
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex gap-3">
              <Button onClick={handleImport} disabled={isPending}>
                {isPending ? "Importing..." : "Import All Entries"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setParsedEntries([]);
                  setFile(null);
                }}
              >
                Clear
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedEntries.map((entry, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{formatDate(entry.date)}</td>
                      <td className="px-3 py-2">{entry.hours.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
