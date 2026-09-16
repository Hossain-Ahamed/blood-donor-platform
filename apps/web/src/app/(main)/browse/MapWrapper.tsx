"use client";

import dynamic from "next/dynamic";
import type { MapMarkerItem } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

export function MapWrapper({
  center,
  markers = [],
  radiusKm,
  showCenter = true,
  centerLabel,
  onMarkerClick,
  onMapClick,
}: {
  center: [number, number];
  markers?: MapMarkerItem[];
  radiusKm?: number;
  showCenter?: boolean;
  centerLabel?: string;
  onMarkerClick?: (id: string) => void;
  onMapClick?: (pos: [number, number]) => void;
}) {
  return (
    <Map
      center={center}
      zoom={12}
      markers={markers}
      radiusMeters={radiusKm ? radiusKm * 1000 : undefined}
      showCenter={showCenter}
      centerLabel={centerLabel}
      onMarkerClick={onMarkerClick}
      onMapClick={onMapClick}
    />
  );
}
