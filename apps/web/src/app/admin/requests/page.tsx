"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { apiClient } from "@/lib/api/client";
import { BloodGroup, RequestStatus } from "@repo/shared";
import {
  bloodGroupLabels,
  urgencyLabels,
  requestStatusLabels,
  componentTypeLabels,
  getLabel,
} from "@/lib/labels";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Hospital,
  User as UserIcon,
  Phone,
  Eye,
  AlertTriangle,
  Globe,
  Crosshair,
  Filter,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
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

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestWithRequester[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [status, setStatus] = useState<string>("all");
  const [bloodGroup, setBloodGroup] = useState<string>("all");
  const [radiusKm, setRadiusKm] = useState<string>("25");
  // Default to showing all locations normally for admin
  const [useRadiusFilter, setUseRadiusFilter] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Location state
  const [center, setCenter] = useState<[number, number]>([23.7925, 90.4078]);
  const [locationSource, setLocationSource] = useState<
    "profile" | "gps" | "custom" | "all"
  >("all");
  const [profileLocation, setProfileLocation] = useState<
    [number, number] | null
  >(null);
  const [profileAreaName, setProfileAreaName] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Request Details Dialog & Action State
  const [selectedRequest, setSelectedRequest] =
    useState<RequestWithRequester | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch admin profile to check for saved DB location
  useEffect(() => {
    async function loadAdminProfile() {
      try {
        const res = await apiClient.request<any>("/donor-profiles/me");
        const profile = res?.data || res;
        if (profile?.location) {
          const loc = profile.location;
          let coords: [number, number] | null = null;
          if (Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
            coords = [loc.coordinates[1], loc.coordinates[0]];
          } else if (typeof loc.lat === "number" && typeof loc.lng === "number") {
            coords = [loc.lat, loc.lng];
          }
          if (coords) {
            setProfileLocation(coords);
            setProfileAreaName(profile.area_name || null);
          }
        }
      } catch {
        // Admin has no donor profile or not created yet
      }
    }
    loadAdminProfile();
  }, []);

  // Fetch Requests
  const fetchRequests = useCallback(
    async (
      currentPage = page,
      currentStatus = status,
      currentBloodGroup = bloodGroup,
      currentCenter = center,
      applyRadius = useRadiusFilter,
      currentRadius = radiusKm,
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "20",
        });

        if (currentStatus !== "all") params.append("status", currentStatus);
        if (currentBloodGroup !== "all") {
          params.append("blood_group", currentBloodGroup);
        }

        if (applyRadius) {
          // Cap radius at max 200 km
          const cappedRadius = Math.min(200, Math.max(1, parseFloat(currentRadius) || 25));
          params.append("lat", currentCenter[0].toString());
          params.append("lng", currentCenter[1].toString());
          params.append("radiusKm", cappedRadius.toString());
        }

        const response = await apiClient.request<
          PaginatedResponse<RequestWithRequester>
        >(`/admin/requests?${params.toString()}`);

        const data = (response as any).data?.data
          ? (response as any).data
          : response;

        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setRequests(list);
        setTotalCount(data?.meta?.total ?? list.length);
        setTotalPages(data?.meta?.totalPages ?? 1);
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch requests");
      } finally {
        setLoading(false);
      }
    },
    [page, status, bloodGroup, center, useRadiusFilter, radiusKm],
  );

  // Trigger fetch on filter change
  useEffect(() => {
    fetchRequests(page, status, bloodGroup, center, useRadiusFilter, radiusKm);
  }, [page, status, bloodGroup, useRadiusFilter, radiusKm, center, fetchRequests]);

  // Radius change with 200 km max limit enforcement
  const handleRadiusChange = (val: string) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 200) {
      num = 200;
      toast.info("Maximum range is limited to 200 km.");
    }
    setRadiusKm(num.toString());
    setPage(1);
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
        const newCoords: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setCenter(newCoords);
        setLocationSource("gps");
        setUseRadiusFilter(true);
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
    setCenter(profileLocation);
    setLocationSource("profile");
    setUseRadiusFilter(true);
    toast.success("Location set to your Saved Profile Location");
  };

  const handleShowAllWorldwide = () => {
    setUseRadiusFilter(false);
    setLocationSource("all");
    toast.info("Showing requests normally from all locations");
  };

  const handleMapClick = (pos: [number, number]) => {
    setCenter(pos);
    setLocationSource("custom");
    setUseRadiusFilter(true);
    toast.info("Updated admin search center from map.");
  };

  // Status update action (Approve, Cancel, Fulfill)
  const handleUpdateStatus = async (newStatus: RequestStatus) => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      await apiClient.request(`/admin/requests/${selectedRequest.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      const label = getLabel(requestStatusLabels, newStatus);
      toast.success(`Request status updated to ${label}`);

      // Update in local state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id ? { ...r, status: newStatus } : r,
        ),
      );
      setSelectedRequest((prev) =>
        prev ? { ...prev, status: newStatus } : null,
      );
      setIsDetailDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to update request status");
    } finally {
      setActionLoading(false);
    }
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
      position: [
        r.location!.coordinates[1],
        r.location!.coordinates[0],
      ],
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
              Review, verify, approve, fulfill, or cancel emergency blood requests.
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
                  locationSource === "profile" && useRadiusFilter
                    ? "bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Home className="w-3.5 h-3.5 text-red-500" />
                <span>Saved Location</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDetectGps}
              disabled={isLocating}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                locationSource === "gps" && useRadiusFilter
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-blue-500" />
              )}
              <span>GPS Location</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
            {/* Status Select */}
            <div className="flex items-center gap-2 min-w-[150px]">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Status:
              </Label>
              <Select
                value={status}
                onValueChange={(val: string | null) => {
                  setStatus(val || "all");
                  setPage(1);
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
            <div className="flex items-center gap-2 min-w-[150px]">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Group:
              </Label>
              <Select
                value={bloodGroup}
                onValueChange={(val: string | null) => {
                  setBloodGroup(val || "all");
                  setPage(1);
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
              onClick={() => fetchRequests()}
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
        <div className="w-full lg:w-5/12 flex flex-col gap-3 overflow-y-auto pr-1">
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
                  Locations&quot;.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowAllWorldwide}
                className="text-xs mt-2"
              >
                Show All Locations
              </Button>
            </div>
          ) : (
            requestsWithDistance.map((req) => {
              const isSelected = selectedRequest?.id === req.id;
              const isCritical = req.urgency === "CRITICAL";
              const isUrgent = req.urgency === "URGENT";

              return (
                <Card
                  key={req.id}
                  onClick={() => {
                    setSelectedRequest(req);
                    setIsDetailDialogOpen(true);
                  }}
                  className={`transition-all duration-200 border cursor-pointer shadow-sm rounded-xl ${
                    isSelected
                      ? "ring-2 ring-red-500 border-red-500 bg-red-50/20 dark:bg-red-950/30"
                      : "hover:border-red-300 dark:hover:border-red-900/60 hover:bg-muted/30"
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-extrabold text-red-600 dark:text-red-400">
                            Need {getLabel(bloodGroupLabels, req.blood_group)}
                          </CardTitle>
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
                            className="text-[10px] font-semibold px-2 py-0"
                          >
                            {getLabel(requestStatusLabels, req.status)}
                          </Badge>
                          {req.urgency && (
                            <Badge
                              variant={
                                isCritical
                                  ? "destructive"
                                  : isUrgent
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-[10px] px-1.5 py-0"
                            >
                              {getLabel(urgencyLabels, req.urgency)}
                            </Badge>
                          )}
                        </div>

                        {req.distanceText && useRadiusFilter && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{req.distanceText}</span>
                          </div>
                        )}
                      </div>

                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs text-muted-foreground space-y-2.5">
                    <div className="flex items-center gap-1.5 text-foreground/90 font-medium">
                      <Hospital className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {req.hospital_name
                          ? `${req.hospital_name} (${req.area_name})`
                          : req.area_name}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span>
                        Requester:{" "}
                        <strong className="text-foreground font-semibold">
                          {req.requester?.name || "Unknown"}
                        </strong>
                      </span>
                      <span>
                        {req.units_fulfilled} / {req.units_needed} bags
                      </span>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7.5 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View & Manage Request
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Leaflet Map */}
        <div className="w-full lg:w-7/12 h-[400px] lg:h-full rounded-2xl overflow-hidden border shadow-sm relative bg-muted/20">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3 pr-6">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <span>
                      Need {getLabel(bloodGroupLabels, selectedRequest.blood_group)}
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
                <DialogDescription>
                  Request ID: {selectedRequest.id} • Created on{" "}
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </DialogDescription>
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
                  <p className="text-foreground">{selectedRequest.patient_note}</p>
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
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View Public Page
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
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
    </div>
  );
}
