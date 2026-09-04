export interface NormalizedMarketData {
  source: 'dexscreener';
  resourceType: 'pair';
  resourceKey: string;
  mintAddress: string;
  symbol?: string;
  name?: string;
  marketAddress: string;
  baseMint?: string;
  quoteMint?: string;
  dexId?: string;
  priceUsd?: string;
  liquidityUsd?: string;
  volume5mUsd?: string;
  volume1hUsd?: string;
  volume24hUsd?: string;
  priceChange5mPercent?: string;
  priceChange1hPercent?: string;
  priceChange24hPercent?: string;
  observedAt: Date;
  raw: unknown;
}
