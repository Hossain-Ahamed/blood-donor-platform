import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { bloodGroupLabels, getLabel } from "@/lib/labels";

export type DonationItem = {
  id: string;
  donation_date: string;
  confirmed_by_donor: boolean;
  confirmed_by_requester?: boolean;
  response?: {
    id: string;
    request_id: string;
    status: string;
    request?: {
      id: string;
      blood_group: string;
      hospital_name?: string | null;
      area_name?: string;
      patient_name?: string | null;
      status: string;
      urgency: string;
      contact_phone?: string | null;
    } | null;
  } | null;
};

interface HistoryDonationCardProps {
  donation: DonationItem;
  confirmDonationAction: (formData: FormData) => Promise<void>;
}

export function HistoryDonationCard({
  donation,
  confirmDonationAction,
}: HistoryDonationCardProps) {
  const req = donation.response?.request;
  const requestId = donation.response?.request_id || req?.id;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span>Blood Donation</span>
              {req?.blood_group && (
                <Badge
                  variant="outline"
                  className="font-bold border-red-300 text-red-600 dark:text-red-400"
                >
                  {getLabel(bloodGroupLabels, req.blood_group)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Donation Date:{" "}
              {new Date(donation.donation_date).toLocaleDateString(undefined, {
                dateStyle: "medium",
              })}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {donation.confirmed_by_donor ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Confirmed
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Pending Donor Confirmation
              </Badge>
            )}

            {requestId && (
              <Link href={`/requests/${requestId}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-medium flex items-center gap-1 h-7"
                >
                  View Request &rarr;
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-1">
        {req && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
            {req.patient_name && (
              <span>
                Patient: <strong>{req.patient_name}</strong>
              </span>
            )}
            {(req.hospital_name || req.area_name) && (
              <span>
                Location:{" "}
                <strong>
                  {req.hospital_name
                    ? `${req.hospital_name}, ${req.area_name}`
                    : req.area_name}
                </strong>
              </span>
            )}
          </div>
        )}

        {!donation.confirmed_by_donor && (
          <form action={confirmDonationAction}>
            <input type="hidden" name="donationId" value={donation.id} />
            <Button
              size="sm"
              variant="outline"
              type="submit"
              className="mt-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 text-xs"
            >
              Confirm Donation Completed
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
