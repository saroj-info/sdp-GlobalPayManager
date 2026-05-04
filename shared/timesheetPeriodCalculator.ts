/**
 * Timesheet Period Calculator
 * 
 * Calculates timesheet periods and payment dates based on contract configuration
 */

import { addDays, addMonths, startOfWeek, endOfWeek, format, differenceInDays, isBefore, isAfter, startOfMonth, endOfMonth, getDay } from 'date-fns';

export interface TimesheetPeriodConfig {
  frequency: 'weekly' | 'fortnightly' | 'semi_monthly' | 'monthly';
  firstTimesheetStartDate: Date;
  calculationMethod?: string; // 'standard_week', 'worker_start_day', 'week_a', 'week_b', or number for monthly/semi-monthly
  paymentDay?: string; // 'Monday', 'Tuesday', etc.
  paymentDaysAfterPeriod?: number; // Days after period end
  paymentHolidayRule?: boolean; // If true, pay on previous working day when holiday
}

export interface TimesheetPeriod {
  startDate: Date;
  endDate: Date;
  paymentDate: Date | null;
  applicableDays: Date[];
}

/**
 * Get day of week index from day name (Monday = 1, Sunday = 0)
 */
function getDayIndex(dayName: string): number {
  const days: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  };
  return days[dayName] ?? 1; // Default to Monday
}

/**
 * Get day name from date
 */
function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[getDay(date)];
}

/**
 * Calculate the timesheet period for a given reference date
 */
