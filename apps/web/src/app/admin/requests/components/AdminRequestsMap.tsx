"use client";

import dynamic from "next/dynamic";
import { Crosshair } from "lucide-react";
import type { MapMarkerItem } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      Loading admin map...
    </div>
  ),
});

interface AdminRequestsMapProps {
  center: [number, number];
  markers: MapMarkerItem[];
  radiusKm: string;
  useRadiusFilter: boolean;
  onMarkerClick: (id: string) => void;
  onMapClick: (pos: [number, number]) => void;
}

export function AdminRequestsMap({
  center,
  markers,
  radiusKm,
  useRadiusFilter,
  onMarkerClick,
  onMapClick,
}: AdminRequestsMapProps) {
  return (
    <div className="w-full lg:w-7/12 h-100 lg:h-full rounded-2xl overflow-hidden border shadow-sm relative bg-muted/20">
      <Map
        center={center}
        zoom={12}
        markers={markers}
        radiusMeters={
          useRadiusFilter ? parseFloat(radiusKm) * 1000 : undefined
        }
        showCenter={useRadiusFilter}
        centerLabel="Admin Location"
        onMarkerClick={onMarkerClick}
        onMapClick={onMapClick}
      />

      <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border text-[11px] text-muted-foreground shadow-md pointer-events-none z-10 flex items-center gap-1.5">
        <Crosshair className="w-3.5 h-3.5 text-red-500 shrink-0" />
        <span>Click any marker or card to view details & actions.</span>
      </div>
    </div>
  );
}
