export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'all_time'
  | 'custom';

export type OrderStatusFilter =
  | 'all'
  | 'pending'
  | 'payment_verified'
  | 'awaiting_delivery'
  | 'approved'
  | 'rejected'
  | 'completed';

export interface DateFilterRange {
  start: Date | null;
  end: Date | null;
  label: string;
  startDateStr?: string;
  endDateStr?: string;
}

export interface FilterStatistics {
  totalOrders: number;
  pendingOrders: number;
  paymentVerifiedOrders: number;
  awaitingDeliveryOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  completedOrders: number;
  totalOrderValue: number; // in cents
  totalOrderValueFormatted: string; // e.g. "$124.50 USD"
}

export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, min, sec] = timeStr.split(':').map(Number);
  const ms = timeStr.includes('.') ? Number(timeStr.split('.')[1]) : 0;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, min, Math.floor(sec), ms));
  try {
    const invDate = new Date(utcGuess.toLocaleString('en-US', { timeZone }));
    const diff = utcGuess.getTime() - invDate.getTime();
    return new Date(utcGuess.getTime() + diff);
  } catch {
    return utcGuess;
  }
}

export function getZonedDateString(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

export function getDateRangeForPreset(
  preset: DatePreset,
  timeZone = 'UTC',
  customStart?: string,
  customEnd?: string
): DateFilterRange {
  try {
    const now = new Date();
    const todayStr = getZonedDateString(now, timeZone);
    const [y, m, d] = todayStr.split('-').map(Number);

    if (preset === 'today') {
      return {
        start: zonedTimeToUtc(todayStr, '00:00:00', timeZone),
        end: zonedTimeToUtc(todayStr, '23:59:59.999', timeZone),
        label: `Today (${todayStr})`,
        startDateStr: todayStr,
        endDateStr: todayStr,
      };
    }

    if (preset === 'yesterday') {
      const yesterdayDate = new Date(Date.UTC(y, m - 1, d - 1));
      const yesterdayStr = getZonedDateString(yesterdayDate, 'UTC');
      return {
        start: zonedTimeToUtc(yesterdayStr, '00:00:00', timeZone),
        end: zonedTimeToUtc(yesterdayStr, '23:59:59.999', timeZone),
        label: `Yesterday (${yesterdayStr})`,
        startDateStr: yesterdayStr,
        endDateStr: yesterdayStr,
      };
    }

    if (preset === 'last_7_days') {
      const pastDate = new Date(Date.UTC(y, m - 1, d - 6));
      const pastStr = getZonedDateString(pastDate, 'UTC');
      return {
        start: zonedTimeToUtc(pastStr, '00:00:00', timeZone),
        end: zonedTimeToUtc(todayStr, '23:59:59.999', timeZone),
        label: `Last 7 Days (${pastStr} to ${todayStr})`,
        startDateStr: pastStr,
        endDateStr: todayStr,
      };
    }

    if (preset === 'last_30_days') {
      const pastDate = new Date(Date.UTC(y, m - 1, d - 29));
      const pastStr = getZonedDateString(pastDate, 'UTC');
      return {
        start: zonedTimeToUtc(pastStr, '00:00:00', timeZone),
        end: zonedTimeToUtc(todayStr, '23:59:59.999', timeZone),
        label: `Last 30 Days (${pastStr} to ${todayStr})`,
        startDateStr: pastStr,
        endDateStr: todayStr,
      };
    }

    if (preset === 'this_month') {
      const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonthFirst = new Date(Date.UTC(y, m, 1));
      const lastDayOfMonth = new Date(nextMonthFirst.getTime() - 86400000);
      const endStr = getZonedDateString(lastDayOfMonth, 'UTC');
      return {
        start: zonedTimeToUtc(startStr, '00:00:00', timeZone),
        end: zonedTimeToUtc(endStr, '23:59:59.999', timeZone),
        label: `This Month (${startStr} to ${endStr})`,
        startDateStr: startStr,
        endDateStr: endStr,
      };
    }

    if (preset === 'last_month') {
      const prevMonthFirst = new Date(Date.UTC(y, m - 2, 1));
      const prevMonthLast = new Date(Date.UTC(y, m - 1, 0));
      const startStr = getZonedDateString(prevMonthFirst, 'UTC');
      const endStr = getZonedDateString(prevMonthLast, 'UTC');
      return {
        start: zonedTimeToUtc(startStr, '00:00:00', timeZone),
        end: zonedTimeToUtc(endStr, '23:59:59.999', timeZone),
        label: `Last Month (${startStr} to ${endStr})`,
        startDateStr: startStr,
        endDateStr: endStr,
      };
    }

    if (preset === 'custom' && customStart && customEnd) {
      return {
        start: zonedTimeToUtc(customStart, '00:00:00', timeZone),
        end: zonedTimeToUtc(customEnd, '23:59:59.999', timeZone),
        label: `Custom (${customStart} to ${customEnd})`,
        startDateStr: customStart,
        endDateStr: customEnd,
      };
    }

    return { start: null, end: null, label: 'All Time' };
  } catch (err) {
    console.error('Error calculating date range:', err);
    return { start: null, end: null, label: 'All Time' };
  }
}

export const DATE_PRESET_OPTIONS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'all_time', label: 'All Time' },
  { id: 'custom', label: 'Custom Date Range' },
];

export const ORDER_STATUS_OPTIONS: { id: OrderStatusFilter; label: string; badgeColor: string }[] = [
  { id: 'all', label: 'All Orders', badgeColor: 'bg-slate-700 text-slate-200' },
  { id: 'pending', label: 'Pending', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'payment_verified', label: 'Payment Verified', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'awaiting_delivery', label: 'Awaiting Delivery', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { id: 'approved', label: 'Approved', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { id: 'rejected', label: 'Rejected', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { id: 'completed', label: 'Completed', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
];
