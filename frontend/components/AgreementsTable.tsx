"use client";

import { Loader2, Scale, Clock, AlertCircle, Gavel } from "lucide-react";
import { useAgreements, useResolveDispute, useDisputeArbitrationContract } from "@/lib/hooks/useDisputeArbitration";
import { useWallet } from "@/lib/genlayer/wallet";
import { error } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { RaiseDisputeModal } from "./RaiseDisputeModal";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Agreement } from "@/lib/contracts/types";

export function AgreementsTable() {
  const contract = useDisputeArbitrationContract();
  const { data: agreements, isLoading, isError } = useAgreements();
  const { address, isConnected, isLoading: isWalletLoading } = useWallet();
  const { resolveDispute, isResolving, resolvingAgreementId } = useResolveDispute();

  const handleResolve = (agreementId: string) => {
    if (!address) {
      error("Please connect your wallet to resolve disputes");
      return;
    }

    const confirmed = confirm(
      "Resolve this dispute? Validators will read the evidence and reach a binding, consensus verdict."
    );

    if (confirmed) {
      resolveDispute(agreementId);
    }
  };

  if (isLoading) {
    return (
      <div className="brand-card p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading agreements...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="brand-card p-12">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-yellow-400 opacity-60" />
          <h3 className="text-xl font-bold">Setup Required</h3>
          <div className="space-y-2">
            <p className="text-muted-foreground">Contract address not configured.</p>
            <p className="text-sm text-muted-foreground">
              Please set <code className="bg-muted px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in your .env file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="brand-card p-8">
        <div className="text-center">
          <p className="text-destructive">Failed to load agreements. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!agreements || agreements.length === 0) {
    return (
      <div className="brand-card p-12">
        <div className="text-center space-y-3">
          <Scale className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
          <h3 className="text-xl font-bold">No Agreements Yet</h3>
          <p className="text-muted-foreground">Create the first one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-card p-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parties</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Terms</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {agreements.map((agreement) => (
              <AgreementRow
                key={agreement.id}
                agreement={agreement}
                currentAddress={address}
                isConnected={isConnected}
                isWalletLoading={isWalletLoading}
                onResolve={handleResolve}
                isResolving={isResolving && resolvingAgreementId === agreement.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AgreementRowProps {
  agreement: Agreement;
  currentAddress: string | null;
  isConnected: boolean;
  isWalletLoading: boolean;
  onResolve: (agreementId: string) => void;
  isResolving: boolean;
}

function statusBadge(agreement: Agreement) {
  if (agreement.status === "resolved") {
    const winnerLabel = agreement.verdict_winner === "party_a" ? "Party A" : "Party B";
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <Scale className="w-3 h-3 mr-1" />
          Resolved
        </Badge>
        <span className="text-xs text-muted-foreground">
          Winner: <span className="font-semibold text-foreground">{winnerLabel}</span>
        </span>
      </div>
    );
  }
  if (agreement.status === "disputed") {
    return (
      <Badge variant="outline" className="text-orange-400 border-orange-500/30">
        <Gavel className="w-3 h-3 mr-1" />
        Disputed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
      <Clock className="w-3 h-3 mr-1" />
      Open
    </Badge>
  );
}

function AgreementRow({ agreement, currentAddress, isConnected, isWalletLoading, onResolve, isResolving }: AgreementRowProps) {
  const isParty =
    currentAddress?.toLowerCase() === agreement.party_a?.toLowerCase() ||
    currentAddress?.toLowerCase() === agreement.party_b?.toLowerCase();
  const canDispute = isConnected && currentAddress && isParty && agreement.status === "open" && !isWalletLoading;
  const canResolve = isConnected && currentAddress && agreement.status === "disputed" && !isWalletLoading;

  return (
    <tr className="group hover:bg-white/5 transition-colors animate-fade-in">
      <td className="px-4 py-4">
        <span className="text-sm font-mono">{agreement.id}</span>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1 text-xs">
          <AddressDisplay address={agreement.party_a} maxLength={10} showCopy={false} />
          <AddressDisplay address={agreement.party_b} maxLength={10} showCopy={false} />
        </div>
      </td>
      <td className="px-4 py-4 max-w-xs">
        <span className="text-sm text-muted-foreground line-clamp-2">{agreement.terms}</span>
        {agreement.status === "resolved" && agreement.verdict_reasoning && (
          <p className="text-xs italic text-accent mt-1">&quot;{agreement.verdict_reasoning}&quot;</p>
        )}
      </td>
      <td className="px-4 py-4">
        <span className="text-sm font-semibold">{agreement.amount}</span>
      </td>
      <td className="px-4 py-4">{statusBadge(agreement)}</td>
      <td className="px-4 py-4">
        <div className="flex gap-2">
          {canDispute && <RaiseDisputeModal agreementId={agreement.id} />}
          {canResolve && (
            <Button onClick={() => onResolve(agreement.id)} disabled={isResolving} size="sm" variant="gradient">
              {isResolving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve"
              )}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
