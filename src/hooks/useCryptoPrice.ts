"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CandlePoint,
  type NormalizedMarket,
  type PricePoint,
} from "@/lib/api";
import { formatChartTime } from "@/lib/format";
import {
  BINANCE_STREAM_SYMBOLS,
  type CryptoToken,
} from "@/lib/tokens";

export const POLL_INTERVAL_MS = 5000;
const HISTORY_WINDOW_MS = 12 * 60 * 60 * 1000;

export type ChartTimeframe = "live" | "1m" | "5m" | "15m";

const TIMEFRAME_MS: Record<Exclude<ChartTimeframe, "live">, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
};

const BINANCE_CHART_THROTTLE_MS = 2000;
const BINANCE_WS_CHART_THROTTLE_MS = 5000;
const WS_RETRY_DELAYS_MS = [1000, 2000, 5000, 10000];
const BINANCE_REST_BASES = [
  "https://api.binance.com/api/v3",
  "https://data-api.binance.vision/api/v3",
];
export type CandleRange = "1min" | "1h" | "4h" | "1d" | "1w" | "1mo" | "1y";

const CANDLE_RANGE_CONFIG: Record<
  CandleRange,
  { interval: string; intervalMs: number; limit: number }
> = {
  "1min": { interval: "1m", intervalMs: 60_000, limit: 60 },
  "1h": { interval: "1m", intervalMs: 60_000, limit: 60 },
  "4h": { interval: "5m", intervalMs: 300_000, limit: 48 },
  "1d": { interval: "30m", intervalMs: 1_800_000, limit: 48 },
  "1w": { interval: "4h", intervalMs: 14_400_000, limit: 42 },
  "1mo": { interval: "1d", intervalMs: 86_400_000, limit: 30 },
  "1y": { interval: "1w", intervalMs: 604_800_000, limit: 52 },
};

function candleLabelGranularity(intervalMs: number) {
  if (intervalMs >= 604_800_000) return "week" as const;
  if (intervalMs >= 86_400_000) return "day" as const;
  if (intervalMs >= 3_600_000) return "hour" as const;
  if (intervalMs >= 60_000) return "minute" as const;
  return "second" as const;
}

export type UseCryptoPriceOptions = {
  /** Binance trade stream for smoother price + chart updates (USDT pairs). */
  binanceStream?: boolean;
  timeframe?: ChartTimeframe;
  candleRange?: CandleRange;
};

export type UseCryptoPriceResult = {
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  name: string | null;
  history: PricePoint[];
  wsHistory: PricePoint[];
  candleHistory: CandlePoint[];
  wsConnected: boolean;
  loading: boolean;
  error: string | null;
  meta: NormalizedMarket | null;
};

function makePoint(price: number, time: number): PricePoint {
  return { time, price, label: formatChartTime(time) };
}

/**
 * Live market data + rolling chart history. Mount with a React `key` when
 * `token`, `timeframe`, or `binanceStream` changes to reset internal state
 * without a reset effect.
 */
