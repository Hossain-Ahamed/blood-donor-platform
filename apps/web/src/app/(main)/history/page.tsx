import { apiServer } from "@/lib/api/server";
import { bloodGroupLabels, requestStatusLabels, getLabel } from "@/lib/labels";
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

type BloodRequest = {
  id: string;
  blood_group: string;
  created_at: string;
  status: string;
  area_name: string;
  units_fulfilled: number;
  units_needed: number;
};

type Donation = {
  id: string;
  donation_date: string;
  confirmed_by_donor: boolean;
};

export default async function HistoryPage() {
  let requests: BloodRequest[] = [];
  let donations: Donation[] = [];

  try {
    const [reqData, donData] = await Promise.all([
      apiServer
        .request<{ data: BloodRequest[] } | BloodRequest[]>("/requests")
        .catch(() => []), // Assuming /requests returns own requests by default or we need to pass a param
      apiServer
        .request<{ data: Donation[] } | Donation[]>("/donations/me")
        .catch(() => []),
    ]);

    requests = Array.isArray(reqData) ? reqData : reqData?.data || [];
    donations = Array.isArray(donData) ? donData : donData?.data || [];
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground mt-2">
          View your past blood requests and donations.
        </p>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-100">
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="donations">My Donations</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6 space-y-4">
          {requests.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <p>You haven&apos;t made any blood requests yet.</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        Request for {getLabel(bloodGroupLabels, r.blood_group)}
                      </CardTitle>
                      <CardDescription>
                        {new Date(r.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {getLabel(requestStatusLabels, r.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    <strong>Area:</strong> {r.area_name}
                  </p>
                  <p className="text-sm">
                    <strong>Units:</strong> {r.units_fulfilled} /{" "}
                    {r.units_needed}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="donations" className="mt-6 space-y-4">
          {donations.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <p>No donation history found.</p>
              </CardContent>
            </Card>
          ) : (
            donations.map((d) => (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Donation</CardTitle>
                      <CardDescription>
                        {new Date(d.donation_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {d.confirmed_by_donor ? (
                      <Badge className="bg-green-600 hover:bg-green-600">
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending Confirmation</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!d.confirmed_by_donor && (
                    <form
                      action={async () => {
                        "use server";
                        import("@/lib/api/server").then(
                          async ({ apiServer }) => {
                            await apiServer.request(
                              `/donations/${d.id}/confirm`,
                              { method: "PATCH" },
                            );
                            import("next/cache").then(({ revalidatePath }) =>
                              revalidatePath("/history"),
                            );
                          },
                        );
                      }}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        type="submit"
                        className="mt-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                      >
                        Confirm Donation
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
