"use client";

import { Button } from "@/components/ui/button";
import { HeartHandshake } from "lucide-react";

interface BrowseEmptyStateProps {
  radiusKm: string;
  bloodGroup: string;
  onRadiusChange: (val: string) => void;
  onBloodGroupChange: (val: string) => void;
}

export function BrowseEmptyState({
  radiusKm,
  bloodGroup,
  onRadiusChange,
  onBloodGroupChange,
}: BrowseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl border border-dashed flex-1 gap-3.5">
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
        <HeartHandshake className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-base text-foreground">
          No requests found within {radiusKm} km
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Try expanding the search radius or selecting all blood groups to find
          more recipients in need.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRadiusChange("25")}
          className="text-xs"
        >
          Expand to 25 km
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRadiusChange("50")}
          className="text-xs"
        >
          Expand to 50 km
        </Button>
        {bloodGroup !== "ALL" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBloodGroupChange("ALL")}
            className="text-xs"
          >
            All Blood Groups
          </Button>
        )}
      </div>
    </div>
  );
}
