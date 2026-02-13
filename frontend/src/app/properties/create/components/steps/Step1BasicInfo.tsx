import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Building, Home, Briefcase, Tag, LandPlot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const PROPERTY_TYPES = [
    { id: "APARTMENT", label: "Apartment", icon: Building },
    { id: "HOUSE", label: "House", icon: Home },
    { id: "OFFICE", label: "Office", icon: Briefcase },
] as const;

export function Step1BasicInfo() {
    const { register, watch, formState: { errors } } = useFormContext<ListingFormValues>();

    return (
        <>
            {/* Header Section */}
            <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display drop-shadow-sm">Let&apos;s get started.</h1>
                <p className="text-slate-500 text-lg font-medium">Tell us about your property. We&apos;ll help you fill in the details later.</p>
            </div>

            {/* Transaction Type */}
            <section className="space-y-4">
                <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight">
                    <Tag className="text-primary w-5 h-5" /> Transaction Type
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <label className="cursor-pointer group relative">
                        <input
                            type="radio"
                            value="FOR_SALE"
                            {...register("transactionType")}
                            className="sr-only peer"
                        />
                        <div className="p-6 rounded-2xl border-2 border-slate-100 bg-white peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary peer-checked:shadow-xl peer-checked:shadow-primary/10 hover:border-primary/30 flex flex-col items-center justify-center text-center h-32">
                            <span className="block text-xl font-black font-display tracking-tight mb-1">For Sale</span>
                            <span className="text-xs font-bold text-slate-400 group-peer-checked:text-primary/70 uppercase tracking-widest">I want to sell</span>
                        </div>
                    </label>
                    <label className="cursor-pointer group relative">
                        <input
                            type="radio"
                            value="FOR_RENT"
                            {...register("transactionType")}
                            className="sr-only peer"
                        />
                        <div className="p-6 rounded-2xl border-2 border-slate-100 bg-white peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary peer-checked:shadow-xl peer-checked:shadow-primary/10 hover:border-primary/30 flex flex-col items-center justify-center text-center h-32">
                            <span className="block text-xl font-black font-display tracking-tight mb-1">For Rent</span>
                            <span className="text-xs font-bold text-slate-400 group-peer-checked:text-primary/70 uppercase tracking-widest">I want to rent</span>
                        </div>
                    </label>
                </div>
            </section>

            {/* Property Type */}
            <section className="space-y-4">
                <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight">
                    <LandPlot className="text-primary w-5 h-5" /> Property Type
                </h2>
                <div className="grid grid-cols-3 gap-4">
                    {PROPERTY_TYPES.map((pt) => (
                        <label key={pt.id} className="cursor-pointer group relative">
                            <input
                                type="radio"
                                value={pt.id}
                                {...register("type")}
                                className="sr-only peer"
                            />
                            <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-100 bg-white text-slate-400 peer-checked:border-primary peer-checked:text-primary peer-checked:bg-primary/5 peer-checked:shadow-xl peer-checked:shadow-primary/10 hover:border-primary/30 h-36 text-center">
                                <pt.icon className="w-8 h-8 mb-4 opacity-50 group-peer-checked:opacity-100 transition-opacity" />
                                <span className="font-black text-[13px] font-display uppercase tracking-widest leading-none">{pt.label}</span>
                            </div>
                        </label>
                    ))}
                </div>
            </section>

            {/* Property Details */}
            <section className="space-y-6">
                <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight">
                    <FileText className="text-primary w-5 h-5" /> Property Details
                </h2>
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
        </>
    );
}
