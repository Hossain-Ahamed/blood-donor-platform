import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { apiServer } from "@/lib/api/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeartHandshake, CheckCircle2 } from "lucide-react";
import { HistoryRequestCard, type BloodRequestItem } from "./HistoryRequestCard";
import { HistoryApplicationCard, type AppliedResponseItem } from "./HistoryApplicationCard";
import { HistoryDonationCard, type DonationItem } from "./HistoryDonationCard";

async function confirmDonationAction(formData: FormData) {
  "use server";
  const donationId = formData.get("donationId") as string;
  const responseId = formData.get("responseId") as string;
  if (!donationId && !responseId) return;
  try {
    const url = responseId
      ? `/donations/response/${responseId}/confirm`
      : `/donations/${donationId}/confirm`;
    await apiServer.request(url, {
      method: "PATCH",
      body: JSON.stringify({ confirmed: true }),
      headers: {
        "Content-Type": "application/json",
      },
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

  let requests: BloodRequestItem[] = [];
  let donations: DonationItem[] = [];
  let appliedResponses: AppliedResponseItem[] = [];
  let shouldRedirectToLogin = false;

  try {
    const [reqRes, donRes, respRes] = await Promise.allSettled([
      apiServer.request<{ data: BloodRequestItem[] } | BloodRequestItem[]>("/requests/me"),
      apiServer.request<{ data: DonationItem[] } | DonationItem[]>("/donations/me"),
      apiServer.request<{ data: AppliedResponseItem[] } | AppliedResponseItem[]>("/responses/me"),
    ]);

    if (
      (reqRes.status === "rejected" &&
        ((reqRes.reason as any)?.status === 401 ||
          (reqRes.reason as any)?.statusCode === 401)) ||
      (donRes.status === "rejected" &&
        ((donRes.reason as any)?.status === 401 ||
          (donRes.reason as any)?.statusCode === 401)) ||
      (respRes.status === "rejected" &&
        ((respRes.reason as any)?.status === 401 ||
          (respRes.reason as any)?.statusCode === 401))
    ) {
      shouldRedirectToLogin = true;
    }

    if (reqRes.status === "fulfilled") {
      const val = reqRes.value;
      requests = Array.isArray(val) ? val : val?.data || [];
    }
    if (donRes.status === "fulfilled") {
      const val = donRes.value;
      donations = Array.isArray(val) ? val : val?.data || [];
    }
    if (respRes.status === "fulfilled") {
      const val = respRes.value;
      appliedResponses = Array.isArray(val) ? val : val?.data || [];
    }
  } catch (e) {
    console.error(e);
  }

  if (shouldRedirectToLogin) {
    redirect("/login?redirect=/history");
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
            requests.map((r) => <HistoryRequestCard key={r.id} request={r} />)
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
                    {appliedResponses.map((item) => (
                      <HistoryApplicationCard
                        key={item.id}
                        item={item}
                        confirmDonationAction={confirmDonationAction}
                      />
                    ))}
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
                    {donations.map((d) => (
                      <HistoryDonationCard
                        key={d.id}
                        donation={d}
                        confirmDonationAction={confirmDonationAction}
                      />
                    ))}
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
