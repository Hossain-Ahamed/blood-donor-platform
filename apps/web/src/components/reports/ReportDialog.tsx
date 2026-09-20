"use client";

import React, { useState } from "react";
import { ReportTargetType } from "@repo/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Flag, AlertTriangle, ShieldAlert, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

interface ReportDialogProps {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string;
  targetTitle?: string;
  trigger?: React.ReactNode;
}

const REQUEST_PRESETS = [
  "Fake or fraudulent blood request",
  "Demanding money or commercial blood selling",
  "Inaccurate hospital location or fake contact details",
  "Abusive, harassing, or spam content",
  "Other policy violation",
];

const USER_PRESETS = [
  "Demanding money or payment for blood donation (strictly prohibited)",
  "Scam, financial extortion, or asking for unwarranted fees",
  "Harassment, abuse, or threatening communication",
  "Refused to donate or no-show after confirmation",
  "Impersonation, deceptive identity, or fake profile",
  "Other misconduct or safety concern",
];

export function ReportDialog({
  targetType,
  targetId,
  targetOwnerId,
  targetTitle,
  trigger,
}: ReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent users from reporting themselves or their own requests
  const isSelfOrOwn = Boolean(
    user?.id &&
      (user.id === targetId || (targetOwnerId && user.id === targetOwnerId)),
  );

  if (isSelfOrOwn) {
    return null;
  }

  const presets =
    targetType === ReportTargetType.REQUEST ? REQUEST_PRESETS : USER_PRESETS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSelfOrOwn) {
      toast.error("You cannot report yourself or your own request.");
      return;
    }

    if (!user) {
      toast.error("You must be signed in to submit a report.");
      return;
    }

    if (!category && !details.trim()) {
      toast.error("Please select a reason or provide details for this report.");
      return;
    }

    const fullReason = category
      ? details.trim()
        ? `[${category}] ${details.trim()}`
        : category
      : details.trim();

    if (fullReason.length < 5) {
      toast.error("Please provide at least 5 characters explaining the issue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.request("/reports", {
        method: "POST",
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason: fullReason,
        }),
      });

      toast.success(
        "Report submitted successfully. Our admin team will review it shortly.",
      );
      setOpen(false);
      setCategory("");
      setDetails("");
    } catch (err: any) {
      const message =
        err?.message || "Failed to submit report. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {trigger}
        </span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-xs text-muted-foreground hover:text-destructive h-8 px-2.5 flex items-center gap-1.5 transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-semibold">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>
                Report {targetType === ReportTargetType.REQUEST ? "Blood Request" : "User"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Help maintain trust and safety on the platform. All reports are confidential
              and reviewed by platform moderators.
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="py-4 space-y-3 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Sign in required
              </p>
              <p className="text-xs text-muted-foreground">
                You must be logged in to submit a safety or compliance report.
              </p>
              <div className="pt-2">
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {targetTitle && (
                <div className="rounded-md bg-muted/60 px-3 py-2 text-xs border border-border/60">
                  <span className="text-muted-foreground font-medium">Reporting: </span>
                  <span className="font-semibold text-foreground">{targetTitle}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Select a reason
                </Label>
                <div className="grid gap-1.5">
                  {presets.map((item) => (
                    <label
                      key={item}
                      className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-all ${
                        category === item
                          ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300 font-medium"
                          : "border-border/60 hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportCategory"
                        checked={category === item}
                        onChange={() => setCategory(item)}
                        className="text-red-600 focus:ring-red-500 rounded-full"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-details" className="text-xs font-semibold text-foreground">
                  Additional details (optional)
                </Label>
                <Textarea
                  id="report-details"
                  placeholder="Provide any relevant context, links, or explanation..."
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={isSubmitting || (!category && !details.trim())}
                  className="gap-1.5 font-semibold"
                >
                  {isSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Report</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}