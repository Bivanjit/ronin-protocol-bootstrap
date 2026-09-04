import { describe, expect, it } from 'vitest';
import { normalizeDexPair } from '../src/normalizers/market.js';

const fixture = {
  chainId: 'solana',
  dexId: 'raydium',
  pairAddress: 'PAIR123',
  baseToken: { address: 'TOKEN123', name: 'Test', symbol: 'TST' },
  quoteToken: { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
  priceUsd: '1.25',
  volume: { m5: 1000, h1: 12000, h24: 50000 },
  priceChange: { m5: 1.2, h1: 4.5, h24: 18.3 },
  liquidity: { usd: 75000 },
};

describe('DexScreener normalization', () => {
  it('normalizes a raw pair into the Ronin observation model', () => {
    const observedAt = new Date('2026-09-04T08:00:00.000Z');
    const result = normalizeDexPair(fixture, observedAt);
    expect(result.source).toBe('dexscreener');
    expect(result.mintAddress).toBe('TOKEN123');
    expect(result.marketAddress).toBe('PAIR123');
    expect(result.priceUsd).toBe('1.25');
    expect(result.liquidityUsd).toBe('75000');
    expect(result.volume1hUsd).toBe('12000');
    expect(result.observedAt).toEqual(observedAt);
  });
});
