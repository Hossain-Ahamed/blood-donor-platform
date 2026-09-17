import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MapPin,
  AlertCircle,
  Phone,
  HeartHandshake,
} from "lucide-react";
import { bloodGroupLabels, urgencyLabels, getLabel } from "@/lib/labels";

export type AppliedResponseItem = {
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
    confirmed_by_requester?: boolean;
  } | null;
  request?: {
    id: string;
    blood_group: string;
    hospital_name?: string | null;
    area_name?: string;
    patient_name?: string | null;
    disease?: string | null;
    status: string;
    urgency: string;
    needed_time?: string | null;
    contact_phone?: string | null;
  } | null;
};

interface HistoryApplicationCardProps {
  item: AppliedResponseItem;
  confirmDonationAction: (formData: FormData) => Promise<void>;
}

export function HistoryApplicationCard({
  item,
  confirmDonationAction,
}: HistoryApplicationCardProps) {
  const req = item.request;
  const requestId = item.request_id || req?.id;

  return (
    <Card className="transition-all hover:border-red-300 hover:shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                {req?.blood_group ? (
                  <span className="text-red-600 dark:text-red-400 font-black">
                    Need {getLabel(bloodGroupLabels, req.blood_group)}
                  </span>
                ) : (
                  <span>Blood Request</span>
                )}
              </CardTitle>

              {item.status === "OFFERED" && (
                <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending Requester Review
                </Badge>
              )}
              {item.status === "ACCEPTED" && (
                <Badge
                  className={
                    item.donation?.confirmed_by_donor ||
                    item.donation?.confirmed_by_requester
                      ? "bg-emerald-600 hover:bg-emerald-600 text-white text-xs"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  }
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {item.donation?.confirmed_by_donor ||
                  item.donation?.confirmed_by_requester
                    ? "Donation Completed"
                    : "Accepted Offer"}
                </Badge>
              )}
              {item.status === "DECLINED" && (
                <Badge variant="secondary" className="text-xs">
                  <XCircle className="w-3 h-3 mr-1" />
                  Declined
                </Badge>
              )}
              {item.status === "CANCELLED" && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Cancelled
                </Badge>
              )}

              {req?.urgency && (
                <Badge
                  variant={req.urgency === "CRITICAL" ? "destructive" : "outline"}
                  className="text-xs"
                >
                  {getLabel(urgencyLabels, req.urgency)}
                </Badge>
              )}
            </div>

            <CardDescription className="text-xs">
              You offered on{" "}
              {new Date(item.created_at).toLocaleDateString(undefined, {
                dateStyle: "medium",
              })}
            </CardDescription>
          </div>

          {requestId && (
            <Link href={`/requests/${requestId}`}>
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-semibold border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 flex items-center gap-1 shrink-0"
              >
                View Full Details
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          {req?.patient_name && (
            <p>
              <strong className="text-foreground">Patient:</strong> {req.patient_name}
            </p>
          )}
          {req?.disease && (
            <p>
              <strong className="text-foreground">Disease / Reason:</strong>{" "}
              <span className="text-red-600 dark:text-red-400 font-medium">
                {req.disease}
              </span>
            </p>
          )}
          {(req?.hospital_name || req?.area_name) && (
            <p className="flex items-center gap-1 sm:col-span-2">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <strong className="text-foreground">Location:</strong>{" "}
              {req.hospital_name ? `${req.hospital_name}, ${req.area_name}` : req.area_name}
            </p>
          )}
        </div>

        {item.status === "DECLINED" && item.rejection_reason && (
          <div className="p-2.5 bg-muted/60 rounded-md border border-muted text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Decline Reason:</span>{" "}
              <span>&ldquo;{item.rejection_reason}&rdquo;</span>
            </div>
          </div>
        )}

        {req?.contact_phone && (item.status === "OFFERED" || item.status === "ACCEPTED") && (
          <div className="flex items-center justify-between pt-2 border-t border-muted/60 text-xs">
            <span className="text-muted-foreground">
              Requester phone: <strong className="text-foreground">{req.contact_phone}</strong>
            </span>
            <a href={`tel:${req.contact_phone}`}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                Call Requester
              </Button>
            </a>
          </div>
        )}

        {item.status === "ACCEPTED" && (
          <div className="pt-2 border-t border-muted/60">
            {item.donation?.confirmed_by_donor || item.donation?.confirmed_by_requester ? (
              <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-md text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold">Donation Confirmed & Completed!</span>
                  <span className="ml-1 text-muted-foreground">
                    {item.donation?.confirmed_by_donor && item.donation?.confirmed_by_requester
                      ? "(Confirmed by both you and the requester)"
                      : item.donation?.confirmed_by_donor
                        ? "(Confirmed by you)"
                        : "(Confirmed by requester)"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-emerald-600" />
                    Have you completed donating blood for this request?
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Either you or the requester can confirm. Confirming logs your donation and begins your rest period.
                  </p>
                </div>
                <form action={confirmDonationAction}>
                  <input type="hidden" name="responseId" value={item.id} />
                  {item.donation?.id && (
                    <input type="hidden" name="donationId" value={item.donation.id} />
                  )}
                  <Button
                    size="sm"
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Donation Completed
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
