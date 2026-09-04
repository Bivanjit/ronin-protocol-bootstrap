import { z } from "zod";

const HeliusTransactionSchema = z.object({
  slot: z.number().optional(),
  blockTime: z.number().nullable().optional(),
  transaction: z.object({
    signatures: z.array(z.string()).optional(),
    message: z.unknown().optional(),
  }).optional(),
  meta: z.unknown().nullable().optional(),
});

const HeliusResponseSchema = z.object({
  result: z.object({
    data: z.array(HeliusTransactionSchema),
    paginationToken: z.string().optional(),
  }),
});

export type HeliusTransaction = z.infer<typeof HeliusTransactionSchema>;

export interface HeliusTransactionsResult {
  data: HeliusTransaction[];
  paginationToken?: string;
}

export function createHeliusClient(apiKey: string) {
  const endpoint = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  return {
    async getTransactionsForAddress(
      address: string,
      limit = 100,
    ): Promise<HeliusTransactionsResult> {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "ronin-helius",
          method: "getTransactionsForAddress",
          params: [
            address,
            {
              transactionDetails: "full",
              limit,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Helius request failed: ${response.status} ${response.statusText}`,
        );
      }

      const json: unknown = await response.json();

      const parsed = HeliusResponseSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error(
          `Invalid Helius response: ${parsed.error.message}`,
        );
      }

      return parsed.data.result;
    },
  };
}