"use client";

import { memo, useMemo, useState } from "react";
import type { CandlePoint } from "@/lib/api";

type CandleChartProps = {
  data: CandlePoint[];
  emptyText?: string;
};

function CandleChartInner({
  data,
  emptyText = "Waiting for candle history…",
}: CandleChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { min, max } = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 1 };
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const c of data) {
      min = Math.min(min, c.low);
      max = Math.max(max, c.high);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      return { min: 0, max: 1 };
    }
    return { min, max };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-400">
        {emptyText}
      </div>
    );
  }

  const h = 324;
  const w = Math.max(data.length * 16, 640);
  const chartTop = 24;
  const chartBottom = h - 30;
  const chartHeight = chartBottom - chartTop;
  const span = max - min || 1;
  const y = (v: number) => chartTop + ((max - v) / span) * chartHeight;
  const x = (idx: number) => idx * 16 + 16;
  const ticks = Array.from({ length: 5 }, (_, i) => i);
  const hovered = hoverIdx != null ? data[hoverIdx] : null;
  const crossX = hoverIdx != null ? x(hoverIdx) : null;
  const tooltipX =
    hoverIdx != null ? Math.min(Math.max(x(hoverIdx) + 12, 12), w - 170) : null;
  const tooltipY = chartTop + 8;

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b1220] p-2">
      <div className="mb-2 flex items-center justify-between px-2 text-xs text-zinc-400">
        <span>BINANCE-STYLE CANDLES</span>
        {hovered ? (
          <span className="font-mono text-zinc-300">
            O {hovered.open.toFixed(2)} H {hovered.high.toFixed(2)} L{" "}
            {hovered.low.toFixed(2)} C {hovered.close.toFixed(2)}
          </span>
        ) : (
          <span className="text-zinc-500">Hover to inspect OHLC</span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-[320px] w-full"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - rect.left) / rect.width) * w;
          const idx = Math.max(0, Math.min(data.length - 1, Math.round((rel - 16) / 16)));
          setHoverIdx(idx);
        }}
      >
        <rect x={0} y={0} width={w} height={h} fill="#0b1220" />
        {ticks.map((i) => {
          const ratio = i / (ticks.length - 1);
          const py = chartTop + ratio * chartHeight;
          const price = max - ratio * span;
          return (
            <g key={`y-${i}`}>
              <line x1={8} y1={py} x2={w - 48} y2={py} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              <text x={w - 44} y={py + 4} fill="#9ca3af" fontSize={10}>
                {price.toFixed(2)}
              </text>
            </g>
          );
        })}

        {ticks.map((i) => {
          const idx = Math.floor((i / (ticks.length - 1)) * (data.length - 1));
          const px = x(idx);
          return (
            <text key={`x-${i}`} x={px - 10} y={h - 8} fill="#9ca3af" fontSize={10}>
              {data[idx]?.label ?? ""}
            </text>
          );
        })}

        {crossX != null ? (
          <line
            x1={crossX}
            y1={chartTop}
            x2={crossX}
            y2={chartBottom}
            stroke="rgba(34,211,238,0.35)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ) : null}

        {hovered && tooltipX != null ? (
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect
              x={0}
              y={0}
              width={158}
              height={78}
              rx={8}
              fill="rgba(10,15,25,0.92)"
              stroke="rgba(255,255,255,0.18)"
            />
            <text x={8} y={16} fill="#a1a1aa" fontSize={10}>
              {hovered.label}
            </text>
            <text x={8} y={32} fill="#e4e4e7" fontSize={10}>
              O {hovered.open.toFixed(2)}
            </text>
            <text x={84} y={32} fill="#22d3ee" fontSize={10}>
              H {hovered.high.toFixed(2)}
            </text>
            <text x={8} y={48} fill="#fda4af" fontSize={10}>
              L {hovered.low.toFixed(2)}
            </text>
            <text x={84} y={48} fill="#86efac" fontSize={10}>
              C {hovered.close.toFixed(2)}
            </text>
          </g>
        ) : null}

        {data.map((c, idx) => {
          const px = x(idx);
          const yOpen = y(c.open);
          const yClose = y(c.close);
          const yHigh = y(c.high);
          const yLow = y(c.low);
          const top = Math.min(yOpen, yClose);
          const bodyH = Math.max(Math.abs(yOpen - yClose), 1.5);
          const bullish = c.close >= c.open;
          const color = bullish ? "#34d399" : "#fb7185";
          const active = hoverIdx === idx;
          return (
            <g key={c.time}>
              <line x1={px} y1={yHigh} x2={px} y2={yLow} stroke={color} strokeWidth={1.2} />
              <rect
                x={px - 4}
                y={top}
                width={8}
                height={bodyH}
                rx={1}
                fill={bullish ? "rgba(52,211,153,0.62)" : "rgba(251,113,133,0.62)"}
                stroke={color}
                strokeWidth={active ? 1.4 : 0.8}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const CandleChart = memo(CandleChartInner);
