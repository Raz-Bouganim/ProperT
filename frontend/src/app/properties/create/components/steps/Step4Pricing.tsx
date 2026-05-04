import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";
import { Label } from "@/components/ui/Input";
import { AvailabilityScheduler } from "../partials/AvailabilityScheduler";
import { Tag, MapPin, Bed, Bath, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PROPERTY_TYPES } from "../../constants/propertyTypes";
import { StepContainer } from "../shared/StepContainer";
import { SectionHeader } from "../shared/SectionHeader";

interface Step4PricingProps {
    images: (File & { preview?: string })[];
    onEditStep: (step: number) => void;
}

export function Step4Pricing({ images, onEditStep }: Step4PricingProps) {
    const { register, watch, formState: { errors } } = useFormContext<ListingFormValues>();
    const transactionType = watch("transactionType");
    const currency = watch("currency") || "USD";

    const getCurrencySymbol = (currencyCode: string) => {
        const symbols: Record<string, string> = {
            USD: "$",
            EUR: "€",
            GBP: "£",
            ILS: "₪"
        };
        return symbols[currencyCode] || "$";
    };

    return (
        <div className="space-y-10">
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display drop-shadow-sm">Pricing & Review.</h1>
                <p className="text-slate-500 text-lg font-medium">
                    {transactionType === "FOR_SALE"
                        ? "Set your asking price and review before publishing."
                        : "Set your monthly rent and review before publishing."}
                </p>
            </div>

            {/* Pricing Card */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-6">
                    <h2 className="text-xl font-black text-slate-900 font-display tracking-tight flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" />
                        {transactionType === "FOR_SALE" ? "Asking Price" : "Monthly Rent"}
                    </h2>

                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-2 pr-4 w-fit">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" {...register("negotiable")} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            <span className="ml-3 text-sm font-bold text-slate-600">Negotiable</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label className="text-slate-500 font-bold uppercase text-[11px] tracking-widest pl-1">Currency</Label>
                        <select
                            {...register("currency")}
                            className="w-full h-14 rounded-xl border-slate-200 bg-slate-50 px-4 text-base font-bold shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none appearance-none cursor-pointer"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="ILS">ILS (₪)</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-slate-500 font-bold uppercase text-[11px] tracking-widest pl-1">
                            {transactionType === "FOR_SALE" ? "Total Amount" : "Monthly Rent Amount"}
                        </Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-black text-lg">{getCurrencySymbol(currency)}</span>
                            </div>
                            <input
                                type="number"
                                {...register("price", { valueAsNumber: true })}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={0}
                                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                                placeholder="Enter amount..."
                                className={cn(
                                    "w-full h-14 pl-10 pr-4 rounded-xl border bg-white text-xl font-bold text-slate-900 shadow-sm transition-all outline-none placeholder:text-slate-300 placeholder:font-medium",
                                    errors.price
                                        ? "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                                        : "border-slate-200 focus:border-primary focus:ring-primary/10"
                                )}
                            />
                            {transactionType === "FOR_RENT" && (
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                    <span className="text-slate-400 font-bold text-sm bg-slate-100 px-2 py-1 rounded">/ month</span>
                                </div>
                            )}
                        </div>
                        {errors.price && <p className="text-red-500 text-sm font-medium pl-1">{errors.price.message}</p>}
                    </div>
                </div>

                {/* Rent Specific Fields */}
                {transactionType === "FOR_RENT" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold uppercase text-[11px] tracking-widest pl-1">Lease Duration</Label>
                            <select {...register("leaseDuration")} className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">
                                <option value="6 Months">6 Months</option>
                                <option value="12 Months">12 Months (1 Year)</option>
                                <option value="24 Months">24 Months (2 years)</option>
                                <option value="Flexible">Flexible / Short Term</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold uppercase text-[11px] tracking-widest pl-1">
                                Available from <span className="text-red-600">*</span>
                            </Label>
                            <input
                                type="date"
                                {...register("availableDate")}
                                className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                            />
                            <p className="text-xs text-slate-400 font-medium pl-1">
                                Required to publish a rental. You can leave it blank while saving a draft.
                            </p>
                        </div>
                    </div>
                )}
            </section>

            {/* Viewing Availability */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-6">
                    <h2 className="text-xl font-black text-slate-900 font-display tracking-tight flex items-center gap-2">
                        <span className="material-icons-outlined text-primary">schedule</span>
                        Viewing Availability
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Add specific dates or recurring days when your property is available for viewing.</p>
                </div>

                <AvailabilityScheduler />
            </section>

            {/* Listing Summary */}
            <section className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-white/50">
                    <h3 className="font-black text-slate-900 font-display tracking-tight text-lg">Listing Summary</h3>
                </div>
                <div className="divide-y divide-slate-200">
                    {/* Basic Info */}
                    <div className="px-8 py-5 flex justify-between items-start hover:bg-white transition-colors group">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Basic Info</p>
                            <p className="font-bold text-slate-900 text-lg">{watch("title") || "Untitled Listing"}</p>
                            <p className="text-sm text-slate-500 line-clamp-1">{watch("description") || "No description"}</p>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100/50">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-200/50 text-xs font-bold text-slate-600">
                                    {PROPERTY_TYPES.find(t => t.id === watch("type"))?.label}
                                </span>
                                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {watch("addressLine") || "No address"}
                                </span>
                            </div>
                        </div>
                        <button type="button" onClick={() => onEditStep(1)} className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 hover:underline transition-all whitespace-nowrap ml-4 cursor-pointer">Edit</button>
                    </div>

                    {/* Property Details */}
                    <div className="px-8 py-5 flex justify-between items-start hover:bg-white transition-colors group">
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Property Details</p>
                            <div className="flex items-center gap-4 text-sm font-bold text-slate-900">
                                <span className="flex items-center gap-1.5"><Bed className="w-4 h-4 text-slate-400" /> {watch("beds")} Beds</span>
                                <span className="flex items-center gap-1.5"><Bath className="w-4 h-4 text-slate-400" /> {watch("baths")} Baths</span>
                                <span className="flex items-center gap-1.5"><Square className="w-4 h-4 text-slate-400" /> {watch("sqft")} sqft</span>
                            </div>
                            {watch("amenities") && watch("amenities")!.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {watch("amenities")!.map((feature, i) => (
                                        <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                            {feature}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button type="button" onClick={() => onEditStep(2)} className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 hover:underline transition-all whitespace-nowrap ml-4 cursor-pointer">Edit</button>
                    </div>

                    {/* Photos */}
                    <div className="px-8 py-5 flex justify-between items-center hover:bg-white transition-colors group">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Photos</p>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-900">{images.length} photos uploaded</span>
                                {images.length > 0 && (
                                    <div className="flex -space-x-2">
                                        {images.slice(0, 3).map((img, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200 relative">
                                                <Image src={img.preview || ""} alt="" fill className="object-cover" />
                                            </div>
                                        ))}
                                        {images.length > 3 && (
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                +{images.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button type="button" onClick={() => onEditStep(3)} className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 hover:underline transition-all whitespace-nowrap ml-4 cursor-pointer">Edit</button>
                    </div>
                </div>
            </section>
        </div>
    );
}
