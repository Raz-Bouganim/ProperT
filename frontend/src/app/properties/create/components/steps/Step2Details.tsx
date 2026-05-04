import { AmenitySelector } from "../partials/AmenitySelector";
import { Plus } from "lucide-react";
import { StepContainer } from "../shared/StepContainer";
import { SectionHeader } from "../shared/SectionHeader";
import { NumericInputField } from "../shared/NumericInputField";
import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";

export function Step2Details() {
    const { watch } = useFormContext<ListingFormValues>();
    const propertyType = watch("type");

    return (
        <StepContainer
            title="Let's get into the details."
            description="Tell us what makes your property unique. Accurate details help match you with the right tenants."
        >
            {/* Core Metrics Section */}
            <section className="mb-8">
                <SectionHeader icon="analytics" title="Property Specs" />
                <div
                    className={
                        propertyType === "OFFICE"
                            ? "grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6"
                            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6"
                    }
                >
                    <NumericInputField
                        label="Square Footage"
                        name="sqft"
                        placeholder="0"
                        min={0}
                    />
                    {propertyType !== "OFFICE" && (
                        <>
                            <NumericInputField
                                label="Bedrooms"
                                name="beds"
                                min={0}
                                step={0.5}
                            />
                            <NumericInputField
                                label="Bathrooms"
                                name="baths"
                                min={0}
                                step={0.5}
                            />
                        </>
                    )}
                    <NumericInputField
                        label="Year Built"
                        name="yearBuilt"
                        placeholder="YYYY"
                        min={1800}
                    />
                </div>
            </section>

            <div className="w-full h-px bg-slate-200 mb-8"></div>

            {/* Amenities Section */}
            <section className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <SectionHeader
                            icon="stars"
                            title="Amenities & Features"
                            description="Select all that apply to your property."
                        />
                    </div>
                    <div className="flex items-center text-sm text-primary cursor-pointer hover:underline gap-1 font-bold">
                        <Plus className="w-4 h-4" />
                        <span>Suggest new amenity</span>
                    </div>
                </div>

                <AmenitySelector />
            </section>
        </StepContainer>
    );
}
