/**
 * 12-month money chart — one series per currency, never summed across
 * currencies. Bars for a billing view, lines for a trend view. Legend renders
 * only when there are 2+ currencies (a single series is named by the title).
 */

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Receipt } from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MonthlyMoney } from "@shared/dashboard";
import { EmptyState } from "./empty-state";
import { formatMonthTick, formatMonthLong } from "./use-dashboard-summary";

interface MonthlyMoneyChartProps {
  data: MonthlyMoney;
  variant: "bar" | "line";
  emptyMessage: string;
}

const compact = (v: unknown) =>
  new Intl.NumberFormat(undefined, { notation: "compact" }).format(Number(v));

export function MonthlyMoneyChart({ data, variant, emptyMessage }: MonthlyMoneyChartProps) {
  if (data.currencies.length === 0) {
    return (
      <div className="h-[280px]">
        <EmptyState icon={Receipt} message={emptyMessage} />
      </div>
    );
  }

  const rows = data.rows.map(r => ({ month: r.month, ...r.totals }));
  const config: ChartConfig = Object.fromEntries(
    data.currencies.map((c, i) => [c, { label: c, color: `var(--chart-${(i % 8) + 1})` }]),
  );

  const axes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="month" tickFormatter={formatMonthTick} tickLine={false} axisLine={false} fontSize={11} minTickGap={16} />
      <YAxis tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={compact} />
      <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatMonthLong(String(v))} />} />
    </>
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      {variant === "bar" ? (
        <BarChart data={rows} margin={{ left: -4, right: 4, top: 4 }}>
          {axes}
          {data.currencies.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {data.currencies.map(c => (
            <Bar key={c} dataKey={c} fill={`var(--color-${c})`} radius={[4, 4, 0, 0]} maxBarSize={20} />
          ))}
        </BarChart>
      ) : (
        <LineChart data={rows} margin={{ left: -4, right: 4, top: 4 }}>
          {axes}
          {data.currencies.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {data.currencies.map(c => (
            <Line key={c} dataKey={c} stroke={`var(--color-${c})`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  );
}
