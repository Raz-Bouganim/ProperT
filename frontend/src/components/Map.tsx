import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useMemo } from "react";
import { X, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapProps {
    listings: any[];
    center?: [number, number];
    zoom?: number;
    hoveredListingId?: string | null;
    className?: string;
    onLocationSelect?: (lat: number, lng: number) => void;
    isInteractive?: boolean;
}

function ZoomControls() {
    const map = useMap();

    return (
        <div className="absolute top-6 right-6 flex flex-col gap-2 z-[400] isolate">
            <button
                type="button"
                onClick={() => map.zoomIn()}
                className="w-10 h-10 bg-white rounded-lg shadow-xl border border-slate-100 flex items-center justify-center text-slate-600 hover:text-primary hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                aria-label="Zoom In"
            >
                <Plus size={20} strokeWidth={2.5} />
            </button>
            <button
                type="button"
                onClick={() => map.zoomOut()}
                className="w-10 h-10 bg-white rounded-lg shadow-xl border border-slate-100 flex items-center justify-center text-slate-600 hover:text-primary hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                aria-label="Zoom Out"
            >
                <Minus size={20} strokeWidth={2.5} />
            </button>
        </div>
    );
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

function MapEvents({ onLocationSelect, isInteractive }: { onLocationSelect?: (lat: number, lng: number) => void, isInteractive?: boolean }) {
    useMapEvents({
        click(e) {
            if (isInteractive && onLocationSelect) {
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
}

function InvalidateMapSize() {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

export default function Map({ listings, center = [40.7128, -74.0060], zoom = 13, hoveredListingId, className, onLocationSelect, isInteractive }: MapProps) {
    const [selectedListing, setSelectedListing] = useState<any>(null);

    // Center map on first listing if available
    const mapCenter = useMemo(() => {
        if (listings.length > 0 && listings[0].latitude && listings[0].longitude) {
            return [listings[0].latitude, listings[0].longitude] as [number, number];
        }
        return center;
    }, [listings, center]);

    // Effect to auto-select highlighted listing
    useEffect(() => {
        if (hoveredListingId) {
            const listing = listings.find(l => l.id === hoveredListingId);
            if (listing) setSelectedListing(listing);
        }
    }, [hoveredListingId, listings]);

    // Custom Marker Icons
    const createCustomIcon = (highlighted: boolean) => {
        return L.divIcon({
            className: "custom-map-marker",
            html: `<div class="${highlighted
                ? "w-12 h-12 bg-primary text-white scale-110 z-50"
                : "w-10 h-10 bg-white text-primary hover:scale-105"
                } rounded-full shadow-xl border-4 border-white flex items-center justify-center transition-all duration-300 transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });
    };

    return (
        <div className={cn("relative h-full w-full rounded-2xl overflow-hidden group", className)}>
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
                zoomControl={false}
            >
                <ChangeView center={mapCenter} zoom={zoom} />
                <InvalidateMapSize />
                <MapEvents onLocationSelect={onLocationSelect} isInteractive={isInteractive} />
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <ZoomControls />
                {listings.map((listing) => (
                    listing.latitude && listing.longitude ? (
                        <Marker
                            key={listing.id}
                            position={[listing.latitude, listing.longitude]}
                            icon={createCustomIcon(hoveredListingId === listing.id || selectedListing?.id === listing.id)}
                            draggable={isInteractive && listing.id === "preview"}
                            eventHandlers={{
                                click: () => setSelectedListing(listing),
                                dragend: (e) => {
                                    if (isInteractive && onLocationSelect) {
                                        const marker = e.target;
                                        const position = marker.getLatLng();
                                        onLocationSelect(position.lat, position.lng);
                                    }
                                }
                            }}
                        />
                    ) : null
                ))}
            </MapContainer>

            {/* Floating Property Card */}
            {selectedListing && selectedListing.id !== "preview" && (
                <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-80 bg-white p-4 rounded-xl shadow-2xl z-[1000] animate-in slide-in-from-bottom-4 duration-300 border border-slate-100">
                    <div className="flex gap-4">
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                            <img
                                src={selectedListing.images?.[0] || "/placeholder.svg"}
                                alt={selectedListing.title}
                                className="object-cover w-full h-full"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 truncate">{selectedListing.title}</h3>
                            <p className="text-slate-500 text-sm truncate">{selectedListing.address}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="font-bold text-primary">${Number(selectedListing.price).toLocaleString()}</span>
                                <button
                                    type="button"
                                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors cursor-pointer"
                                    onClick={() => setSelectedListing(null)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
