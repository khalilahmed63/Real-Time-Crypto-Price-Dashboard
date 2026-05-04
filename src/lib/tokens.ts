export const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  AVAX: "avalanche-2",
  DOT: "polkadot",
} as const;

export const BINANCE_STREAM_SYMBOLS = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  BNB: "bnbusdt",
  SOL: "solusdt",
  XRP: "xrpusdt",
  ADA: "adausdt",
  DOGE: "dogeusdt",
  TRX: "trxusdt",
  AVAX: "avaxusdt",
  DOT: "dotusdt",
} as const;

export type CryptoToken = keyof typeof COINGECKO_IDS;

/** Display order in the token picker (top-10 style list, no stablecoins). */
export const CRYPTO_TOKEN_ORDER: readonly CryptoToken[] = [
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "TRX",
  "AVAX",
  "DOT",
];

export function isCryptoToken(value: string): value is CryptoToken {
  return value in COINGECKO_IDS;
}
