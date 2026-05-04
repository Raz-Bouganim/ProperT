import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";
import { cn } from "@/lib/utils";
import { AMENITIES } from "../../constants/amenities";

export function AmenitySelector() {
    const { watch, setValue } = useFormContext<ListingFormValues>();
    const amenities = watch("amenities") || [];

    const toggleAmenity = (amenityId: string) => {
        if (amenities.includes(amenityId)) {
            setValue("amenities", amenities.filter((f) => f !== amenityId));
        } else {
            setValue("amenities", [...amenities, amenityId]);
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {AMENITIES.map((amenity) => {
                const isSelected = amenities.includes(amenity.id);
                return (
                    <label key={amenity.id} className="cursor-pointer group relative">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={isSelected}
                            onChange={() => toggleAmenity(amenity.id)}
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
                                <span className="material-icons-outlined">{amenity.icon}</span>
                            </div>
                            <span className={cn(
                                "font-bold text-sm transition-colors",
                                isSelected ? "text-primary" : "text-slate-700"
                            )}>{amenity.label}</span>
                        </div>
                    </label>
                );
            })}
        </div>
    );
}
