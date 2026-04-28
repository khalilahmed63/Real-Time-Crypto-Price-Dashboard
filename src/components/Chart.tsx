"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "@/lib/api";
import { formatChartTime, type ChartLabelGranularity } from "@/lib/format";

type ChartProps = {
  data: PricePoint[];
  accent: string;
  title?: string;
  valueKey?: "price" | "changePct";
  valueLabel?: string;
  yTickFormatter?: (v: number | string) => string;
  tooltipFormatter?: (value: number | string) => string;
  emptyText?: string;
};

function ChartInner({
  data,
  accent,
  title,
  valueKey = "price",
  valueLabel = "Price",
  yTickFormatter,
  tooltipFormatter,
  emptyText = "Waiting for price samples…",
}: ChartProps) {
  const chartData = useMemo(() => data.map((d) => ({ ...d, t: d.time })), [data]);
  const labelMode = useMemo<ChartLabelGranularity>(() => {
    if (chartData.length < 2) return "second";
    const first = chartData[0]?.t ?? 0;
    const last = chartData[chartData.length - 1]?.t ?? 0;
    const spanMs = Math.max(0, last - first);
    if (spanMs >= 1000 * 60 * 60 * 24 * 7) return "week";
    if (spanMs >= 1000 * 60 * 60 * 24) return "day";
    if (spanMs >= 1000 * 60 * 60) return "hour";
    if (spanMs >= 1000 * 60) return "minute";
    return "second";
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full min-w-0">
      {title ? <p className="mb-2 text-xs text-zinc-500">{title}</p> : null}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.08)"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
            tickFormatter={(v) =>
              typeof v === "number" ? formatChartTime(v, labelMode) : String(v)
            }
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v) =>
              yTickFormatter
                ? yTickFormatter(v)
                : typeof v === "number"
                  ? v.toLocaleString()
                  : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              background: "rgba(24,24,27,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              color: "#fafafa",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            labelFormatter={(label) =>
              typeof label === "number"
                ? formatChartTime(label, labelMode)
                : String(label)
            }
            formatter={(value) => {
              const v = value as number | string | undefined;
              const text =
                v == null
                  ? "—"
                  : tooltipFormatter
                    ? tooltipFormatter(v)
                    : typeof v === "number"
                      ? v.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })
                      : v;
              return [text, valueLabel];
            }}
          />
          <Line
            type="monotone"
            dataKey={valueKey}
            stroke={accent}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive
            animationDuration={400}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export const Chart = memo(ChartInner);
