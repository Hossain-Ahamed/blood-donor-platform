"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { bloodGroupLabels, urgencyLabels, getLabel } from "@/lib/labels";

// Fix Leaflet's default icon issue with Next.js/Webpack
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// A distinct icon for the user's own location (blue marker)
const CenterIcon = L.divIcon({
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #2563eb;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.4), 0 2px 8px rgba(0,0,0,0.35);
  "></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

// A custom blood drop pin icon for requests (distinct emerald icon if current user applied)
const createRequestIcon = (
  bloodGroup?: string,
  isCritical?: boolean,
  hasApplied?: boolean,
) => {
  const bgText = bloodGroup ? getLabel(bloodGroupLabels, bloodGroup) : "🩸";
  const bgColor = hasApplied
    ? "#059669"
    : isCritical
      ? "#dc2626"
      : "#e11d48";
  const borderColor = hasApplied ? "#a7f3d0" : "white";
  const appliedBadge = hasApplied
    ? `<span style="font-size: 8px; font-weight: 800; display: block; line-height: 1; margin-top: 1px; color: #ecfdf5;">APPLIED</span>`
    : "";

  return L.divIcon({
    html: `<div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      height: 36px;
      padding: 0 4px;
      background: ${bgColor};
      color: white;
      font-weight: 700;
      font-size: 11px;
      border: 2px solid ${borderColor};
      border-radius: 18px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      cursor: pointer;
    ">${bgText}${appliedBadge}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

export interface MapMarkerItem {
  id: string;
  position: [number, number];
  title: string;
  description?: string;
  blood_group?: string;
  urgency?: string;
  area_name?: string;
  hospital_name?: string;
  distanceText?: string;
  hasApplied?: boolean;
}

interface MapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarkerItem[];
  onMarkerClick?: (id: string) => void;
  radiusMeters?: number;
  showCenter?: boolean;
  centerLabel?: string;
  onMapClick?: (pos: [number, number]) => void;
}

function MapUpdater({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function MapEventsHandler({
  onMapClick,
}: {
  onMapClick?: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export default function Map({
  center,
  zoom = 12,
  markers = [],
  onMarkerClick,
  radiusMeters,
  showCenter = true,
  centerLabel = "Your Location",
  onMapClick,
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "0.5rem",
        zIndex: 0,
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} />
      <MapEventsHandler onMapClick={onMapClick} />

      {/* User's location marker */}
      {showCenter && (
        <Marker position={center} icon={CenterIcon}>
          <Popup>
            <div className="font-semibold text-sm">{centerLabel}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Lat: {center[0].toFixed(4)}, Lng: {center[1].toFixed(4)}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Radius circle overlay */}
      {radiusMeters && (
        <Circle
          center={center}
          radius={radiusMeters}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "6 4",
          }}
        />
      )}

      {markers.map((m) => {
        const isCritical = m.urgency === "CRITICAL";
        const icon = m.blood_group
          ? createRequestIcon(m.blood_group, isCritical, m.hasApplied)
          : DefaultIcon;

        return (
          <Marker
            key={m.id}
            position={m.position}
            icon={icon}
            eventHandlers={{
              click: () => onMarkerClick?.(m.id),
            }}
          >
            <Popup>
              <div className="p-1 min-w-[180px]">
                {m.hasApplied && (
                  <div className="mb-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 text-center flex items-center justify-center gap-1">
                    ✓ You Offered to Donate
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-sm text-red-600 dark:text-red-400">
                    Need{" "}
                    {m.blood_group
                      ? getLabel(bloodGroupLabels, m.blood_group)
                      : "Blood"}
                  </span>
                  {m.urgency && (
                    <Badge
                      variant={
                        m.urgency === "CRITICAL"
                          ? "destructive"
                          : m.urgency === "URGENT"
                            ? "default"
                            : "secondary"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {getLabel(urgencyLabels, m.urgency)}
                    </Badge>
                  )}
                </div>

                {m.distanceText && (
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    📍 {m.distanceText}
                  </div>
                )}

                {(m.hospital_name || m.area_name || m.description) && (
                  <div className="text-xs text-muted-foreground mb-2">
                    {m.hospital_name
                      ? `${m.hospital_name} (${m.area_name || m.description})`
                      : m.area_name || m.description}
                  </div>
                )}

                <Link href={`/requests/${m.id}`}>
                  <Button size="sm" className="w-full text-xs h-7">
                    View & Respond
                  </Button>
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
