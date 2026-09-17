"use client";

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
import {
  Droplets,
  Home,
  Navigation,
  Crosshair,
  MapPin,
  Loader2,
  Search,
} from "lucide-react";

interface BrowseFilterBarProps {
  locationSource: "profile" | "gps" | "custom" | "default";
  locationBadgeLabel: string;
  profileLocation: [number, number] | null;
  profileAreaName?: string;
  isLocating: boolean;
  isLoading: boolean;
  bloodGroup: string;
  radiusKm: string;
  onSwitchToProfile: () => void;
  onSwitchToGps: () => void;
  onBloodGroupChange: (val: string | null) => void;
  onRadiusChange: (val: string) => void;
  onApplyFilter: (e?: React.FormEvent) => void;
}

export function BrowseFilterBar({
  locationSource,
  locationBadgeLabel,
  profileLocation,
  profileAreaName,
  isLocating,
  isLoading,
  bloodGroup,
  radiusKm,
  onSwitchToProfile,
  onSwitchToGps,
  onBloodGroupChange,
  onRadiusChange,
  onApplyFilter,
}: BrowseFilterBarProps) {
  return (
    <div className="bg-card p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Droplets className="w-6 h-6 text-red-600 fill-red-600" />
              Browse Nearby Blood Requests
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
            Real-time emergency requests near your location. Relocate by clicking on the map.
          </p>
        </div>

        {/* Location Switcher Segmented Control */}
        <div className="flex items-center p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/80 w-full sm:w-auto">
          {profileLocation && (
            <button
              type="button"
              onClick={onSwitchToProfile}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                locationSource === "profile"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="truncate max-w-[160px] sm:max-w-none">
                {profileAreaName ? `Saved: ${profileAreaName}` : "Saved Profile Location"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchToGps}
            disabled={isLocating}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              locationSource === "gps"
                ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>Current GPS Location</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Row */}
      <form
        onSubmit={onApplyFilter}
        className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60"
      >
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          {/* Blood Group Select */}
          <div className="flex items-center gap-2 min-w-42.5">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Blood Group:
            </Label>
            <Select value={bloodGroup} onValueChange={onBloodGroupChange}>
              <SelectTrigger className="h-9 w-full bg-background">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" label="All Groups">🩸 All Groups</SelectItem>
                <SelectItem value="A_POS" label="A+">A+</SelectItem>
                <SelectItem value="A_NEG" label="A-">A-</SelectItem>
                <SelectItem value="B_POS" label="B+">B+</SelectItem>
                <SelectItem value="B_NEG" label="B-">B-</SelectItem>
                <SelectItem value="O_POS" label="O+">O+</SelectItem>
                <SelectItem value="O_NEG" label="O-">O-</SelectItem>
                <SelectItem value="AB_POS" label="AB+">AB+</SelectItem>
                <SelectItem value="AB_NEG" label="AB-">AB-</SelectItem>
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
                onClick={() => onRadiusChange(r)}
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
                onChange={(e) => onRadiusChange(e.target.value)}
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
  );
}
