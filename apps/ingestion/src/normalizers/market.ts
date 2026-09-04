import { DexPairSchema } from '../sources/dexscreener.js';
import type { NormalizedMarketData } from '../types/market.js';

export function normalizeDexPair(pair: unknown, observedAt: Date): NormalizedMarketData {
  const p = DexPairSchema.parse(pair);
  return {
    source: 'dexscreener',
    resourceType: 'pair',
    resourceKey: p.pairAddress,
    mintAddress: p.baseToken.address,
    symbol: p.baseToken.symbol,
    name: p.baseToken.name,
    marketAddress: p.pairAddress,
    baseMint: p.baseToken.address,
    quoteMint: p.quoteToken?.address,
    dexId: p.dexId,
    priceUsd: p.priceUsd,
    liquidityUsd: p.liquidity?.usd?.toString(),
    volume5mUsd: p.volume?.m5?.toString(),
    volume1hUsd: p.volume?.h1?.toString(),
    volume24hUsd: p.volume?.h24?.toString(),
    priceChange5mPercent: p.priceChange?.m5?.toString(),
    priceChange1hPercent: p.priceChange?.h1?.toString(),
    priceChange24hPercent: p.priceChange?.h24?.toString(),
    observedAt,
    raw: pair,
  };
}
