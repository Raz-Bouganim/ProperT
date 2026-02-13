import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";
import { cn } from "@/lib/utils";

const AMENITIES = [
    "Swimming Pool", "Gym & Fitness", "Parking Spot", "High-Speed Wifi",
    "Air Conditioning", "Private Balcony", "Pet Friendly", "Elevator Access",
    "24/7 Security", "In-unit Laundry", "Dishwasher", "Fireplace"
];

export function AmenitySelector() {
    const { watch, setValue } = useFormContext<ListingFormValues>();
    const features = watch("features") || [];

    const toggleFeature = (feature: string) => {
        if (features.includes(feature)) {
            setValue("features", features.filter(f => f !== feature));
        } else {
            setValue("features", [...features, feature]);
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {AMENITIES.map((amenity) => {
                const isSelected = features.includes(amenity);
                return (
                    <label key={amenity} className="cursor-pointer group relative">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={isSelected}
                            onChange={() => toggleFeature(amenity)}
                        />
                        <div className={cn(
                            "p-4 rounded-xl border-2 h-full flex flex-col items-start gap-3 relative overflow-hidden",
                            isSelected
                                ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                                : "border-slate-100 bg-white hover:border-primary/30"
                        )}>
                            <div className={cn(
                                "h-10 w-10 rounded-lg border flex items-center justify-center transition-colors",
                                isSelected
                                    ? "bg-primary text-white border-primary"
                                    : "bg-slate-50 border-slate-100 text-slate-500"
                            )}>
                                {amenity.includes("Pool") && <span className="material-icons-outlined">pool</span>}
                                {amenity.includes("Gym") && <span className="material-icons-outlined">fitness_center</span>}
                                {amenity.includes("Parking") && <span className="material-icons-outlined">local_parking</span>}
                                {amenity.includes("Wifi") && <span className="material-icons-outlined">wifi</span>}
                                {amenity.includes("Air") && <span className="material-icons-outlined">ac_unit</span>}
                                {amenity.includes("Balcony") && <span className="material-icons-outlined">deck</span>}
                                {amenity.includes("Pet") && <span className="material-icons-outlined">pets</span>}
                                {amenity.includes("Elevator") && <span className="material-icons-outlined">elevator</span>}
                                {amenity.includes("Security") && <span className="material-icons-outlined">security</span>}
                                {amenity.includes("Laundry") && <span className="material-icons-outlined">local_laundry_service</span>}
                                {amenity.includes("Dishwasher") && <span className="material-icons-outlined">kitchen</span>}
                                {amenity.includes("Fireplace") && <span className="material-icons-outlined">fireplace</span>}
                                {!amenity.match(/(Pool|Gym|Parking|Wifi|Air|Balcony|Pet|Elevator|Security|Laundry|Dishwasher|Fireplace)/) && (
                                    <span className="material-icons-outlined">check</span>
                                )}
                            </div>
                            <span className={cn(
                                "font-bold text-sm transition-colors",
                                isSelected ? "text-primary" : "text-slate-700"
                            )}>{amenity}</span>
                        </div>
                    </label>
                );
            })}
        </div>
    );
}
