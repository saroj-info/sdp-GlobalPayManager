import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock, CheckCircle } from "lucide-react";

export interface TimesheetEntryValue {
  date: string;
  hoursWorked?: string;
  daysWorked?: string;
  startTime?: string;
  endTime?: string;
  breakHours?: string;
  description?: string;
  projectRateLineId?: string;
  isPresent?: boolean;
}

interface RateLine {
  id: string;
  projectName?: string;
  description?: string;
  rate: string;
  currency?: string;
}

interface TimesheetEntryTableProps {
  rateType: "hourly" | "daily" | "annual";
  rateStructure?: "single" | "multiple";
  rateLines?: RateLine[];
  periodDates: Date[];
  entries: TimesheetEntryValue[];
  onChange: (entries: TimesheetEntryValue[]) => void;
  currency?: string;
}

function calcHours(start: string, end: string, brk: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(eh)) return 0;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 1440;
  diff -= (parseFloat(brk || "0") * 60);
  return Math.max(0, Math.round((diff / 60) * 100) / 100);
}

function blankEntry(date: string): TimesheetEntryValue {
  return { date, hoursWorked: "", startTime: "", endTime: "", breakHours: "", description: "", projectRateLineId: "" };
}

function blankDailyEntry(date: string): TimesheetEntryValue {
  return { date, daysWorked: "0", description: "", projectRateLineId: "" };
}

