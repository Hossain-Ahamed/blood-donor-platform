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
import { Badge } from "@/components/ui/badge";
import { apiClient, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { Users, HeartHandshake } from "lucide-react";
import { RequesterResponseItem } from "./RequesterResponseItem";
import { DonorProfileModal } from "./DonorProfileModal";
import { DeclineResponseModal } from "./DeclineResponseModal";

export interface RequesterDonorResponse {
  id: string;
  request_id: string;
  donor_id: string;
  status: "OFFERED" | "ACCEPTED" | "DECLINED" | "CANCELLED" | string;
  message?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  donation?: {
    id: string;
    donation_date: string;
    confirmed_by_donor: boolean;
    confirmed_by_requester: boolean;
  } | null;
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
  const [isConfirmingId, setIsConfirmingId] = useState<string | null>(null);

  const handleConfirmBloodReceived = async (
    response: RequesterDonorResponse,
  ) => {
    setIsConfirmingId(response.id);
    try {
      await apiClient.request(`/donations/response/${response.id}/confirm`, {
        method: "PATCH",
        body: JSON.stringify({ confirmed: true }),
      });

      setResponses((prev) =>
        prev.map((r) =>
          r.id === response.id
            ? {
                ...r,
                donation: {
                  id: r.donation?.id || "",
                  donation_date:
                    r.donation?.donation_date || new Date().toISOString(),
                  confirmed_by_donor: r.donation?.confirmed_by_donor || false,
                  confirmed_by_requester: true,
                },
              }
            : r,
        ),
      );

      toast.success(
        `Blood donation from ${response.donor?.name || "donor"} confirmed as received!`,
      );
      router.refresh();
    } catch (err) {
      console.error("Failed to confirm blood donation:", err);
      toast.error("Failed to confirm blood donation. Please try again.");
    } finally {
      setIsConfirmingId(null);
    }
  };

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
              {responses.map((item) => (
                <RequesterResponseItem
                  key={item.id}
                  item={item}
                  isAccepting={isAcceptingId === item.id}
                  isConfirming={isConfirmingId === item.id}
                  onViewProfile={(res) => setSelectedDonorForProfile(res)}
                  onAccept={handleAccept}
                  onDecline={handleOpenDeclineModal}
                  onConfirmBloodReceived={handleConfirmBloodReceived}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DonorProfileModal
        response={selectedDonorForProfile}
        isAccepting={isAcceptingId === selectedDonorForProfile?.id}
        isConfirming={isConfirmingId === selectedDonorForProfile?.id}
        onClose={() => setSelectedDonorForProfile(null)}
        onAccept={handleAccept}
        onDecline={(target) => {
          setSelectedDonorForProfile(null);
          handleOpenDeclineModal(target);
        }}
        onConfirmDonation={(target) => {
          handleConfirmBloodReceived(target);
          setSelectedDonorForProfile((prev) =>
            prev
              ? {
                  ...prev,
                  donation: {
                    id: prev.donation?.id || "",
                    donation_date:
                      prev.donation?.donation_date || new Date().toISOString(),
                    confirmed_by_donor:
                      prev.donation?.confirmed_by_donor || false,
                    confirmed_by_requester: true,
                  },
                }
              : null,
          );
        }}
      />

      <DeclineResponseModal
        target={declineTarget}
        declineReason={declineReason}
        isSubmitting={isSubmittingDecline}
        onReasonChange={setDeclineReason}
        onClose={() => setDeclineTarget(null)}
        onConfirm={handleConfirmDecline}
      />
    </>
  );
}
