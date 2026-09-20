import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  Droplet,
  ShieldCheck,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Activity,
  FileText,
  Lock,
} from "lucide-react";
import { apiServer } from "@/lib/api/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import { formatBloodGroup, toHumanReadable, FriendProfileDetail } from "@repo/shared";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect(`/login?redirect=/friends/${id}`);
  }

  let detail: FriendProfileDetail | null = null;
  let shouldRedirectToLogin = false;
  let isRestricted = false;
  let restrictedMessage = "";

  try {
    const res = await apiServer.request<FriendProfileDetail>(
      `/friends/${id}/profile`,
    );
    if (res && res.user) {
      detail = res;
    }
  } catch (err: any) {
    if (err?.status === 401 || err?.statusCode === 401) {
      shouldRedirectToLogin = true;
    } else if (err?.status === 403 || err?.statusCode === 403) {
      isRestricted = true;
      restrictedMessage =
        err?.data?.message ||
        "This profile is only visible while there is an active blood request, or to friends and connected donors.";
    } else {
      console.error("Failed to load friend profile:", err);
    }
  }

  if (shouldRedirectToLogin) {
    redirect(`/login?redirect=/friends/${id}`);
  }

  if (isRestricted) {
    return (
      <div className="container max-w-xl mx-auto py-12 px-4 space-y-6">
        <div>
          <Link
            href="/friends"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Friends
          </Link>
        </div>

        <Card className="border shadow-sm text-center overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-red-600/20 via-rose-600/20 to-red-600/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-background border shadow-sm flex items-center justify-center -mb-8">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <CardContent className="pt-8 pb-8 px-6 space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight">Profile Restricted</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                {restrictedMessage}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border text-xs text-muted-foreground max-w-md mx-auto text-left space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                Community Privacy Policy
              </p>
              <p>
                Profiles on RoktoLink are only public when a user has an active blood request, or to their accepted friends and donors who have connected on requests.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <FriendActionButton targetUserId={id} size="default" />
           
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!detail) {
    notFound();
  }

  const { user, profile, relationship, friendship_id, donations, requests } =
    detail;
  const isFriends = relationship === "FRIENDS";
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="container max-w-4xl mx-auto py-6 sm:py-8 px-4 space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/friends"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Friends
        </Link>
      </div>

      {/* Profile Header Card */}
      <Card className="border bg-card shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-red-600 via-rose-600 to-red-700" />
        <CardContent className="p-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 mb-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-md shrink-0">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                <AvatarFallback className="text-2xl font-bold bg-red-100 text-red-600">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
                    {user.name}
                  </h1>
                  {profile?.blood_group && (
                    <Badge className="bg-red-600 text-white font-black px-2.5 py-0.5 text-xs shadow-sm">
                      {formatBloodGroup(profile.blood_group)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Member since{" "}
                  {new Date(user.created_at).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-end">
              <FriendActionButton
                targetUserId={user.id}
                initialStatus={relationship}
                initialFriendshipId={friendship_id || undefined}
                size="default"
              />
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="text-xs sm:text-sm text-foreground/90 italic bg-muted/40 p-3 rounded-lg my-3 border border-border/40">
              &quot;{profile.bio}&quot;
            </p>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground">Location</span>
              <p className="font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate">{profile?.area_name || "Not specified"}</span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground">Donation Status</span>
              <p className="font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${profile?.is_available ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                <span>{profile?.is_available ? "Available" : "In Cooldown"}</span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground">Last Donation</span>
              <p className="font-semibold">
                {profile?.last_donation_date
                  ? new Date(profile.last_donation_date).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" },
                    )
                  : "None recorded"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground">Total Donations</span>
              <p className="font-semibold text-red-600 font-bold">
                {donations.length} life-saving donation(s)
              </p>
            </div>
          </div>

          {/* Contact Details Banner */}
          <div className="mt-4 pt-4 border-t">
            {isFriends ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    You are connected as Friends
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can contact this donor directly in emergency situations.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {user.phone && (
                    <a href={`tel:${user.phone}`}>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold text-xs h-9"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call {user.phone}
                      </Button>
                    </a>
                  )}
                  {user.email && (
                    <a href={`mailto:${user.email}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-9"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-muted-foreground">
                <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>
                  Direct contact phone number and emergency coordination are visible once you both accept a friend request.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Donation History & Requests */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl grid grid-cols-2 max-w-md h-11">
          <TabsTrigger
            value="history"
            className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Activity className="w-4 h-4 text-red-600" />
            <span>Donation History ({donations.length})</span>
          </TabsTrigger>

          <TabsTrigger
            value="requests"
            className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <FileText className="w-4 h-4 text-red-600" />
            <span>Blood Requests ({requests.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Donation History Content */}
        <TabsContent value="history" className="space-y-3">
          {donations.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-xs sm:text-sm text-muted-foreground">
                No recorded donations yet for this user.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {donations.map((don) => (
                <Card key={don.id} className="p-4 border bg-card shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-sm text-foreground">
                          Blood Donated
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {don.hospital_name || don.area_name
                          ? `${don.area_name || ""}${don.hospital_name ? " (" + don.hospital_name + ")" : ""}`
                          : "Blood Donation"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(don.donation_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {don.blood_group && (
                      <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold">
                        {formatBloodGroup(don.blood_group)}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Requests Content */}
        <TabsContent value="requests" className="space-y-3">
          {requests.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-xs sm:text-sm text-muted-foreground">
                No blood requests created by this user yet.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {requests.map((req) => (
                <Card
                  key={req.id}
                  className="p-4 border bg-card hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-red-600 text-white font-extrabold text-xs">
                          {formatBloodGroup(req.blood_group)}
                        </Badge>
                        <Badge
                          variant={
                            req.status === "OPEN"
                              ? "default"
                              : req.status === "FULFILLED"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px] font-bold"
                        >
                          {toHumanReadable(req.status)}
                        </Badge>
                        {req.urgency === "CRITICAL" && (
                          <Badge className="bg-rose-100 text-rose-700 border-rose-300 text-[10px] font-bold">
                            Critical Urgency
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-foreground">
                        {req.area_name}
                        {req.hospital_name ? ` • ${req.hospital_name}` : ""}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Units: {req.units_fulfilled}/{req.units_needed} fulfilled
                        • Posted{" "}
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <Link href={`/requests/${req.id}`}>
                      <Button size="sm" variant="outline" className="text-xs w-full sm:w-auto">
                        View Request Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
