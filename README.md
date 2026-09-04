# Ronin Protocol

Solana-first on-chain intelligence and data aggregation platform.

## Current milestone

STEP 1.1 — Source → raw record → normalized observation → durable database record.

Initial source roles:
- DexScreener: primary market/pair/liquidity/volume data
- Birdeye: market/token/trading data
- Solana RPC / Helius: on-chain transactions and wallet activity
- Solscan: secondary on-chain verification
- Etherscan: future Ethereum support only

## Development

Requirements:
- Node.js 22+
- pnpm 10+
- PostgreSQL 16+

Copy `.env.example` to `.env`, set `DATABASE_URL`, then run the Prisma migration workflow.

No secrets belong in Git.
