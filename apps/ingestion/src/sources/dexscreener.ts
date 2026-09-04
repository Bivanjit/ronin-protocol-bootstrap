import { z } from 'zod';

const DexPairSchema = z.object({
  chainId: z.string(),
  dexId: z.string().optional(),
  url: z.string().optional(),
  pairAddress: z.string(),
  baseToken: z.object({ address: z.string(), name: z.string().optional(), symbol: z.string().optional() }),
  quoteToken: z.object({ address: z.string(), name: z.string().optional(), symbol: z.string().optional() }).optional(),
  priceUsd: z.string().optional(),
  volume: z.object({ m5: z.number().optional(), h1: z.number().optional(), h24: z.number().optional() }).optional(),
  priceChange: z.object({ m5: z.number().optional(), h1: z.number().optional(), h24: z.number().optional() }).optional(),
  liquidity: z.object({ usd: z.number().optional() }).optional(),
});

export interface DexScreenerClient {
  getPairsByToken(mintAddress: string): Promise<{ pairs: unknown[]; observedAt: Date; raw: unknown }>;
}

export function createDexScreenerClient(baseUrl: string): DexScreenerClient {
  return {
    async getPairsByToken(mintAddress) {
      const observedAt = new Date();
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/tokens/v1/solana/${encodeURIComponent(mintAddress)}`);
      if (!response.ok) throw new Error(`DexScreener request failed: ${response.status}`);
      const raw = await response.json();
      const pairs = Array.isArray(raw) ? raw : Array.isArray(raw?.pairs) ? raw.pairs : [];
      const validated = pairs.filter((pair) => {
        const result = DexPairSchema.safeParse(pair);
        return result.success && result.data.chainId === 'solana';
      });
      return { pairs: validated, observedAt, raw };
    },
  };
}

export { DexPairSchema };
