import Tesseract from "tesseract.js";

interface ExtractedEntry {
  date: string;
  project: string;
  task: string;
  hours: string;
}

export async function processImageWithOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ExtractedEntry[]> {
  return new Promise((resolve, reject) => {
    Tesseract.recognize(file, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    })
      .then(({ data: { text } }) => {
        const entries = parseOCRText(text);
        resolve(entries);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function parseOCRText(text: string): ExtractedEntry[] {
  const entries: ExtractedEntry[] = [];
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  // Simple parsing logic - looking for patterns like:
  // Date | Project | Task | Hours
  for (const line of lines) {
    // Skip header lines
    if (
      line.toLowerCase().includes("date") ||
      line.toLowerCase().includes("project") ||
      line.toLowerCase().includes("task") ||
      line.toLowerCase().includes("hours")
    ) {
      continue;
    }

    // Try to extract date pattern (YYYY-MM-DD or MM/DD/YYYY or DD/MM/YYYY)
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    if (!dateMatch) continue;

    // Try to extract hours (decimal number, usually at the end)
    const hoursMatch = line.match(/(\d+\.?\d*)\s*(hrs?|hours?)?$/i);
    if (!hoursMatch) continue;

    const date = normalizeDate(dateMatch[0]);
    const hours = hoursMatch[1];

    // Extract project and task (everything between date and hours)
    let remaining = line
      .replace(dateMatch[0], "||SPLIT||")
      .replace(hoursMatch[0], "")
      .trim();
    
    const parts = remaining.split("||SPLIT||")[1]?.trim().split(/[\t|]+/).filter((p) => p.trim()) || [];

    if (parts.length >= 2) {
      entries.push({
        date,
        project: parts[0].trim(),
        task: parts.slice(1).join(" ").trim(),
        hours,
      });
    } else if (parts.length === 1) {
      entries.push({
        date,
        project: parts[0].trim(),
        task: "General Work",
        hours,
      });
    }
  }

  // If no entries found, create a sample entry for demo
  if (entries.length === 0) {
    const today = new Date().toISOString().split("T")[0];
    entries.push({
      date: today,
      project: "Sample Project",
      task: "Review extracted data and edit as needed",
      hours: "8.0",
    });
  }

  return entries;
}

function normalizeDate(dateStr: string): string {
  // Convert various date formats to YYYY-MM-DD
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      let [first, second, third] = parts.map(p => parseInt(p, 10));
      
      // Determine format based on values
      let year, month, day;
      
      if (third > 31) {
        // MM/DD/YYYY or DD/MM/YYYY
        year = third;
        if (first <= 12) {
          month = first;
          day = second;
        } else {
          day = first;
          month = second;
        }
      } else if (first > 31) {
        // YYYY/MM/DD
        year = first;
        month = second;
        day = third;
      } else {
        // Assume MM/DD/YY or DD/MM/YY
        year = third < 100 ? 2000 + third : third;
        if (first <= 12) {
          month = first;
          day = second;
        } else {
          day = first;
          month = second;
        }
      }
      
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  } else if (dateStr.includes("-")) {
    // Already in some dash format
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      let [first, second, third] = parts.map(p => parseInt(p, 10));
      
      if (first > 31) {
        // Already YYYY-MM-DD
        return dateStr;
      } else {
        // DD-MM-YYYY or MM-DD-YYYY
        let year = third < 100 ? 2000 + third : third;
        let month = first <= 12 ? first : second;
        let day = first <= 12 ? second : first;
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }
  
  // Default to today if parsing fails
  return new Date().toISOString().split("T")[0];
}