export function TimesheetEntryTable({
  rateType,
  rateStructure = "single",
  rateLines = [],
  periodDates,
  entries,
  onChange,
  currency = "AUD",
}: TimesheetEntryTableProps) {
  const isMultiple = rateStructure === "multiple" && rateLines.length > 0;

  const entriesForDate = (dateStr: string) =>
    entries.filter((e) => e.date === dateStr);

  const addEntry = (dateStr: string) => {
    const newEntry =
      rateType === "hourly" ? blankEntry(dateStr) : blankDailyEntry(dateStr);
    onChange([...entries, newEntry]);
  };

  const removeEntry = (dateStr: string, idx: number) => {
    const dateEntries = entriesForDate(dateStr);
    const targetEntry = dateEntries[idx];
    const globalIdx = entries.findIndex(
      (e, i) => e.date === dateStr && entries.slice(0, i).filter((x) => x.date === dateStr).length === idx
    );
    onChange(entries.filter((_, i) => i !== globalIdx));
  };

  const updateEntry = (dateStr: string, idx: number, patch: Partial<TimesheetEntryValue>) => {
    const newEntries = [...entries];
    let count = -1;
    for (let i = 0; i < newEntries.length; i++) {
      if (newEntries[i].date === dateStr) {
        count++;
        if (count === idx) {
          const updated = { ...newEntries[i], ...patch };
          if (rateType === "hourly" && ("startTime" in patch || "endTime" in patch || "breakHours" in patch)) {
            const h = calcHours(
              "startTime" in patch ? (patch.startTime ?? "") : (newEntries[i].startTime ?? ""),
              "endTime" in patch ? (patch.endTime ?? "") : (newEntries[i].endTime ?? ""),
              "breakHours" in patch ? (patch.breakHours ?? "") : (newEntries[i].breakHours ?? "")
            );
            updated.hoursWorked = h > 0 ? String(h) : "";
          }
          newEntries[i] = updated;
          break;
        }
      }
    }
    onChange(newEntries);
  };

  const dayTotal = (dateStr: string): number => {
    const es = entriesForDate(dateStr);
    if (rateType === "hourly") {
      return es.reduce((s, e) => s + (parseFloat(e.hoursWorked || "0") || 0), 0);
    }
    return es.reduce((s, e) => s + (parseFloat(e.daysWorked || "0") || 0), 0);
  };

  const periodTotal = (): number => {
    if (rateType === "hourly") {
      return entries.reduce((s, e) => s + (parseFloat(e.hoursWorked || "0") || 0), 0);
    }
    return entries.reduce((s, e) => s + (parseFloat(e.daysWorked || "0") || 0), 0);
  };

  if (periodDates.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
        <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Select a period above to start entering time</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {periodDates.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayEntries = entriesForDate(dateStr);
        const total = dayTotal(dateStr);
        const hasData = rateType === "annual"
          ? dayEntries.some((e) => e.isPresent)
          : total > 0;
        const dayLabel = format(date, "EEE d MMM");
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        return (
          <div
            key={dateStr}
            className={`rounded-lg border ${hasData ? "border-primary/40 bg-primary/5" : isWeekend ? "border-muted bg-muted/30" : "border-border"}`}
          >
            {/* Day header */}
            <div className={`flex items-center justify-between px-3 py-2 ${hasData ? "bg-primary/10" : isWeekend ? "bg-muted/50" : "bg-muted/20"} rounded-t-lg`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${isWeekend ? "text-muted-foreground" : "text-foreground"}`}>
                  {dayLabel}
                  {isWeekend && <span className="ml-1 text-xs font-normal text-muted-foreground">(Weekend)</span>}
                </span>
                {hasData && (
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {rateType === "hourly" ? `${total.toFixed(2)}h` : `${total.toFixed(1)}d`}
                  </Badge>
                )}
              </div>
              {rateType !== "annual" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:text-primary"
                  onClick={() => addEntry(dateStr)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Entry
                </Button>
              )}
            </div>

            {/* Entry rows */}
            <div className="divide-y divide-border">
              {rateType === "annual" ? (
                // Annual: single presence row per day
                <div className="flex items-center gap-4 px-3 py-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Switch
                      checked={Boolean(dayEntries[0]?.isPresent)}
                      onCheckedChange={(checked) => {
                        if (dayEntries.length === 0) {
                          onChange([...entries, { date: dateStr, isPresent: checked }]);
                        } else {
                          updateEntry(dateStr, 0, { isPresent: checked });
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {dayEntries[0]?.isPresent ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3.5 w-3.5" />Present</span>
                      ) : "Not present"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Notes..."
                      value={dayEntries[0]?.description || ""}
                      onChange={(e) => {
                        if (dayEntries.length === 0) {
                          onChange([...entries, { date: dateStr, isPresent: false, description: e.target.value }]);
                        } else {
                          updateEntry(dateStr, 0, { description: e.target.value });
                        }
                      }}
                      className="h-7 text-sm"
                    />
                  </div>
                </div>
              ) : dayEntries.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground italic">
                  Click "Add Entry" to log time for this day
                </div>
              ) : (
                dayEntries.map((entry, idx) => (
                  <div key={idx} className="px-3 py-2">
                    {rateType === "hourly" ? (
                      <HourlyEntryRow
                        entry={entry}
                        idx={idx}
                        dateStr={dateStr}
                        isMultiple={isMultiple}
                        rateLines={rateLines}
                        onUpdate={(patch) => updateEntry(dateStr, idx, patch)}
                        onRemove={() => removeEntry(dateStr, idx)}
                        showRemove={dayEntries.length > 1}
                      />
                    ) : (
                      <DailyEntryRow
                        entry={entry}
                        idx={idx}
                        dateStr={dateStr}
                        isMultiple={isMultiple}
                        rateLines={rateLines}
                        onUpdate={(patch) => updateEntry(dateStr, idx, patch)}
                        onRemove={() => removeEntry(dateStr, idx)}
                        showRemove={dayEntries.length > 1}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* Period total */}
      <div className="flex items-center justify-end pt-3 border-t border-border">
        <div className="text-sm font-semibold text-foreground">
          Period Total:{" "}
          <span className="text-primary text-base">
            {rateType === "hourly"
              ? `${periodTotal().toFixed(2)} hours`
              : rateType === "daily"
              ? `${periodTotal().toFixed(1)} days`
              : `${entries.filter((e) => e.isPresent).length} days present`}
          </span>
        </div>
      </div>
    </div>
  );
}

function HourlyEntryRow({
  entry, idx, dateStr, isMultiple, rateLines, onUpdate, onRemove, showRemove,
}: {
  entry: TimesheetEntryValue;
  idx: number;
  dateStr: string;
  isMultiple: boolean;
  rateLines: RateLine[];
  onUpdate: (patch: Partial<TimesheetEntryValue>) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const hours = parseFloat(entry.hoursWorked || "0") || 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_60px_80px_auto] gap-2 items-end">
        {/* Start time */}
        <div className="space-y-1">
          {idx === 0 && <p className="text-xs text-muted-foreground">Start</p>}
          <Input
            type="time"
            value={entry.startTime || ""}
            onChange={(e) => onUpdate({ startTime: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        {/* Break */}
        <div className="space-y-1">
          {idx === 0 && <p className="text-xs text-muted-foreground">Break (h)</p>}
          <Input
            type="number"
            step="0.25"
            min="0"
            placeholder="0"
            value={entry.breakHours || ""}
            onChange={(e) => onUpdate({ breakHours: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        {/* End time */}
        <div className="space-y-1">
          {idx === 0 && <p className="text-xs text-muted-foreground">End</p>}
          <Input
            type="time"
            value={entry.endTime || ""}
            onChange={(e) => onUpdate({ endTime: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        {/* Hours badge */}
        <div className="space-y-1">
          {idx === 0 && <p className="text-xs text-muted-foreground">Hours</p>}
          <div className="h-8 flex items-center">
            {hours > 0 ? (
              <Badge variant="secondary" className="h-6 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {hours.toFixed(2)}h
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
        {/* Delete */}
        <div className="space-y-1">
          {idx === 0 && <p className="text-xs text-muted-foreground invisible">Del</p>}
          <div className="h-8 flex items-center">
            {showRemove && (
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className={`grid gap-2 ${isMultiple ? "grid-cols-2" : "grid-cols-1"}`}>
        {isMultiple && (
          <Select value={entry.projectRateLineId || ""} onValueChange={(v) => onUpdate({ projectRateLineId: v })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select rate..." />
            </SelectTrigger>
            <SelectContent>
              {rateLines.map((rl) => (
                <SelectItem key={rl.id} value={rl.id}>
                  {rl.projectName || rl.description || "Rate"} ({rl.currency || ""} {rl.rate}/hr)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          placeholder="Notes for this entry..."
          value={entry.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}

function DailyEntryRow({
  entry, idx, dateStr, isMultiple, rateLines, onUpdate, onRemove, showRemove,
}: {
  entry: TimesheetEntryValue;
  idx: number;
  dateStr: string;
  isMultiple: boolean;
  rateLines: RateLine[];
  onUpdate: (patch: Partial<TimesheetEntryValue>) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr_auto] gap-2 items-center">
      <Select value={entry.daysWorked || "0"} onValueChange={(v) => onUpdate({ daysWorked: v })}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">No work</SelectItem>
          <SelectItem value="0.5">Half day (0.5)</SelectItem>
          <SelectItem value="1">Full day (1.0)</SelectItem>
        </SelectContent>
      </Select>

      <div className={`grid gap-2 ${isMultiple ? "grid-cols-2" : "grid-cols-1"}`}>
        {isMultiple && (
          <Select value={entry.projectRateLineId || ""} onValueChange={(v) => onUpdate({ projectRateLineId: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select rate..." />
            </SelectTrigger>
            <SelectContent>
              {rateLines.map((rl) => (
                <SelectItem key={rl.id} value={rl.id}>
                  {rl.projectName || rl.description || "Rate"} ({rl.currency || ""} {rl.rate}/d)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          placeholder="Notes..."
          value={entry.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="h-8 text-xs"
        />
      </div>

      {showRemove ? (
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <div className="w-8" />
      )}
    </div>
  );
}
