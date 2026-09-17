"use client";

import { useState } from "react";
import { toast } from "sonner";

interface UseAdminLocationHandlersProps {
  profileLocation: [number, number] | null;
  updateParams: (updates: Record<string, string | null>) => void;
}

export function useAdminLocationHandlers({
  profileLocation,
  updateParams,
}: UseAdminLocationHandlersProps) {
  const [isLocating, setIsLocating] = useState(false);

  const handleRadiusChange = (val: string) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 200) {
      num = 200;
      toast.info("Maximum range is limited to 200 km.");
    }
    updateParams({ radiusKm: num.toString(), page: "1" });
  };

  const handleDetectGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        updateParams({
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
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

  return {
    isLocating,
    handleRadiusChange,
    handleDetectGps,
    handleUseSavedLocation,
    handleShowAllWorldwide,
    handleMapClick,
  };
}
