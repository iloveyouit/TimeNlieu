/**
 * CSV/Excel Parser for Timesheet Import
 * 
 * Parses CSV and Excel files to extract timesheet entries.
 * Focuses on essential fields: entry_date and hours.
 * 
 * Expected CSV format:
 * week_ending,entry_date,day_of_week,hours,user_email,status
 */

import * as XLSX from 'xlsx';

export type ParsedEntry = {
  date: Date;
  hours: number;
};

export type ParseResult = {
  entries: ParsedEntry[];
  errors: string[];
};

/**
 * Parse a date string in various formats (YYYY-MM-DD or M/D/YYYY)
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  
  // Try M/D/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  
  return null;
}

/**
 * Parse CSV content into timesheet entries
 */
export function parseCSV(content: string): ParseResult {
  const entries: ParsedEntry[] = [];
  const errors: string[] = [];
  
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    errors.push('CSV file is empty or has no data rows');
    return { entries, errors };
  }
  
  // Parse header to find column indices
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const dateIndex = header.findIndex(h => h === 'entry_date' || h === 'date');
  const hoursIndex = header.findIndex(h => h === 'hours');
  
  if (dateIndex === -1) {
    errors.push('CSV must have an "entry_date" or "date" column');
    return { entries, errors };
  }
  
  if (hoursIndex === -1) {
    errors.push('CSV must have an "hours" column');
    return { entries, errors };
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    const dateStr = values[dateIndex];
    const hoursStr = values[hoursIndex];
    
    const date = parseDate(dateStr);
    const hours = parseFloat(hoursStr);
    
    if (!date) {
      errors.push(`Row ${i + 1}: Invalid date "${dateStr}"`);
      continue;
    }
    
    if (isNaN(hours) || hours < 0) {
      errors.push(`Row ${i + 1}: Invalid hours "${hoursStr}"`);
      continue;
    }
    
    // Skip zero-hour entries
    if (hours === 0) continue;
    
    entries.push({ date, hours });
  }
  
  return { entries, errors };
}

/**
 * Parse Excel file (ArrayBuffer) into timesheet entries
 */
export function parseExcel(buffer: ArrayBuffer): ParseResult {
  const entries: ParsedEntry[] = [];
  const errors: string[] = [];
  
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      errors.push('Excel file has no worksheets');
      return { entries, errors };
    }
    
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    
    if (data.length === 0) {
      errors.push('Excel sheet is empty');
      return { entries, errors };
    }
    
    // Look for date and hours columns (case-insensitive)
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    
    const dateKey = columns.find(k => 
      k.toLowerCase() === 'entry_date' || k.toLowerCase() === 'date'
    );
    const hoursKey = columns.find(k => k.toLowerCase() === 'hours');
    
    if (!dateKey) {
      errors.push('Excel must have an "entry_date" or "date" column');
      return { entries, errors };
    }
    
    if (!hoursKey) {
      errors.push('Excel must have an "hours" column');
      return { entries, errors };
    }
    
    // Parse data rows
    data.forEach((row, index) => {
      const dateValue = row[dateKey];
      const hoursValue = row[hoursKey];
      
      let date: Date | null = null;
      
      // Handle Excel date serial numbers
      if (typeof dateValue === 'number') {
        const parsed = XLSX.SSF.parse_date_code(dateValue);
        if (parsed && typeof parsed.y === 'number') {
          date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
        }
      } else if (typeof dateValue === 'string') {
        date = parseDate(dateValue);
      }
      
      const hours = typeof hoursValue === 'number' 
        ? hoursValue 
        : parseFloat(String(hoursValue));
      
      if (!date) {
        errors.push(`Row ${index + 2}: Invalid date`);
        return;
      }
      
      if (isNaN(hours) || hours < 0) {
        errors.push(`Row ${index + 2}: Invalid hours`);
        return;
      }
      
      // Skip zero-hour entries
      if (hours === 0) return;
      
      entries.push({ date, hours });
    });
  } catch (err) {
    errors.push(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
  
  return { entries, errors };
}

/**
 * Detect file type and parse accordingly
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    const text = await file.text();
    return parseCSV(text);
  }
  
  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    return parseExcel(buffer);
  }
  
  return {
    entries: [],
    errors: [`Unsupported file type: .${extension}. Please use CSV or Excel files.`],
  };
}
