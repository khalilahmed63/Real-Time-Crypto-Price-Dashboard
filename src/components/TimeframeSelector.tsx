"use client";

import { memo } from "react";
import type { ChartTimeframe } from "@/hooks/useCryptoPrice";

const OPTIONS: { id: ChartTimeframe; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
];

type TimeframeSelectorProps = {
  value: ChartTimeframe;
  onChange: (tf: ChartTimeframe) => void;
  disabled?: boolean;
};

function TimeframeSelectorInner({
  value,
  onChange,
  disabled,
}: TimeframeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Chart
      </span>
      <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
        {OPTIONS.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.id)}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-violet-500/25 text-violet-200"
                  : "text-zinc-400 hover:text-zinc-200",
                disabled ? "opacity-50" : "",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const TimeframeSelector = memo(TimeframeSelectorInner);
