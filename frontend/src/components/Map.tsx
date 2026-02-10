"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

// Fix for default marker icons in Leaflet with Webpack/Next.js
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const HighlightedIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface MapProps {
    listings: any[];
    center?: [number, number];
    zoom?: number;
    hoveredListingId?: string | null;
}

export default function Map({ listings, center = [40.7128, -74.0060], zoom = 13, hoveredListingId }: MapProps) {
    // Center map on first listing if available
    const mapCenter = listings.length > 0 && listings[0].latitude && listings[0].longitude
        ? [listings[0].latitude, listings[0].longitude] as [number, number]
        : center;

    return (
        <MapContainer
            center={mapCenter}
            zoom={zoom}
            style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {listings.map((listing) => (
                listing.latitude && listing.longitude ? (
                    <Marker
                        key={listing.id}
                        position={[listing.latitude, listing.longitude]}
                        icon={hoveredListingId === listing.id ? HighlightedIcon : DefaultIcon}
                        zIndexOffset={hoveredListingId === listing.id ? 1000 : 0}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                <img
                                    src={listing.images[0] || "/placeholder.svg"}
                                    alt={listing.title}
                                    className="w-full h-32 object-cover rounded-lg mb-2"
                                />
                                <h3 className="font-bold text-sm">{listing.title}</h3>
                                <p className="text-xs text-gray-500">${Number(listing.price).toLocaleString()}/mo</p>
                            </div>
                        </Popup>
                    </Marker>
                ) : null
            ))}
        </MapContainer>
    );
}