export function calculatePeriod(config: TimesheetPeriodConfig, referenceDate: Date = new Date()): TimesheetPeriod {
  const { frequency, firstTimesheetStartDate, calculationMethod } = config;
  
  switch (frequency) {
    case 'weekly':
      return calculateWeeklyPeriod(config, referenceDate);
    case 'fortnightly':
      return calculateFortnightlyPeriod(config, referenceDate);
    case 'semi_monthly':
      return calculateSemiMonthlyPeriod(config, referenceDate);
    case 'monthly':
      return calculateMonthlyPeriod(config, referenceDate);
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}

/**
 * Calculate weekly period
 * Handles partial first periods that start mid-week
 */
function calculateWeeklyPeriod(config: TimesheetPeriodConfig, referenceDate: Date): TimesheetPeriod {
  const { firstTimesheetStartDate, calculationMethod } = config;
  
  // For worker_start_day, use the actual day of week from firstTimesheetStartDate
  if (calculationMethod === 'worker_start_day') {
    const firstPeriodStart = new Date(firstTimesheetStartDate);
    
    // Calculate which 7-day period contains the reference date
    const daysSinceFirst = differenceInDays(referenceDate, firstPeriodStart);
    
    // Guard against pre-contract reference dates - always return first period
    if (daysSinceFirst < 0) {
      return {
        startDate: firstPeriodStart,
        endDate: addDays(firstPeriodStart, 6),
        paymentDate: calculatePaymentDate(config, addDays(firstPeriodStart, 6)),
        applicableDays: getApplicableDays(firstPeriodStart, addDays(firstPeriodStart, 6)),
      };
    }
    
    const weekIndex = Math.floor(daysSinceFirst / 7);
    const periodStart = addDays(firstPeriodStart, weekIndex * 7);
    const periodEnd = addDays(periodStart, 6);
    
    return {
      startDate: periodStart,
      endDate: periodEnd,
      paymentDate: calculatePaymentDate(config, periodEnd),
      applicableDays: getApplicableDays(periodStart, periodEnd),
    };
  }
  
  // Map calculation method to week start day
  const weekStartMap: { [key: string]: number } = {
    'monday_sunday': 1,
    'tuesday_monday': 2,
    'wednesday_tuesday': 3,
    'thursday_wednesday': 4,
    'friday_thursday': 5,
    'saturday_friday': 6,
    'sunday_saturday': 0,
    'standard_week': 1 // Default to Monday
  };
  
  const weekStartDay = weekStartMap[calculationMethod || 'monday_sunday'] ?? 1;
  const weekEndDay = weekStartDay === 0 ? 6 : weekStartDay - 1; // Day before week start
  
  // Calculate the end of the first period (which may be partial)
  const firstPeriodStart = new Date(firstTimesheetStartDate);
  const firstStartDayOfWeek = firstPeriodStart.getDay();
  
  let daysToFirstEnd = weekEndDay - firstStartDayOfWeek;
  if (daysToFirstEnd < 0) daysToFirstEnd += 7;
  // Don't force 7 days for first period - if starting on end day, period is 0 days (same day)
  
  const firstPeriodEnd = addDays(firstPeriodStart, daysToFirstEnd);
  
  // Check if reference date is in the first period
  if (!isAfter(referenceDate, firstPeriodEnd)) {
    return {
      startDate: firstPeriodStart,
      endDate: firstPeriodEnd,
      paymentDate: calculatePaymentDate(config, firstPeriodEnd),
      applicableDays: getApplicableDays(firstPeriodStart, firstPeriodEnd),
    };
  }
  
  // For subsequent periods, calculate which 7-day period we're in
  // First full period starts the day after firstPeriodEnd
  const firstFullPeriodStart = addDays(firstPeriodEnd, 1);
  const daysSinceFirstFullPeriod = differenceInDays(referenceDate, firstFullPeriodStart);
  
  // Guard against negative values (shouldn't happen due to check above, but be safe)
  if (daysSinceFirstFullPeriod < 0) {
    return {
      startDate: firstPeriodStart,
      endDate: firstPeriodEnd,
      paymentDate: calculatePaymentDate(config, firstPeriodEnd),
      applicableDays: getApplicableDays(firstPeriodStart, firstPeriodEnd),
    };
  }
  
  // Calculate which 7-day period we're in
  const fullWeekIndex = Math.floor(daysSinceFirstFullPeriod / 7);
  
  // Period starts at firstFullPeriodStart, then proceeds in 7-day increments
  const periodStart = addDays(firstFullPeriodStart, fullWeekIndex * 7);
  const periodEnd = addDays(periodStart, 6);
  
  return {
    startDate: periodStart,
    endDate: periodEnd,
    paymentDate: calculatePaymentDate(config, periodEnd),
    applicableDays: getApplicableDays(periodStart, periodEnd),
  };
}

/**
 * Calculate fortnightly period
 */
function calculateFortnightlyPeriod(config: TimesheetPeriodConfig, referenceDate: Date): TimesheetPeriod {
  const { firstTimesheetStartDate, calculationMethod } = config;
  
  // Calculate the number of weeks since the first period start
  const daysSinceFirst = differenceInDays(referenceDate, firstTimesheetStartDate);
  const weeksSinceFirst = Math.floor(daysSinceFirst / 7);
  
  // Determine which fortnight we're in
  const fortnightIndex = Math.floor(weeksSinceFirst / 2);
  
  // Calculate the start of this fortnight
  const periodStart = addDays(firstTimesheetStartDate, fortnightIndex * 14);
  const periodEnd = addDays(periodStart, 13); // 14 days total
  
  return {
    startDate: periodStart,
    endDate: periodEnd,
    paymentDate: calculatePaymentDate(config, periodEnd),
    applicableDays: getApplicableDays(periodStart, periodEnd),
  };
}

/**
 * Calculate semi-monthly period (twice per month)
 */
function calculateSemiMonthlyPeriod(config: TimesheetPeriodConfig, referenceDate: Date): TimesheetPeriod {
  const { calculationMethod } = config;
  
  const splitDay = calculationMethod ? parseInt(calculationMethod) : 15;
  const currentDay = referenceDate.getDate();
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (currentDay <= splitDay) {
    // First half of the month: 1st to splitDay
    periodStart = new Date(currentYear, currentMonth, 1);
    periodEnd = new Date(currentYear, currentMonth, splitDay);
  } else {
    // Second half of the month: (splitDay + 1) to end of month
    periodStart = new Date(currentYear, currentMonth, splitDay + 1);
    periodEnd = endOfMonth(referenceDate);
  }
  
  return {
    startDate: periodStart,
    endDate: periodEnd,
    paymentDate: calculatePaymentDate(config, periodEnd),
    applicableDays: getApplicableDays(periodStart, periodEnd),
  };
}

/**
 * Calculate monthly period
 */
function calculateMonthlyPeriod(config: TimesheetPeriodConfig, referenceDate: Date): TimesheetPeriod {
  const { calculationMethod } = config;
  
  const startDay = calculationMethod ? parseInt(calculationMethod) : 1;
  const currentDay = referenceDate.getDate();
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (currentDay >= startDay) {
    // Current period: startDay of current month to (startDay - 1) of next month
    periodStart = new Date(currentYear, currentMonth, startDay);
    const nextMonth = new Date(currentYear, currentMonth + 1, startDay);
    periodEnd = addDays(nextMonth, -1);
  } else {
    // Previous period: startDay of previous month to (startDay - 1) of current month
    periodStart = new Date(currentYear, currentMonth - 1, startDay);
    const currentMonthStart = new Date(currentYear, currentMonth, startDay);
    periodEnd = addDays(currentMonthStart, -1);
  }
  
  return {
    startDate: periodStart,
    endDate: periodEnd,
    paymentDate: calculatePaymentDate(config, periodEnd),
    applicableDays: getApplicableDays(periodStart, periodEnd),
  };
}

/**
 * Calculate payment date based on period end and payment configuration
 */
function calculatePaymentDate(config: TimesheetPeriodConfig, periodEnd: Date): Date | null {
  const { paymentDay, paymentDaysAfterPeriod, paymentHolidayRule } = config;
  
  if (!paymentDay || paymentDaysAfterPeriod === undefined) {
    return null;
  }
  
  // Calculate the target payment date
  let paymentDate = addDays(periodEnd, paymentDaysAfterPeriod);
  
  // Find the next occurrence of the specified payment day
  const targetDayIndex = getDayIndex(paymentDay);
  const currentDayIndex = getDay(paymentDate);
  
  let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
  if (daysToAdd === 0 && getDay(paymentDate) !== targetDayIndex) {
    daysToAdd = 7;
  }
  
  paymentDate = addDays(paymentDate, daysToAdd);
  
  // Apply holiday rule if needed (simplified - just check weekend)
  if (paymentHolidayRule) {
    const dayOfWeek = getDay(paymentDate);
    if (dayOfWeek === 0) { // Sunday
      paymentDate = addDays(paymentDate, -2); // Move to Friday
    } else if (dayOfWeek === 6) { // Saturday
      paymentDate = addDays(paymentDate, -1); // Move to Friday
    }
  }
  
  return paymentDate;
}

/**
 * Get all applicable days in the period (for UI display)
 */
function getApplicableDays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    days.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return days;
}

