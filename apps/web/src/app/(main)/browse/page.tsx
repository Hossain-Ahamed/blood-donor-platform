import { apiServer } from "@/lib/api/server";
import { BrowseClient } from "./BrowseClient";
import type { DonorProfile, User } from "@repo/shared";

type ProfileWithUser = DonorProfile & { user?: User };

interface RequestItem {
  id: string;
  blood_group: string;
  area_name: string;
  hospital_name?: string;
  urgency: string;
  units_needed?: number;
  units_fulfilled?: number;
  created_at?: string;
  location: { type: string; coordinates: [number, number] };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const bloodGroup =
    typeof params.bloodGroup === "string" ? params.bloodGroup : undefined;
  const radiusKm = typeof params.radiusKm === "string" ? params.radiusKm : "10";
  const sourceParam =
    typeof params.source === "string" ? params.source : undefined;
  const latParam =
    typeof params.lat === "string" ? parseFloat(params.lat) : undefined;
  const lngParam =
    typeof params.lng === "string" ? parseFloat(params.lng) : undefined;

  let user: User | null = null;
  let profileLocation: [number, number] | null = null;
  let profileAreaName: string | undefined = undefined;
  let appliedRequestIds: string[] = [];

  try {
    const [profileRes, userRes, responsesRes] = await Promise.allSettled([
      apiServer.request<{ data: ProfileWithUser } | ProfileWithUser>(
        "/donor-profiles/me",
      ),
      apiServer.request<{ data: User } | User>("/users/me"),
      apiServer.request<any[]>("/responses/me"),
    ]);

    if (profileRes.status === "fulfilled") {
      const val = profileRes.value;
      const profile =
        "data" in val && val.data ? val.data : (val as ProfileWithUser);
      profileAreaName = profile?.area_name;
      if (profile?.location) {
        const loc: any = profile.location;
        if (Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
          // PostGIS Point coordinates [lng, lat] -> Leaflet expects [lat, lng]
          profileLocation = [loc.coordinates[1], loc.coordinates[0]];
        } else if (typeof loc.lat === "number" && typeof loc.lng === "number") {
          profileLocation = [loc.lat, loc.lng];
        }
      }
    }

    if (userRes.status === "fulfilled") {
      const val = userRes.value;
      user = "data" in val && val.data ? val.data : (val as User);
    }

    if (responsesRes.status === "fulfilled" && responsesRes.value) {
      const val = responsesRes.value;
      const list = Array.isArray(val)
        ? val
        : "data" in val && Array.isArray((val as any).data)
          ? (val as any).data
          : [];
      appliedRequestIds = list
        .filter((r: any) => r.status !== "CANCELLED")
        .map((r: any) => r.request_id);
    }
  } catch (error) {
    console.warn("User not authenticated or profile not set:", error);
  }

  // Determine initial center and source mode from params / DB
  const hasExplicitCoords =
    latParam !== undefined &&
    lngParam !== undefined &&
    !isNaN(latParam) &&
    !isNaN(lngParam);

  let initialCenter: [number, number] = [23.7925, 90.4078]; // Default Dhaka
  let initialSource: "profile" | "gps" | "custom" | "default" = "default";

  if (sourceParam === "profile" && profileLocation) {
    initialCenter = profileLocation;
    initialSource = "profile";
  } else if (hasExplicitCoords) {
    initialCenter = [latParam!, lngParam!];
    initialSource =
      sourceParam === "gps"
        ? "gps"
        : sourceParam === "profile"
          ? "profile"
          : "custom";
  } else if (profileLocation) {
    initialCenter = profileLocation;
    initialSource = "profile";
  }

  // Initial SSR fetch of nearby requests
  let initialRequests: RequestItem[] = [];
  try {
    const bgParam =
      bloodGroup && bloodGroup !== "ALL" ? `&bloodGroup=${bloodGroup}` : "";
    const data = await apiServer.request<
      { data: RequestItem[] } | RequestItem[]
    >(
      `/requests/nearby?lat=${initialCenter[0]}&lng=${initialCenter[1]}&radiusKm=${radiusKm}${bgParam}`,
    );
    initialRequests = Array.isArray(data) ? data : data?.data || [];
  } catch (error) {
    console.error("Initial nearby requests fetch failed:", error);
  }

  return (
    <BrowseClient
      user={user}
      profileLocation={profileLocation}
      profileAreaName={profileAreaName}
      initialCenter={initialCenter}
      initialSource={initialSource}
      initialRequests={initialRequests}
      initialBloodGroup={bloodGroup || "ALL"}
      initialRadiusKm={radiusKm}
      hasExplicitCoords={hasExplicitCoords}
      appliedRequestIds={appliedRequestIds}
    />
  );
}
