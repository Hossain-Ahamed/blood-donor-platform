"use client";

import { Globe, Home, Navigation, Loader2 } from "lucide-react";

interface AdminRequestsLocationSwitcherProps {
  useRadiusFilter: boolean;
  locationSource: "profile" | "gps" | "custom" | "all";
  profileLocation: [number, number] | null;
  profileAreaName: string | null;
  isLocating: boolean;
  onShowAllWorldwide: () => void;
  onUseSavedLocation: () => void;
  onDetectGps: () => void;
}

export function AdminRequestsLocationSwitcher({
  useRadiusFilter,
  locationSource,
  profileLocation,
  profileAreaName,
  isLocating,
  onShowAllWorldwide,
  onUseSavedLocation,
  onDetectGps,
}: AdminRequestsLocationSwitcherProps) {
  return (
    <div className="flex items-center p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/80 w-full sm:w-auto overflow-x-auto">
      <button
        type="button"
        onClick={onShowAllWorldwide}
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
          onClick={onUseSavedLocation}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            useRadiusFilter && locationSource === "profile"
              ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span className="truncate max-w-40 sm:max-w-none">
            {profileAreaName || "Saved"}
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={onDetectGps}
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
  );
}
