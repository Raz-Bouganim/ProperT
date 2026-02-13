import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";
import { Input, Label } from "@/components/ui/Input";
import { AmenitySelector } from "../partials/AmenitySelector";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Step2Details() {
    const { register, formState: { errors } } = useFormContext<ListingFormValues>();

    return (
        <div className="space-y-10">
            <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display drop-shadow-sm">Let&apos;s get into the details.</h1>
                <p className="text-slate-500 text-lg font-medium">Tell us what makes your property unique. Accurate details help match you with the right tenants.</p>
            </div>

            {/* Core Metrics Section */}
            <section className="mb-8">
                <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight mb-6">
                    <span className="material-icons-outlined text-primary">analytics</span>
                    Property Specs
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Square Footage */}
                    <div className="relative group p-1">
                        <Label className="text-slate-500 font-semibold normal-case tracking-normal text-sm mb-2 block">Square Footage</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                placeholder="0"
                                {...register("sqft", { valueAsNumber: true })}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={0}
                                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                                className={cn(
                                    "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
                                    errors.sqft ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
                                )}
                            />
                            {errors.sqft && <p className="text-red-500 text-xs font-semibold mt-1 pl-1">{errors.sqft.message}</p>}
                        </div>
                    </div>

                    {/* Bedrooms */}
                    <div className="relative group p-1">
                        <Label className="text-slate-500 font-semibold normal-case tracking-normal text-sm mb-2 block">Bedrooms</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                {...register("beds", { valueAsNumber: true })}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={0}
                                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                                className={cn(
                                    "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
                                    errors.beds ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
                                )}
                            />
                            {errors.beds && <p className="text-red-500 text-xs font-semibold mt-1 pl-1">{errors.beds.message}</p>}
                        </div>
                    </div>

                    {/* Bathrooms */}
                    <div className="relative group p-1">
                        <Label className="text-slate-500 font-semibold normal-case tracking-normal text-sm mb-2 block">Bathrooms</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="0.5"
                                {...register("baths", { valueAsNumber: true })}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={0}
                                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                                className={cn(
                                    "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
                                    errors.baths ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
                                )}
                            />
                            {errors.baths && <p className="text-red-500 text-xs font-semibold mt-1 pl-1">{errors.baths.message}</p>}
                        </div>
                    </div>

                    {/* Year Built */}
                    <div className="relative group p-1">
                        <Label className="text-slate-500 font-semibold normal-case tracking-normal text-sm mb-2 block">Year Built</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                placeholder="YYYY"
                                {...register("yearBuilt", { valueAsNumber: true })}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={1800}
                                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                                className={cn(
                                    "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
                                    errors.yearBuilt ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
                                )}
                            />
                            {errors.yearBuilt && <p className="text-red-500 text-xs font-semibold mt-1 pl-1">{errors.yearBuilt.message}</p>}
                        </div>
                    </div>
                </div>
            </section>

            <div className="w-full h-px bg-slate-200 mb-8"></div>

            {/* Amenities Section */}
            <section className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight">
                            <span className="material-icons-outlined text-primary">stars</span>
                            Amenities & Features
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Select all that apply to your property.</p>
                    </div>
                    <div className="flex items-center text-sm text-primary cursor-pointer hover:underline gap-1 font-bold">
                        <Plus className="w-4 h-4" />
                        <span>Suggest new amenity</span>
                    </div>
                </div>

                <AmenitySelector />
            </section>
        </div>
    );
}
