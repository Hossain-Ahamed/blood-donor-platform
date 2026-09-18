"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { bloodGroupLabels, getLabel } from "@/lib/labels";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Phone,
  HeartHandshake,
  AlertCircle,
  Eye,
  Loader2,
  MessageSquare,
  Flag,
} from "lucide-react";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ReportTargetType } from "@repo/shared";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import type { RequesterDonorResponse } from "./RequesterResponsesCard";

interface RequesterResponseItemProps {
  item: RequesterDonorResponse;
  isAccepting: boolean;
  isConfirming: boolean;
  onViewProfile: (item: RequesterDonorResponse) => void;
  onAccept: (item: RequesterDonorResponse) => void;
  onDecline: (item: RequesterDonorResponse) => void;
  onConfirmBloodReceived: (item: RequesterDonorResponse) => void;
}

export function RequesterResponseItem({
  item,
  isAccepting,
  isConfirming,
  onViewProfile,
  onAccept,
  onDecline,
  onConfirmBloodReceived,
}: RequesterResponseItemProps) {
  const donor = item.donor;
  const initials = donor?.name
    ? donor.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "D";

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        item.status === "OFFERED"
          ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10"
          : item.status === "ACCEPTED"
            ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10"
            : "border-muted bg-card/60 opacity-85"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 border border-muted-foreground/20 shrink-0">
            <AvatarImage src={donor?.avatar_url || undefined} alt={donor?.name || "Donor"} />
            <AvatarFallback className="font-semibold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                {donor?.name || "Anonymous Donor"}
              </span>
              {donor?.blood_group && (
                <Badge
                  variant="outline"
                  className="font-bold border-red-300 text-red-600 dark:text-red-400 text-xs px-2 py-0"
                >
                  {getLabel(bloodGroupLabels, donor.blood_group)}
                </Badge>
              )}
              {item.status === "OFFERED" && (
                <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] px-2 py-0">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending Review
                </Badge>
              )}
              {item.status === "ACCEPTED" && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Accepted Donor
                </Badge>
              )}
              {item.status === "DECLINED" && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                  <XCircle className="w-3 h-3 mr-1" />
                  Declined
                </Badge>
              )}
              {item.status === "CANCELLED" && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground">
                  Cancelled by Donor
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {donor?.area_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-500" />
                  {donor.area_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(item.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Key Donor Info Strip */}
            <div className="flex items-center gap-2 pt-1 text-xs flex-wrap">
              {donor?.phone && (
                <a
                  href={`tel:${donor.phone}`}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded-md hover:underline"
                  title="Call donor"
                >
                  <Phone className="w-3 h-3" />
                  {donor.phone}
                </a>
              )}
              {donor?.age !== undefined && donor?.age !== null && (
                <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 font-medium bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3" />
                  {donor.age} yrs
                </span>
              )}
              {donor?.religion && (
                <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 px-2 py-0.5 rounded-md">
                  <HeartHandshake className="w-3 h-3" />
                  {donor.religion}
                </span>
              )}
            </div>

            {/* Medical / Health Notes Callout */}
            {donor?.health_notes && (
              <div className="mt-1.5 text-xs bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 px-2.5 py-1.5 rounded-md flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-semibold">Medical Note: </span>
                  <span>{donor.health_notes}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact & Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-medium flex items-center gap-1.5"
            onClick={() => onViewProfile(item)}
          >
            <Eye className="w-3.5 h-3.5" />
            View Profile
          </Button>

          {donor?.phone && (
            <a href={`tel:${donor.phone}`}>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-medium flex items-center gap-1 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                <Phone className="w-3.5 h-3.5" />
                {donor.phone}
              </Button>
            </a>
          )}

          {item.status === "ACCEPTED" && item.donor_id && (
            <FriendActionButton
              targetUserId={item.donor_id}
              size="sm"
            />
          )}

          {item.donor_id && (
            <ReportDialog
              targetType={ReportTargetType.USER}
              targetId={item.donor_id}
              targetTitle={`Donor: ${donor?.name || "Donor"}`}
              trigger={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center gap-1 px-2"
                  title="Report donor for asking money, misconduct, or false commitment"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Report</span>
                </Button>
              }
            />
          )}

          {item.status === "OFFERED" && (
            <>
              <Button
                size="sm"
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => onAccept(item)}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                )}
                Accept Offer
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => onDecline(item)}
              >
                Decline
              </Button>
            </>
          )}

          {item.status === "ACCEPTED" && (
            <>
              {item.donation?.confirmed_by_donor || item.donation?.confirmed_by_requester ? (
                <Badge className="h-8 px-3 text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Blood Received & Confirmed
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5"
                  onClick={() => onConfirmBloodReceived(item)}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Confirm Blood Received
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {item.message && (
        <div className="mt-3 text-xs bg-background/80 rounded-md p-2.5 border text-foreground flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-muted-foreground">Donor note:</span>{" "}
            <span className="italic">&ldquo;{item.message}&rdquo;</span>
          </div>
        </div>
      )}

      {item.status === "DECLINED" && item.rejection_reason && (
        <div className="mt-2 text-xs bg-muted/60 rounded-md p-2 border border-muted text-muted-foreground flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Declined reason:</span>{" "}
            <span>&ldquo;{item.rejection_reason}&rdquo;</span>
          </div>
        </div>
      )}
    </div>
  );
}
