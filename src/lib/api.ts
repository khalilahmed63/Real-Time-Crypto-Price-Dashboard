export type PricePoint = {
  time: number;
  price: number;
  label: string;
};

export type NormalizedMarket = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
};
