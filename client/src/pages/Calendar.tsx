import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { TimesheetEntry, User } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: entries = [], isLoading } = useQuery<TimesheetEntry[]>({
    queryKey: ["/api/timesheet-entries"],
  });

  const exportToICal = () => {
    const icalContent = generateICalContent(entries);
    const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timesheet-${format(currentDate, "yyyy-MM")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateICalContent = (entries: TimesheetEntry[]): string => {
    const now = new Date();
    const timestamp = format(now, "yyyyMMdd'T'HHmmss'Z'");
    const userTimezone = user?.timezone || "America/New_York";
    
    let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TimesheetPro//Timesheet Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:TimesheetPro
X-WR-TIMEZONE:${userTimezone}
X-WR-CALDESC:Timesheet entries from TimesheetPro
`;

    entries.forEach((entry) => {
      const dateStr = entry.date.replace(/-/g, "");
      const uid = `${entry.id}@timesheetpro.app`;
      
      ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${timestamp}
DTSTART;VALUE=DATE:${dateStr}
DTEND;VALUE=DATE:${dateStr}
SUMMARY:${entry.project} - ${entry.task}
DESCRIPTION:Hours: ${entry.hours}\\nProject: ${entry.project}\\nTask: ${entry.task}${entry.notes ? `\\nNotes: ${entry.notes}` : ''}
STATUS:${entry.status.toUpperCase()}
END:VEVENT
`;
    });

    ical += `END:VCALENDAR`;
    return ical;
  };

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getEntriesForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return entries.filter((entry) => entry.date === dayStr);
  };

  const getTotalHoursForDay = (day: Date) => {
    const dayEntries = getEntriesForDay(day);
    return dayEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
  };

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-calendar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={previousMonth}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold" data-testid="text-current-month">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={goToToday}
            data-testid="button-today"
          >
            Today
          </Button>
        </div>
        <Button
          onClick={exportToICal}
          className="flex items-center gap-2"
          data-testid="button-export-ical"
        >
          <Download className="h-4 w-4" />
          Export to iCal
        </Button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square"></div>
          ))}
          
          {daysInMonth.map((day) => {
            const dayEntries = getEntriesForDay(day);
            const totalHours = getTotalHoursForDay(day);
            const isToday = isSameDay(day, new Date());
            const hasEntries = dayEntries.length > 0;

            return (
              <div
                key={day.toISOString()}
                className={`aspect-square border rounded-lg p-2 ${
                  !isSameMonth(day, currentDate)
                    ? "bg-muted/30 text-muted-foreground"
                    : ""
                } ${isToday ? "border-primary border-2" : "border-border"} ${
                  hasEntries ? "bg-accent/20" : ""
                }`}
                data-testid={`day-${format(day, "yyyy-MM-dd")}`}
              >
                <div className="flex flex-col h-full">
                  <div className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </div>
                  {hasEntries && (
                    <div className="mt-auto">
                      <div className="text-xs font-semibold text-primary" data-testid={`hours-${format(day, "yyyy-MM-dd")}`}>
                        {totalHours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Legend</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary rounded"></div>
            <span className="text-sm">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border bg-accent/20 rounded"></div>
            <span className="text-sm">Has entries</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border rounded"></div>
            <span className="text-sm">No entries</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
