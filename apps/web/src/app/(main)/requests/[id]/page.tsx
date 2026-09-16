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
import { MapWrapper } from "../../browse/MapWrapper";
import type { BloodRequest } from "@repo/shared";

type BloodRequestDetail = BloodRequest & {
  location?: {
    type: string;
    coordinates: [number, number];
  };
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let request: BloodRequestDetail | null = null;
  try {
    const res = await apiServer.request<{ data: BloodRequestDetail } | BloodRequestDetail>(
      `/requests/${id}`,
    );
    request = "data" in res && res.data ? res.data : (res as BloodRequestDetail);
  } catch (error) {
    console.error(error);
  }

  if (!request) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient & Medical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {request.patient_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Name</p>
                    <p className="font-semibold text-base">{request.patient_name}</p>
                  </div>
                )}
                {request.patient_age !== undefined && request.patient_age !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Age</p>
                    <p className="font-semibold text-base">{request.patient_age} years</p>
                  </div>
                )}
                {request.disease && (
                  <div>
                    <p className="text-sm text-muted-foreground">Disease / Reason</p>
                    <p className="font-semibold text-base text-red-600 dark:text-red-400">
                      {request.disease}
                    </p>
                  </div>
                )}
                {request.needed_time && (
                  <div>
                    <p className="text-sm text-muted-foreground">Exact Time Needed</p>
                    <p className="font-semibold text-base">
                      {new Date(request.needed_time).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Component Type</p>
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
                  <p className="text-sm text-muted-foreground">Hospital & Area</p>
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
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded-md overflow-hidden border">
                {request.location?.coordinates ? (
                  <MapWrapper
                    center={[
                      request.location.coordinates[1],
                      request.location.coordinates[0],
                    ]}
                    markers={[]}
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                    Map not available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Can you help?</CardTitle>
              <CardDescription>
                Offer to donate blood for this request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                action={async () => {
                  "use server";
                  const { apiServer } = await import("@/lib/api/server");
                  await apiServer.request(
                    `/requests/${id}/responses`,
                    { method: "POST" },
                  );
                  const { revalidatePath } = await import("next/cache");
                  revalidatePath(`/requests/${id}`);
                }}
              >
                <Button
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  type="submit"
                >
                  I can donate
                </Button>
              </form>
              <p className="text-xs text-center text-muted-foreground">
                Your contact details will only be shared if the requester
                accepts your offer.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
