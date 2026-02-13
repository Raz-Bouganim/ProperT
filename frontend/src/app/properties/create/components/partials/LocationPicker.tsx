import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";
import { useGeocoding } from "../../hooks/useGeocoding";
import { Input } from "@/components/ui/Input";
import { Loader2, Search, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// Dynamic import for Map
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
        </div>
    ),
});

interface LocationPickerProps {
    images?: (File & { preview?: string })[];
}

export function LocationPicker({ images = [] }: LocationPickerProps) {
    const { register, setValue, watch, formState: { errors } } = useFormContext<ListingFormValues>();
    const {
        isGeocoding,
        searchError,
        mapCenter,
        mapZoom,
        searchAddress,
        reverseGeocode
    } = useGeocoding(setValue);

    const address = watch("address");

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl sticky top-24 space-y-5">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 font-display tracking-tight">
                <MapPin className="text-primary w-6 h-6" /> Location
            </h2>

            {/* Address Search */}
            <div className="space-y-2 group">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors z-10" />
                    <Input
                        type="text"
                        {...register("address")}
                        error={undefined}
                        placeholder="Enter address..."
                        className={cn(
                            "pl-12 pr-24 h-12 bg-white rounded-xl border-slate-200 font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all truncate",
                            errors.address && "border-red-500 focus-visible:ring-red-500"
                        )}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                searchAddress(address);
                            }
                        }}
                        onBlur={() => {
                            if (address && address.length > 3) {
                                searchAddress(address);
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => searchAddress(address)}
                        disabled={isGeocoding}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-bold px-4 py-1.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-2 z-10"
                    >
                        {isGeocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
                    </button>
                </div>
                {errors.address && (
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider ml-1">
                        {errors.address.message}
                    </span>
                )}
            </div>

            {searchError && (
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider ml-1 mt-1 animate-in fade-in slide-in-from-top-1">
                    {searchError}
                </p>
            )}

            {/* Real Map Integration */}
            <div className="relative w-full h-80 rounded-xl overflow-hidden group border border-slate-200 shadow-sm">
                <Map
                    className="rounded-none"
                    listings={watch("latitude") && watch("longitude") ? [{
                        id: "preview",
                        latitude: watch("latitude"),
                        longitude: watch("longitude"),
                        title: watch("title") || "New Listing",
                        address: watch("address") || "Property Location",
                        price: watch("price") || 0,
                        images: images.map(img => img.preview || "")
                    }] : []}
                    center={mapCenter}
                    zoom={mapZoom}
                    onLocationSelect={reverseGeocode}
                    isInteractive={true}
                />
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-slate-200 flex items-start gap-4 shadow-sm transition-all hover:border-primary/20 group">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5 font-bold shadow-md shadow-primary/20">i</div>
                <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-600 leading-relaxed font-manrope">
                        Drag the map to pinpoint the exact entrance location.
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Click map to move pin
                    </p>
                </div>
            </div>

            {/* Unit/Zip Fields */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <Input
                    className={cn(
                        "h-12 bg-slate-50 rounded-xl px-4 text-sm font-semibold text-slate-900 transition-all placeholder:font-medium shadow-sm",
                        errors.houseNumber ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:ring-primary/5 focus:border-primary/20"
                    )}
                    placeholder="Unit Number"
                    {...register("houseNumber")}
                />
                <Input
                    className={cn(
                        "h-12 bg-slate-50 rounded-xl px-4 text-sm font-semibold text-slate-900 transition-all placeholder:font-medium shadow-sm",
                        errors.zipCode ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:ring-primary/5 focus:border-primary/20"
                    )}
                    placeholder="Zip Code"
                    {...register("zipCode")}
                />
            </div>

            {/* Hidden fields for location details */}
            <input type="hidden" {...register("city")} />
            <input type="hidden" {...register("country")} />
            <input type="hidden" {...register("state")} />
            <input type="hidden" {...register("street")} />
        </div>
    );
}
