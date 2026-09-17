"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { Heart, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { DonorCooldownAlert } from "./DonorCooldownAlert";
import { DonorActiveResponseView } from "./DonorActiveResponseView";

export interface DonorResponse {
  id: string;
  request_id: string;
  donor_id: string;
  status: "OFFERED" | "ACCEPTED" | "DECLINED" | "CANCELLED" | string;
  message?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

interface DonorResponseActionCardProps {
  requestId: string;
  initialResponse: DonorResponse | null;
  requestStatus: string;
  requesterContactPhone?: string | null;
  requesterName?: string | null;
  donorPhone?: string | null;
  lastDonationDate?: string | Date | null;
}

export function DonorResponseActionCard({
  requestId,
  initialResponse,
  requestStatus,
  requesterContactPhone,
  requesterName,
  donorPhone,
  lastDonationDate,
}: DonorResponseActionCardProps) {
  const router = useRouter();
  const [response, setResponse] = useState<DonorResponse | null>(
    initialResponse,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  // 90-day cooldown calculation
  const cooldownDays = 90;
  let inCooldown = false;
  let daysRemaining = 0;
  let eligibleDate: Date | null = null;
  let formattedLastDonation = "";

  if (lastDonationDate) {
    const lastDate = new Date(lastDonationDate);
    if (!isNaN(lastDate.getTime())) {
      formattedLastDonation = lastDate.toLocaleDateString(undefined, {
        dateStyle: "medium",
      });
      const eligible = new Date(lastDate);
      eligible.setDate(eligible.getDate() + cooldownDays);
      eligibleDate = eligible;
      const diffTime = eligible.getTime() - Date.now();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      inCooldown = daysRemaining > 0;
    }
  }

  const isRequestOpen =
    requestStatus === "OPEN" || requestStatus === "PARTIALLY_FULFILLED";

  const handleDonate = async () => {
    if (isSubmitting) return;

    if (inCooldown) {
      toast.error(
        `You are in a medical rest cooldown period. You can donate again in ${daysRemaining} day(s).`,
      );
      return;
    }

    if (!donorPhone?.trim()) {
      toast.error(
        "Please add a contact phone number to your profile before responding.",
      );
      router.push(`/profile?redirect=/requests/${requestId}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiClient.request<
        { data: DonorResponse } | DonorResponse
      >(`/requests/${requestId}/responses`, {
        method: "POST",
        body: JSON.stringify({
          message: message.trim() || undefined,
        }),
      });

      const savedResponse =
        res && "data" in res ? res.data : (res as DonorResponse);

      setResponse(savedResponse);
      toast.success(
        "Offer submitted successfully! The requester has been notified.",
      );
      router.refresh();
    } catch (err) {
      console.error("Failed to submit response:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to submit donation offer");
      } else {
        toast.error("Failed to submit donation offer. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!response) return;
    setIsSubmitting(true);
    try {
      await apiClient.request(`/responses/${response.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      setResponse((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
      toast.info("Donation offer has been cancelled.");
      router.refresh();
    } catch (err) {
      console.error("Failed to cancel response:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to cancel donation offer");
      } else {
        toast.error("Failed to cancel offer. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (response) {
    return (
      <DonorActiveResponseView
        response={response}
        requesterName={requesterName}
        requesterContactPhone={requesterContactPhone}
        isSubmitting={isSubmitting}
        isRequestOpen={isRequestOpen}
        onCancelOffer={handleCancelOffer}
        onReOffer={() => setResponse(null)}
      />
    );
  }

  // State 5: Fresh state — can offer
  return (
    <Card className="sticky top-24 border-red-200 dark:border-red-950/60 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Heart className="w-5 h-5 text-red-600 fill-red-600" />
          Can you donate?
        </CardTitle>
        <CardDescription className="text-xs">
          Offer blood for this emergency. The requester will review and contact
          you directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {inCooldown && (
          <DonorCooldownAlert
            daysRemaining={daysRemaining}
            formattedLastDonation={formattedLastDonation}
            eligibleDate={eligibleDate}
          />
        )}

        {isRequestOpen ? (
          <div className="space-y-3">
            {showNoteInput ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="donor-note-input"
                  className="text-xs font-semibold text-foreground flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                  Attach a message / note (optional):
                </label>
                <textarea
                  id="donor-note-input"
                  rows={3}
                  placeholder="e.g. I can arrive at the hospital by 2:00 PM, I am within 5 km..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={300}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2.5 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Visible to requester</span>
                  <span>{message.length} / 300</span>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 h-7"
                onClick={() => setShowNoteInput(true)}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Add note or ETA (optional)
              </Button>
            )}

            <Button
              size="lg"
              className={`w-full font-bold shadow-md flex items-center justify-center gap-2 ${
                inCooldown
                  ? "bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed hover:bg-zinc-400"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
              onClick={handleDonate}
              disabled={isSubmitting || inCooldown}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting Offer...
                </>
              ) : inCooldown ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  In Cooldown ({daysRemaining}d left)
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-white" />
                  I Can Donate Blood
                </>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center leading-snug">
              By offering, your contact phone and donor profile credentials will
              be shared with the patient attendant upon acceptance.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-muted p-3 text-center space-y-1">
            <p className="text-xs font-semibold text-foreground">
              Request is {requestStatus.toLowerCase()}
            </p>
            <p className="text-[11px] text-muted-foreground">
              This blood request is no longer accepting new donor offers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
