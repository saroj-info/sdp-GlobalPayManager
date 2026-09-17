/**
 * Workforce by country — horizontal stacked bar (employees + contractors).
 * Countries beyond the top 8 fold into an "Other" row so the chart stays
 * readable at any tenant size.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users } from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CountryWorkforce } from "@shared/dashboard";
import { EmptyState } from "./empty-state";

const MAX_ROWS = 8;

const config = {
  employees: { label: "Employees", color: "var(--chart-1)" },
  contractors: { label: "Contractors", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function WorkforceByCountryChart({ data }: { data: CountryWorkforce[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[280px]">
        <EmptyState icon={Users} message="No workers yet" />
      </div>
    );
  }

  const top = data.slice(0, MAX_ROWS);
  const rest = data.slice(MAX_ROWS);
  const rows = rest.length === 0 ? top : [
    ...top,
    rest.reduce(
      (acc, c) => ({
        ...acc,
        employees: acc.employees + c.employees,
        contractors: acc.contractors + c.contractors,
        total: acc.total + c.total,
      }),
      { countryId: null, countryName: "Other", employees: 0, contractors: 0, total: 0 } as CountryWorkforce,
    ),
  ];

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8, top: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="countryName"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={96}
          interval={0}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="employees" stackId="a" fill="var(--color-employees)" maxBarSize={18} />
        <Bar dataKey="contractors" stackId="a" fill="var(--color-contractors)" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}
