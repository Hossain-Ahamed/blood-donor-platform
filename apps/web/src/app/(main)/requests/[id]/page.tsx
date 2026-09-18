import { apiServer } from "@/lib/api/server";
import { notFound } from "next/navigation";
import { RequestManagementCard } from "./RequestManagementCard";
import { DonorResponseActionCard, type DonorResponse } from "./DonorResponseActionCard";
import { RequesterResponsesCard, type RequesterDonorResponse } from "./RequesterResponsesCard";
import { RequestDetailHeader } from "./RequestDetailHeader";
import { RequesterInfoCard } from "./RequesterInfoCard";
import { PatientMedicalDetailsCard } from "./PatientMedicalDetailsCard";
import { HospitalLocationCard } from "./HospitalLocationCard";
import { DonorHelpPromptCard } from "./DonorHelpPromptCard";
import type { BloodRequest, DonorProfile, User, BloodGroup } from "@repo/shared";

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

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <RequestDetailHeader
        id={request.id}
        bloodGroup={request.blood_group}
        urgency={request.urgency}
        createdAt={request.created_at}
        user={user}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequesterInfoCard
            requester={request.requester}
            contactPhone={request.contact_phone || ""}
            requesterProfile={request.requester_profile}
          />

          <PatientMedicalDetailsCard request={request} />

          <HospitalLocationCard
            hospitalName={request.hospital_name}
            areaName={request.area_name}
            coordinates={request.location?.coordinates}
          />

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
              <DonorHelpPromptCard
                id={id}
                contactPhone={request.contact_phone}
                hasUser={Boolean(user)}
                isProfileComplete={isProfileComplete}
                hasPhone={hasPhone}
              />

              {user && isProfileComplete && hasPhone && (
                <DonorResponseActionCard
                  requestId={id}
                  requesterId={request.requester_id}
                  initialResponse={myResponse}
                  requestStatus={request.status}
                  requesterContactPhone={request.contact_phone}
                  requesterName={request.requester?.name}
                  donorPhone={userPhone}
                  lastDonationDate={profile?.last_donation_date}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
