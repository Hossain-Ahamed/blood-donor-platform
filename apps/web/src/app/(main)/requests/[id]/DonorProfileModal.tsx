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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { bloodGroupLabels, getLabel } from "@/lib/labels";
import Link from "next/link";
import {
  User,
  Phone,
  MapPin,
  Activity,
  Calendar,
  HeartHandshake,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Flag,
  ExternalLink,
} from "lucide-react";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ReportTargetType } from "@repo/shared";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import type { RequesterDonorResponse } from "./RequesterResponsesCard";

interface DonorProfileModalProps {
  response: RequesterDonorResponse | null;
  isAccepting: boolean;
  isConfirming: boolean;
  onClose: () => void;
  onAccept: (res: RequesterDonorResponse) => void;
  onDecline: (res: RequesterDonorResponse) => void;
  onConfirmDonation: (res: RequesterDonorResponse) => void;
}

export function DonorProfileModal({
  response,
  isAccepting,
  isConfirming,
  onClose,
  onAccept,
  onDecline,
  onConfirmDonation,
}: DonorProfileModalProps) {
  if (!response) return null;
  const donor = response.donor;

  return (
    <Dialog open={Boolean(response)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-red-600" />
              Donor Profile Details
            </DialogTitle>
            {response.donor_id && (
              <ReportDialog
                targetType={ReportTargetType.USER}
                targetId={response.donor_id}
                targetTitle={`Donor: ${donor?.name || "Donor"}`}
                trigger={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-2"
                    title="Report donor for asking money or misconduct"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Donor</span>
                  </Button>
                }
              />
            )}
          </div>
          <DialogDescription className="text-xs">
            Review full donor profile and contact information before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Profile Header */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border">
            <Avatar className="h-14 w-14 border shrink-0">
              <AvatarImage src={donor?.avatar_url || undefined} />
              <AvatarFallback className="font-bold text-lg bg-red-100 dark:bg-red-950 text-red-600">
                {donor?.name?.[0]?.toUpperCase() || "D"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h4 className="font-bold text-base leading-tight">{donor?.name}</h4>
              <div className="flex items-center gap-2 flex-wrap">
                {donor?.blood_group && (
                  <Badge className="bg-red-600 text-white font-bold text-xs">
                    {getLabel(bloodGroupLabels, donor.blood_group)}
                  </Badge>
                )}
                <Badge
                  variant={donor?.is_available !== false ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {donor?.is_available !== false
                    ? "Available to donate"
                    : "Currently Unavailable"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Key Contact & Medical Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg border bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3 text-blue-600" />
                Phone Number
              </span>
              {donor?.phone ? (
                <a
                  href={`tel:${donor.phone}`}
                  className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  {donor.phone}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Not provided
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-lg border bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-red-500" />
                Area / Location
              </span>
              <span className="font-semibold text-foreground">
                {donor?.area_name || "Not specified"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg border bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Activity className="w-3 h-3 text-emerald-600" />
                Last Blood Donation
              </span>
              <span className="font-medium text-foreground">
                {donor?.last_donation_date
                  ? new Date(donor.last_donation_date).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })
                  : "First-time / Not recorded"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg border bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-purple-600" />
                Donor Age
              </span>
              <span className="font-medium text-foreground">
                {donor?.age ? `${donor.age} years old` : "Age not specified"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg border bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <HeartHandshake className="w-3 h-3 text-indigo-600" />
                Religion
              </span>
              <span className="font-medium text-foreground">
                {donor?.religion || "Not specified"}
              </span>
            </div>
          </div>

          {/* Bio & Health Notes */}
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 text-xs space-y-1">
            <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              Donor Medical / Health Notes:
            </span>
            <p className="text-foreground leading-relaxed">
              {donor?.health_notes ||
                "No medical conditions or health restrictions noted by donor."}
            </p>
          </div>

          {donor?.bio && (
            <div className="p-3 rounded-lg border bg-muted/20 text-xs">
              <span className="font-semibold text-muted-foreground block mb-1">
                About the Donor:
              </span>
              <p className="text-foreground">{donor.bio}</p>
            </div>
          )}

          {response.message && (
            <div className="p-3 rounded-lg border bg-muted/40 text-xs">
              <span className="font-semibold text-muted-foreground block mb-1">
                Message for this request:
              </span>
              <p className="italic text-foreground">&ldquo;{response.message}&rdquo;</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {response.status === "OFFERED" && (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => onDecline(response)}
              >
                Decline
              </Button>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => onAccept(response)}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Accept Offer
              </Button>
            </>
          )}

          {response.status === "ACCEPTED" && (
            <>
              {response.donation?.confirmed_by_donor ||
              response.donation?.confirmed_by_requester ? (
                <Badge className="bg-emerald-600 text-white font-semibold py-1.5 px-3">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Blood Received & Confirmed
                </Badge>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={() => onConfirmDonation(response)}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Confirm Blood Received
                </Button>
              )}
            </>
          )}

          {response.status === "ACCEPTED" && response.donor_id && (
            <FriendActionButton
              targetUserId={response.donor_id}
              targetUserName={donor?.name}
              size="default"
              simple={true}
            />
          )}

          {response.donor_id && (
            <Link
              href={`/friends/${response.donor_id}`}
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                className="w-full text-xs gap-1.5 border-muted-foreground/30 hover:border-red-300 hover:text-red-600"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Profile
              </Button>
            </Link>
          )}

          {response.status === "ACCEPTED" && donor?.phone && (
            <a href={`tel:${donor.phone}`} className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                Call {donor.phone}
              </Button>
            </a>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
