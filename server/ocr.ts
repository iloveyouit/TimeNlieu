import Tesseract from 'tesseract.js';

export interface ExtractedEntry {
  date: string;
  project: string;
  task: string;
  hours: number;
}

export async function processImageWithOCR(imageBuffer: Buffer): Promise<ExtractedEntry[]> {
  try {
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: info => console.log(info),
    });

    return parseTimesheetText(text);
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error('Failed to process image with OCR');
  }
}

function parseTimesheetText(text: string): ExtractedEntry[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const entries: ExtractedEntry[] = [];

  // Common patterns for dates: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
  const datePattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  // Pattern for hours: decimal numbers
  const hoursPattern = /(\d+\.?\d*)\s*(hrs?|hours?)?/i;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    const hoursMatch = line.match(hoursPattern);

    if (dateMatch && hoursMatch) {
      const date = normalizeDate(dateMatch[1]);
      const hours = parseFloat(hoursMatch[1]);

      // Extract project and task from remaining text
      let remainingText = line
        .replace(dateMatch[0], '')
        .replace(hoursMatch[0], '')
        .trim();

      // Try to split into project and task
      const parts = remainingText.split(/[-–—:]/);
      const project = parts[0]?.trim() || 'Unknown Project';
      const task = parts.slice(1).join(' ').trim() || 'General Work';

      if (date && !isNaN(hours) && hours > 0) {
        entries.push({
          date,
          project,
          task,
          hours,
        });
      }
    }
  }

  return entries;
}

function normalizeDate(dateStr: string): string {
  // Try to parse various date formats and convert to YYYY-MM-DD
  let date: Date;

  if (dateStr.includes('-') && dateStr.length === 10) {
    // Already in YYYY-MM-DD format
    return dateStr;
  }

  // Try MM/DD/YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [first, second, third] = parts.map(p => parseInt(p, 10));

    // Assume MM/DD/YYYY if first part <= 12
    if (first <= 12) {
      date = new Date(third > 99 ? third : 2000 + third, first - 1, second);
    } else {
      // DD/MM/YYYY
      date = new Date(third > 99 ? third : 2000 + third, second - 1, first);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Default to today if parsing fails
  const today = new Date();
  return today.toISOString().split('T')[0];
}
