"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import type { RequesterDonorResponse } from "./RequesterResponsesCard";

const DECLINE_REASON_PRESETS = [
  "Found another donor",
  "All required blood units already fulfilled",
  "Patient condition changed / blood no longer required",
  "Donor location is too far from hospital",
  "Blood group or component mismatch",
];

interface DeclineResponseModalProps {
  target: RequesterDonorResponse | null;
  declineReason: string;
  isSubmitting: boolean;
  onReasonChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeclineResponseModal({
  target,
  declineReason,
  isSubmitting,
  onReasonChange,
  onClose,
  onConfirm,
}: DeclineResponseModalProps) {
  if (!target) return null;

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
            <AlertCircle className="w-5 h-5" />
            Decline Donation Offer
          </DialogTitle>
          <DialogDescription className="text-xs">
            Please specify the reason why you are declining this offer from{" "}
            <span className="font-semibold text-foreground">
              {target.donor?.name || "this donor"}
            </span>
            . The reason will be communicated to the donor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-2">
              Quick Reason Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DECLINE_REASON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onReasonChange(preset)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    declineReason === preset
                      ? "bg-red-600 text-white border-red-600 font-medium"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-muted"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="rejection-reason-input"
              className="text-xs font-semibold text-foreground flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-muted-foreground" />
              Reason Details <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejection-reason-input"
              rows={3}
              placeholder="Type or select a reason above (e.g. Found another donor closer to the hospital)..."
              value={declineReason}
              onChange={(e) => onReasonChange(e.target.value)}
              maxLength={250}
              className="w-full text-xs rounded-md border border-input bg-background p-2.5 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 leading-relaxed"
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Required field</span>
              <span>{declineReason.length} / 250</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            onClick={onConfirm}
            disabled={isSubmitting || !declineReason.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Declining...
              </>
            ) : (
              "Confirm & Decline Offer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
