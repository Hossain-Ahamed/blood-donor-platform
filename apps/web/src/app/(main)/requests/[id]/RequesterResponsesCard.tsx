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
import { apiClient, ApiError } from "@/lib/api/client";
import { bloodGroupLabels, getLabel } from "@/lib/labels";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Loader2,
  HeartHandshake,
  MapPin,
  Calendar,
  Eye,
  Activity,
  User,
  AlertCircle,
  FileText,
} from "lucide-react";

export interface RequesterDonorResponse {
  id: string;
  request_id: string;
  donor_id: string;
  status: "OFFERED" | "ACCEPTED" | "DECLINED" | "CANCELLED" | string;
  message?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  donor: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    blood_group?: string | null;
    area_name?: string | null;
    is_available?: boolean;
    last_donation_date?: string | null;
    age?: number | null;
    date_of_birth?: string | null;
    religion?: string | null;
    bio?: string | null;
    health_notes?: string | null;
  } | null;
}

interface RequesterResponsesCardProps {
  requestId: string;
  initialResponses: RequesterDonorResponse[];
}

const DECLINE_REASON_PRESETS = [
  "Found another donor",
  "All required blood units already fulfilled",
  "Patient condition changed / blood no longer required",
  "Donor location is too far from hospital",
  "Blood group or component mismatch",
];

