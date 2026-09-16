"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapWrapper } from "./MapWrapper";
import { apiClient } from "@/lib/api/client";
import { bloodGroupLabels, urgencyLabels, getLabel } from "@/lib/labels";
import {
  Navigation,
  MapPin,
  Home,
  Loader2,
  Search,
  Crosshair,
  HeartHandshake,
  Hospital,
  Droplets,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { MapMarkerItem } from "@/components/Map";
import type { User } from "@repo/shared";

interface RequestItem {
  id: string;
  blood_group: string;
  area_name: string;
  hospital_name?: string;
  urgency: string;
  units_needed?: number;
  units_fulfilled?: number;
  created_at?: string;
  location: { type: string; coordinates: [number, number] }; // [lng, lat]
}

interface BrowseClientProps {
  user: User | null;
  profileLocation: [number, number] | null; // [lat, lng]
  profileAreaName?: string;
  initialCenter: [number, number]; // [lat, lng]
  initialSource?: "profile" | "gps" | "custom" | "default";
  initialRequests: RequestItem[];
  initialBloodGroup?: string;
  initialRadiusKm?: string;
  hasExplicitCoords?: boolean;
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

export function BrowseClient({
  user,
  profileLocation,
  profileAreaName,
  initialCenter,
  initialSource = "default",
  initialRequests,
  initialBloodGroup = "ALL",
  initialRadiusKm = "10",
  hasExplicitCoords = false,
}: BrowseClientProps) {
  const pathname = usePathname();

  // Location state
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [locationSource, setLocationSource] = useState<
    "profile" | "gps" | "custom" | "default"
  >(initialSource);

  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [bloodGroup, setBloodGroup] = useState<string>(initialBloodGroup);
  const [radiusKm, setRadiusKm] = useState<string>(initialRadiusKm);
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );

  const isFirstMount = useRef(true);

  // Sync state to URL params so everything persists on page reload
  const syncToUrl = useCallback(
    (
      coords: [number, number],
      source: "profile" | "gps" | "custom" | "default",
      radius: string,
      bg: string,
    ) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (bg && bg !== "ALL") {
        params.set("bloodGroup", bg);
      }
      params.set("radiusKm", radius);
      params.set("source", source);
      params.set("lat", coords[0].toFixed(4));
      params.set("lng", coords[1].toFixed(4));
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    },
    [pathname],
  );

  // Fetch nearby requests
  const fetchRequests = useCallback(
    async (
      coords: [number, number],
      radius: string,
      bg: string,
      source: "profile" | "gps" | "custom" | "default",
    ) => {
      setIsLoading(true);
      try {
        const bgParam = bg && bg !== "ALL" ? `&bloodGroup=${bg}` : "";
        const data = await apiClient.request<
          { data: RequestItem[] } | RequestItem[]
        >(
          `/requests/nearby?lat=${coords[0]}&lng=${coords[1]}&radiusKm=${radius}${bgParam}`,
        );
        const list = Array.isArray(data) ? data : data?.data || [];
        setRequests(list);
        syncToUrl(coords, source, radius, bg);
      } catch (err) {
        console.error("Failed to load nearby requests:", err);
        toast.error("Failed to fetch nearby requests.");
      } finally {
        setIsLoading(false);
      }
    },
    [syncToUrl],
  );

  // Live GPS geolocation trigger
  const detectGpsLocation = useCallback(
    (notify = true) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        if (notify) toast.error("Geolocation is not supported by your browser");
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
          if (notify) {
            toast.success("Switched to your live GPS Location!");
          }
          fetchRequests(newCoords, radiusKm, bloodGroup, "gps");
        },
        (error) => {
          setIsLocating(false);
          console.warn("Geolocation lookup failed/denied:", error);
          if (notify) {
            if (error.code === error.PERMISSION_DENIED) {
              toast.error(
                "Location permission denied. Please allow location access in your browser.",
              );
            } else {
              toast.error(
                "Could not retrieve GPS location. Please try again or choose on map.",
              );
            }
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
      );
    },
    [bloodGroup, radiusKm, fetchRequests],
  );

  // Switch to Saved Profile Location
  const switchToProfileLocation = () => {
    if (!profileLocation) {
      toast.error("No saved location found in your profile.");
      return;
    }
    setCenter(profileLocation);
    setLocationSource("profile");
    toast.success("Switched to your Saved Profile Location!");
    fetchRequests(profileLocation, radiusKm, bloodGroup, "profile");
  };

  // Switch to Live GPS Location
  const switchToGpsLocation = () => {
    detectGpsLocation(true);
  };

  // On initial mount:
  // If no explicit coordinates provided and not logged in (no profile location), auto-detect GPS
  useEffect(() => {
    if (!isFirstMount.current) return;
    isFirstMount.current = false;

    if (!hasExplicitCoords) {
      if (!profileLocation) {
        // Not logged in -> Auto-detect current browser GPS
        detectGpsLocation(false);
      }
    }
  }, [hasExplicitCoords, profileLocation, detectGpsLocation]);

  // Handle filter changes (Blood group change)
  const handleBloodGroupChange = (val: string | null) => {
    const newBg = val || "ALL";
    setBloodGroup(newBg);
    fetchRequests(center, radiusKm, newBg, locationSource);
  };

  // Handle radius change
  const handleRadiusChange = (val: string) => {
    setRadiusKm(val);
    fetchRequests(center, val, bloodGroup, locationSource);
  };

  // Handle form submit
  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchRequests(center, radiusKm, bloodGroup, locationSource);
  };

  // Handle map click to re-center
  const handleMapClick = (pos: [number, number]) => {
    setCenter(pos);
    setLocationSource("custom");
    toast.info("Updated search center from map.");
    fetchRequests(pos, radiusKm, bloodGroup, "custom");
  };

  // Compute distances & sort nearest first
  const requestsWithDistance = requests
    .map((req) => {
      // req.location.coordinates is [lng, lat]
      const reqLat = req.location.coordinates[1];
      const reqLng = req.location.coordinates[0];
      const dist = calculateDistance(center[0], center[1], reqLat, reqLng);
      return {
        ...req,
        distanceKm: dist,
        distanceText: formatDistance(dist),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // Markers for map
  const markers: MapMarkerItem[] = requestsWithDistance.map((r) => ({
    id: r.id,
    position: [r.location.coordinates[1], r.location.coordinates[0]],
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

  const locationBadgeLabel = {
    profile: profileAreaName
      ? `Saved Profile: ${profileAreaName}`
      : "Saved Profile Location",
    gps: "Live GPS Location",
    custom: "Custom Map Pin",
    default: "Default (Dhaka)",
  }[locationSource];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-3 md:p-6 gap-4">
      {/* Top Header & Interactive Filter Bar */}
      <div className="bg-card p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col gap-4">
        {/* Title and Location Switcher Row */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Droplets className="w-6 h-6 text-red-600 animate-pulse" />
                Browse Open Requests
              </h1>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 font-medium transition-colors ${
                  locationSource === "profile"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : locationSource === "gps"
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                {locationSource === "profile" ? (
                  <Home className="w-3.5 h-3.5 mr-1" />
                ) : locationSource === "gps" ? (
                  <Navigation className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5 mr-1" />
                )}
                {locationBadgeLabel}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Showing blood donation requests nearest to your chosen location.
            </p>
          </div>

          {/* Location Switcher Segmented Control */}
          <div className="flex items-center p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/80 w-full sm:w-auto overflow-x-auto">
            {profileLocation && (
              <button
                type="button"
                onClick={switchToProfileLocation}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  locationSource === "profile"
                    ? "bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Home className="w-3.5 h-3.5 text-red-500" />
                <span>My Saved Location</span>
              </button>
            )}

            <button
              type="button"
              onClick={switchToGpsLocation}
              disabled={isLocating}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                locationSource === "gps"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-blue-500" />
              )}
              <span>Current GPS Location</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <form
          onSubmit={handleApplyFilter}
          className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60"
        >
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
            {/* Blood Group Select */}
            <div className="flex items-center gap-2 min-w-[170px]">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Blood Group:
              </Label>
              <Select value={bloodGroup} onValueChange={handleBloodGroupChange}>
                <SelectTrigger className="h-9 w-full bg-background">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" label="All Groups">
                    🩸 All Groups
                  </SelectItem>
                  <SelectItem value="A_POS" label="A+">
                    A+
                  </SelectItem>
                  <SelectItem value="A_NEG" label="A-">
                    A-
                  </SelectItem>
                  <SelectItem value="B_POS" label="B+">
                    B+
                  </SelectItem>
                  <SelectItem value="B_NEG" label="B-">
                    B-
                  </SelectItem>
                  <SelectItem value="O_POS" label="O+">
                    O+
                  </SelectItem>
                  <SelectItem value="O_NEG" label="O-">
                    O-
                  </SelectItem>
                  <SelectItem value="AB_POS" label="AB+">
                    AB+
                  </SelectItem>
                  <SelectItem value="AB_NEG" label="AB-">
                    AB-
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Radius Preset Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Label className="text-xs font-medium text-muted-foreground mr-1">
                Radius:
              </Label>
              {["5", "10", "20", "50"].map((r) => (
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
                  onChange={(e) => setRadiusKm(e.target.value)}
                  onBlur={() =>
                    fetchRequests(center, radiusKm, bloodGroup, locationSource)
                  }
                  className="h-8 w-16 text-xs text-center px-1"
                  placeholder="km"
                />
                <span className="text-xs text-muted-foreground">km</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* Main Content: Left Requests List + Right Interactive Map */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        {/* Left Column: Sorted Requests List */}
        <div className="w-full lg:w-5/12 flex flex-col gap-3 overflow-y-auto pr-1">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {isLoading
                  ? "Finding requests..."
                  : `${requestsWithDistance.length} open ${
                      requestsWithDistance.length === 1 ? "request" : "requests"
                    } nearby`}
              </span>
            </div>
            {isLoading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Filtering...
              </span>
            )}
          </div>

          {requestsWithDistance.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl border border-dashed flex-1 gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">
                  No requests found within {radiusKm} km
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Try expanding the search radius or selecting all blood groups
                  to find more recipients in need.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRadiusChange("25")}
                  className="text-xs"
                >
                  Expand to 25 km
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRadiusChange("50")}
                  className="text-xs"
                >
                  Expand to 50 km
                </Button>
                {bloodGroup !== "ALL" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBloodGroupChange("ALL")}
                    className="text-xs"
                  >
                    All Blood Groups
                  </Button>
                )}
              </div>
            </div>
          ) : (
            requestsWithDistance.map((req) => {
              const isSelected = selectedRequestId === req.id;
              const isCritical = req.urgency === "CRITICAL";
              const isUrgent = req.urgency === "URGENT";

              return (
                <Card
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
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
                          <CardTitle className="text-lg font-extrabold text-red-600 dark:text-red-400">
                            Need {getLabel(bloodGroupLabels, req.blood_group)}
                          </CardTitle>
                          <Badge
                            variant={
                              isCritical
                                ? "destructive"
                                : isUrgent
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-[11px] font-semibold px-2 py-0"
                          >
                            {getLabel(urgencyLabels, req.urgency)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{req.distanceText}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-sm text-muted-foreground space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-foreground/90 font-medium">
                      <Hospital className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {req.hospital_name
                          ? `${req.hospital_name} (${req.area_name})`
                          : req.area_name}
                      </span>
                    </div>

                    {req.units_needed && (
                      <div className="text-xs text-muted-foreground">
                        Units needed:{" "}
                        <span className="font-semibold text-foreground">
                          {req.units_fulfilled ?? 0} / {req.units_needed} bags
                        </span>
                      </div>
                    )}

                    <div className="pt-1">
                      <Link href={`/requests/${req.id}`} className="block">
                        <Button
                          size="sm"
                          className="w-full bg-red-600 hover:bg-red-700 text-white text-xs h-8 font-medium shadow-sm"
                        >
                          Respond & Donate
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column: Interactive Map */}
        <div className="w-full lg:w-7/12 h-[420px] lg:h-full rounded-2xl overflow-hidden border shadow-sm relative bg-muted/20">
          <MapWrapper
            center={center}
            markers={markers}
            radiusKm={parseFloat(radiusKm) || 10}
            centerLabel={locationBadgeLabel}
            onMarkerClick={(id) => setSelectedRequestId(id)}
            onMapClick={handleMapClick}
          />

          {/* Quick Tip Pill */}
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-background/90 backdrop-blur-md px-3.5 py-2 rounded-xl border text-[11px] text-muted-foreground shadow-md pointer-events-none z-10 flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-red-500 shrink-0" />
            <span>Click anywhere on the map to relocate search center.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
