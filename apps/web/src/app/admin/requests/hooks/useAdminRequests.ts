"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { RequestStatus } from "@repo/shared";
import { toast } from "sonner";
import { requestStatusLabels, getLabel } from "@/lib/labels";
import type { RequestWithRequester, PaginatedResponse } from "../components/types";

interface UseAdminRequestsProps {
  page: number;
  status: string;
  bloodGroup: string;
  center: [number, number];
  useRadiusFilter: boolean;
  radiusKm: string;
  requestIdParam: string;
}

export function useAdminRequests({
  page,
  status,
  bloodGroup,
  center,
  useRadiusFilter,
  radiusKm,
  requestIdParam,
}: UseAdminRequestsProps) {
  const queryClient = useQueryClient();

  // 1. Fetch admin profile location
  const { data: profileLocationData } = useQuery({
    queryKey: ["admin", "profile-location"],
    queryFn: async () => {
      try {
        const res = await apiClient.request<{
          data?: {
            location?: { coordinates?: [number, number]; lat?: number; lng?: number };
            area_name?: string;
          };
          location?: { coordinates?: [number, number]; lat?: number; lng?: number };
          area_name?: string;
        }>("/donor-profiles/me");

        const profile = res && "data" in res && res.data ? res.data : res;
        if (profile?.location) {
          const loc = profile.location;
          let coords: [number, number] | null = null;
          if (Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
            coords = [loc.coordinates[1], loc.coordinates[0]];
          } else if (typeof loc.lat === "number" && typeof loc.lng === "number") {
            coords = [loc.lat, loc.lng];
          }
          if (coords) {
            return { coords, areaName: profile.area_name || null };
          }
        }
        return null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const profileLocation = profileLocationData?.coords ?? null;
  const profileAreaName = profileLocationData?.areaName ?? null;

  // 2. Fetch requests list
  const {
    data: requestsData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: [
      "admin-requests",
      {
        page,
        status,
        bloodGroup,
        center,
        useRadiusFilter,
        radiusKm,
        requestId: requestIdParam,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (requestIdParam) params.append("requestId", requestIdParam.trim());
      if (status !== "all") params.append("status", status);
      if (bloodGroup !== "all") params.append("blood_group", bloodGroup);

      if (useRadiusFilter) {
        const cappedRadius = Math.min(200, Math.max(1, parseFloat(radiusKm) || 25));
        params.append("lat", center[0].toString());
        params.append("lng", center[1].toString());
        params.append("radiusKm", cappedRadius.toString());
      }

      const response = await apiClient.request<
        | PaginatedResponse<RequestWithRequester>
        | { data: PaginatedResponse<RequestWithRequester> | RequestWithRequester[] }
      >(`/admin/requests?${params.toString()}`);

      const responseData = "data" in response ? response.data : response;
      const list: RequestWithRequester[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray((responseData as PaginatedResponse<RequestWithRequester>)?.data)
          ? (responseData as PaginatedResponse<RequestWithRequester>).data
          : [];

      const meta =
        "meta" in response
          ? response.meta
          : responseData && typeof responseData === "object" && "meta" in responseData
            ? (responseData as PaginatedResponse<RequestWithRequester>).meta
            : undefined;

      return {
        requests: list,
        totalCount: meta?.total ?? list.length,
        totalPages: meta?.totalPages ?? 1,
      };
    },
  });

  const requests = useMemo(() => requestsData?.requests ?? [], [requestsData?.requests]);
  const totalCount = requestsData?.totalCount ?? 0;
  const totalPages = requestsData?.totalPages ?? 1;

  // 3. Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: RequestStatus }) => {
      return apiClient.request(`/admin/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    },
    onSuccess: (_, variables) => {
      const label = getLabel(requestStatusLabels, variables.newStatus);
      toast.success(`Request status updated to ${label}`);
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update request status",
      );
    },
  });

  // 4. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.request(`/admin/requests/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Request deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete request");
    },
  });

  return {
    profileLocation,
    profileAreaName,
    requests,
    totalCount,
    totalPages,
    loading,
    refetch,
    updateStatusMutation,
    deleteMutation,
  };
}
