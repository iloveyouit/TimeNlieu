import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { processImageWithOCR } from "@/lib/ocrUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ExtractedEntry {
  date: string;
  project: string;
  task: string;
  hours: string;
}

export default function Upload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [extractedEntries, setExtractedEntries] = useState<ExtractedEntry[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (entries: ExtractedEntry[]) => {
      const formattedEntries = entries.map((entry) => ({
        date: entry.date,
        project: entry.project,
        task: entry.task,
        hours: entry.hours,
        status: "pending",
      }));

      await apiRequest("POST", "/api/timesheet-entries/bulk", {
        entries: formattedEntries,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheet-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-summaries"] });
      toast({
        title: "Success",
        description: "Timesheet entries saved successfully!",
      });
      setExtractedEntries([]);
      setUploadedImage(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to save entries",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file (JPEG or PNG)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);

      const progressCallback = (progress: number) => {
        setProcessingProgress(progress);
      };

      const entries = await processImageWithOCR(file, progressCallback);
      
      setExtractedEntries(entries);
      setIsProcessing(false);
      toast({
        title: "OCR Complete",
        description: `Extracted ${entries.length} entries from your timesheet`,
      });
    } catch (error) {
      console.error("OCR processing error:", error);
      setIsProcessing(false);
      toast({
        title: "Processing failed",
        description: "Failed to extract data from image. Please try again or enter manually.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const updateEntry = (index: number, field: keyof ExtractedEntry, value: string) => {
    const updated = [...extractedEntries];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedEntries(updated);
  };

  const deleteEntry = (index: number) => {
    setExtractedEntries(extractedEntries.filter((_, i) => i !== index));
  };

  const totalHours = extractedEntries.reduce(
    (sum, entry) => sum + (parseFloat(entry.hours) || 0),
    0
  );

  return (
    <div className="space-y-6" data-testid="page-upload">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Upload Timesheet</h2>
          <p className="text-muted-foreground mt-1">
            Upload a screenshot to automatically extract timesheet data
          </p>
        </div>
      </div>

      {!isProcessing && extractedEntries.length === 0 && (
        <>
          <Card>
            <CardContent className="p-8">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                data-testid="dropzone-upload"
              >
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
                    <i className="fas fa-cloud-upload-alt text-4xl text-primary"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Drop your timesheet here
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      or click to browse files
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports: JPEG, PNG (Max 10MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    id="file-input"
                    className="hidden"
                    accept="image/jpeg,image/png"
                    onChange={handleFileInput}
                    data-testid="input-file"
                  />
                  <Button
                    onClick={() => document.getElementById("file-input")?.click()}
                    data-testid="button-select-file"
                  >
                    Select File
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-info-circle text-primary"></i>
                Tips for Best Results
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-success mt-0.5"></i>
                  <span>Ensure the screenshot is clear and well-lit</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-success mt-0.5"></i>
                  <span>Include all columns: Date, Project, Task, and Hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-success mt-0.5"></i>
                  <span>Avoid cropping important information</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-success mt-0.5"></i>
                  <span>Review and edit extracted data before saving</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {isProcessing && (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <div>
                <h3 className="text-lg font-semibold">Processing your timesheet...</h3>
                <p className="text-muted-foreground mt-1">
                  Using OCR to extract data from your screenshot
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Processing</span>
                <span className="text-sm font-medium">{processingProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {extractedEntries.length > 0 && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Extracted Data</h3>
                <span className="text-sm text-success flex items-center gap-2">
                  <i className="fas fa-check-circle"></i>
                  OCR Complete
                </span>
              </div>

              {uploadedImage && (
                <div className="mb-6">
                  <img
                    src={uploadedImage}
                    alt="Uploaded timesheet"
                    className="rounded-lg border border-border max-h-64 mx-auto"
                  />
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                        Project
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                        Task
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                        Hours
                      </th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {extractedEntries.map((entry, index) => (
                      <tr key={index} className="hover:bg-muted/50" data-testid={`row-extracted-${index}`}>
                        <td className="px-4 py-3">
                          <Input
                            type="date"
                            value={entry.date}
                            onChange={(e) => updateEntry(index, "date", e.target.value)}
                            className="text-sm"
                            data-testid={`input-date-${index}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="text"
                            value={entry.project}
                            onChange={(e) => updateEntry(index, "project", e.target.value)}
                            className="text-sm"
                            data-testid={`input-project-${index}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="text"
                            value={entry.task}
                            onChange={(e) => updateEntry(index, "task", e.target.value)}
                            className="text-sm"
                            data-testid={`input-task-${index}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Input
                            type="number"
                            step="0.5"
                            value={entry.hours}
                            onChange={(e) => updateEntry(index, "hours", e.target.value)}
                            className="text-sm w-20 text-right font-mono"
                            data-testid={`input-hours-${index}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEntry(index)}
                            className="text-destructive hover:text-destructive/80"
                            data-testid={`button-delete-${index}`}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Hours Extracted
                    </p>
                    <p className="text-2xl font-bold font-mono mt-1" data-testid="text-total-hours">
                      {totalHours.toFixed(1)} hrs
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExtractedEntries([]);
                        setUploadedImage(null);
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => saveMutation.mutate(extractedEntries)}
                      disabled={saveMutation.isPending}
                      data-testid="button-save-entries"
                    >
                      {saveMutation.isPending ? "Saving..." : "Save Entries"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
