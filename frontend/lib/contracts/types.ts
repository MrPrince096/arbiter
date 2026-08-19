/**
 * TypeScript types for the GenLayer Dispute Arbitration contract
 */

export interface Agreement {
  id: string;
  party_a: string;
  party_b: string;
  terms: string;
  amount: string;
  status: "open" | "disputed" | "resolved";
  evidence?: string;
  evidence_url?: string;
  verdict_winner?: "party_a" | "party_b" | "";
  verdict_reasoning?: string;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}
