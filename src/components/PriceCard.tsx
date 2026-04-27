"use client";

import { memo, useEffect, useRef, useState } from "react";
import { formatCompactUsd, formatPercent, formatUsd } from "@/lib/format";

type PriceDirection = "up" | "down" | "flat";

type PriceCardProps = {
  symbol: string;
  name: string | null;
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  loading: boolean;
};

function PriceCardInner({
  symbol,
  name,
  price,
  change24h,
  volume24h,
  marketCap,
  loading,
}: PriceCardProps) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState<PriceDirection>("flat");

  useEffect(() => {
    if (price == null || loading) return;
    const p = prev.current;
    prev.current = price;
    if (p == null) return;
    if (price > p) setFlash("up");
    else if (price < p) setFlash("down");
    else setFlash("flat");
    const t = window.setTimeout(() => setFlash("flat"), 600);
    return () => window.clearTimeout(t);
  }, [price, loading]);

  const positive = change24h != null && change24h >= 0;
  const changeColor = positive ? "text-emerald-400" : "text-rose-400";
  const flashClass =
    flash === "up"
      ? "ring-emerald-400/40"
      : flash === "down"
        ? "ring-rose-400/40"
        : "ring-transparent";

  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-xl backdrop-blur-xl transition-[box-shadow] duration-300",
        "ring-2",
        flashClass,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {name ?? symbol}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-white tabular-nums sm:text-4xl">
            {loading && price == null ? (
              <span className="inline-block h-9 w-40 animate-pulse rounded-lg bg-white/10" />
            ) : price != null ? (
              <span className="inline-flex items-baseline gap-2">
                {formatUsd(price)}
                <span
                  className={[
                    "text-lg font-medium transition-transform duration-300",
                    flash === "up" ? "translate-y-[-2px] text-emerald-400" : "",
                    flash === "down" ? "translate-y-[2px] text-rose-400" : "",
                    flash === "flat" ? "opacity-0" : "opacity-100",
                  ].join(" ")}
                  aria-hidden
                >
                  {flash === "up" ? "▲" : flash === "down" ? "▼" : ""}
                </span>
              </span>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">24h change</p>
          {loading && change24h == null ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded-md bg-white/10" />
          ) : change24h != null ? (
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${changeColor}`}
            >
              {formatPercent(change24h)}
            </p>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-zinc-500">—</p>
          )}
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-zinc-500">24h volume</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-200 tabular-nums">
            {loading && volume24h == null ? (
              <span className="inline-block h-5 w-28 animate-pulse rounded bg-white/10" />
            ) : volume24h != null ? (
              formatCompactUsd(volume24h)
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Market cap</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-200 tabular-nums">
            {loading && marketCap == null ? (
              <span className="inline-block h-5 w-28 animate-pulse rounded bg-white/10" />
            ) : marketCap != null ? (
              formatCompactUsd(marketCap)
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export const PriceCard = memo(PriceCardInner);
