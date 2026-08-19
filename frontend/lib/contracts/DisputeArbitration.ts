import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Agreement, TransactionReceipt } from "./types";
import {
  estimateWriteFeePreset,
  feePresetToTransactionFees,
  type FeePresetEstimate,
  type FeePresetLevel,
} from "../genlayer/fees";

/**
 * DisputeArbitration contract class for interacting with the GenLayer
 * Dispute Arbitration contract.
 */
class DisputeArbitration {
  private contractAddress: `0x${string}`;
  private client: any;
  private studioUrl?: string;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.studioUrl = studioUrl;

    const config: any = {
      chain: studionet,
    };

    if (address) {
      config.account = address as `0x${string}`;
    }

    if (studioUrl) {
      config.endpoint = studioUrl;
    }

    this.client = createClient(config);
  }

  /**
   * Update the address used for transactions
   */
  updateAccount(address: string): void {
    const config: any = {
      chain: studionet,
      account: address as `0x${string}`,
    };

    if (this.studioUrl) {
      config.endpoint = this.studioUrl;
    }

    this.client = createClient(config);
  }

  async estimateCreateAgreementFees(
    agreementId: string,
    partyB: string,
    terms: string,
    amount: string,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(
      this.client,
      {
        address: this.contractAddress,
        functionName: "create_agreement",
        args: [agreementId, partyB, terms, amount],
      },
      level,
    );
  }

  async estimateRaiseDisputeFees(
    agreementId: string,
    evidence: string,
    evidenceUrl: string,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(
      this.client,
      {
        address: this.contractAddress,
        functionName: "raise_dispute",
        args: [agreementId, evidence, evidenceUrl],
      },
      level,
    );
  }

  async estimateResolveDisputeFees(
    agreementId: string,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(
      this.client,
      {
        address: this.contractAddress,
        functionName: "resolve_dispute",
        args: [agreementId],
      },
      level,
    );
  }

  /**
   * Get full details for every agreement.
   */
  async getAllAgreements(): Promise<Agreement[]> {
    try {
      const agreements: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_all_agreements",
        args: [],
      });

      if (agreements instanceof Map) {
        return Array.from(agreements.entries()).map(([id, data]: any) => {
          const obj: Record<string, any> = Array.from((data as any).entries()).reduce(
            (acc: Record<string, any>, [key, value]: any) => {
              acc[key] = value;
              return acc;
            },
            {},
          );
          return { id, ...obj } as Agreement;
        });
      }

      return [];
    } catch (error) {
      console.error("Error fetching agreements:", error);
      throw new Error("Failed to fetch agreements from contract");
    }
  }

  /**
   * Create a new agreement.
   */
  async createAgreement(
    agreementId: string,
    partyB: string,
    terms: string,
    amount: string,
    feePreset?: FeePresetEstimate
  ): Promise<TransactionReceipt> {
    try {
      const fees = feePresetToTransactionFees(feePreset);
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "create_agreement",
        args: [agreementId, partyB, terms, amount],
        value: BigInt(0),
        ...(fees ? { fees } : {}),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error creating agreement:", error);
      throw new Error("Failed to create agreement");
    }
  }

  /**
   * Raise a dispute on an agreement, with evidence.
   */
  async raiseDispute(
    agreementId: string,
    evidence: string,
    evidenceUrl: string
  ): Promise<TransactionReceipt> {
    try {
      const feePreset = await this.estimateRaiseDisputeFees(agreementId, evidence, evidenceUrl);
      const fees = feePresetToTransactionFees(feePreset);
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "raise_dispute",
        args: [agreementId, evidence, evidenceUrl],
        value: BigInt(0),
        ...(fees ? { fees } : {}),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error raising dispute:", error);
      throw new Error("Failed to raise dispute");
    }
  }

  /**
   * Resolve a disputed agreement — triggers the LLM-judged, consensus verdict.
   */
  async resolveDispute(agreementId: string): Promise<TransactionReceipt> {
    try {
      const feePreset = await this.estimateResolveDisputeFees(agreementId);
      const fees = feePresetToTransactionFees(feePreset);
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "resolve_dispute",
        args: [agreementId],
        value: BigInt(0),
        ...(fees ? { fees } : {}),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error resolving dispute:", error);
      throw new Error("Failed to resolve dispute");
    }
  }
}

export default DisputeArbitration;
