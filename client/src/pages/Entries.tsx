import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimesheetEntry } from "@shared/schema";

export default function Entries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: entries = [], isLoading } = useQuery<TimesheetEntry[]>({
    queryKey: ["/api/timesheet-entries"],
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/timesheet-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheet-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
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
        description: "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.task.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    exportToCSV(filteredEntries, "timesheet-entries.csv");
    toast({
      title: "Success",
      description: "CSV file downloaded successfully",
    });
  };

  const handleExportPDF = () => {
    exportToPDF(filteredEntries, "timesheet-entries.pdf");
    toast({
      title: "Success",
      description: "PDF file downloaded successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-entries">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Timesheet Entries</h2>
          <p className="text-muted-foreground mt-1">
            View and manage all your timesheet entries
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <div className="md:col-span-3">
              <Input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {filteredEntries.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {entries.length}
                </span>{" "}
                entries
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                data-testid="button-export-csv"
              >
                <i className="fas fa-file-csv mr-2"></i>
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                data-testid="button-export-pdf"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                Export PDF
              </Button>
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {entries.length === 0
                ? "No entries yet. Upload your first timesheet to get started."
                : "No entries match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                      Project
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                      Task
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                      Hours
                    </th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/50" data-testid={`row-entry-${entry.id}`}>
                      <td className="px-6 py-4 text-sm" data-testid={`text-date-${entry.id}`}>
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium" data-testid={`text-project-${entry.id}`}>
                        {entry.project}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-task-${entry.id}`}>
                        {entry.task}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono" data-testid={`text-hours-${entry.id}`}>
                        {parseFloat(entry.hours).toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.status === "approved"
                              ? "bg-success/10 text-success"
                              : entry.status === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}
                          data-testid={`badge-status-${entry.id}`}
                        >
                          {entry.status.charAt(0).toUpperCase() +
                            entry.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          className="text-destructive hover:text-destructive/80"
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${entry.id}`}
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
