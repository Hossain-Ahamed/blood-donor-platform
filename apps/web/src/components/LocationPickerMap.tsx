"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Leaflet default icon fix
const PinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerMapProps {
  position: [number, number] | null;
  onPositionSelect: (pos: [number, number]) => void;
  defaultCenter?: [number, number];
  zoom?: number;
}

function MapEventsHandler({
  onSelect,
}: {
  onSelect: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function MapViewController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function LocationPickerMap({
  position,
  onPositionSelect,
  defaultCenter = [23.7925, 90.4078], // Default to Dhaka
  zoom = 13,
}: LocationPickerMapProps) {
  const activeCenter = position || defaultCenter;

  return (
    <MapContainer
      center={activeCenter}
      zoom={zoom}
      style={{
        height: "100%",
        width: "100%",
        minHeight: "220px",
        borderRadius: "0.5rem",
        zIndex: 0,
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewController center={activeCenter} zoom={zoom} />
      <MapEventsHandler onSelect={onPositionSelect} />

      {position && <Marker position={position} icon={PinIcon} />}
    </MapContainer>
  );
}
