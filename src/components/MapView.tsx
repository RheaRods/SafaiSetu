import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  color?: string;
  popup?: string;
}

interface MapViewProps {
  center: [number, number];
  markers?: MapMarker[];
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
  height?: number;
  zoom?: number;
}

delete (L.Icon.Default.prototype as any)._getIconPath;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createColoredIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/><circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>`;
  return L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
  });
}

export default function MapView({
  center,
  markers = [],
  onLocationSelect,
  interactive = false,
  height = 300,
  zoom = 15,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);

    if (interactive && onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setLatLng([lat, lng]);
        } else {
          selectedMarkerRef.current = L.marker([lat, lng], { icon: createColoredIcon('#dc2626') })
            .addTo(markerLayerRef.current!);
        }
        onLocationSelect(lat, lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markerLayerRef.current || !mapRef.current) return;
    markerLayerRef.current.clearLayers();
    selectedMarkerRef.current = null;

    markers.forEach((m) => {
      const color = m.color || '#0d9488';
      const marker = L.marker([m.latitude, m.longitude], { icon: createColoredIcon(color) })
        .addTo(markerLayerRef.current!);
      if (m.popup) {
        marker.bindPopup(m.popup);
      }
    });

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [markers]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px` }}
      className="w-full rounded-xl overflow-hidden border border-gray-200 z-0"
    />
  );
}