/**
 * Get upcoming payment schedule (next 6 payment dates)
 */
export function getUpcomingPaymentSchedule(config: TimesheetPeriodConfig, count: number = 6): Date[] {
  const schedule: Date[] = [];
  let currentDate = new Date();
  
  for (let i = 0; i < count; i++) {
    const period = calculatePeriod(config, currentDate);
    if (period.paymentDate) {
      schedule.push(period.paymentDate);
    }
    
    // Move to next period based on frequency
    switch (config.frequency) {
      case 'weekly':
        currentDate = addDays(currentDate, 7);
        break;
      case 'fortnightly':
        currentDate = addDays(currentDate, 14);
        break;
      case 'semi_monthly':
        currentDate = addDays(currentDate, 15); // Approximate
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
    }
  }
  
  return schedule;
}

/**
 * Schedule entry produced by `generatePeriodSchedule` — matches the columns shown in
 * the contract wizard's "Timesheet Periods & Pay Dates Preview" dialog.
 */
export interface PeriodScheduleEntry {
  number: number;
  start: Date;
  end: Date;
  payDate: Date;
}

export interface PeriodScheduleInput {
  startDate: string | Date;            // contract start (or first timesheet start)
  endDate?: string | Date | null;      // contract end (optional)
  timesheetFrequency?: string | null;  // 'weekly' | 'fortnightly' | 'semi_monthly' | 'monthly'
  timesheetCalculationMethod?: string | null;
  paymentScheduleType?: string | null; // 'days_after' | 'specific_day'
  paymentDay?: string | null;
  paymentDaysAfterPeriod?: number | null;
}

function dayOfWeekFromCalcMethod(method: string | null | undefined): number {
  const map: Record<string, number> = {
    monday_sunday: 1,
    tuesday_monday: 2,
    wednesday_tuesday: 3,
    thursday_wednesday: 4,
    friday_thursday: 5,
    saturday_friday: 6,
    sunday_saturday: 0,
  };
  return method && map[method] !== undefined ? map[method] : 1;
}

function payDateFor(periodEnd: Date, scheduleType?: string | null, paymentDay?: string | null, daysAfter?: number | null): Date {
  const out = new Date(periodEnd);
  if (scheduleType === 'days_after') {
    out.setDate(out.getDate() + (daysAfter || 0));
    return out;
  }
  if (paymentDay) {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
    };
    const targetDow = dayMap[paymentDay.toLowerCase()];
    if (targetDow !== undefined) {
      let diff = targetDow - out.getDay();
      if (diff <= 0) diff += 7;
      out.setDate(out.getDate() + diff);
      return out;
    }
  }
  // Fallback — same day as period end
  return out;
}

/**
 * Generate a sequence of timesheet periods starting at the contract start date.
 *
 * This function is the single source of truth used by:
 *   - the contract wizard's "Timesheet Periods & Pay Dates Preview"
 *   - the create-timesheet modal's "Suggested Periods"
 *   - the sign-contract page's payment-schedule preview
 *
 * It mirrors the wizard's inline calculation so all three views render identical periods.
 */
