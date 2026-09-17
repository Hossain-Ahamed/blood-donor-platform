import Link from "next/link";
import { apiServer } from "@/lib/api/server";
import {
  bloodGroupLabels,
  urgencyLabels,
  componentTypeLabels,
  requestStatusLabels,
  getLabel,
} from "@/lib/labels";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { RequestManagementCard } from "./RequestManagementCard";
import {
  DonorResponseActionCard,
  type DonorResponse,
} from "./DonorResponseActionCard";
import {
  RequesterResponsesCard,
  type RequesterDonorResponse,
} from "./RequesterResponsesCard";
import type { BloodRequest, DonorProfile, User } from "@repo/shared";

type BloodRequestDetail = BloodRequest & {
  location?: {
    type: string;
    coordinates: [number, number];
  };
  requester?: {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
  requester_profile?: {
    area_name?: string | null;
    blood_group?: string | null;
    is_available?: boolean;
    last_donation_date?: string | null;
  } | null;
};

type ProfileWithUser = DonorProfile & { user?: User };

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let request: BloodRequestDetail | null = null;
  let user: User | null = null;
  let profile: ProfileWithUser | null = null;
  let myResponse: DonorResponse | null = null;
  let responses: RequesterDonorResponse[] = [];

  try {
    const [reqRes, userRes, profileRes, myRespRes, responsesRes] =
      await Promise.allSettled([
        apiServer.request<{ data: BloodRequestDetail } | BloodRequestDetail>(
          `/requests/${id}`,
        ),
        apiServer.request<{ data: User } | User>("/users/me"),
        apiServer.request<{ data: ProfileWithUser } | ProfileWithUser>(
          "/donor-profiles/me",
        ),
        apiServer.request<{ data: DonorResponse } | DonorResponse>(
          `/requests/${id}/my-response`,
        ),
        apiServer.request<
          { data: RequesterDonorResponse[] } | RequesterDonorResponse[]
        >(`/requests/${id}/responses`),
      ]);

    if (reqRes.status === "fulfilled") {
      const val = reqRes.value;
      request =
        "data" in val && val.data ? val.data : (val as BloodRequestDetail);
    }
    if (userRes.status === "fulfilled") {
      const val = userRes.value;
      user = "data" in val && val.data ? val.data : (val as User);
    }
    if (profileRes.status === "fulfilled") {
      const val = profileRes.value;
      profile = "data" in val && val.data ? val.data : (val as ProfileWithUser);
    }
    if (myRespRes.status === "fulfilled" && myRespRes.value) {
      const val = myRespRes.value;
      myResponse =
        "data" in val && val.data ? val.data : (val as DonorResponse);
    }
    if (responsesRes.status === "fulfilled" && responsesRes.value) {
      const val = responsesRes.value;
      responses = Array.isArray(val)
        ? val
        : "data" in val && Array.isArray(val.data)
          ? val.data
          : [];
    }
  } catch (error) {
    console.error(error);
  }

  if (!request) {
    notFound();
  }

  const isOwnRequest = user?.id === request.requester_id;
  const isProfileComplete = Boolean(profile && profile.blood_group);

  const coordinates = request.location?.coordinates;
  const hasCoords = Boolean(
    coordinates &&
    Array.isArray(coordinates) &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number",
  );
  const [lng, lat] = hasCoords && coordinates ? coordinates : [0, 0];
  const googleDirectionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : "#";
  const googleSearchUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : "#";

  const requester = request.requester;
  const requesterArea =
    request.requester_profile?.area_name || request.area_name;
  const requesterInitials = requester?.name
    ? requester.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "R";

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Need {getLabel(bloodGroupLabels, request.blood_group)}
          </h1>
          <p className="text-muted-foreground mt-2">
            Requested on {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge
          variant={request.urgency === "CRITICAL" ? "destructive" : "default"}
          className="text-lg px-4 py-1"
        >
          {getLabel(urgencyLabels, request.urgency)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Requester Profile Card */}
          <Card className="border-red-100 dark:border-red-950/60 shadow-xs bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-red-600" />
                  Request Posted By
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs font-medium border-red-200 text-red-700 dark:text-red-400"
                >
                  Requester Profile
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <Avatar className="h-12 w-12 border border-muted-foreground/20 shrink-0 shadow-xs">
                    <AvatarImage
                      src={requester?.avatar_url || undefined}
                      alt={requester?.name || "Requester"}
                    />
                    <AvatarFallback className="font-bold bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
                      {requesterInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-foreground">
                        {requester?.name || "Verified Community Member"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{requesterArea}</span>
                      </span>
                      <span>•</span>
                      <span>
                        Posted on{" "}
                        {new Date(request.created_at).toLocaleDateString(
                          undefined,
                          { dateStyle: "medium" },
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {request.contact_phone && (
                  <a href={`tel:${request.contact_phone}`} className="shrink-0">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-xs h-9 px-3.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call {requester?.name?.split(" ")[0] || "Requester"}
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient & Medical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.contact_phone && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/80 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Requester / Emergency Contact
                    </p>
                    <p className="text-base sm:text-lg font-black text-foreground tracking-tight">
                      {request.contact_phone}
                    </p>
                  </div>
                  <a href={`tel:${request.contact_phone}`}>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-sm h-9 px-3.5"
                    >
                      <Phone className="w-4 h-4" />
                      Call Requester
                    </Button>
                  </a>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {request.patient_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Patient Name
                    </p>
                    <p className="font-semibold text-base">
                      {request.patient_name}
                    </p>
                  </div>
                )}
                {request.patient_age !== undefined &&
                  request.patient_age !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Patient Age
                      </p>
                      <p className="font-semibold text-base">
                        {request.patient_age} years
                      </p>
                    </div>
                  )}
                {request.disease && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Disease / Reason
                    </p>
                    <p className="font-semibold text-base text-red-600 dark:text-red-400">
                      {request.disease}
                    </p>
                  </div>
                )}
                {request.needed_time && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Exact Time Needed
                    </p>
                    <p className="font-semibold text-base">
                      {new Date(request.needed_time).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">
                    Component Type
                  </p>
                  <p className="font-medium">
                    {getLabel(componentTypeLabels, request.component_type)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Units Needed</p>
                  <p className="font-medium">
                    {request.units_fulfilled} / {request.units_needed} bags
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Hospital & Area
                  </p>
                  <p className="font-medium">
                    {request.hospital_name
                      ? `${request.hospital_name} (${request.area_name})`
                      : request.area_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {getLabel(requestStatusLabels, request.status)}
                  </p>
                </div>
              </div>

              {request.patient_note && (
                <div className="mt-4 p-4 bg-muted/50 rounded-md border border-muted">
                  <p className="text-sm font-medium mb-1 text-muted-foreground">
                    Note from requester:
                  </p>
                  <p className="text-sm">{request.patient_note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
                  <MapPin className="w-5 h-5 text-red-600 shrink-0" />
                  Hospital & Location Details
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {request.hospital_name
                    ? `${request.hospital_name}, ${request.area_name}`
                    : request.area_name}
                </CardDescription>
              </div>

              {hasCoords && (
                <div className="flex items-center gap-2">
                  <a
                    href={googleDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 h-8 px-3"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Get Directions
                    </Button>
                  </a>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-72 w-full rounded-xl overflow-hidden border shadow-inner bg-muted/20 relative">
                {hasCoords ? (
                  <iframe
                    title="Hospital Location on Google Maps"
                    src={`https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    Location coordinates not provided
                  </div>
                )}
              </div>

              {hasCoords && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="font-medium text-foreground">
                      {request.hospital_name || request.area_name}
                    </span>
                    <span>
                      ({lat.toFixed(5)}, {lng.toFixed(5)})
                    </span>
                  </span>

                  <div className="flex items-center gap-3">
                    <a
                      href={googleSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 font-semibold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <RequesterResponsesCard
            requestId={id}
            initialResponses={responses}
            isRequesterOrAdmin={Boolean(isOwnRequest || user?.role === "ADMIN")}
          />
        </div>

        <div className="space-y-6">
          {(isOwnRequest || user?.role === "ADMIN") && (
            <RequestManagementCard
              request={request}
              isOwnRequest={Boolean(isOwnRequest)}
              isAdmin={user?.role === "ADMIN"}
            />
          )}

          {!isOwnRequest && (
            <>
              {!user ? (
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Can you help?</CardTitle>
                    <CardDescription>
                      Offer to donate blood for this request.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        You must be logged in to offer a blood donation for this
                        request.
                      </p>
                      <Link href={`/login?redirect=/requests/${id}`}>
                        <Button
                          size="lg"
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          Login to Donate
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : !isProfileComplete ? (
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Can you help?</CardTitle>
                    <CardDescription>
                      Offer to donate blood for this request.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium text-center">
                        Profile Information Required
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        You need to complete your donor profile (with your blood
                        group and location) before responding.
                      </p>
                      <Link href={`/profile?redirect=/requests/${id}`}>
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-full border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                        >
                          Complete Profile to Respond
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <DonorResponseActionCard
                  requestId={id}
                  initialResponse={myResponse}
                  requestStatus={request.status}
                  requesterContactPhone={request.contact_phone}
                  requesterName={request.patient_name}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
