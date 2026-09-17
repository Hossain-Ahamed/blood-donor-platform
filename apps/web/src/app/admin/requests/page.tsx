"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useState, useMemo, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { BloodGroup, RequestStatus } from "@repo/shared";
import {
  bloodGroupLabels,
  urgencyLabels,
  requestStatusLabels,
  componentTypeLabels,
  getLabel,
} from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Navigation,
  MapPin,
  Home,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User as UserIcon,
  Phone,
  Eye,
  AlertTriangle,
  Globe,
  Crosshair,
  Filter,
  Check,
  ShieldCheck,
  Edit3,
  Trash2,
  Search,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { RequestEditDialog } from "@/components/RequestEditDialog";
import type { MapMarkerItem } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      Loading admin map...
    </div>
  ),
});

interface RequestWithRequester {
  id: string;
  blood_group: string;
  component_type?: string;
  area_name: string;
  hospital_name?: string;
  patient_name?: string;
  patient_age?: number;
  disease?: string;
  patient_note?: string;
  contact_phone?: string;
  urgency?: string;
  units_needed: number;
  units_fulfilled: number;
  status: string;
  created_at: string;
  needed_time?: string;
  expires_at?: string;
  location?: { type: string; coordinates: [number, number] }; // [lng, lat]
  requester?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

function AdminRequestsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Read state from URL search parameters (reload-safe)
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
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return [23.7925, 90.4078];
  }, [latParam, lngParam]);

  // Sync state changes directly to URL parameters
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

  // Local UI state
  const [selectedRequest, setSelectedRequest] =
    useState<RequestWithRequester | null>(null);
  const [searchIdInput, setSearchIdInput] = useState(requestIdParam);
  const [handledRequestId, setHandledRequestId] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // 1. Fetch admin profile location via TanStack Query
  const { data: profileLocationData } = useQuery({
    queryKey: ["admin", "profile-location"],
    queryFn: async () => {
      try {
        const res = await apiClient.request<{
          data?: {
            location?: {
              type?: string;
              coordinates?: [number, number];
              lat?: number;
              lng?: number;
            };
            area_name?: string;
          };
          location?: {
            type?: string;
            coordinates?: [number, number];
            lat?: number;
            lng?: number;
          };
          area_name?: string;
        }>("/donor-profiles/me");

        const profile = res && "data" in res && res.data ? res.data : res;
        if (profile?.location) {
          const loc = profile.location;
          let coords: [number, number] | null = null;
          if (Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
            coords = [loc.coordinates[1], loc.coordinates[0]];
          } else if (
            typeof loc.lat === "number" &&
            typeof loc.lng === "number"
          ) {
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

  // 2. Fetch requests via TanStack Query
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

      if (requestIdParam) {
        params.append("requestId", requestIdParam.trim());
      }
      if (status !== "all") params.append("status", status);
      if (bloodGroup !== "all") {
        params.append("blood_group", bloodGroup);
      }

      if (useRadiusFilter) {
        const cappedRadius = Math.min(
          200,
          Math.max(1, parseFloat(radiusKm) || 25),
        );
        params.append("lat", center[0].toString());
        params.append("lng", center[1].toString());
        params.append("radiusKm", cappedRadius.toString());
      }

      const response = await apiClient.request<
        | PaginatedResponse<RequestWithRequester>
        | {
            data:
              PaginatedResponse<RequestWithRequester> | RequestWithRequester[];
          }
      >(`/admin/requests?${params.toString()}`);

      const responseData = "data" in response ? response.data : response;
      const list: RequestWithRequester[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray(
              (responseData as PaginatedResponse<RequestWithRequester>)?.data,
            )
          ? (responseData as PaginatedResponse<RequestWithRequester>).data
          : [];

      const meta =
        "meta" in response
          ? response.meta
          : responseData &&
              typeof responseData === "object" &&
              "meta" in responseData
            ? (responseData as PaginatedResponse<RequestWithRequester>).meta
            : undefined;

      return {
        requests: list,
        totalCount: meta?.total ?? list.length,
        totalPages: meta?.totalPages ?? 1,
      };
    },
  });

  const requests = requestsData?.requests ?? [];
  const requests = useMemo(
    () => requestsData?.requests ?? [],
    [requestsData?.requests],
  );
  const totalCount = requestsData?.totalCount ?? 0;
  const totalPages = requestsData?.totalPages ?? 1;

  // Auto-select and open detail dialog if navigated directly with ?requestId=
  useEffect(() => {
    if (requestIdParam && requests.length > 0) {
    if (!requestIdParam && handledRequestId !== null) {
      setHandledRequestId(null);
    } else if (
      requestIdParam &&
      handledRequestId !== requestIdParam &&
      requests.length > 0
    ) {
      const match = requests.find(
        (r) =>
          r.id.toLowerCase() === requestIdParam.toLowerCase() ||
          r.id.toLowerCase().startsWith(requestIdParam.toLowerCase()),
      );
      if (match && selectedRequest?.id !== match.id) {
      if (match) {
        setHandledRequestId(requestIdParam);
        setSelectedRequest(match);
        setIsDetailDialogOpen(true);
      } else if (!loading) {
        setHandledRequestId(requestIdParam);
      }
  if (!requestIdParam && handledRequestId !== null) {
    setHandledRequestId(null);
  } else if (
    requestIdParam &&
    handledRequestId !== requestIdParam &&
    requests.length > 0
  ) {
    const match = requests.find(
      (r) =>
        r.id.toLowerCase() === requestIdParam.toLowerCase() ||
        r.id.toLowerCase().startsWith(requestIdParam.toLowerCase()),
    );
    if (match) {
      setHandledRequestId(requestIdParam);
      setSelectedRequest(match);
      setIsDetailDialogOpen(true);
    } else if (!loading) {
      setHandledRequestId(requestIdParam);
    }
  }, [requestIdParam, requests, selectedRequest?.id]);
  }
  }, [requestIdParam, handledRequestId, requests, loading]);

  // 3. Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      newStatus,
    }: {
      id: string;
      newStatus: RequestStatus;
    }) => {
      return apiClient.request(`/admin/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    },
    onSuccess: (_, variables) => {
      const label = getLabel(requestStatusLabels, variables.newStatus);
      toast.success(`Request status updated to ${label}`);
      setSelectedRequest((prev) =>
        prev && prev.id === variables.id
          ? { ...prev, status: variables.newStatus }
          : prev,
      );
      setIsDetailDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update request status",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.request(`/admin/requests/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Request deleted successfully");
      setIsDeleteDialogOpen(false);
      setIsDetailDialogOpen(false);
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete request",
      );
    },
  });

  const actionLoading =
    updateStatusMutation.isPending || deleteMutation.isPending;

  const handleUpdateStatus = (newStatus: RequestStatus) => {
    if (!selectedRequest) return;
    updateStatusMutation.mutate({ id: selectedRequest.id, newStatus });
  };

  const handleDeleteRequest = () => {
    if (!selectedRequest) return;
    deleteMutation.mutate(selectedRequest.id);
  };

  // Radius change with 200 km max limit enforcement
  const handleRadiusChange = (val: string) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 200) {
      num = 200;
      toast.info("Maximum range is limited to 200 km.");
    }
    updateParams({ radiusKm: num.toString(), page: "1" });
  };

  // GPS Geolocation trigger
  const handleDetectGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        updateParams({
          lat,
          lng,
          source: "gps",
          use_radius: "true",
          page: "1",
        });
        toast.success("Location set to your Current GPS Location");
      },
      (error) => {
        setIsLocating(false);
        console.warn("GPS error:", error);
        toast.error("Could not retrieve GPS location");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleUseSavedLocation = () => {
    if (!profileLocation) {
      toast.error("No saved location found in profile");
      return;
    }
    updateParams({
      lat: profileLocation[0].toString(),
      lng: profileLocation[1].toString(),
      source: "profile",
      use_radius: "true",
      page: "1",
    });
    toast.success("Location set to your Saved Profile Location");
  };

  const handleShowAllWorldwide = () => {
    updateParams({
      use_radius: "false",
      source: "all",
      lat: null,
      lng: null,
      page: "1",
    });
    toast.info("Showing requests normally from all locations");
  };

  const handleMapClick = (pos: [number, number]) => {
    updateParams({
      lat: pos[0].toFixed(5),
      lng: pos[1].toFixed(5),
      source: "custom",
      use_radius: "true",
      page: "1",
    });
    toast.info("Updated admin search center from map.");
  };

  // Calculate distance for all requests
  const requestsWithDistance = requests.map((req) => {
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
    return {
      ...req,
      distanceKm,
      distanceText,
    };
  });

  // Map markers
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
      description: r.hospital_name
        ? `${r.hospital_name} (${r.area_name})`
        : r.area_name,
      blood_group: r.blood_group,
      urgency: r.urgency,
      area_name: r.area_name,
      hospital_name: r.hospital_name,
      distanceText: r.distanceText,
    }));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-3 md:p-6 gap-4">
      {/* Top Header & Filter Control Bar */}
      <div className="bg-card p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-red-600" />
                Admin: Manage Requests
              </h1>
              <Badge variant="secondary" className="text-xs font-semibold">
                {totalCount} Total
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 font-medium transition-colors ${
                  locationSource === "profile" && useRadiusFilter
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : locationSource === "gps" && useRadiusFilter
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      : locationSource === "custom" && useRadiusFilter
                        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        : "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {locationSource === "profile" && useRadiusFilter ? (
                  <Home className="w-3.5 h-3.5 mr-1" />
                ) : locationSource === "gps" && useRadiusFilter ? (
                  <Navigation className="w-3.5 h-3.5 mr-1" />
                ) : locationSource === "custom" && useRadiusFilter ? (
                  <Crosshair className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <Globe className="w-3.5 h-3.5 mr-1" />
                )}
                {useRadiusFilter
                  ? locationSource === "profile"
                    ? profileAreaName
                      ? `Saved: ${profileAreaName} (${radiusKm}km)`
                      : `Saved Profile (${radiusKm}km)`
                    : locationSource === "gps"
                      ? `Live GPS (${radiusKm}km)`
                      : `Custom Pin (${radiusKm}km)`
                  : "All Locations (Worldwide)"}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Review, verify, approve, fulfill, or cancel emergency blood
              requests.
            </p>
          </div>

          {/* Location Switcher Segmented Control */}
          <div className="flex items-center p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/80 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={handleShowAllWorldwide}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !useRadiusFilter
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All Locations</span>
            </button>

            {profileLocation && (
              <button
                type="button"
                onClick={handleUseSavedLocation}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  useRadiusFilter && locationSource === "profile"
                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span className="truncate max-w-[160px] sm:max-w-none">
                  {profileAreaName || "Saved"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDetectGps}
              disabled={isLocating}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                useRadiusFilter && locationSource === "gps"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>GPS Location</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
            {/* Search by Request ID */}
            <div className="flex items-center gap-1.5 min-w-56 max-w-sm flex-1">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                ID:
              </Label>
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search Request ID (UUID)..."
                  value={searchIdInput}
                  onChange={(e) => setSearchIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateParams({
                        requestId: searchIdInput.trim() || null,
                        page: "1",
                      });
                    }
                  }}
                  className="h-9 text-xs pl-8 pr-7 font-mono bg-background"
                />
                {searchIdInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchIdInput("");
                      updateParams({ requestId: null, page: "1" });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5"
                    title="Clear ID filter"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 px-3 text-xs font-semibold shrink-0"
                onClick={() =>
                  updateParams({
                    requestId: searchIdInput.trim() || null,
                    page: "1",
                  })
                }
              >
                Search
              </Button>
            </div>

            {requestIdParam && (
              <Badge
                variant="outline"
                className="h-8 px-2.5 text-xs border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-1.5 cursor-pointer font-mono"
                onClick={() => {
                  setSearchIdInput("");
                  updateParams({ requestId: null, page: "1" });
                }}
                title="Click to clear ID filter"
              >
                <span>ID: {requestIdParam.substring(0, 8)}...</span>
                <span className="font-bold">✕</span>
              </Badge>
            )}

            {/* Status Select */}
            <div className="flex items-center gap-2 min-w-37.5">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Status:
              </Label>
              <Select
                value={status}
                onValueChange={(val: string | null) => {
                  updateParams({
                    status: !val || val === "all" ? null : val,
                    page: "1",
                  });
                }}
              >
                <SelectTrigger className="h-9 w-full bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="All Statuses">
                    All Statuses
                  </SelectItem>
                  {Object.values(RequestStatus).map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      label={getLabel(requestStatusLabels, s)}
                    >
                      {getLabel(requestStatusLabels, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Blood Group Select */}
            <div className="flex items-center gap-2 min-w-37.5">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Group:
              </Label>
              <Select
                value={bloodGroup}
                onValueChange={(val: string | null) => {
                  updateParams({
                    blood_group: !val || val === "all" ? null : val,
                    page: "1",
                  });
                }}
              >
                <SelectTrigger className="h-9 w-full bg-background">
                  <SelectValue placeholder="All Blood Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="All Blood Groups">
                    🩸 All Groups
                  </SelectItem>
                  {Object.values(BloodGroup).map((bg) => (
                    <SelectItem
                      key={bg}
                      value={bg}
                      label={getLabel(bloodGroupLabels, bg)}
                    >
                      {getLabel(bloodGroupLabels, bg)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Radius Preset Pills (with max 200 km constraint) */}
            {useRadiusFilter && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Label className="text-xs font-medium text-muted-foreground mr-1">
                  Radius (max 200km):
                </Label>
                {["10", "25", "50", "100", "200"].map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={radiusKm === r ? "default" : "outline"}
                    onClick={() => handleRadiusChange(r)}
                    className={`h-8 px-2.5 text-xs rounded-full font-medium ${
                      radiusKm === r
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "hover:bg-muted/70"
                    }`}
                  >
                    {r} km
                  </Button>
                ))}
                <div className="flex items-center gap-1 ml-1">
                  <Input
                    type="number"
                    min="1"
                    max="200"
                    value={radiusKm}
                    onChange={(e) => handleRadiusChange(e.target.value)}
                    className="h-8 w-16 text-xs text-center px-1"
                    placeholder="km"
                  />
                  <span className="text-xs text-muted-foreground">km</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              className="h-9 text-xs font-semibold"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Filter className="w-3.5 h-3.5 mr-1.5" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Left Requests List + Right Interactive Map */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left Side: Requests Cards List */}
        <div className="w-full lg:w-5/12 flex flex-col gap-3 overflow-y-auto px-1.5 py-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {loading
                ? "Loading requests..."
                : `${requestsWithDistance.length} ${
                    requestsWithDistance.length === 1 ? "Request" : "Requests"
                  } shown (Page ${page}/${totalPages})`}
            </span>
          </div>

          {requestsWithDistance.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl border border-dashed flex-1 gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base">No requests found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting status, blood group, or switching to &quot;All
                  Locations&quot; to expand results.
                </p>
              </div>
            </div>
          ) : (
            requestsWithDistance.map((req) => {
              const isCritical = req.urgency === "CRITICAL";
              const isUrgent = req.urgency === "URGENT";
              const isSelected = selectedRequest?.id === req.id;

              return (
                <Card
                  key={req.id}
                  onClick={() => {
                    setSelectedRequest(req);
                    setIsDetailDialogOpen(true);
                  }}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-red-400/80 ${
                    isSelected
                      ? "ring-2 ring-red-500 border-transparent bg-red-500/5"
                      : "bg-card"
                  } ${
                    isCritical
                      ? "border-l-4 border-l-red-600"
                      : isUrgent
                        ? "border-l-4 border-l-amber-500"
                        : "border-l-4 border-l-blue-500"
                  }`}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-lg font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-lg shrink-0">
                        {getLabel(bloodGroupLabels, req.blood_group)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold truncate flex items-center gap-1.5">
                          {req.hospital_name || req.area_name}
                        </CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{req.area_name}</span>
                          {req.distanceText && (
                            <span className="font-medium text-red-600 dark:text-red-400 ml-1 shrink-0">
                              • {req.distanceText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={
                          req.status === "OPEN"
                            ? "default"
                            : req.status === "FULFILLED"
                              ? "secondary"
                              : req.status === "CANCELLED"
                                ? "destructive"
                                : "outline"
                        }
                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5"
                      >
                        {getLabel(requestStatusLabels, req.status)}
                      </Badge>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {getLabel(urgencyLabels, req.urgency)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 text-xs space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground pt-1 border-t">
                      <span>Units Needed:</span>
                      <span className="font-semibold text-foreground">
                        {req.units_fulfilled} / {req.units_needed} bags (
                        {getLabel(componentTypeLabels, req.component_type)})
                      </span>
                    </div>

                    {req.patient_name && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Patient:</span>
                        <span className="font-medium text-foreground">
                          {req.patient_name}{" "}
                          {req.patient_age ? `(${req.patient_age}y)` : ""}
                        </span>
                      </div>
                    )}

                    {req.needed_time && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> Needed
                          By:
                        </span>
                        <span className="font-medium text-foreground">
                          {new Date(req.needed_time).toLocaleDateString()}{" "}
                          {new Date(req.needed_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-muted/50">
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <span className="text-[11px] text-muted-foreground truncate">
                          By: {req.requester?.name || "Anonymous"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/80 bg-muted px-1 rounded truncate shrink-0">
                          ID: {req.id.substring(0, 8)}...
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 font-medium shrink-0"
                      >
                        Manage &rarr;
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateParams({ page: Math.max(1, page - 1).toString() })
                }
                disabled={page === 1 || loading}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateParams({
                    page: Math.min(totalPages, page + 1).toString(),
                  })
                }
                disabled={page === totalPages || loading}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Leaflet Map */}
        <div className="w-full lg:w-7/12 h-100 lg:h-full rounded-2xl overflow-hidden border shadow-sm relative bg-muted/20">
          <Map
            center={center}
            zoom={12}
            markers={markers}
            radiusMeters={
              useRadiusFilter ? parseFloat(radiusKm) * 1000 : undefined
            }
            showCenter={useRadiusFilter}
            centerLabel="Admin Location"
            onMarkerClick={(id) => {
              const req = requests.find((r) => r.id === id);
              if (req) {
                setSelectedRequest(req);
                setIsDetailDialogOpen(true);
              }
            }}
            onMapClick={handleMapClick}
          />

          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border text-[11px] text-muted-foreground shadow-md pointer-events-none z-10 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Click any marker or card to view details & actions.</span>
          </div>
        </div>
      </div>

      {/* Admin Request Detail & Action Dialog */}
      <Dialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDetailDialogOpen(false);
          }
        }}
      >
        <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3 pr-6">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <span>
                      Need{" "}
                      {getLabel(bloodGroupLabels, selectedRequest.blood_group)}
                    </span>
                    <Badge
                      variant={
                        selectedRequest.status === "OPEN"
                          ? "default"
                          : selectedRequest.status === "FULFILLED"
                            ? "secondary"
                            : selectedRequest.status === "CANCELLED"
                              ? "destructive"
                              : "outline"
                      }
                      className="text-xs"
                    >
                      {getLabel(requestStatusLabels, selectedRequest.status)}
                    </Badge>
                  </DialogTitle>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted/60 rounded-lg border font-mono text-xs">
                    <span className="truncate">
                      Request ID:{" "}
                      <strong className="text-foreground select-all">
                        {selectedRequest.id}
                      </strong>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedRequest.id);
                        toast.success("Copied Request ID to clipboard!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                      Copy ID
                    </Button>
                  </div>
                  <DialogDescription>
                    Created on{" "}
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 text-sm">
                {/* Patient & Hospital Info */}
                <div className="space-y-3 p-3 bg-muted/40 rounded-xl border">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                    Medical & Location
                  </h4>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Hospital & Area
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedRequest.hospital_name
                        ? `${selectedRequest.hospital_name} (${selectedRequest.area_name})`
                        : selectedRequest.area_name}
                    </span>
                  </div>

                  {selectedRequest.patient_name && (
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        Patient Name & Age
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedRequest.patient_name}{" "}
                        {selectedRequest.patient_age
                          ? `(${selectedRequest.patient_age} yrs)`
                          : ""}
                      </span>
                    </div>
                  )}

                  {selectedRequest.disease && (
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        Disease / Reason
                      </span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {selectedRequest.disease}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Component & Units
                    </span>
                    <span className="font-medium text-foreground">
                      {getLabel(
                        componentTypeLabels,
                        selectedRequest.component_type,
                      )}{" "}
                      • {selectedRequest.units_fulfilled} /{" "}
                      {selectedRequest.units_needed} bags
                    </span>
                  </div>
                </div>

                {/* Requester & Contact Info */}
                <div className="space-y-3 p-3 bg-muted/40 rounded-xl border">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                    Requester & Contact
                  </h4>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Requester Name
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedRequest.requester?.name || "Unknown"}
                    </span>
                  </div>

                  {selectedRequest.contact_phone && (
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        Contact Phone
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <a
                          href={`tel:${selectedRequest.contact_phone}`}
                          className="hover:underline text-emerald-700 dark:text-emerald-400"
                        >
                          {selectedRequest.contact_phone}
                        </a>
                      </span>
                    </div>
                  )}

                  {selectedRequest.needed_time && (
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        Needed Time
                      </span>
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {new Date(selectedRequest.needed_time).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Urgency Level
                    </span>
                    <Badge
                      variant={
                        selectedRequest.urgency === "CRITICAL"
                          ? "destructive"
                          : selectedRequest.urgency === "URGENT"
                            ? "default"
                            : "secondary"
                      }
                      className="text-xs mt-1"
                    >
                      {getLabel(urgencyLabels, selectedRequest.urgency)}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedRequest.patient_note && (
                <div className="p-3 bg-muted/30 rounded-xl border text-xs">
                  <span className="font-semibold text-muted-foreground block mb-1">
                    Requester Note:
                  </span>
                  <p className="text-foreground">
                    {selectedRequest.patient_note}
                  </p>
                </div>
              )}

              {/* Action Buttons: Approve, Fulfill, Cancel */}
              <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    href={`/requests/${selectedRequest.id}`}
                    target="_blank"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View Public Page
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditDialogOpen(true)}
                    disabled={actionLoading}
                    className="text-xs border-zinc-300 text-foreground hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    Edit Details
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={actionLoading}
                    className="text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>

                  {selectedRequest.status !== "OPEN" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(RequestStatus.OPEN)}
                      disabled={actionLoading}
                      className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Approve / Open
                    </Button>
                  )}

                  {selectedRequest.status !== "FULFILLED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleUpdateStatus(RequestStatus.FULFILLED)
                      }
                      disabled={actionLoading}
                      className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Mark Fulfilled
                    </Button>
                  )}

                  {selectedRequest.status !== "CANCELLED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        handleUpdateStatus(RequestStatus.CANCELLED)
                      }
                      disabled={actionLoading}
                      className="text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject / Cancel
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Request Edit Dialog */}
      <RequestEditDialog
        request={selectedRequest}
        isOpen={isEditDialogOpen}
        isAdmin={true}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={(updated) => {
          setSelectedRequest((prev) =>
            prev ? { ...prev, ...(updated || {}) } : null,
          );
          queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
        }}
      />

      {/* Admin Request Confirm Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
      >
        <DialogContent className="w-full max-w-md sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Delete Blood Request?
            </DialogTitle>
            <DialogDescription className="text-xs">
              As an administrator, are you sure you want to delete this blood
              request? This will remove the request from public listings and
              search results.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteRequest}
              disabled={actionLoading}
              className="font-semibold"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