export function generatePeriodSchedule(
  input: PeriodScheduleInput,
  maxPeriods: number = 8,
): PeriodScheduleEntry[] {
  if (!input.timesheetFrequency || !input.startDate) return [];

  const parseLocal = (d: string | Date): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return new Date(d);
    // YYYY-MM-DD or ISO — parse as local date so we don't shift across timezones.
    const ymd = String(d).slice(0, 10).split('-').map(Number);
    if (ymd.length === 3 && ymd.every(n => !isNaN(n))) {
      return new Date(ymd[0], ymd[1] - 1, ymd[2]);
    }
    const fallback = new Date(d);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  const contractStartDate = parseLocal(input.startDate);
  if (!contractStartDate) return [];
  const contractEndDate = input.endDate ? parseLocal(input.endDate) : null;
  const cap = contractEndDate ? Math.max(maxPeriods, 100) : maxPeriods;

  const periods: PeriodScheduleEntry[] = [];
  let currentPeriodStart = new Date(contractStartDate);

  for (let i = 0; i < cap; i++) {
    if (contractEndDate && currentPeriodStart > contractEndDate) break;

    let periodEnd = new Date(currentPeriodStart);

    switch (input.timesheetFrequency) {
      case 'weekly': {
        const weekStartDay = dayOfWeekFromCalcMethod(input.timesheetCalculationMethod);
        const weekEndDay = weekStartDay === 0 ? 6 : weekStartDay - 1;
        let daysToAdd = weekEndDay - currentPeriodStart.getDay();
        if (daysToAdd < 0) daysToAdd += 7;
        if (i > 0 && daysToAdd === 0) daysToAdd = 7;
        periodEnd.setDate(periodEnd.getDate() + daysToAdd);
        break;
      }
      case 'fortnightly': {
        const startDay = currentPeriodStart.getDay();
        if (input.timesheetCalculationMethod === 'week_1') {
          if (i === 0) {
            const daysUntilSunday = 7 - startDay;
            periodEnd.setDate(periodEnd.getDate() + daysUntilSunday);
          } else {
            periodEnd.setDate(periodEnd.getDate() + 13);
          }
        } else {
          if (i === 0) {
            const daysUntilSunday = 7 - startDay;
            periodEnd.setDate(periodEnd.getDate() + daysUntilSunday + 7);
          } else {
            periodEnd.setDate(periodEnd.getDate() + 13);
          }
        }
        break;
      }
      case 'semi_monthly': {
        const currentDay = currentPeriodStart.getDate();
        const currentMonth = currentPeriodStart.getMonth();
        const currentYear = currentPeriodStart.getFullYear();
        if (currentDay <= 15) {
          periodEnd = new Date(currentYear, currentMonth, 15);
        } else {
          periodEnd = new Date(currentYear, currentMonth + 1, 0);
        }
        break;
      }
      case 'monthly': {
        const periodStartDay = parseInt(input.timesheetCalculationMethod || '1') || 1;
        const currentDay = currentPeriodStart.getDate();
        const currentMonth = currentPeriodStart.getMonth();
        const currentYear = currentPeriodStart.getFullYear();
        if (currentDay < periodStartDay) {
          periodEnd = new Date(currentYear, currentMonth, periodStartDay - 1);
        } else {
          periodEnd = new Date(currentYear, currentMonth + 1, periodStartDay - 1);
        }
        break;
      }
      default:
        return periods;
    }

    if (contractEndDate && periodEnd > contractEndDate) {
      periodEnd = new Date(contractEndDate);
      periods.push({
        number: i + 1,
        start: new Date(currentPeriodStart),
        end: periodEnd,
        payDate: payDateFor(periodEnd, input.paymentScheduleType, input.paymentDay, input.paymentDaysAfterPeriod),
      });
      break;
    }

    periods.push({
      number: i + 1,
      start: new Date(currentPeriodStart),
      end: periodEnd,
      payDate: payDateFor(periodEnd, input.paymentScheduleType, input.paymentDay, input.paymentDaysAfterPeriod),
    });

    currentPeriodStart = new Date(periodEnd);
    currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
  }

  return periods;
}

/**
 * Format period for display
 */
export function formatPeriod(period: TimesheetPeriod): string {
  return `${format(period.startDate, 'MMM d')} - ${format(period.endDate, 'MMM d, yyyy')}`;
}

/**
 * Format payment date for display
 */
export function formatPaymentDate(date: Date | null): string {
  if (!date) return 'Not configured';
  return format(date, 'MMM d, yyyy (EEEE)');
}
