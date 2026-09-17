"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { MapWrapper } from "./MapWrapper";
import { apiClient } from "@/lib/api/client";
import { bloodGroupLabels, getLabel } from "@/lib/labels";
import { Loader2, Crosshair, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { MapMarkerItem } from "@/components/Map";
import type { User } from "@repo/shared";
import { calculateDistance, formatDistance } from "@/lib/utils/distance";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { BrowseRequestCard, type RequestItemWithDistance } from "./BrowseRequestCard";
import { BrowseEmptyState } from "./BrowseEmptyState";

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
  appliedRequestIds?: string[];
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
  appliedRequestIds = [],
}: BrowseClientProps) {
  const pathname = usePathname();
  const appliedSet = new Set(appliedRequestIds);

  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [locationSource, setLocationSource] = useState<
    "profile" | "gps" | "custom" | "default"
  >(initialSource);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bloodGroup, setBloodGroup] = useState<string>(initialBloodGroup);
  const [radiusKm, setRadiusKm] = useState<string>(initialRadiusKm);
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const isFirstMount = useRef(true);

  useEffect(() => {
    if (selectedRequestId) {
      const el = document.getElementById(`request-card-${selectedRequestId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedRequestId]);

  const syncToUrl = useCallback(
    (
      coords: [number, number],
      source: "profile" | "gps" | "custom" | "default",
      radius: string,
      bg: string,
    ) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (bg && bg !== "ALL") params.set("bloodGroup", bg);
      params.set("radiusKm", radius);
      params.set("source", source);
      params.set("lat", coords[0].toFixed(4));
      params.set("lng", coords[1].toFixed(4));
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    },
    [pathname],
  );

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
          if (notify) toast.success("Switched to your live GPS Location!");
          fetchRequests(newCoords, radiusKm, bloodGroup, "gps");
        },
        (error) => {
          setIsLocating(false);
          console.warn("Geolocation lookup failed/denied:", error);
          if (notify) {
            toast.error(
              error.code === error.PERMISSION_DENIED
                ? "Location permission denied. Please allow location access in your browser."
                : "Could not retrieve GPS location. Please try again or choose on map.",
            );
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
      );
    },
    [bloodGroup, radiusKm, fetchRequests],
  );

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

  const switchToGpsLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    detectGpsLocation(true);
  };

  useEffect(() => {
    if (!isFirstMount.current) return;
    isFirstMount.current = false;
    if (!hasExplicitCoords && !profileLocation) {
      detectGpsLocation(false);
    }
  }, [hasExplicitCoords, profileLocation, detectGpsLocation]);

  const handleBloodGroupChange = (val: string | null) => {
    const newBg = val || "ALL";
    setBloodGroup(newBg);
    fetchRequests(center, radiusKm, newBg, locationSource);
  };

  const handleRadiusChange = (val: string) => {
    setRadiusKm(val);
    fetchRequests(center, val, bloodGroup, locationSource);
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchRequests(center, radiusKm, bloodGroup, locationSource);
  };

  const handleMapClick = (pos: [number, number]) => {
    setCenter(pos);
    setLocationSource("custom");
    toast.info("Updated search center from map.");
    fetchRequests(pos, radiusKm, bloodGroup, "custom");
  };

  const requestsWithDistance: RequestItemWithDistance[] = requests
    .map((req) => {
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

  const markers: MapMarkerItem[] = requestsWithDistance.map((req) => ({
    id: req.id,
    position: [req.location.coordinates[1], req.location.coordinates[0]],
    title: `Need ${getLabel(bloodGroupLabels, req.blood_group)}`,
    description: req.hospital_name
      ? `${req.hospital_name} (${req.area_name})`
      : req.area_name,
    blood_group: req.blood_group,
    urgency: req.urgency,
    area_name: req.area_name,
    hospital_name: req.hospital_name,
    distanceText: req.distanceText,
  }));

  const locationBadgeLabel =
    locationSource === "profile"
      ? profileAreaName
        ? `Profile: ${profileAreaName}`
        : "Saved Profile Location"
      : locationSource === "gps"
        ? "Live GPS Location"
        : "Custom Pin Location";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-3 md:p-6 gap-4">
      <BrowseFilterBar
        locationSource={locationSource}
        locationBadgeLabel={locationBadgeLabel}
        profileLocation={profileLocation}
        profileAreaName={profileAreaName}
        isLocating={isLocating}
        isLoading={isLoading}
        bloodGroup={bloodGroup}
        radiusKm={radiusKm}
        onSwitchToProfile={switchToProfileLocation}
        onSwitchToGps={switchToGpsLocation}
        onBloodGroupChange={handleBloodGroupChange}
        onRadiusChange={handleRadiusChange}
        onApplyFilter={handleApplyFilter}
      />

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        <div className="order-2 lg:order-1 w-full lg:w-5/12 flex flex-col gap-3 lg:overflow-y-auto pr-0 lg:pr-1">
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
            <BrowseEmptyState
              radiusKm={radiusKm}
              bloodGroup={bloodGroup}
              onRadiusChange={handleRadiusChange}
              onBloodGroupChange={handleBloodGroupChange}
            />
          ) : (
            requestsWithDistance.map((req) => (
              <BrowseRequestCard
                key={req.id}
                req={req}
                isSelected={selectedRequestId === req.id}
                hasApplied={appliedSet.has(req.id)}
                onSelect={(id) => setSelectedRequestId(id)}
              />
            ))
          )}
        </div>

        <div className="order-1 lg:order-2 w-full lg:w-7/12 h-[320px] sm:h-[380px] md:h-[420px] lg:h-full rounded-2xl overflow-hidden border shadow-sm relative bg-muted/20 shrink-0">
          <MapWrapper
            center={center}
            markers={markers}
            radiusKm={parseFloat(radiusKm) || 10}
            centerLabel={locationBadgeLabel}
            onMarkerClick={(id) => setSelectedRequestId(id)}
            onMapClick={handleMapClick}
          />
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-background/90 backdrop-blur-md px-3.5 py-2 rounded-xl border text-[11px] text-muted-foreground shadow-md pointer-events-none z-10 flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-red-500 shrink-0" />
            <span>Click anywhere on the map to relocate search center.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
