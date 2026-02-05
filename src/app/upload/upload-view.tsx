"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { stubOcrFromImage, importOcrReview } from "@/lib/upload-actions";

type Project = { id: string; name: string; code: string; clientName: string | null; isActive: boolean | null };
type ProjectTask = { id: string; projectId: string; name: string; code: string | null };
type Role = { id: string; name: string };

type ReviewRow = {
  projectId: string | null;
  taskId: string | null;
  roleId: string | null;
  entryType: "Work" | "Admin";
  hours: number[];
};

type ReviewData = {
  weekStartDate: number;
  rows: ReviewRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateInput = (dateMs: number) => new Date(dateMs).toISOString().slice(0, 10);

const startOfWeekUtc = (date: Date) => {
  const day = date.getUTCDay();
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day);
};

export function UploadView({
  projects,
  projectTasks,
  roles,
}: {
  projects: Project[];
  projectTasks: ProjectTask[];
  roles: Role[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) return;
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) handleFile(nextFile);
  };

  const handleOcrStub = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const data = await stubOcrFromImage(formData);
      setReview(data);
    });
  };

  const handleAddRow = () => {
    setReview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: [
          ...prev.rows,
          { projectId: null, taskId: null, roleId: null, entryType: "Work", hours: Array(7).fill(0) },
        ],
      };
    });
  };

  const handleRowChange = (index: number, next: Partial<ReviewRow>) => {
    setReview((prev) => {
      if (!prev) return prev;
      const rows = [...prev.rows];
      rows[index] = { ...rows[index], ...next };
      return { ...prev, rows };
    });
  };

  const handleHourChange = (rowIndex: number, dayIndex: number, value: string) => {
    const hours = Number.parseFloat(value);
    setReview((prev) => {
      if (!prev) return prev;
      const rows = [...prev.rows];
      const row = { ...rows[rowIndex] };
      const nextHours = [...row.hours];
      nextHours[dayIndex] = Number.isFinite(hours) ? hours : 0;
      row.hours = nextHours;
      rows[rowIndex] = row;
      return { ...prev, rows };
    });
  };

  const handleImport = async () => {
    if (!review) return;
    await importOcrReview(review);
  };

  const filteredTasks = (projectId: string | null) =>
    projectId ? projectTasks.filter((task) => task.projectId === projectId) : projectTasks;

  const weekRangeLabel = useMemo(() => {
    if (!review) return "";
    const start = new Date(review.weekStartDate);
    const end = new Date(review.weekStartDate + 6 * DAY_MS);
    return `${start.toLocaleDateString("en-US")} – ${end.toLocaleDateString("en-US")}`;
  }, [review]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Timesheet</CardTitle>
          <CardDescription>Drag and drop a PNG/JPEG. OCR is stubbed for now.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <p className="text-sm text-muted-foreground">
              Drag & drop your screenshot here, or choose a file.
            </p>
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
            <Button onClick={handleOcrStub} disabled={!file || isPending}>
              {isPending ? "Processing..." : "Extract (Stub OCR)"}
            </Button>
          </div>
          <div className="flex items-center justify-center rounded-lg border bg-muted/20 p-4">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Timesheet preview"
                width={520}
                height={320}
                className="max-h-64 w-auto rounded-md object-contain"
                unoptimized
              />
            ) : (
              <p className="text-sm text-muted-foreground">Preview will appear here.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {review ? (
        <Card>
          <CardHeader>
            <CardTitle>Review Extracted Entries</CardTitle>
            <CardDescription>Week of {weekRangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm">
                Week Start (Sunday)
                <input
                  type="date"
                  className="mt-1 h-9 rounded-md border bg-background px-2"
                  value={toDateInput(review.weekStartDate)}
                  onChange={(event) => {
                    const next = startOfWeekUtc(new Date(event.target.value));
                    setReview((prev) => (prev ? { ...prev, weekStartDate: next } : prev));
                  }}
                />
              </label>
              <Button variant="secondary" onClick={handleAddRow}>
                Add Row
              </Button>
              <Button onClick={handleImport}>Import as Draft</Button>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Project</th>
                    <th className="px-3 py-2 text-left">Task</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    {DAYS.map((day) => (
                      <th key={day} className="px-3 py-2 text-left">
                        {day}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {review.rows.map((row, rowIndex) => {
                    const total = row.hours.reduce((sum, val) => sum + val, 0);
                    return (
                      <tr key={`row-${rowIndex}`} className="border-t">
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2"
                            value={row.projectId ?? ""}
                            onChange={(event) =>
                              handleRowChange(rowIndex, {
                                projectId: event.target.value || null,
                                taskId: null,
                              })
                            }
                          >
                            <option value="">Unassigned</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.code} — {project.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2"
                            value={row.taskId ?? ""}
                            onChange={(event) =>
                              handleRowChange(rowIndex, {
                                taskId: event.target.value || null,
                              })
                            }
                          >
                            <option value="">Unassigned</option>
                            {filteredTasks(row.projectId).map((task) => (
                              <option key={task.id} value={task.id}>
                                {task.code ? `${task.code} — ${task.name}` : task.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2"
                            value={row.roleId ?? ""}
                            onChange={(event) =>
                              handleRowChange(rowIndex, {
                                roleId: event.target.value || null,
                              })
                            }
                          >
                            <option value="">Unassigned</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2"
                            value={row.entryType}
                            onChange={(event) =>
                              handleRowChange(rowIndex, {
                                entryType: event.target.value as "Work" | "Admin",
                              })
                            }
                          >
                            <option value="Work">Work</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        {row.hours.map((value, dayIndex) => (
                          <td key={`day-${dayIndex}`} className="px-3 py-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.25"
                              value={Number.isFinite(value) ? value : 0}
                              onChange={(event) =>
                                handleHourChange(rowIndex, dayIndex, event.target.value)
                              }
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 font-medium">{total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
