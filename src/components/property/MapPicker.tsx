'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Leaflet requires browser APIs, so we lazy-load it
function MapPickerInner({ initialLat, initialLng, onLocationChange }: MapPickerProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [L, setL] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default: Asunción, Paraguay
  const defaultLat = initialLat || -25.2637;
  const defaultLng = initialLng || -57.5759;

  useEffect(() => {
    // Dynamically import Leaflet in browser
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;

    // Fix Leaflet default icon path issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    const map = L.map(containerRef.current).setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat, pos.lng);
    });

    map.on('click', (e: any) => {
      marker.setLatLng(e.latlng);
      onLocationChange(e.latlng.lat, e.latlng.lng);
    });

    // If initial coords provided, notify parent
    if (initialLat && initialLng) {
      onLocationChange(initialLat, initialLng);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [L]);

  return (
    <div className="space-y-2">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={containerRef} className="w-full h-[300px] rounded-xl border border-slate-200 overflow-hidden z-0" />
      <p className="text-[10px] text-slate-400 font-medium">
        📍 Hacé clic en el mapa o arrastrá el pin para marcar la ubicación exacta
      </p>
    </div>
  );
}

// Export as dynamic to avoid SSR issues
export default function MapPicker(props: MapPickerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-full h-[300px] rounded-xl bg-slate-100 animate-pulse" />;
  return <MapPickerInner {...props} />;
}