export function useCryptoPrice(
  token: CryptoToken,
  options: UseCryptoPriceOptions = {}
): UseCryptoPriceResult {
  const { binanceStream = true, timeframe = "live", candleRange = "1d" } = options;
  const candleCfg = CANDLE_RANGE_CONFIG[candleRange];
  const candleLabelMode = candleLabelGranularity(candleCfg.intervalMs);

  const [meta] = useState<NormalizedMarket | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [wsHistory, setWsHistory] = useState<PricePoint[]>([]);
  const [candleHistory, setCandleHistory] = useState<CandlePoint[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsPrice, setWsPrice] = useState<number | null>(null);

  const lastBucketPushRef = useRef(0);
  const lastBinanceChartRef = useRef(0);
  const lastWsChartRef = useRef(0);
  const historyRef = useRef<PricePoint[]>([]);

  const pushPoint = useCallback((price: number, time: number) => {
    setHistory((prev) => {
      const next = [...prev, makePoint(price, time)].filter(
        (point) => time - point.time <= HISTORY_WINDOW_MS
      );
      historyRef.current = next;
      return next;
    });
  }, []);

  const pushWsPoint = useCallback((price: number, time: number) => {
    setWsHistory((prev) =>
      [...prev, makePoint(price, time)].filter(
        (point) => time - point.time <= HISTORY_WINDOW_MS
      )
    );
  }, []);

  const tryPushBucketed = useCallback(
    (price: number, time: number) => {
      if (timeframe === "live") {
        pushPoint(price, time);
        return;
      }
      const span = TIMEFRAME_MS[timeframe];
      const last = lastBucketPushRef.current;
      if (last === 0 || time - last >= span) {
        lastBucketPushRef.current = time;
        pushPoint(price, time);
      }
    },
    [pushPoint, timeframe]
  );

  useEffect(() => {
    let cancelled = false;
    const symbol = BINANCE_STREAM_SYMBOLS[token].toUpperCase();

    async function preloadCandleHistory() {
      try {
        const params = new URLSearchParams({
          symbol,
          interval: candleCfg.interval,
          limit: String(candleCfg.limit),
        });
        let rows: Array<[number, string, string, string, string, string, number]> =
          [];
        for (const base of BINANCE_REST_BASES) {
          const res = await fetch(`${base}/klines?${params.toString()}`, {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) continue;
          const json = (await res.json()) as Array<
            [number, string, string, string, string, string, number]
          >;
          if (Array.isArray(json) && json.length > 0) {
            rows = json;
            break;
          }
        }
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;

        const points = rows
          .map((row) => {
            const openTime = row[0];
            const closePrice = Number.parseFloat(row[4]);
            return Number.isFinite(openTime) && Number.isFinite(closePrice)
              ? makePoint(closePrice, openTime)
              : null;
          })
          .filter((p): p is PricePoint => p !== null);

        if (points.length === 0) return;
        const candles = rows
          .map((row) => {
            const openTime = row[0];
            const open = Number.parseFloat(row[1]);
            const high = Number.parseFloat(row[2]);
            const low = Number.parseFloat(row[3]);
            const close = Number.parseFloat(row[4]);
            if (![openTime, open, high, low, close].every(Number.isFinite)) {
              return null;
            }
            return {
              time: openTime,
              label: formatChartTime(openTime, candleLabelMode),
              open,
              high,
              low,
              close,
            } satisfies CandlePoint;
          })
          .filter((c): c is CandlePoint => c !== null);

        setHistory(points);
        setWsHistory(points);
        setCandleHistory(candles);
        historyRef.current = points;
        lastBucketPushRef.current = points[points.length - 1]?.time ?? 0;
        lastWsChartRef.current = points[points.length - 1]?.time ?? 0;
        setLoading(false);
      } catch {
        /* best effort preload; realtime stream still runs */
      }
    }

    preloadCandleHistory();
    return () => {
      cancelled = true;
    };
  }, [token, candleCfg.interval, candleCfg.limit]);

  useEffect(() => {
    if (!binanceStream) return;

    const sym = BINANCE_STREAM_SYMBOLS[token];
    const urls = [
      `wss://stream.binance.com:9443/ws/${sym}@trade`,
      `wss://stream.binance.com/ws/${sym}@trade`,
    ];
    let ws: WebSocket | null = null;
    let stopped = false;
    let retryTimer: number | null = null;
    let retryAttempt = 0;
    let urlIndex = 0;

    const scheduleReconnect = () => {
      if (stopped) return;
      const delay =
        WS_RETRY_DELAYS_MS[Math.min(retryAttempt, WS_RETRY_DELAYS_MS.length - 1)];
      retryAttempt += 1;
      retryTimer = window.setTimeout(() => {
        urlIndex = (urlIndex + 1) % urls.length;
        connect();
      }, delay);
    };

    const connect = () => {
      if (stopped) return;
      try {
        ws = new WebSocket(urls[urlIndex]);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        if (stopped) return;
        retryAttempt = 0;
        setWsConnected(true);
        setError(null);
      };

      ws.onmessage = (ev) => {
        if (stopped) return;
        try {
          const msg = JSON.parse(ev.data as string) as { p?: string };
          const p = msg.p != null ? Number.parseFloat(msg.p) : Number.NaN;
          if (!Number.isFinite(p)) return;
          setWsPrice(p);
          setLoading(false);
          setError(null);
          const now = Date.now();
          const bucket =
            Math.floor(now / candleCfg.intervalMs) * candleCfg.intervalMs;
          setCandleHistory((prev) => {
            const within = prev.filter(
              (c) => now - c.time <= candleCfg.intervalMs * candleCfg.limit
            );
            const last = within[within.length - 1];
            if (!last || last.time !== bucket) {
              return [
                ...within,
                {
                  time: bucket,
                  label: formatChartTime(bucket, candleLabelMode),
                  open: p,
                  high: p,
                  low: p,
                  close: p,
                },
              ];
            }
            const next = [...within];
            next[next.length - 1] = {
              ...last,
              // Keep the active candle visually aligned with live time.
              label: formatChartTime(now, candleLabelMode),
              high: Math.max(last.high, p),
              low: Math.min(last.low, p),
              close: p,
            };
            return next;
          });
          if (now - lastWsChartRef.current >= BINANCE_WS_CHART_THROTTLE_MS) {
            lastWsChartRef.current = now;
            pushWsPoint(p, now);
          }
          if (timeframe === "live") {
            if (now - lastBinanceChartRef.current >= BINANCE_CHART_THROTTLE_MS) {
              lastBinanceChartRef.current = now;
              pushPoint(p, now);
            }
          } else {
            tryPushBucketed(p, now);
          }
        } catch {
          /* ignore malformed */
        }
      };

      ws.onerror = () => {
        if (stopped) return;
        setWsConnected(false);
      };

      ws.onclose = () => {
        if (stopped) return;
        setWsConnected(false);
        setLoading(false);
        setError("WebSocket disconnected. Reconnecting...");
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer != null) {
        window.clearTimeout(retryTimer);
      }
      setWsConnected(false);
      ws?.close();
    };
  }, [
    binanceStream,
    token,
    pushPoint,
    pushWsPoint,
    tryPushBucketed,
    timeframe,
    candleCfg.intervalMs,
    candleCfg.limit,
    candleLabelMode,
  ]);

  const price =
    binanceStream && wsPrice != null
      ? wsPrice
      : meta?.price != null
        ? meta.price
        : null;

  return {
    price,
    change24h: meta?.change24h ?? null,
    volume24h: meta?.volume24h ?? null,
    marketCap: meta?.marketCap ?? null,
    name: meta?.name ?? null,
    history,
    wsHistory,
    candleHistory,
    wsConnected,
    loading,
    error,
    meta,
  };
}
