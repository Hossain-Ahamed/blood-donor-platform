"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  RotateCcw,
} from "lucide-react";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import type { DonorResponse } from "./DonorResponseActionCard";

interface DonorActiveResponseViewProps {
  response: DonorResponse;
  requesterId?: string | null;
  requesterName?: string | null;
  requesterContactPhone?: string | null;
  isSubmitting: boolean;
  isRequestOpen: boolean;
  onCancelOffer: () => void;
  onReOffer: () => void;
}

export function DonorActiveResponseView({
  response,
  requesterId,
  requesterName,
  requesterContactPhone,
  isSubmitting,
  isRequestOpen,
  onCancelOffer,
  onReOffer,
}: DonorActiveResponseViewProps) {
  // State 1: Active OFFERED (Pending Review)
  if (response.status === "OFFERED") {
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
            onClick={onCancelOffer}
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
  if (response.status === "ACCEPTED") {
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
              <span className="font-semibold">{requesterName || "Requester"}</span>
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

            {requesterId && (
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Connect with requester:</span>
                <FriendActionButton targetUserId={requesterId} size="sm" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 3: DECLINED
  if (response.status === "DECLINED") {
    return (
      <Card className="sticky top-24 border-muted shadow-sm">
        <CardHeader className="pb-3">
          <Badge variant="secondary" className="w-fit flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            Offer Declined
          </Badge>
          <CardTitle className="text-base font-bold mt-2">
            Thank you for volunteering
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            The requester did not proceed with this offer or found another donor.
            Your willingness to help is deeply appreciated!
          </p>
          {response.rejection_reason && (
            <div className="rounded-md bg-muted/60 border p-2.5 text-xs text-foreground space-y-1">
              <span className="font-semibold text-muted-foreground block">
                Reason from requester:
              </span>
              <p className="italic">&ldquo;{response.rejection_reason}&rdquo;</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // State 4: CANCELLED (with option to re-offer if still open)
  if (response.status === "CANCELLED") {
    return (
      <Card className="sticky top-24 border-muted shadow-sm">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="w-fit text-muted-foreground">
            Offer Cancelled
          </Badge>
          <CardTitle className="text-base font-bold mt-2">
            Donation Offer Cancelled
          </CardTitle>
          <CardDescription className="text-xs">
            You previously cancelled your offer for this request.
          </CardDescription>
        </CardHeader>
        {isRequestOpen && (
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={onReOffer}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Offer to Donate Again
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  return null;
}
