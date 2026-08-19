"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import DisputeArbitration from "../contracts/DisputeArbitration";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import type { FeePresetLevel } from "../genlayer/fees";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import type { Agreement } from "../contracts/types";

/**
 * Hook to get the DisputeArbitration contract instance.
 *
 * Returns null if contract address is not configured. Read-only operations
 * work without a connected wallet; write operations require one.
 */
export function useDisputeArbitrationContract(): DisputeArbitration | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  const contract = useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.",
        {
          label: "Setup Guide",
          onClick: () => window.open("/docs/setup", "_blank")
        }
      );
      return null;
    }

    return new DisputeArbitration(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);

  return contract;
}

/**
 * Hook to fetch all agreements. Refetches on window focus and after mutations.
 */
export function useAgreements() {
  const contract = useDisputeArbitrationContract();

  return useQuery<Agreement[], Error>({
    queryKey: ["agreements"],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve([]);
      }
      return contract.getAllAgreements();
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

/**
 * Hook to count how many agreements the given address is a party to —
 * the arbitration-app equivalent of "your points" in the betting example.
 */
export function useMyCaseCount(address: string | null) {
  const { data: agreements } = useAgreements();
  const count = (agreements ?? []).filter(
    (a) =>
      !!address &&
      (a.party_a?.toLowerCase() === address.toLowerCase() ||
        a.party_b?.toLowerCase() === address.toLowerCase())
  ).length;
  return count;
}

/**
 * Hook to create a new agreement.
 */
export function useCreateAgreement() {
  const contract = useDisputeArbitrationContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      agreementId,
      partyB,
      terms,
      amount,
      feePresetLevel,
    }: {
      agreementId: string;
      partyB: string;
      terms: string;
      amount: string;
      feePresetLevel?: FeePresetLevel;
    }) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to create an agreement.");
      }
      setIsCreating(true);
      const feePreset = await contract.estimateCreateAgreementFees(
        agreementId,
        partyB,
        terms,
        amount,
        feePresetLevel ?? "standard"
      );
      return contract.createAgreement(agreementId, partyB, terms, amount, feePreset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agreements"] });
      setIsCreating(false);
      success("Agreement created", {
        description: "Your agreement has been recorded on the blockchain."
      });
    },
    onError: (err: any) => {
      console.error("Error creating agreement:", err);
      setIsCreating(false);
      error("Failed to create agreement", {
        description: err?.message || "Please try again."
      });
    },
  });

  return {
    ...mutation,
    isCreating,
    createAgreement: mutation.mutate,
    createAgreementAsync: mutation.mutateAsync,
  };
}

/**
 * Hook to raise a dispute on an agreement.
 */
export function useRaiseDispute() {
  const contract = useDisputeArbitrationContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isRaising, setIsRaising] = useState(false);
  const [raisingAgreementId, setRaisingAgreementId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      agreementId,
      evidence,
      evidenceUrl,
    }: {
      agreementId: string;
      evidence: string;
      evidenceUrl: string;
    }) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to raise a dispute.");
      }
      setIsRaising(true);
      setRaisingAgreementId(agreementId);
      return contract.raiseDispute(agreementId, evidence, evidenceUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agreements"] });
      setIsRaising(false);
      setRaisingAgreementId(null);
      success("Dispute raised", {
        description: "The agreement is now disputed and ready for resolution."
      });
    },
    onError: (err: any) => {
      console.error("Error raising dispute:", err);
      setIsRaising(false);
      setRaisingAgreementId(null);
      error("Failed to raise dispute", {
        description: err?.message || "Please try again."
      });
    },
  });

  return {
    ...mutation,
    isRaising,
    raisingAgreementId,
    raiseDispute: mutation.mutate,
    raiseDisputeAsync: mutation.mutateAsync,
  };
}

/**
 * Hook to resolve a disputed agreement — triggers the LLM-judged verdict.
 */
export function useResolveDispute() {
  const contract = useDisputeArbitrationContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isResolving, setIsResolving] = useState(false);
  const [resolvingAgreementId, setResolvingAgreementId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (agreementId: string) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to resolve a dispute.");
      }
      setIsResolving(true);
      setResolvingAgreementId(agreementId);
      return contract.resolveDispute(agreementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agreements"] });
      setIsResolving(false);
      setResolvingAgreementId(null);
      success("Verdict reached", {
        description: "Validators have judged the dispute and recorded a verdict."
      });
    },
    onError: (err: any) => {
      console.error("Error resolving dispute:", err);
      setIsResolving(false);
      setResolvingAgreementId(null);
      error("Failed to resolve dispute", {
        description: err?.message || "Please try again."
      });
    },
  });

  return {
    ...mutation,
    isResolving,
    resolvingAgreementId,
    resolveDispute: mutation.mutate,
    resolveDisputeAsync: mutation.mutateAsync,
  };
}
