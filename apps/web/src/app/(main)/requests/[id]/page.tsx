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
import {
  MapPin,
  Navigation,
  ExternalLink,
  ShieldCheck,
  User as UserIcon,
  Phone,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RequestManagementCard } from "./RequestManagementCard";
import {
  DonorResponseActionCard,
  type DonorResponse,
} from "./DonorResponseActionCard";
import {
  RequesterResponsesCard,
  type RequesterDonorResponse,
} from "./RequesterResponsesCard";
import type {
  BloodRequest,
  DonorProfile,
  User,
  BloodGroup,
} from "@repo/shared";

type BloodRequestDetail = BloodRequest & {
  location?: {
    type: string;
    coordinates: [number, number];
  };
  requester?: {
    id: string;
    name: string;
    avatar_url?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string;
    created_at?: string | Date;
  } | null;
  requester_profile?: {
    area_name?: string | null;
    blood_group?: BloodGroup | null;
    is_available?: boolean | null;
    last_donation_date?: string | Date | null;
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

  try {
    const [reqRes, userRes, profileRes, myRespRes] = await Promise.allSettled([
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
  } catch (error) {
    console.error(error);
  }

  if (!request) {
    notFound();
  }

  const isOwnRequest = user?.id === request.requester_id;
  const isProfileComplete = Boolean(profile && profile.blood_group);
  const userPhone = user?.phone?.trim() || profile?.user?.phone?.trim();
  const hasPhone = Boolean(userPhone);

  let responses: RequesterDonorResponse[] = [];
  if (isOwnRequest || user?.role === "ADMIN") {
    try {
      const respRes = await apiServer.request<
        { data: RequesterDonorResponse[] } | RequesterDonorResponse[]
      >(`/requests/${id}/responses`);
      responses = Array.isArray(respRes)
        ? respRes
        : "data" in respRes && Array.isArray(respRes.data)
          ? respRes.data
          : [];
    } catch (e) {
      console.error("Failed to fetch responses for request:", e);
    }
  }

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

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Need {getLabel(bloodGroupLabels, request.blood_group)}
          </h1>
          <div className="flex items-center gap-2.5 mt-3">
            <Avatar className="h-9 w-9 border border-muted-foreground/20 shadow-sm shrink-0">
              <AvatarImage
                src={request.requester?.avatar_url || undefined}
                alt={request.requester?.name || "Requester"}
              />
              <AvatarFallback className="font-semibold text-xs bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400">
                {request.requester?.name
                  ? request.requester.name.charAt(0).toUpperCase()
                  : "R"}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">
              Posted by{" "}
              <span className="font-semibold text-foreground">
                {request.requester?.name || "Anonymous Requester"}
              </span>{" "}
              •{" "}
              {new Date(request.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          {user?.role === "ADMIN" && (
            <Link href={`/admin/requests?requestId=${request.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50 flex items-center gap-1.5 font-semibold text-xs h-9 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                <span>Show full detail</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-70" />
              </Button>
            </Link>
          )}

          <Badge
            variant={request.urgency === "CRITICAL" ? "destructive" : "default"}
            className="text-base md:text-lg px-4 py-1"
          >
            {getLabel(urgencyLabels, request.urgency)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Requester Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-red-600 shrink-0" />
                Requester Information
              </CardTitle>
              <CardDescription className="text-xs">
                Details of the person who initiated this blood request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-muted-foreground/20 shadow-sm shrink-0">
                  <AvatarImage
                    src={request.requester?.avatar_url || undefined}
                    alt={request.requester?.name || "Requester"}
                  />
                  <AvatarFallback className="font-bold text-lg bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400">
                    {request.requester?.name
                      ? request.requester.name.charAt(0).toUpperCase()
                      : "R"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-base text-foreground truncate">
                      {request.requester?.name || "Anonymous Requester"}
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-xs font-semibold"
                    >
                      Requester
                    </Badge>
                    {isOwnRequest && (
                      <Badge
                        variant="outline"
                        className="text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-800"
                      >
                        Your Request
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-muted-foreground pt-0.5">
                    <span>
                      Posted on{" "}
                      {new Date(request.created_at).toLocaleString(
                        undefined,
                        {
                          dateStyle: "medium",
                          timeStyle: "short",
                        },
                      )}
                    </span>
                    {(request.requester_profile?.area_name ||
                      request.area_name) && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          {request.requester_profile?.area_name ||
                            request.area_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {request.requester?.phone ? (
                <div className="mt-4 pt-3.5 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50/60 dark:bg-red-950/20 p-3.5 rounded-xl border border-red-100 dark:border-red-900/40">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        Requester Call Number
                      </span>
                      <a
                        href={`tel:${request.requester.phone}`}
                        className="font-bold text-base text-red-700 dark:text-red-300 hover:underline tracking-wide font-mono"
                      >
                        {request.requester.phone}
                      </a>
                    </div>
                  </div>
                  <a href={`tel:${request.requester.phone}`}>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4 shadow-sm flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Requester
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground italic">
                  Requester phone number not available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient & Medical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div>
                  <p className="text-sm text-muted-foreground">
                    Form Contact Phone
                  </p>
                  {request.contact_phone ? (
                    <a
                      href={`tel:${request.contact_phone}`}
                      className="font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {request.contact_phone}
                    </a>
                  ) : (
                    <p className="font-medium">Not provided</p>
                  )}
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

          {(isOwnRequest || user?.role === "ADMIN") && (
            <RequesterResponsesCard
              requestId={id}
              initialResponses={responses}
            />
          )}
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
                    </div>

                    {request.contact_phone && (
                      <div className="rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3.5 text-center space-y-2">
                        <span className="text-xs text-muted-foreground font-medium block">
                          Form Contact Phone (Public):
                        </span>
                        <a
                          href={`tel:${request.contact_phone}`}
                          className="font-bold text-base text-red-600 dark:text-red-400 hover:underline flex items-center justify-center gap-1.5 tracking-wide"
                        >
                          <Phone className="w-4 h-4" />
                          {request.contact_phone}
                        </a>
                        <a href={`tel:${request.contact_phone}`} className="block pt-1">
                          <Button
                            size="sm"
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8 shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call Now
                          </Button>
                        </a>
                      </div>
                    )}

                    <div className="space-y-2.5 text-center pt-1">
                      <p className="text-xs text-muted-foreground">
                        Sign in to offer blood donation and track coordination directly.
                      </p>
                      <Link href={`/login?redirect=/requests/${id}`}>
                        <Button
                          size="lg"
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                          Login to Offer Blood
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : !isProfileComplete ? (
                <Card className="sticky top-24 shadow-sm">
                  <CardHeader>
                    <CardTitle>Can you help?</CardTitle>
                    <CardDescription>
                      Offer to donate blood for this request.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.contact_phone && (
                      <div className="rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3.5 text-center space-y-2">
                        <span className="text-xs text-muted-foreground font-medium block">
                          Need to coordinate immediately?
                        </span>
                        <a
                          href={`tel:${request.contact_phone}`}
                          className="font-bold text-base text-red-600 dark:text-red-400 hover:underline flex items-center justify-center gap-1.5"
                        >
                          <Phone className="w-4 h-4" />
                          {request.contact_phone}
                        </a>
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium text-center">
                        Profile Information Required
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        Please ensure your donor profile has your blood group
                        and location before offering to donate.
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
              ) : !hasPhone ? (
                <Card className="sticky top-24 border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-amber-800 dark:text-amber-300">
                      Contact Number Required
                    </CardTitle>
                    <CardDescription>
                      Add your phone number to respond as a donor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground text-center">
                        Requesters need your direct phone number to coordinate
                        urgently when accepting your blood donation offer.
                      </p>
                      <Link href={`/profile?redirect=/requests/${id}`}>
                        <Button
                          size="lg"
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Add Contact Number in Profile
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
                  requesterName={
                    request.requester?.name || request.patient_name
                  }
                  donorPhone={userPhone}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
