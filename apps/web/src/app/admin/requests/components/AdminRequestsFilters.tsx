"use client";

import { BloodGroup, RequestStatus } from "@repo/shared";
import { bloodGroupLabels, requestStatusLabels, getLabel } from "@/lib/labels";
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
  ShieldCheck,
  Globe,
  Home,
  Navigation,
  Crosshair,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { AdminRequestsLocationSwitcher } from "./AdminRequestsLocationSwitcher";
import { AdminRequestsRadiusFilter } from "./AdminRequestsRadiusFilter";

interface AdminRequestsFiltersProps {
  totalCount: number;
  locationSource: "profile" | "gps" | "custom" | "all";
  useRadiusFilter: boolean;
  profileAreaName: string | null;
  radiusKm: string;
  searchIdInput: string;
  setSearchIdInput: (val: string) => void;
  status: string;
  bloodGroup: string;
  isLocating: boolean;
  loading: boolean;
  profileLocation: [number, number] | null;
  requestIdParam: string;
  onShowAllWorldwide: () => void;
  onUseSavedLocation: () => void;
  onDetectGps: () => void;
  onRadiusChange: (val: string) => void;
  onUpdateParams: (updates: Record<string, string | null>) => void;
  onRefetch: () => void;
}

export function AdminRequestsFilters({
  totalCount,
  locationSource,
  useRadiusFilter,
  profileAreaName,
  radiusKm,
  searchIdInput,
  setSearchIdInput,
  status,
  bloodGroup,
  isLocating,
  loading,
  profileLocation,
  requestIdParam,
  onShowAllWorldwide,
  onUseSavedLocation,
  onDetectGps,
  onRadiusChange,
  onUpdateParams,
  onRefetch,
}: AdminRequestsFiltersProps) {
  return (
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

        <AdminRequestsLocationSwitcher
          useRadiusFilter={useRadiusFilter}
          locationSource={locationSource}
          profileLocation={profileLocation}
          profileAreaName={profileAreaName}
          isLocating={isLocating}
          onShowAllWorldwide={onShowAllWorldwide}
          onUseSavedLocation={onUseSavedLocation}
          onDetectGps={onDetectGps}
        />
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
                    onUpdateParams({
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
                    onUpdateParams({ requestId: null, page: "1" });
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
                onUpdateParams({
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
                onUpdateParams({ requestId: null, page: "1" });
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
                onUpdateParams({
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
                onUpdateParams({
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

          <AdminRequestsRadiusFilter
            useRadiusFilter={useRadiusFilter}
            radiusKm={radiusKm}
            onRadiusChange={onRadiusChange}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefetch}
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
  );
}
