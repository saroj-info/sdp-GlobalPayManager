import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

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
  description: string;
  rate: string;
}

interface DailyTimesheetCardProps {
  date: Date;
  rateType: 'hourly' | 'daily' | 'annual';
  rateStructure?: 'single' | 'multiple';
  rateLines?: RateLine[];
  value: TimesheetEntryValue;
  onChange: (value: TimesheetEntryValue) => void;
  error?: {
    hoursWorked?: string;
    daysWorked?: string;
    startTime?: string;
    endTime?: string;
    breakHours?: string;
    projectRateLineId?: string;
  };
  isHourlyContract?: boolean;
}

function calculateHoursWorked(startTime: string, endTime: string, breakHours: string): number {
  if (!startTime || !endTime) return 0;
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) return 0;
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  let diffMinutes = endTotalMinutes - startTotalMinutes;
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  const breakMinutes = parseFloat(breakHours || '0') * 60;
  diffMinutes -= breakMinutes;
  return Math.round((diffMinutes / 60) * 100) / 100;
}

export function DailyTimesheetCard({
  date,
  rateType,
  rateStructure = 'single',
  rateLines = [],
  value,
  onChange,
  error,
  isHourlyContract,
}: DailyTimesheetCardProps) {
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const dayOfWeek = format(date, 'EEE');
  const dayOfMonth = format(date, 'd');
  const monthYear = format(date, 'MMM yyyy');

  const effectiveRateType = isHourlyContract !== undefined
    ? (isHourlyContract ? 'hourly' : 'daily')
    : rateType;

  useEffect(() => {
    if (effectiveRateType === 'hourly') {
      if (!value.startTime || !value.endTime) {
        setCalculatedHours(0);
        onChange({ ...value, hoursWorked: '0' });
        return;
      }
      const hours = calculateHoursWorked(value.startTime, value.endTime, value.breakHours || '0');
      setCalculatedHours(hours);
      onChange({ ...value, hoursWorked: hours > 0 ? hours.toFixed(2) : '0' });
    }
  }, [value.startTime, value.endTime, value.breakHours, effectiveRateType]);

  const hasData = effectiveRateType === 'hourly'
    ? Boolean(value.startTime && value.endTime)
    : effectiveRateType === 'daily'
    ? Boolean(value.daysWorked && parseFloat(value.daysWorked) > 0)
    : Boolean(value.isPresent);

  return (
    <Card className={`transition-all ${hasData ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-lg">{dayOfWeek}</h4>
              {hasData && (
                <CheckCircle className="h-4 w-4 text-green-600" data-testid={`check-${value.date}`} />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {dayOfMonth} {monthYear}
            </p>
          </div>

          {effectiveRateType === 'hourly' && calculatedHours > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1" data-testid={`hours-badge-${value.date}`}>
              <Clock className="h-3 w-3" />
              {calculatedHours.toFixed(2)}h
            </Badge>
          )}

          {effectiveRateType === 'daily' && value.daysWorked && parseFloat(value.daysWorked) > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1" data-testid={`days-badge-${value.date}`}>
              {parseFloat(value.daysWorked).toFixed(1)}d
            </Badge>
          )}
        </div>

        {effectiveRateType === 'hourly' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`start-${value.date}`} className="text-xs">Start Time</Label>
                <Input
                  id={`start-${value.date}`}
                  data-testid={`input-start-time-${value.date}`}
                  type="time"
                  value={value.startTime || ''}
                  onChange={(e) => onChange({ ...value, startTime: e.target.value })}
                  className="h-9"
                />
                {error?.startTime && <p className="text-xs text-destructive">{error.startTime}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`break-${value.date}`} className="text-xs">Break (hours)</Label>
                <Input
                  id={`break-${value.date}`}
                  data-testid={`input-break-hours-${value.date}`}
                  type="number"
                  step="0.25"
                  min="0"
                  max="8"
                  placeholder="0.5"
                  value={value.breakHours || ''}
                  onChange={(e) => onChange({ ...value, breakHours: e.target.value })}
                  className="h-9"
                />
                {error?.breakHours && <p className="text-xs text-destructive">{error.breakHours}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`end-${value.date}`} className="text-xs">End Time</Label>
                <Input
                  id={`end-${value.date}`}
                  data-testid={`input-end-time-${value.date}`}
                  type="time"
                  value={value.endTime || ''}
                  onChange={(e) => onChange({ ...value, endTime: e.target.value })}
                  className="h-9"
                />
                {error?.endTime && <p className="text-xs text-destructive">{error.endTime}</p>}
              </div>
            </div>

            {rateStructure === 'multiple' && rateLines.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Applicable Rate</Label>
                <Select
                  value={value.projectRateLineId || ''}
                  onValueChange={(v) => onChange({ ...value, projectRateLineId: v })}
                >
                  <SelectTrigger className="h-9" data-testid={`select-rate-line-${value.date}`}>
                    <SelectValue placeholder="Select rate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rateLines.map((rl) => (
                      <SelectItem key={rl.id} value={rl.id}>
                        {rl.description} ({rl.rate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error?.projectRateLineId && <p className="text-xs text-destructive">{error.projectRateLineId}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`notes-${value.date}`} className="text-xs">Notes (optional)</Label>
              <Textarea
                id={`notes-${value.date}`}
                data-testid={`textarea-notes-${value.date}`}
                placeholder="Add any notes about today's work..."
                value={value.description || ''}
                onChange={(e) => onChange({ ...value, description: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}

        {effectiveRateType === 'daily' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`days-${value.date}`} className="text-xs">Days Worked</Label>
              <Select
                value={value.daysWorked || ''}
                onValueChange={(v) => onChange({ ...value, daysWorked: v })}
              >
                <SelectTrigger className="h-9" data-testid={`select-days-worked-${value.date}`}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No work</SelectItem>
                  <SelectItem value="0.5">Half day (0.5)</SelectItem>
                  <SelectItem value="1">Full day (1.0)</SelectItem>
                </SelectContent>
              </Select>
              {error?.daysWorked && <p className="text-xs text-destructive">{error.daysWorked}</p>}
            </div>

            {rateStructure === 'multiple' && rateLines.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Applicable Rate</Label>
                <Select
                  value={value.projectRateLineId || ''}
                  onValueChange={(v) => onChange({ ...value, projectRateLineId: v })}
                >
                  <SelectTrigger className="h-9" data-testid={`select-rate-line-${value.date}`}>
                    <SelectValue placeholder="Select rate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rateLines.map((rl) => (
                      <SelectItem key={rl.id} value={rl.id}>
                        {rl.description} ({rl.rate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error?.projectRateLineId && <p className="text-xs text-destructive">{error.projectRateLineId}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`notes-${value.date}`} className="text-xs">Notes (optional)</Label>
              <Textarea
                id={`notes-${value.date}`}
                data-testid={`textarea-notes-${value.date}`}
                placeholder="Add any notes about today's work..."
                value={value.description || ''}
                onChange={(e) => onChange({ ...value, description: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}

        {effectiveRateType === 'annual' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Present today?</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{value.isPresent ? 'Yes' : 'No'}</span>
                <Switch
                  checked={Boolean(value.isPresent)}
                  onCheckedChange={(checked) => onChange({ ...value, isPresent: checked })}
                  data-testid={`switch-present-${value.date}`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`notes-${value.date}`} className="text-xs">Notes (optional)</Label>
              <Textarea
                id={`notes-${value.date}`}
                data-testid={`textarea-notes-${value.date}`}
                placeholder="Add any notes..."
                value={value.description || ''}
                onChange={(e) => onChange({ ...value, description: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
