import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { apiServer } from "@/lib/api/server";
import {
  bloodGroupLabels,
  requestStatusLabels,
  urgencyLabels,
  getLabel,
} from "@/lib/labels";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";

type BloodRequest = {
  id: string;
  blood_group: string;
  created_at: string;
  status: string;
  area_name: string;
  hospital_name?: string | null;
  units_fulfilled: number;
  units_needed: number;
};

type AppliedResponse = {
  id: string;
  request_id: string;
  donor_id: string;
  status: "OFFERED" | "ACCEPTED" | "DECLINED" | "CANCELLED" | string;
  message?: string | null;
  rejection_reason?: string | null;
  created_at: string;
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

type Donation = {
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

async function confirmDonationAction(formData: FormData) {
  "use server";
  const donationId = formData.get("donationId") as string;
  if (!donationId) return;
  try {
    await apiServer.request(`/donations/${donationId}/confirm`, {
      method: "PATCH",
    });
    revalidatePath("/history");
  } catch (err) {
    console.error("Failed to confirm donation:", err);
  }
}

export default async function HistoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    redirect("/login?redirect=/history");
  }

  let requests: BloodRequest[] = [];
  let donations: Donation[] = [];
  let appliedResponses: AppliedResponse[] = [];

  try {
    const [reqData, donData, respData] = await Promise.all([
      apiServer
        .request<{ data: BloodRequest[] } | BloodRequest[]>("/requests/me")
        .catch(() => []),
      apiServer
        .request<{ data: Donation[] } | Donation[]>("/donations/me")
        .catch(() => []),
      apiServer
        .request<{ data: AppliedResponse[] } | AppliedResponse[]>(
          "/responses/me",
        )
        .catch(() => []),
    ]);

    requests = Array.isArray(reqData) ? reqData : reqData?.data || [];
    donations = Array.isArray(donData) ? donData : donData?.data || [];
    appliedResponses = Array.isArray(respData)
      ? respData
      : respData?.data || [];
  } catch (e) {
    console.error(e);
  }

  const totalDonationItems = Math.max(
    appliedResponses.length,
    donations.length,
  );

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your blood requests, applied volunteer offers, and
          donation history.
        </p>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-100">
          <TabsTrigger value="requests">
            My Requests ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="donations">
            My Donations ({totalDonationItems})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6 space-y-4">
          {requests.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <p>You haven&apos;t made any blood requests yet.</p>
                <Link href="/requests/new" className="mt-4">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Create a Blood Request
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            requests.map((r) => (
              <Card key={r.id} className="transition-all hover:border-red-300">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-red-600 dark:text-red-400 font-black">
                          {getLabel(bloodGroupLabels, r.blood_group)}
                        </span>
                        <span>Request</span>
                      </CardTitle>
                      <CardDescription>
                        Created on {new Date(r.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        r.status === "OPEN"
                          ? "default"
                          : r.status === "FULFILLED"
                            ? "secondary"
                            : r.status === "CANCELLED"
                              ? "destructive"
                              : "outline"
                      }
                      className="text-xs uppercase font-semibold"
                    >
                      {getLabel(requestStatusLabels, r.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <strong>Area:</strong> {r.area_name}
                    </p>
                    <p>
                      <strong>Units:</strong> {r.units_fulfilled} /{" "}
                      {r.units_needed} bags
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/requests/${r.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-medium border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                      >
                        View & Manage &rarr;
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="donations" className="mt-6 space-y-6">
          {appliedResponses.length === 0 && donations.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <HeartHandshake className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-foreground">
                  No donation history or offers found
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  When you volunteer to donate for open requests, your offers
                  and donation records will appear here.
                </p>
                <Link href="/browse" className="mt-4">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Find Blood Requests
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {appliedResponses.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-red-600" />
                      Your Donation Offers ({appliedResponses.length})
                    </h3>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Click any offer to review full request details
                    </span>
                  </div>

                  <div className="space-y-3">
                    {appliedResponses.map((item) => {
                      const req = item.request;
                      const requestId = item.request_id || req?.id;

                      return (
                        <Card
                          key={item.id}
                          className="transition-all hover:border-red-300 hover:shadow-xs"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    {req?.blood_group ? (
                                      <span className="text-red-600 dark:text-red-400 font-black">
                                        Need{" "}
                                        {getLabel(
                                          bloodGroupLabels,
                                          req.blood_group,
                                        )}
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
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Accepted Offer
                                    </Badge>
                                  )}
                                  {item.status === "DECLINED" && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Declined
                                    </Badge>
                                  )}
                                  {item.status === "CANCELLED" && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs text-muted-foreground"
                                    >
                                      Cancelled
                                    </Badge>
                                  )}

                                  {req?.urgency && (
                                    <Badge
                                      variant={
                                        req.urgency === "CRITICAL"
                                          ? "destructive"
                                          : "outline"
                                      }
                                      className="text-xs"
                                    >
                                      {getLabel(urgencyLabels, req.urgency)}
                                    </Badge>
                                  )}
                                </div>

                                <CardDescription className="text-xs">
                                  You offered on{" "}
                                  {new Date(
                                    item.created_at,
                                  ).toLocaleDateString(undefined, {
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
                                  <strong className="text-foreground">
                                    Patient:
                                  </strong>{" "}
                                  {req.patient_name}
                                </p>
                              )}
                              {req?.disease && (
                                <p>
                                  <strong className="text-foreground">
                                    Disease / Reason:
                                  </strong>{" "}
                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                    {req.disease}
                                  </span>
                                </p>
                              )}
                              {(req?.hospital_name || req?.area_name) && (
                                <p className="flex items-center gap-1 sm:col-span-2">
                                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                  <strong className="text-foreground">
                                    Location:
                                  </strong>{" "}
                                  {req.hospital_name
                                    ? `${req.hospital_name}, ${req.area_name}`
                                    : req.area_name}
                                </p>
                              )}
                            </div>

                            {item.status === "DECLINED" &&
                              item.rejection_reason && (
                                <div className="p-2.5 bg-muted/60 rounded-md border border-muted text-xs text-muted-foreground flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold text-foreground">
                                      Decline Reason:
                                    </span>{" "}
                                    <span>
                                      &ldquo;{item.rejection_reason}&rdquo;
                                    </span>
                                  </div>
                                </div>
                              )}

                            {req?.contact_phone &&
                              (item.status === "OFFERED" ||
                                item.status === "ACCEPTED") && (
                                <div className="flex items-center justify-between pt-2 border-t border-muted/60 text-xs">
                                  <span className="text-muted-foreground">
                                    Requester phone:{" "}
                                    <strong className="text-foreground">
                                      {req.contact_phone}
                                    </strong>
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
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {donations.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Confirmed Blood Donations ({donations.length})
                  </h3>

                  <div className="space-y-3">
                    {donations.map((d) => {
                      const req = d.response?.request;
                      const requestId = d.response?.request_id || req?.id;

                      return (
                        <Card key={d.id}>
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
                                      {getLabel(
                                        bloodGroupLabels,
                                        req.blood_group,
                                      )}
                                    </Badge>
                                  )}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  Donation Date:{" "}
                                  {new Date(
                                    d.donation_date,
                                  ).toLocaleDateString(undefined, {
                                    dateStyle: "medium",
                                  })}
                                </CardDescription>
                              </div>

                              <div className="flex items-center gap-2">
                                {d.confirmed_by_donor ? (
                                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Confirmed
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
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

                            {!d.confirmed_by_donor && (
                              <form action={confirmDonationAction}>
                                <input
                                  type="hidden"
                                  name="donationId"
                                  value={d.id}
                                />
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
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
