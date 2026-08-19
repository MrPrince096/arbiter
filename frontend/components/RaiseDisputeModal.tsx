"use client";

import { useState, useEffect } from "react";
import { Gavel, Loader2 } from "lucide-react";
import { useRaiseDispute } from "@/lib/hooks/useDisputeArbitration";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function RaiseDisputeModal({ agreementId }: { agreementId: string }) {
  const { raiseDispute, isRaising, raisingAgreementId, isSuccess } = useRaiseDispute();
  const [isOpen, setIsOpen] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceError, setEvidenceError] = useState("");

  const isThisRowRaising = isRaising && raisingAgreementId === agreementId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidence.trim()) {
      setEvidenceError("Describe what happened");
      return;
    }
    raiseDispute({ agreementId, evidence: evidence.trim(), evidenceUrl: evidenceUrl.trim() });
  };

  useEffect(() => {
    if (isSuccess) {
      setEvidence("");
      setEvidenceUrl("");
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setEvidence("");
          setEvidenceUrl("");
          setEvidenceError("");
        }
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Gavel className="w-3 h-3 mr-1" />
          Raise Dispute
        </Button>
      </DialogTrigger>
      <DialogContent className="brand-card border-2 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Raise a Dispute</DialogTitle>
          <DialogDescription>
            Submit evidence. Validators will fetch any URL you provide and judge the outcome against the agreement&apos;s terms.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="evidence">What happened?</Label>
            <textarea
              id="evidence"
              placeholder="e.g. Delivery was never made, no tracking updates since the 3rd."
              value={evidence}
              onChange={(e) => {
                setEvidence(e.target.value);
                setEvidenceError("");
              }}
              rows={3}
              className={`w-full rounded-md border bg-transparent px-3 py-2 text-sm ${
                evidenceError ? "border-destructive" : "border-white/10"
              }`}
            />
            {evidenceError && <p className="text-xs text-destructive">{evidenceError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidenceUrl">Evidence URL (optional)</Label>
            <Input
              id="evidenceUrl"
              type="text"
              placeholder="https://tracking.example/..."
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsOpen(false)} disabled={isThisRowRaising}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" disabled={isThisRowRaising}>
              {isThisRowRaising ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Raise Dispute"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
