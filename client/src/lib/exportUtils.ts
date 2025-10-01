import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TimesheetEntry } from "@shared/schema";

export function exportToCSV(entries: TimesheetEntry[], filename: string) {
  const data = entries.map((entry) => ({
    Date: new Date(entry.date).toLocaleDateString(),
    Project: entry.project,
    Task: entry.task,
    Hours: parseFloat(entry.hours).toFixed(2),
    Status: entry.status,
    Notes: entry.notes || "",
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(entries: TimesheetEntry[], filename: string) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Timesheet Entries", 14, 22);

  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  const tableData = entries.map((entry) => [
    new Date(entry.date).toLocaleDateString(),
    entry.project,
    entry.task,
    parseFloat(entry.hours).toFixed(1),
    entry.status.charAt(0).toUpperCase() + entry.status.slice(1),
  ]);

  autoTable(doc, {
    head: [["Date", "Project", "Task", "Hours", "Status"]],
    body: tableData,
    startY: 35,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [54, 111, 229], // Primary color RGB
      textColor: 255,
      fontStyle: "bold",
    },
  });

  const totalHours = entries.reduce(
    (sum, entry) => sum + parseFloat(entry.hours),
    0
  );

  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(12);
  doc.text(`Total Hours: ${totalHours.toFixed(1)}`, 14, finalY + 10);

  doc.save(filename);
}
