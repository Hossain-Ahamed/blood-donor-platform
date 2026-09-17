import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Hospital } from "lucide-react";
import { bloodGroupLabels, urgencyLabels, getLabel } from "@/lib/labels";

export interface RequestItemWithDistance {
  id: string;
  blood_group: string;
  area_name: string;
  hospital_name?: string;
  urgency: string;
  units_needed?: number;
  units_fulfilled?: number;
  created_at?: string;
  location: { type?: string; coordinates: [number, number] };
  distanceKm: number;
  distanceText: string;
}

interface BrowseRequestCardProps {
  req: RequestItemWithDistance;
  isSelected: boolean;
  hasApplied: boolean;
  onSelect: (id: string) => void;
}

export function BrowseRequestCard({
  req,
  isSelected,
  hasApplied,
  onSelect,
}: BrowseRequestCardProps) {
  const isCritical = req.urgency === "CRITICAL";
  const isUrgent = req.urgency === "URGENT";

  return (
    <Card
      id={`request-card-${req.id}`}
      onClick={() => onSelect(req.id)}
      className={`transition-all duration-200 border cursor-pointer shadow-sm rounded-xl ${
        hasApplied
          ? isSelected
            ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/40"
            : "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/15 dark:bg-emerald-950/20 hover:border-emerald-400"
          : isSelected
            ? "ring-2 ring-red-500 border-red-500 bg-red-50/20 dark:bg-red-950/30"
            : "hover:border-red-300 dark:hover:border-red-900/60 hover:bg-muted/30"
      }`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle
                className={`text-lg font-extrabold ${
                  hasApplied
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
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
              {hasApplied && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2 py-0">
                  ✓ You Applied
                </Badge>
              )}
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
              className={`w-full text-white text-xs h-8 font-medium shadow-sm ${
                hasApplied
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {hasApplied ? "View Your Offer & Details" : "Respond & Donate"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
