"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type NormalizedMarket, type PricePoint } from "@/lib/api";
import { formatChartTime } from "@/lib/format";
import {
  BINANCE_STREAM_SYMBOLS,
  type CryptoToken,
} from "@/lib/tokens";

export const POLL_INTERVAL_MS = 5000;
export const MAX_HISTORY_POINTS = 24;
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
const BINANCE_REST_BASE = "https://api.binance.com/api/v3";
const PRELOAD_INTERVAL = "30m";

export type UseCryptoPriceOptions = {
  /** Binance trade stream for smoother price + chart updates (USDT pairs). */
  binanceStream?: boolean;
  timeframe?: ChartTimeframe;
};

export type UseCryptoPriceResult = {
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  name: string | null;
  history: PricePoint[];
  wsHistory: PricePoint[];
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
  const { binanceStream = true, timeframe = "live" } = options;

  const [meta] = useState<NormalizedMarket | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [wsHistory, setWsHistory] = useState<PricePoint[]>([]);
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

    async function preload12hHistory() {
      try {
        const params = new URLSearchParams({
          symbol,
          interval: PRELOAD_INTERVAL,
          limit: String(MAX_HISTORY_POINTS),
        });
        const res = await fetch(
          `${BINANCE_REST_BASE}/klines?${params.toString()}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
          }
        );
        if (!res.ok) return;
        const rows = (await res.json()) as Array<
          [number, string, string, string, string, string, number]
        >;
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
        setHistory(points);
        setWsHistory(points);
        historyRef.current = points;
        lastBucketPushRef.current = points[points.length - 1]?.time ?? 0;
        lastWsChartRef.current = points[points.length - 1]?.time ?? 0;
        setLoading(false);
      } catch {
        /* best effort preload; realtime stream still runs */
      }
    }

    preload12hHistory();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
  }, [binanceStream, token, pushPoint, pushWsPoint, tryPushBucketed, timeframe]);

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
    wsConnected,
    loading,
    error,
    meta,
  };
}
