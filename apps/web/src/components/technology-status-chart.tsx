import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type TechnologyStatusChartProps = {
  items: Array<{ status: string }>;
};

const chartConfig = {
  count: {
    label: "Technology decisions",
    color: "var(--accent)",
  },
} satisfies ChartConfig;

export function TechnologyStatusChart({ items }: TechnologyStatusChartProps) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.status, (counts.get(item.status) || 0) + 1);
  const data = [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count || left.status.localeCompare(right.status));

  return (
    <ChartContainer className="h-[220px] w-full aspect-auto" config={chartConfig}>
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={9} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 2, 2]} />
      </BarChart>
    </ChartContainer>
  );
}
