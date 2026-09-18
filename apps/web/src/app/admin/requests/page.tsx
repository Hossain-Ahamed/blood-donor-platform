"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { bloodGroupLabels, getLabel } from "@/lib/labels";
import { Loader2 } from "lucide-react";
import { RequestEditDialog } from "@/components/RequestEditDialog";
import type { MapMarkerItem } from "@/components/Map";
import { calculateDistance, formatDistance } from "@/lib/utils/distance";
import type {
  RequestWithRequester,
  RequestWithDistance,
} from "./components/types";
import { AdminRequestsFilters } from "./components/AdminRequestsFilters";
import { AdminRequestsTable } from "./components/AdminRequestsTable";
import { AdminRequestsMap } from "./components/AdminRequestsMap";
import { AdminRequestDetailDialog } from "./components/AdminRequestDetailDialog";
import { AdminRequestDeleteDialog } from "./components/AdminRequestDeleteDialog";
import { useAdminRequests } from "./hooks/useAdminRequests";
import { useAdminLocationHandlers } from "./hooks/useAdminLocationHandlers";

function AdminRequestsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const status = searchParams.get("status") || "all";
  const bloodGroup = searchParams.get("blood_group") || "all";
  const radiusKm = searchParams.get("radiusKm") || "25";
  const useRadiusFilter = searchParams.get("use_radius") === "true";
  const requestIdParam = searchParams.get("requestId") || "";
  const locationSource =
    (searchParams.get("source") as "profile" | "gps" | "custom" | "all") ||
    (useRadiusFilter ? "custom" : "all");

  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const center: [number, number] = useMemo(() => {
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [23.7925, 90.4078];
  }, [latParam, lngParam]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          (key === "page" && value === "1") ||
          (key === "status" && value === "all") ||
          (key === "blood_group" && value === "all") ||
          (key === "use_radius" && value === "false") ||
          (key === "source" && value === "all") ||
          (key === "requestId" && (!value || value === ""))
        ) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      }
      const qs = nextParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const [searchIdInput, setSearchIdInput] = useState(requestIdParam);
  const [explicitSelectedId, setExplicitSelectedId] = useState<string | null>(null);
  const [isExplicitDialogOpen, setIsExplicitDialogOpen] = useState(false);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    profileLocation,
    profileAreaName,
    requests,
    totalCount,
    totalPages,
    loading,
    refetch,
    updateStatusMutation,
    deleteMutation,
  } = useAdminRequests({
    page,
    status,
    bloodGroup,
    center,
    useRadiusFilter,
    radiusKm,
    requestIdParam,
  });

  const {
    isLocating,
    handleRadiusChange,
    handleDetectGps,
    handleUseSavedLocation,
    handleShowAllWorldwide,
    handleMapClick,
  } = useAdminLocationHandlers({
    profileLocation,
    updateParams,
  });

  // Purely derived state - no useEffect needed with TanStack Query!
  const selectedRequest = useMemo(() => {
    if (explicitSelectedId) {
      return requests.find((r) => r.id === explicitSelectedId) ?? null;
    }
    if (requestIdParam && dismissedRequestId !== requestIdParam) {
      return (
        requests.find(
          (r) =>
            r.id.toLowerCase() === requestIdParam.toLowerCase() ||
            r.id.toLowerCase().startsWith(requestIdParam.toLowerCase()),
        ) ?? null
      );
    }
    return null;
  }, [explicitSelectedId, requestIdParam, dismissedRequestId, requests]);

  const isDetailDialogOpen = useMemo(() => {
    if (isExplicitDialogOpen) return true;
    if (requestIdParam && dismissedRequestId !== requestIdParam && selectedRequest) {
      return true;
    }
    return false;
  }, [isExplicitDialogOpen, requestIdParam, dismissedRequestId, selectedRequest]);

  const handleCloseDetailDialog = useCallback(() => {
    setIsExplicitDialogOpen(false);
    setExplicitSelectedId(null);
    if (requestIdParam) {
      setDismissedRequestId(requestIdParam);
    }
  }, [requestIdParam]);

  const actionLoading = updateStatusMutation.isPending || deleteMutation.isPending;

  const requestsWithDistance: RequestWithDistance[] = requests.map((req) => {
    let distanceKm = 0;
    let distanceText = "";
    if (
      req.location?.coordinates &&
      Array.isArray(req.location.coordinates) &&
      req.location.coordinates.length === 2
    ) {
      distanceKm = calculateDistance(
        center[0],
        center[1],
        req.location.coordinates[1],
        req.location.coordinates[0],
      );
      distanceText = formatDistance(distanceKm);
    }
    return { ...req, distanceKm, distanceText };
  });

  const markers: MapMarkerItem[] = requestsWithDistance
    .filter(
      (r) =>
        r.location?.coordinates &&
        Array.isArray(r.location.coordinates) &&
        r.location.coordinates.length === 2,
    )
    .map((r) => ({
      id: r.id,
      position: [r.location!.coordinates[1], r.location!.coordinates[0]],
      title: `Need ${getLabel(bloodGroupLabels, r.blood_group)}`,
      description: r.hospital_name ? `${r.hospital_name} (${r.area_name})` : r.area_name,
      blood_group: r.blood_group,
      urgency: r.urgency,
      area_name: r.area_name,
      hospital_name: r.hospital_name,
      distanceText: r.distanceText,
    }));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-3 md:p-6 gap-4">
      <AdminRequestsFilters
        totalCount={totalCount}
        locationSource={locationSource}
        useRadiusFilter={useRadiusFilter}
        profileAreaName={profileAreaName}
        radiusKm={radiusKm}
        searchIdInput={searchIdInput}
        setSearchIdInput={setSearchIdInput}
        status={status}
        bloodGroup={bloodGroup}
        isLocating={isLocating}
        loading={loading}
        profileLocation={profileLocation}
        requestIdParam={requestIdParam}
        onShowAllWorldwide={handleShowAllWorldwide}
        onUseSavedLocation={handleUseSavedLocation}
        onDetectGps={handleDetectGps}
        onRadiusChange={handleRadiusChange}
        onUpdateParams={updateParams}
        onRefetch={() => refetch()}
      />

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <AdminRequestsTable
          requests={requestsWithDistance}
          selectedRequest={selectedRequest}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onSelectRequest={(req) => {
            setExplicitSelectedId(req.id);
            setIsExplicitDialogOpen(true);
          }}
          onPageChange={(newPage) => updateParams({ page: newPage.toString() })}
        />

        <AdminRequestsMap
          center={center}
          markers={markers}
          radiusKm={radiusKm}
          useRadiusFilter={useRadiusFilter}
          onMarkerClick={(id) => {
            setExplicitSelectedId(id);
            setIsExplicitDialogOpen(true);
          }}
          onMapClick={handleMapClick}
        />
      </div>

      <AdminRequestDetailDialog
        isOpen={isDetailDialogOpen}
        request={selectedRequest}
        actionLoading={actionLoading}
        onClose={handleCloseDetailDialog}
        onOpenEdit={() => setIsEditDialogOpen(true)}
        onOpenDelete={() => setIsDeleteDialogOpen(true)}
        onUpdateStatus={(newStatus) => {
          if (!selectedRequest) return;
          updateStatusMutation.mutate(
            { id: selectedRequest.id, newStatus },
            {
              onSuccess: () => {
                handleCloseDetailDialog();
              },
            },
          );
        }}
      />

      <RequestEditDialog
        request={selectedRequest}
        isOpen={isEditDialogOpen}
        isAdmin={true}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
        }}
      />

      <AdminRequestDeleteDialog
        isOpen={isDeleteDialogOpen}
        isDeleting={deleteMutation.isPending}
        actionLoading={actionLoading}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirmDelete={() => {
          if (!selectedRequest) return;
          deleteMutation.mutate(selectedRequest.id, {
            onSuccess: () => {
              setIsDeleteDialogOpen(false);
              handleCloseDetailDialog();
              if (requestIdParam) {
                updateParams({ requestId: null });
              }
            },
          });
        }}
      />
    </div>
  );
}

export default function AdminRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminRequestsContent />
    </Suspense>
  );
}
