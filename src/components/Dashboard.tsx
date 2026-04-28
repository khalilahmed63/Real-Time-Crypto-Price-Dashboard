"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type CandleRange,
  type ChartTimeframe,
  useCryptoPrice,
} from "@/hooks/useCryptoPrice";
import type { CryptoToken } from "@/lib/tokens";
import { Chart } from "@/components/Chart";
import { CandleChart } from "@/components/CandleChart";
import { PriceCard } from "@/components/PriceCard";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { TokenSelector } from "@/components/TokenSelector";

type MarketPanelProps = {
  token: CryptoToken;
  timeframe: ChartTimeframe;
  candleRange: CandleRange;
  onCandleRangeChange: (range: CandleRange) => void;
};

const CANDLE_RANGE_BADGES: { id: CandleRange; label: string }[] = [
  { id: "1min", label: "1min" },
  { id: "1h", label: "1h" },
  { id: "4h", label: "4h" },
  { id: "1d", label: "1d" },
  { id: "1w", label: "1w" },
  { id: "1mo", label: "1m" },
  { id: "1y", label: "1y" },
];

function MarketPanel({
  token,
  timeframe,
  candleRange,
  onCandleRangeChange,
}: MarketPanelProps) {
  const {
    price,
    change24h,
    volume24h,
    marketCap,
    name,
    candleHistory,
    wsConnected,
    loading,
    error,
  } =
    useCryptoPrice(token, { binanceStream: true, timeframe, candleRange });

  const lineSeries = useMemo(
    () => {
      const lastIdx = candleHistory.length - 1;
      const now = Date.now();
      return candleHistory.map((c, idx) => ({
        // Show active candle on the current date/time in line chart.
        time: idx === lastIdx ? Math.max(c.time, now) : c.time,
        label: c.label,
        price: c.close,
      }));
    },
    [candleHistory, price]
  );

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100"
      >
        <p className="font-medium">Could not load data</p>
        <p className="mt-1 text-rose-200/80">{error}</p>
        <p className="mt-3 text-xs text-rose-200/60">
          Binance stream is temporarily unavailable. The app will retry
          automatically in a few seconds.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <PriceCard
          symbol={token}
          name={name}
          price={price}
          change24h={change24h}
          volume24h={volume24h}
          marketCap={marketCap}
          loading={loading}
        />
      </div>

      {/* <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-300">Price history</h2>
          <span className="text-xs text-zinc-500">WebSocket only</span>
        </div>
        {loading && history.length === 0 ? (
          <div
            className="flex h-[320px] w-full items-center justify-center rounded-xl border border-white/5 bg-white/3"
            aria-hidden
          >
            <div className="h-48 w-full max-w-md animate-pulse rounded-lg bg-white/10" />
          </div>
        ) : (
          <Chart data={history} accent={accent} />
        )}
      </div> */}

      {/* <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-300">
            Intraday change trend
          </h2>
          <span className="text-xs text-zinc-500">
            Baseline: first point in current window
          </span>
        </div>
        {loading && history.length === 0 ? (
          <div
            className="flex h-[320px] w-full items-center justify-center rounded-xl border border-white/5 bg-white/3"
            aria-hidden
          >
            <div className="h-48 w-full max-w-md animate-pulse rounded-lg bg-white/10" />
          </div>
        ) : (
          <Chart
            data={changeSeries}
            accent={change24h != null && change24h < 0 ? "#fb7185" : "#34d399"}
            valueKey="changePct"
            valueLabel="Change"
            yTickFormatter={(v) =>
              typeof v === "number" ? `${v.toFixed(2)}%` : String(v)
            }
            tooltipFormatter={(v) =>
              typeof v === "number" ? formatPercent(v) : String(v)
            }
            emptyText="Waiting for trend samples…"
          />
        )}
      </div> */}

      <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-zinc-300">
            Direct WebSocket tick chart
          </h2>
          <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
            {CANDLE_RANGE_BADGES.map((range) => {
              const active = range.id === candleRange;
              return (
                <button
                  key={`line-${range.id}`}
                  type="button"
                  onClick={() => onCandleRangeChange(range.id)}
                  className={[
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-cyan-500/25 text-cyan-200"
                      : "text-zinc-400 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
          <span
            className={`text-xs ${wsConnected ? "text-emerald-300" : "text-zinc-500"}`}
          >
            {wsConnected ? "Connected (Binance WS)" : "Disconnected"}
          </span>
        </div>
        <Chart
          data={lineSeries}
          accent="#22d3ee"
          valueLabel="WS price"
          emptyText="Waiting for direct WebSocket ticks…"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Candlestick chart</h2>
          <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
            {CANDLE_RANGE_BADGES.map((range) => {
              const active = range.id === candleRange;
              return (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => onCandleRangeChange(range.id)}
                  className={[
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-violet-500/25 text-violet-200"
                      : "text-zinc-400 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>
        <CandleChart data={candleHistory} />
      </div>
    </>
  );
}

export function Dashboard() {
  const [token, setToken] = useState<CryptoToken>("BTC");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("live");
  const [candleRange, setCandleRange] = useState<CandleRange>("1d");

  const onToken = useCallback((t: CryptoToken) => setToken(t), []);
  const onTf = useCallback((tf: ChartTimeframe) => setTimeframe(tf), []);

  const panelKey = `${token}-${timeframe}-ws`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">
          Live markets
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Crypto price dashboard
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">
          Binance websocket price stream with a rolling 20-point chart.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TokenSelector value={token} onChange={onToken} />
        {/* <TimeframeSelector value={timeframe} onChange={onTf} /> */}
      </div>

      <MarketPanel
        key={`${panelKey}-${candleRange}`}
        token={token}
        timeframe={timeframe}
        candleRange={candleRange}
        onCandleRangeChange={setCandleRange}
      />
    </div>
  );
}
