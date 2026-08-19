"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, FileText, DollarSign, User as UserIcon } from "lucide-react";
import { useCreateAgreement } from "@/lib/hooks/useDisputeArbitration";
import type { FeePresetLevel } from "@/lib/genlayer/fees";
import { useWallet } from "@/lib/genlayer/wallet";
import { error } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function CreateAgreementModal() {
  const { isConnected, address, isLoading } = useWallet();
  const { createAgreement, isCreating, isSuccess } = useCreateAgreement();

  const [isOpen, setIsOpen] = useState(false);
  const [agreementId, setAgreementId] = useState("");
  const [partyB, setPartyB] = useState("");
  const [terms, setTerms] = useState("");
  const [amount, setAmount] = useState("");
  const [feePresetLevel, setFeePresetLevel] = useState<FeePresetLevel>("standard");

  const [errors, setErrors] = useState({
    agreementId: "",
    partyB: "",
    terms: "",
    amount: "",
  });

  useEffect(() => {
    if (!isConnected && isOpen && !isCreating) {
      setIsOpen(false);
    }
  }, [isConnected, isOpen, isCreating]);

  const validateForm = (): boolean => {
    const newErrors = { agreementId: "", partyB: "", terms: "", amount: "" };

    if (!agreementId.trim()) newErrors.agreementId = "Agreement ID is required";
    if (!partyB.trim() || !/^0x[a-fA-F0-9]{40}$/.test(partyB.trim()))
      newErrors.partyB = "A valid 0x address is required";
    if (!terms.trim()) newErrors.terms = "Describe the agreement's terms";
    if (!amount.trim()) newErrors.amount = "Amount at stake is required";

    setErrors(newErrors);
    return !Object.values(newErrors).some((e) => e !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      error("Please connect your wallet first");
      return;
    }

    if (!validateForm()) return;

    createAgreement({
      agreementId: agreementId.trim(),
      partyB: partyB.trim(),
      terms: terms.trim(),
      amount: amount.trim(),
      feePresetLevel,
    });
  };

  const resetForm = () => {
    setAgreementId("");
    setPartyB("");
    setTerms("");
    setAmount("");
    setErrors({ agreementId: "", partyB: "", terms: "", amount: "" });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isCreating) resetForm();
    setIsOpen(open);
  };

  useEffect(() => {
    if (isSuccess) {
      resetForm();
      setIsOpen(false);
    }
  }, [isSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="gradient" disabled={!isConnected || !address || isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          New Agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="brand-card border-2 sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Agreement</DialogTitle>
          <DialogDescription>
            Record a two-party agreement. Either side can raise a dispute later — validators judge it against the terms and evidence.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="agreementId" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Agreement ID
            </Label>
            <Input
              id="agreementId"
              type="text"
              placeholder="freelance-invoice-42"
              value={agreementId}
              onChange={(e) => {
                setAgreementId(e.target.value);
                setErrors({ ...errors, agreementId: "" });
              }}
              className={errors.agreementId ? "border-destructive" : ""}
            />
            {errors.agreementId && <p className="text-xs text-destructive">{errors.agreementId}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="partyB" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Other Party&apos;s Address
            </Label>
            <Input
              id="partyB"
              type="text"
              placeholder="0x..."
              value={partyB}
              onChange={(e) => {
                setPartyB(e.target.value);
                setErrors({ ...errors, partyB: "" });
              }}
              className={errors.partyB ? "border-destructive" : ""}
            />
            {errors.partyB && <p className="text-xs text-destructive">{errors.partyB}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms</Label>
            <textarea
              id="terms"
              placeholder="e.g. Alice pays Bob $100 once delivery is confirmed by carrier tracking."
              value={terms}
              onChange={(e) => {
                setTerms(e.target.value);
                setErrors({ ...errors, terms: "" });
              }}
              rows={3}
              className={`w-full rounded-md border bg-transparent px-3 py-2 text-sm ${
                errors.terms ? "border-destructive" : "border-white/10"
              }`}
            />
            {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Amount at Stake
            </Label>
            <Input
              id="amount"
              type="text"
              placeholder="100"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors({ ...errors, amount: "" });
              }}
              className={errors.amount ? "border-destructive" : ""}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          </div>

          <div className="space-y-3">
            <Label>Fee Preset</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "low", label: "Low", detail: "No appeals" },
                { value: "standard", label: "Standard", detail: "1 appeal" },
                { value: "high", label: "High", detail: "2 appeals" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFeePresetLevel(option.value)}
                  className={`rounded-md border px-3 py-2 text-left transition-all ${
                    feePresetLevel === option.value
                      ? "border-accent bg-accent/20 text-accent"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{option.detail}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Agreement"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
