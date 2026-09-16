"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const LocationPickerMap = dynamic(
  () => import("@/components/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[220px] bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading map...
      </div>
    ),
  },
);

interface LocationPickerProps {
  lat?: number | null;
  lng?: number | null;
  areaName?: string;
  onLocationChange: (lat: number, lng: number, suggestedArea?: string) => void;
  onAreaNameChange?: (area: string) => void;
  showAreaInput?: boolean;
  areaInputLabel?: string;
  areaInputPlaceholder?: string;
  required?: boolean;
}

export function LocationPicker({
  lat,
  lng,
  areaName = "",
  onLocationChange,
  onAreaNameChange,
  showAreaInput = true,
  areaInputLabel = "Area / Locality Name",
  areaInputPlaceholder = "e.g. Dhanmondi, Dhaka",
  required = true,
}: LocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const hasLocation = typeof lat === "number" && typeof lng === "number";
  const position: [number, number] | null = hasLocation ? [lat!, lng!] : null;

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      setIsGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            "Accept-Language": "en",
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const bestArea =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.city_district ||
          addr.road ||
          addr.city ||
          addr.town ||
          addr.county ||
          data.display_name?.split(",").slice(0, 2).join(",");

        if (bestArea) {
          return bestArea.trim();
        }
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
    } finally {
      setIsGeocoding(false);
    }
    return null;
  };

  const handleMapSelect = async (pos: [number, number]) => {
    const [selectedLat, selectedLng] = pos;
    onLocationChange(selectedLat, selectedLng);
    const suggested = await reverseGeocode(selectedLat, selectedLng);
    if (suggested) {
      onLocationChange(selectedLat, selectedLng, suggested);
      if (onAreaNameChange) {
        onAreaNameChange(suggested);
      }
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setIsLocating(false);

        onLocationChange(userLat, userLng);
        const suggested = await reverseGeocode(userLat, userLng);
        if (suggested) {
          onLocationChange(userLat, userLng, suggested);
          if (onAreaNameChange) {
            onAreaNameChange(suggested);
          }
        }
        toast.success("Current location detected!");
      },
      (error) => {
        setIsLocating(false);
        console.error("GPS error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(
            "Location permission denied. Please click on the map to choose location.",
          );
        } else {
          toast.error("Unable to retrieve location. Please click on the map.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <div className="space-y-4">
      {showAreaInput && (
        <div className="grid gap-2">
          <Label
            htmlFor="areaName"
            className="flex items-center justify-between"
          >
            <span>
              {areaInputLabel}{" "}
              {required && <span className="text-red-500">*</span>}
            </span>
            {isGeocoding && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Detecting area
                name...
              </span>
            )}
          </Label>
          <Input
            id="areaName"
            name="areaName"
            value={areaName}
            onChange={(e) => onAreaNameChange?.(e.target.value)}
            placeholder={areaInputPlaceholder}
            required={required}
          />
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <Label className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-red-600" />
            Location Pin on Map{" "}
            {required && <span className="text-red-500">*</span>}
          </Label>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-2 border-red-200 hover:bg-red-50 text-red-700 dark:border-red-900 dark:hover:bg-red-950/40 dark:text-red-300"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            ) : (
              <Navigation className="w-4 h-4 text-red-600" />
            )}
            {isLocating ? "Getting GPS..." : "Use Current Location"}
          </Button>
        </div>

        <div className="h-56 w-full rounded-lg border overflow-hidden shadow-inner relative bg-muted/20">
          <LocationPickerMap
            position={position}
            onPositionSelect={handleMapSelect}
            defaultCenter={position || [23.7925, 90.4078]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2 pt-1">
          {hasLocation ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Selected: {lat?.toFixed(4)}, {lng?.toFixed(4)}
              </span>
            </div>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              * Click anywhere on the map or use GPS to set your location pin
            </span>
          )}
          <span className="italic">Click map to adjust pin position</span>
        </div>
      </div>
    </div>
  );
}
