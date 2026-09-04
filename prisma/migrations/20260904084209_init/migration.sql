-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT,
    "decimals" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "marketAddress" TEXT NOT NULL,
    "baseMint" TEXT,
    "quoteMint" TEXT,
    "dexId" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketObservation" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "priceUsd" DECIMAL(38,18),
    "liquidityUsd" DECIMAL(38,8),
    "volume5mUsd" DECIMAL(38,8),
    "volume1hUsd" DECIMAL(38,8),
    "volume24hUsd" DECIMAL(38,8),
    "priceChange5mPercent" DECIMAL(20,8),
    "priceChange1hPercent" DECIMAL(20,8),
    "priceChange24hPercent" DECIMAL(20,8),
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawSourceRecord" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_mintAddress_key" ON "Token"("mintAddress");

-- CreateIndex
CREATE INDEX "Market_tokenId_idx" ON "Market"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Market_source_marketAddress_key" ON "Market"("source", "marketAddress");

-- CreateIndex
CREATE INDEX "MarketObservation_marketId_observedAt_idx" ON "MarketObservation"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "MarketObservation_source_observedAt_idx" ON "MarketObservation"("source", "observedAt");

-- CreateIndex
CREATE INDEX "RawSourceRecord_source_resourceType_resourceKey_observedAt_idx" ON "RawSourceRecord"("source", "resourceType", "resourceKey", "observedAt");

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketObservation" ADD CONSTRAINT "MarketObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
