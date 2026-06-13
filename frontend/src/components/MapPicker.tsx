"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@/lib/theme";

// Custom gradient pin (inline SVG) — replaces leaflet's default blue marker.
const pinIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;transform:translate(-50%,-100%)">
      <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pinG" x1="0" y1="0" x2="34" y2="44" gradientUnits="userSpaceOnUse">
            <stop stop-color="#4f6bff"/><stop offset="1" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
        <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="url(#pinG)"/>
        <circle cx="17" cy="16.5" r="6" fill="white"/>
      </svg>
    </div>`,
  iconSize: [34, 44],
  iconAnchor: [0, 0],
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

function LocationSelector({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  latitude,
  longitude,
  radiusKm,
  onLocationSelect,
  className = "h-full w-full",
}: MapPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const isDark = useTheme((s) => s.isDark);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className={`${className} bg-elevated grid place-items-center text-faint text-sm`}>
        Loading map…
      </div>
    );
  }

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div className={className}>
      <MapContainer
        key={`${isDark}-${latitude}-${longitude}-${radiusKm}`}
        center={[latitude, longitude]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url={tileUrl}
        />
        <LocationSelector onSelect={onLocationSelect} />
        <Marker position={[latitude, longitude]} icon={pinIcon} />
        <Circle
          center={[latitude, longitude]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "#4f6bff",
            fillColor: "#8b5cf6",
            fillOpacity: 0.12,
            weight: 2,
          }}
        />
      </MapContainer>
    </div>
  );
}
