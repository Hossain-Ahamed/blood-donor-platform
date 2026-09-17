"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminRequestsRadiusFilterProps {
  useRadiusFilter: boolean;
  radiusKm: string;
  onRadiusChange: (val: string) => void;
}

export function AdminRequestsRadiusFilter({
  useRadiusFilter,
  radiusKm,
  onRadiusChange,
}: AdminRequestsRadiusFilterProps) {
  if (!useRadiusFilter) return null;

  return (
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
  );
}
