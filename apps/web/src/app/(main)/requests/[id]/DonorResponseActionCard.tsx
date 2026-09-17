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
import { Badge } from "@/components/ui/badge";
import { apiClient, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Heart,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Phone,
  MessageSquare,
  Sparkles,
} from "lucide-react";

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
}

export function DonorResponseActionCard({
  requestId,
  initialResponse,
  requestStatus,
  requesterContactPhone,
  requesterName,
  donorPhone,
}: DonorResponseActionCardProps) {
  const router = useRouter();
  const [response, setResponse] = useState<DonorResponse | null>(
    initialResponse,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const isRequestOpen =
    requestStatus === "OPEN" || requestStatus === "PARTIALLY_FULFILLED";

  const handleDonate = async () => {
    if (isSubmitting) return;

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
    if (!response || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await apiClient.request<
        { data: DonorResponse } | DonorResponse
      >(`/responses/${response.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const updated = res && "data" in res ? res.data : (res as DonorResponse);
      setResponse((prev) =>
        prev ? { ...prev, status: "CANCELLED" } : updated,
      );
      toast.info("Your donation offer has been cancelled.");
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

  // State 1: Active OFFERED (Pending Review)
  if (response && response.status === "OFFERED") {
    return (
      <Card className="sticky top-24 border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <Badge className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 px-2.5 py-1">
              <Clock className="w-3.5 h-3.5" />
              Offer Submitted
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(response.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <CardTitle className="text-lg font-bold mt-2">
            Thank you for volunteering!
          </CardTitle>
          <CardDescription className="text-xs">
            Your offer is awaiting confirmation from the requester.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-background/80 border p-3 text-xs space-y-2">
            <p className="text-foreground leading-relaxed">
              The requester will review all volunteer offers. If accepted, they
              will receive your contact details to coordinate the donation.
            </p>
            {response.message && (
              <div className="pt-2 border-t border-dashed">
                <span className="font-semibold text-muted-foreground">
                  Your note:
                </span>{" "}
                <span className="italic text-foreground">
                  &ldquo;{response.message}&rdquo;
                </span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={handleCancelOffer}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
            )}
            Cancel Donation Offer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // State 2: ACCEPTED (Offer Accepted by Requester)
  if (response && response.status === "ACCEPTED") {
    return (
      <Card className="sticky top-24 border-emerald-400 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 px-2.5 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Offer Accepted 🎉
            </Badge>
          </div>
          <CardTitle className="text-lg font-bold mt-2 text-emerald-800 dark:text-emerald-300">
            You are saving a life!
          </CardTitle>
          <CardDescription className="text-xs">
            The requester accepted your offer. Please coordinate directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-background/90 border border-emerald-200 dark:border-emerald-900/60 p-3.5 text-xs space-y-2">
            <p className="font-medium text-foreground">
              Requester:{" "}
              <span className="font-semibold">
                {requesterName || "Requester"}
              </span>
            </p>
            {requesterContactPhone ? (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1.5">
                  Contact Phone:
                </p>
                <a href={`tel:${requesterContactPhone}`}>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 h-9 text-xs font-semibold shadow-sm">
                    <Phone className="w-3.5 h-3.5" />
                    Call {requesterContactPhone}
                  </Button>
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                The requester has your contact details and will reach out to
                coordinate with you shortly.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 3: DECLINED
  if (response && response.status === "DECLINED") {
    return (
      <Card className="sticky top-24 border-muted shadow-sm">
        <CardHeader className="pb-3">
          <Badge
            variant="secondary"
            className="w-fit flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            Offer Declined
          </Badge>
          <CardTitle className="text-base font-bold mt-2">
            Thank you for volunteering
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            The requester did not proceed with this offer or found another
            donor. Your willingness to help is deeply appreciated!
          </p>
          {response.rejection_reason && (
            <div className="rounded-md bg-muted/60 border p-2.5 text-xs text-foreground space-y-1">
              <span className="font-semibold text-muted-foreground block">
                Reason from requester:
              </span>
              <p className="italic">
                &ldquo;{response.rejection_reason}&rdquo;
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // State 4: CANCELLED (with option to re-offer if still open)
  if (response && response.status === "CANCELLED") {
    return (
      <Card className="sticky top-24 border-muted shadow-sm">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="w-fit flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            Offer Cancelled
          </Badge>
          <CardTitle className="text-base font-bold mt-2">
            Offer Cancelled
          </CardTitle>
          <CardDescription className="text-xs">
            You previously cancelled your offer for this blood request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isRequestOpen ? (
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              onClick={handleDonate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Re-submitting offer...
                </>
              ) : (
                <>
                  <Heart className="w-3.5 h-3.5 mr-2" />
                  Offer to Donate Again
                </>
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              This request is no longer open for responses.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // State 5: Initial / No Response yet
  return (
    <Card className="sticky top-24 shadow-sm border-red-200 dark:border-red-950/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="w-5 h-5 text-red-600 fill-red-600/20" />
          Can you help?
        </CardTitle>
        <CardDescription>
          Offer to donate blood for this request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showNoteInput && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <label
              htmlFor="donor-note"
              className="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Optional message for requester
            </label>
            <input
              id="donor-note"
              type="text"
              placeholder="e.g. Can reach hospital by 4 PM"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={150}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              disabled={isSubmitting}
            />
          </div>
        )}

        <Button
          size="lg"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm transition-all"
          onClick={handleDonate}
          disabled={isSubmitting || !isRequestOpen}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Submitting offer...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />I can donate
            </>
          )}
        </Button>

        {!showNoteInput && (
          <button
            type="button"
            onClick={() => setShowNoteInput(true)}
            className="text-xs text-muted-foreground hover:text-foreground text-center w-full block transition-colors"
          >
            + Add a quick note or arrival time
          </button>
        )}

        <p className="text-xs text-center text-muted-foreground leading-relaxed pt-1">
          Your contact details will only be shared if the requester accepts your
          offer.
        </p>
      </CardContent>
    </Card>
  );
}
