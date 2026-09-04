import 'dotenv/config';
import { createDexScreenerClient } from './sources/dexscreener.js';
import { normalizeDexPair } from './normalizers/market.js';
import { prisma } from './db/prisma.js';

const mintAddress = process.argv[2];
if (!mintAddress) {
  console.error('Usage: pnpm ingestion:once <SOLANA_TOKEN_MINT>');
  process.exit(1);
}

const baseUrl = process.env.DEXSCREENER_API_BASE_URL;
if (!baseUrl) throw new Error('DEXSCREENER_API_BASE_URL is required');

const client = createDexScreenerClient(baseUrl);

try {
  const result = await client.getPairsByToken(mintAddress);
  console.log(`[RONIN] fetched ${result.pairs.length} Solana pairs`);

  await Promise.all(result.pairs.map(async (pair) => {
    const normalized = normalizeDexPair(pair, result.observedAt);
    const token = await prisma.token.upsert({
      where: { mintAddress: normalized.mintAddress },
      create: { mintAddress: normalized.mintAddress, symbol: normalized.symbol, name: normalized.name },
      update: { symbol: normalized.symbol, name: normalized.name },
    });
    const market = await prisma.market.upsert({
      where: { source_marketAddress: { source: normalized.source, marketAddress: normalized.marketAddress } },
      create: {
        tokenId: token.id,
        marketAddress: normalized.marketAddress,
        baseMint: normalized.baseMint,
        quoteMint: normalized.quoteMint,
        dexId: normalized.dexId,
        source: normalized.source,
      },
      update: { tokenId: token.id, baseMint: normalized.baseMint, quoteMint: normalized.quoteMint, dexId: normalized.dexId },
    });
    await prisma.rawSourceRecord.create({
      data: {
        source: normalized.source,
        resourceType: normalized.resourceType,
        resourceKey: normalized.resourceKey,
        payloadJson: normalized.raw as object,
        observedAt: normalized.observedAt,
      },
    });
    const observation = await prisma.marketObservation.create({
      data: {
        marketId: market.id,
        source: normalized.source,
        priceUsd: normalized.priceUsd,
        liquidityUsd: normalized.liquidityUsd,
        volume5mUsd: normalized.volume5mUsd,
        volume1hUsd: normalized.volume1hUsd,
        volume24hUsd: normalized.volume24hUsd,
        priceChange5mPercent: normalized.priceChange5mPercent,
        priceChange1hPercent: normalized.priceChange1hPercent,
        priceChange24hPercent: normalized.priceChange24hPercent,
        observedAt: normalized.observedAt,
      },
    });
    console.log(`✓ ${normalized.symbol ?? normalized.mintAddress} ${normalized.marketAddress} → observation ${observation.id}`);
  }));
} finally {
  await prisma.$disconnect();
}
