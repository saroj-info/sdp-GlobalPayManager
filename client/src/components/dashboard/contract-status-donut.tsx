/**
 * Contracts-by-status donut with a center total and a labeled count legend.
 * Slice colors are fixed per status (color follows the entity), slices render
 * in lifecycle order, and every slice is named with its count in the legend —
 * identity never rides on color alone.
 */

import { PieChart, Pie, Cell, Label } from "recharts";
import { FileText } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getContractStatusLabel } from "@shared/contractHelpers";
import type { StatusCount } from "@shared/dashboard";
import { EmptyState } from "./empty-state";
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_ORDER } from "./use-dashboard-summary";

export function ContractStatusDonut({ data }: { data: StatusCount[] }) {
  const ordered = [
    ...CONTRACT_STATUS_ORDER.filter(s => data.some(d => d.status === s)),
    ...data.map(d => d.status).filter(s => !CONTRACT_STATUS_ORDER.includes(s)),
  ].map(status => ({
    status,
    label: getContractStatusLabel(status),
    count: data.find(d => d.status === status)?.count ?? 0,
    color: CONTRACT_STATUS_COLOR[status] ?? "var(--chart-5)",
  })).filter(d => d.count > 0);

  const total = ordered.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="h-[280px]">
        <EmptyState icon={FileText} message="No contracts yet" />
      </div>
    );
  }

  const config: ChartConfig = Object.fromEntries(
    ordered.map(d => [d.status, { label: d.label, color: d.color }]),
  );

  return (
    <div>
      <ChartContainer config={config} className="aspect-auto h-[190px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
          <Pie
            data={ordered}
            dataKey="count"
            nameKey="status"
            innerRadius={58}
            outerRadius={85}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {ordered.map(d => (
              <Cell key={d.status} fill={d.color} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && viewBox.cx != null && viewBox.cy != null) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} className="fill-foreground text-2xl font-semibold">
                        {total}
                      </tspan>
                      <tspan x={viewBox.cx} dy={18} className="fill-muted-foreground text-[11px]">
                        contracts
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {ordered.map(d => (
          <div key={d.status} className="flex items-center justify-between text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="font-medium tabular-nums">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