export function RequesterResponsesCard({
  requestId,
  initialResponses,
}: RequesterResponsesCardProps) {
  const router = useRouter();
  const [responses, setResponses] =
    useState<RequesterDonorResponse[]>(initialResponses);
  const [selectedDonorForProfile, setSelectedDonorForProfile] =
    useState<RequesterDonorResponse | null>(null);
  const [declineTarget, setDeclineTarget] =
    useState<RequesterDonorResponse | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);
  const [isAcceptingId, setIsAcceptingId] = useState<string | null>(null);

  const handleAccept = async (response: RequesterDonorResponse) => {
    setIsAcceptingId(response.id);
    try {
      await apiClient.request(`/responses/${response.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACCEPTED" }),
      });

      setResponses((prev) =>
        prev.map((r) =>
          r.id === response.id ? { ...r, status: "ACCEPTED" } : r,
        ),
      );

      toast.success(
        `Accepted offer from ${response.donor?.name || "donor"}! Request units updated.`,
      );
      if (selectedDonorForProfile?.id === response.id) {
        setSelectedDonorForProfile(null);
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to accept response:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to accept offer");
      } else {
        toast.error("Failed to accept offer. Please try again.");
      }
    } finally {
      setIsAcceptingId(null);
    }
  };

  const handleOpenDeclineModal = (response: RequesterDonorResponse) => {
    setDeclineTarget(response);
    setDeclineReason("");
  };

  const handleConfirmDecline = async () => {
    if (!declineTarget) return;
    const trimmedReason = declineReason.trim();
    if (!trimmedReason) {
      toast.error("Please provide a reason for declining the offer.");
      return;
    }

    setIsSubmittingDecline(true);
    try {
      await apiClient.request(`/responses/${declineTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "DECLINED",
          rejection_reason: trimmedReason,
        }),
      });

      setResponses((prev) =>
        prev.map((r) =>
          r.id === declineTarget.id
            ? { ...r, status: "DECLINED", rejection_reason: trimmedReason }
            : r,
        ),
      );

      toast.info("Donor offer declined and reason recorded.");
      setDeclineTarget(null);
      if (selectedDonorForProfile?.id === declineTarget.id) {
        setSelectedDonorForProfile(null);
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to decline response:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to decline offer");
      } else {
        toast.error("Failed to decline offer. Please try again.");
      }
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  const offeredCount = responses.filter((r) => r.status === "OFFERED").length;
  const acceptedCount = responses.filter((r) => r.status === "ACCEPTED").length;

  return (
    <>
      <Card className="border-red-200 dark:border-red-950/60 shadow-sm bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              Volunteer Donors
            </CardTitle>
            <div className="flex items-center gap-2">
              {offeredCount > 0 && (
                <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                  {offeredCount} Pending
                </Badge>
              )}
              {acceptedCount > 0 && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  {acceptedCount} Accepted
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {responses.length} Total
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs">
            Review volunteer donors, inspect their donor profile, contact them,
            and accept or decline offers.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {responses.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-muted-foreground/20 bg-muted/20">
              <HeartHandshake className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">
                No donor offers yet
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                When donors view your request and click &ldquo;I can
                donate&rdquo;, their profile and contact information will appear
                here for your review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {responses.map((item) => {
                const donor = item.donor;
                const isAccepting = isAcceptingId === item.id;
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
                    key={item.id}
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
                          <AvatarImage
                            src={donor?.avatar_url || undefined}
                            alt={donor?.name || "Donor"}
                          />
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
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-2 py-0"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Declined
                              </Badge>
                            )}
                            {item.status === "CANCELLED" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0 text-muted-foreground"
                              >
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
                              {new Date(item.created_at).toLocaleString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>

                          {/* Key Donor Info Strip: Contact, Age, Religion */}
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
                        {/* View Full Profile Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium flex items-center gap-1.5"
                          onClick={() => setSelectedDonorForProfile(item)}
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

                        {item.status === "OFFERED" && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              onClick={() => handleAccept(item)}
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
                              onClick={() => handleOpenDeclineModal(item)}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Donor Note for Request */}
                    {item.message && (
                      <div className="mt-3 text-xs bg-background/80 rounded-md p-2.5 border text-foreground flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Donor note:
                          </span>{" "}
                          <span className="italic">
                            &ldquo;{item.message}&rdquo;
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Rejection reason (if declined) */}
                    {item.status === "DECLINED" && item.rejection_reason && (
                      <div className="mt-2 text-xs bg-muted/60 rounded-md p-2 border border-muted text-muted-foreground flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-foreground">
                            Declined reason:
                          </span>{" "}
                          <span>&ldquo;{item.rejection_reason}&rdquo;</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG 1: VIEW FULL DONOR PROFILE */}
      <Dialog
        open={Boolean(selectedDonorForProfile)}
        onOpenChange={(open) => !open && setSelectedDonorForProfile(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-red-600" />
              Donor Profile Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review full donor credentials and contact information before
              confirming.
            </DialogDescription>
          </DialogHeader>

          {selectedDonorForProfile && (
            <div className="space-y-4 py-2 text-sm">
              {/* Profile Header */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border">
                <Avatar className="h-14 w-14 border shrink-0">
                  <AvatarImage
                    src={selectedDonorForProfile.donor?.avatar_url || undefined}
                  />
                  <AvatarFallback className="font-bold text-lg bg-red-100 dark:bg-red-950 text-red-600">
                    {selectedDonorForProfile.donor?.name?.[0]?.toUpperCase() ||
                      "D"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h4 className="font-bold text-base leading-tight">
                    {selectedDonorForProfile.donor?.name}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedDonorForProfile.donor?.blood_group && (
                      <Badge className="bg-red-600 text-white font-bold text-xs">
                        {getLabel(
                          bloodGroupLabels,
                          selectedDonorForProfile.donor.blood_group,
                        )}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        selectedDonorForProfile.donor?.is_available !== false
                          ? "default"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {selectedDonorForProfile.donor?.is_available !== false
                        ? "Available to donate"
                        : "Currently Unavailable"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Key Contact & Medical Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone */}
                <div className="p-2.5 rounded-lg border bg-card/60">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Phone className="w-3 h-3 text-blue-600" />
                    Phone Number
                  </span>
                  {selectedDonorForProfile.donor?.phone ? (
                    <a
                      href={`tel:${selectedDonorForProfile.donor.phone}`}
                      className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {selectedDonorForProfile.donor.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Not provided
                    </span>
                  )}
                </div>

                {/* Location */}
                <div className="p-2.5 rounded-lg border bg-card/60">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 text-red-500" />
                    Area / Location
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedDonorForProfile.donor?.area_name ||
                      "Not specified"}
                  </span>
                </div>

                {/* Last Donation Date */}
                <div className="p-2.5 rounded-lg border bg-card/60">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Activity className="w-3 h-3 text-emerald-600" />
                    Last Blood Donation
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedDonorForProfile.donor?.last_donation_date
                      ? new Date(
                          selectedDonorForProfile.donor.last_donation_date,
                        ).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })
                      : "First-time / Not recorded"}
                  </span>
                </div>

                {/* Age */}
                <div className="p-2.5 rounded-lg border bg-card/60">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-purple-600" />
                    Donor Age
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedDonorForProfile.donor?.age
                      ? `${selectedDonorForProfile.donor.age} years old`
                      : "Age not specified"}
                  </span>
                </div>

                {/* Religion */}
                <div className="p-2.5 rounded-lg border bg-card/60">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <HeartHandshake className="w-3 h-3 text-indigo-600" />
                    Religion
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedDonorForProfile.donor?.religion || "Not specified"}
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
                  {selectedDonorForProfile.donor?.health_notes ||
                    "No medical conditions or health restrictions noted by donor."}
                </p>
              </div>

              {selectedDonorForProfile.donor?.bio && (
                <div className="p-3 rounded-lg border bg-muted/20 text-xs">
                  <span className="font-semibold text-muted-foreground block mb-1">
                    About the Donor:
                  </span>
                  <p className="text-foreground">
                    {selectedDonorForProfile.donor.bio}
                  </p>
                </div>
              )}

              {/* Note attached to this response */}
              {selectedDonorForProfile.message && (
                <div className="p-3 rounded-lg border bg-muted/40 text-xs">
                  <span className="font-semibold text-muted-foreground block mb-1">
                    Message for this request:
                  </span>
                  <p className="italic text-foreground">
                    &ldquo;{selectedDonorForProfile.message}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedDonorForProfile?.status === "OFFERED" && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    const target = selectedDonorForProfile;
                    setSelectedDonorForProfile(null);
                    handleOpenDeclineModal(target);
                  }}
                >
                  Decline
                </Button>

                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={() => handleAccept(selectedDonorForProfile)}
                  disabled={isAcceptingId === selectedDonorForProfile.id}
                >
                  {isAcceptingId === selectedDonorForProfile.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Accept Offer
                </Button>
              </>
            )}

            {selectedDonorForProfile?.status === "ACCEPTED" &&
              selectedDonorForProfile.donor?.phone && (
                <a
                  href={`tel:${selectedDonorForProfile.donor.phone}`}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    <Phone className="w-3.5 h-3.5 mr-1.5" />
                    Call Donor ({selectedDonorForProfile.donor.phone})
                  </Button>
                </a>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: DECLINE REASON DIALOG */}
      <Dialog
        open={Boolean(declineTarget)}
        onOpenChange={(open) => !open && setDeclineTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertCircle className="w-5 h-5" />
              Decline Donation Offer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please specify the reason why you are declining this offer from{" "}
              <span className="font-semibold text-foreground">
                {declineTarget?.donor?.name || "this donor"}
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
                    onClick={() => setDeclineReason(preset)}
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
                onChange={(e) => setDeclineReason(e.target.value)}
                maxLength={250}
                className="w-full text-xs rounded-md border border-input bg-background p-2.5 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 leading-relaxed"
                disabled={isSubmittingDecline}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Required field</span>
                <span>{declineReason.length} / 250</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeclineTarget(null)}
              disabled={isSubmittingDecline}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
              onClick={handleConfirmDecline}
              disabled={isSubmittingDecline || !declineReason.trim()}
            >
              {isSubmittingDecline ? (
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
    </>
  );
}
