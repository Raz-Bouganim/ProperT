import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Tag, LandPlot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES, TRANSACTION_TYPES } from "../../constants/propertyTypes";
import { StepContainer } from "../shared/StepContainer";
import { SectionHeader } from "../shared/SectionHeader";
import { PropertyTypeSelector } from "../shared/PropertyTypeSelector";

export function Step1BasicInfo() {
    const { register, watch, formState: { errors } } = useFormContext<ListingFormValues>();

    return (
        <StepContainer
            title="Let's get started."
            description="Tell us about your property. We'll help you fill in the details later."
        >
            {/* Transaction Type */}
            <section className="space-y-4">
                <SectionHeader icon={Tag} title="Transaction Type" />
                <PropertyTypeSelector
                    name="transactionType"
                    options={TRANSACTION_TYPES}
                    columns={2}
                />
            </section>

            {/* Property Type */}
            <section className="space-y-4">
                <SectionHeader icon={LandPlot} title="Property Type" />
                <PropertyTypeSelector
                    name="type"
                    options={PROPERTY_TYPES}
                    columns={3}
                />
            </section>

            {/* Property Details */}
            <section className="space-y-6">
                <SectionHeader icon={FileText} title="Property Details" />
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <Label className="text-slate-500 font-semibold normal-case tracking-normal text-sm">Property Title</Label>
                            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                {watch("title")?.length || 0}/60
                            </div>
                        </div>
                        <Input
                            placeholder="e.g. Spacious 2-Bedroom Apartment with Ocean View"
                            {...register("title")}
                            error={errors.title?.message}
                            className={cn(
                                "h-12 font-semibold bg-white rounded-xl placeholder:font-medium transition-all",
                                errors.title ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:ring-primary/10"
                            )}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-slate-500 font-semibold ml-1 normal-case tracking-normal text-sm">Description</Label>
                        <Textarea
                            placeholder="Highlight the key features of your property..."
                            {...register("description")}
                            error={errors.description?.message}
                            rows={6}
                            className={cn(
                                "font-semibold bg-white resize-none placeholder:font-medium transition-all",
                                errors.description ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:ring-primary/10"
                            )}
                        />
                    </div>
                </div>
            </section>
        </StepContainer>
    );
}
