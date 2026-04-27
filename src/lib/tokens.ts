export const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDC: "usd-coin",
} as const;

export const BINANCE_STREAM_SYMBOLS = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  USDC: "usdcusdt",
} as const;

export type CryptoToken = keyof typeof COINGECKO_IDS;

export function isCryptoToken(value: string): value is CryptoToken {
  return value in COINGECKO_IDS;
}
