"use client";

import { useEffect, useState, useRef } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import Image from "next/image";
import {
    Loader2, Save, Tag, MapPin, Bed, Bath, Square, Building,
    CalendarDays, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import {
    listingSchema,
    ListingFormValues,
} from "@/app/properties/create/hooks/useListingForm";
import { AmenitySelector } from "@/app/properties/create/components/partials/AmenitySelector";
import { AvailabilityScheduler } from "@/app/properties/create/components/partials/AvailabilityScheduler";
import { PROPERTY_IANA_TIMEZONES } from "@/app/properties/create/constants/timeZones";
import { PROPERTY_TYPES, TRANSACTION_TYPES } from "@/app/properties/create/constants/propertyTypes";
import { Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
    useEditMediaUpload,
    type EditableImage,
} from "../hooks/useEditMediaUpload";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LockedInfo {
    type: string;
    transactionType: string;
    addressLine: string;
    city: string;
    country: string;
    sqft: number;
    bedrooms?: number | null;
    bathrooms?: number | null;
    yearBuilt?: number | null;
}

export interface EditPropertyFormProps {
    propertyId: string;
    slug: string;
    defaultValues: Partial<ListingFormValues>;
    initialImages: Array<{ url: string; id: string }>;
    locked: LockedInfo;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractApiErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) return "Something went wrong. Please try again.";
    const data = error.response?.data;
    if (!data) return "Something went wrong. Please try again.";
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message)) return data.message.join(", ");
    return "Something went wrong. Please try again.";
}

// ── Media Section ─────────────────────────────────────────────────────────────

function MediaSection({
    images,
    addFiles,
    removeImage,
    reorderImages,
    clearAll,
    previewSrc,
}: {
    images: EditableImage[];
    addFiles: (files: File[]) => void;
    removeImage: (i: number) => void;
    reorderImages: (from: number, to: number) => void;
    clearAll: () => void;
    previewSrc: (img: EditableImage) => string;
}) {
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        addFiles(Array.from(e.dataTransfer.files));
    };

    return (
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-5 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="material-icons-outlined text-primary text-xl">collections</span>
                    Photos
                    <span className="text-slate-400 font-medium text-sm">({images.length}/20)</span>
                </h2>
                {images.length > 0 && (
                    <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Remove all
                    </button>
                )}
            </div>

            {/* Upload zone */}
            <label
                className={cn(
                    "block rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
                    isDraggingOver
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 hover:border-primary/40 hover:bg-slate-50"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                />
                <span className="material-icons-outlined text-slate-400 text-3xl mb-2 block">cloud_upload</span>
                <p className="text-sm font-bold text-slate-600">
                    Drag & drop photos or{" "}
                    <span className="text-primary hover:underline">browse files</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP · Max 20MB each</p>
            </label>

            {/* Image grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img, i) => (
                        <div
                            key={`${img.kind}-${i}`}
                            draggable
                            onDragStart={() => setDraggedIndex(i)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                                if (draggedIndex !== null && draggedIndex !== i) {
                                    reorderImages(draggedIndex, i);
                                }
                                setDraggedIndex(null);
                            }}
                            className={cn(
                                "relative group aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing shadow-sm",
                                i === 0 && "ring-2 ring-primary ring-offset-2",
                                draggedIndex === i && "opacity-50 scale-95"
                            )}
                        >
                            {i === 0 && (
                                <div className="absolute top-2 left-2 z-10 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">
                                    COVER
                                </div>
                            )}
                            {img.kind === "new" && (
                                <div className="absolute top-2 left-2 z-10 bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">
                                    NEW
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                className="absolute top-2 right-2 z-20 p-1 bg-black/40 hover:bg-red-500 rounded-md text-white opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <span className="material-icons-outlined text-sm leading-none">close</span>
                            </button>
                            <Image
                                src={previewSrc(img)}
                                alt={`Photo ${i + 1}`}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                unoptimized={img.kind === "new"}
                            />
                        </div>
                    ))}
                </div>
            )}
            <p className="text-xs text-slate-400 italic">
                Drag images to reorder. The first image is the cover photo.
            </p>
        </section>
    );
}

// ── Main Form ──────────────────────────────────────────────────────────────────

export function EditPropertyForm({
    propertyId,
    slug,
    defaultValues,
    initialImages,
    locked,
}: EditPropertyFormProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const warnedRef = useRef(false);

    const form = useForm<ListingFormValues>({
        resolver: zodResolver(listingSchema) as Resolver<ListingFormValues>,
        defaultValues: {
            transactionType: "FOR_SALE",
            type: "APARTMENT",
            beds: 0,
            baths: 0,
            currency: "USD",
            amenities: [],
            negotiable: true,
            timeZone: "UTC",
            images: [],
            availabilities: [],
            ...defaultValues,
        },
        mode: "onChange",
    });

    const { register, handleSubmit, watch, formState: { errors, isDirty } } = form;
    const transactionType = watch("transactionType");
    const currency = watch("currency") || "USD";

    const { images, addFiles, removeImage, reorderImages, clearAll, buildFinalUrls, isUploading, previewSrc } =
        useEditMediaUpload({ initialImages });

    const hasNewImages = images.some((img) => img.kind === "new");
    const mediaChanged = images.length !== initialImages.length || hasNewImages;
    const isFormDirty = isDirty || mediaChanged;

    // Warn on unsaved changes if navigating away
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isFormDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isFormDirty]);

    const CURRENCY_SYMBOLS: Record<string, string> = {
        USD: "$", EUR: "€", GBP: "£", ILS: "₪",
    };

    const propertyTypeLabel = PROPERTY_TYPES.find((t) => t.id === locked.type)?.label ?? locked.type;
    const transactionTypeLabel = TRANSACTION_TYPES.find((t) => t.id === locked.transactionType)?.label ?? locked.transactionType;

    const onSubmit = async (values: ListingFormValues) => {
        if (values.transactionType === "FOR_RENT" && !values.availableDate?.trim()) {
            toast.error("Rental listings require an available-from date.");
            return;
        }

        setIsSaving(true);
        try {
            const finalImageUrls = await buildFinalUrls();
            if (finalImageUrls === null) {
                toast.error("One or more images failed to upload. Please try again.");
                setIsSaving(false);
                return;
            }

            const payload = {
                title: values.title,
                description: values.description,
                price: values.price,
                negotiable: values.negotiable,
                currency: values.currency,
                amenities: values.amenities ?? [],
                images: finalImageUrls,
                virtualTourUrl: values.virtualTourUrl ?? undefined,
                floorPlanUrl: values.floorPlanUrl ?? undefined,
                availabilities: values.availabilities ?? [],
                availableDate: values.availableDate ?? undefined,
                leaseDuration: values.leaseDuration ?? undefined,
                timeZone: values.timeZone,
            };

            await api.patch(`/properties/${propertyId}`, payload);
            warnedRef.current = true;
            toast.success("Listing updated successfully.");
            router.push(`/properties/${slug || propertyId}`);
        } catch (error) {
            toast.error(extractApiErrorMessage(error));
            console.error("Edit listing failed:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <FormProvider {...form}>
            <div className="min-h-screen bg-[#f8f9fc] pb-32">
                <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

                    {/* Page header */}
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/70 mb-1.5">
                            Editing Listing
                        </p>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">
                            {defaultValues.title ?? "Edit Listing"}
                        </h1>
                    </div>

                    {/* ── Read-only "Listing basics" card ── */}
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">
                            Listing basics (cannot be changed)
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</p>
                                    <p className="text-sm font-bold text-slate-800">{propertyTypeLabel}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transaction</p>
                                    <p className="text-sm font-bold text-slate-800">{transactionTypeLabel}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Size</p>
                                    <p className="text-sm font-bold text-slate-800">{locked.sqft.toLocaleString()} sqft</p>
                                </div>
                            </div>
                            {locked.bedrooms != null && (
                                <div className="flex items-center gap-2">
                                    <Bed className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Beds</p>
                                        <p className="text-sm font-bold text-slate-800">{locked.bedrooms}</p>
                                    </div>
                                </div>
                            )}
                            {locked.bathrooms != null && (
                                <div className="flex items-center gap-2">
                                    <Bath className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Baths</p>
                                        <p className="text-sm font-bold text-slate-800">{locked.bathrooms}</p>
                                    </div>
                                </div>
                            )}
                            {locked.yearBuilt != null && (
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Built</p>
                                        <p className="text-sm font-bold text-slate-800">{locked.yearBuilt}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-2 col-span-2 sm:col-span-3">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Address</p>
                                    <p className="text-sm font-bold text-slate-800">
                                        {locked.addressLine}, {locked.city}, {locked.country}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Title & Description ── */}
                    <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight border-b border-slate-100 pb-5">
                            Description
                        </h2>
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <input
                                {...register("title")}
                                placeholder="e.g. Bright 2BR in Downtown"
                                className={cn(
                                    "w-full h-12 px-4 rounded-xl border bg-slate-50 text-base font-bold text-slate-900 outline-none transition-all",
                                    errors.title
                                        ? "border-red-400 focus:ring-red-400/10 focus:border-red-400"
                                        : "border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                )}
                            />
                            {errors.title && (
                                <p className="text-xs font-bold text-red-500">{errors.title.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <textarea
                                {...register("description")}
                                rows={5}
                                placeholder="Describe the property, its highlights, neighbourhood…"
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl border bg-slate-50 text-sm font-medium text-slate-900 outline-none transition-all resize-none",
                                    errors.description
                                        ? "border-red-400 focus:border-red-400"
                                        : "border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                )}
                            />
                            {errors.description && (
                                <p className="text-xs font-bold text-red-500">{errors.description.message}</p>
                            )}
                        </div>
                    </section>

                    {/* ── Amenities ── */}
                    <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight border-b border-slate-100 pb-5">
                            Amenities
                        </h2>
                        <AmenitySelector />
                    </section>

                    {/* ── Media ── */}
                    <MediaSection
                        images={images}
                        addFiles={addFiles}
                        removeImage={removeImage}
                        reorderImages={reorderImages}
                        clearAll={clearAll}
                        previewSrc={previewSrc}
                    />

                    {/* ── Pricing ── */}
                    <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight border-b border-slate-100 pb-5 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-primary" />
                            {transactionType === "FOR_RENT" ? "Monthly Rent" : "Asking Price"}
                        </h2>

                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 pr-5 w-fit">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" {...register("negotiable")} className="sr-only peer" />
                                <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                                <span className="ml-2.5 text-sm font-bold text-slate-600">Negotiable</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <select
                                    {...register("currency")}
                                    className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="ILS">ILS (₪)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label>
                                    {transactionType === "FOR_RENT" ? "Monthly Rent Amount" : "Total Amount"}
                                </Label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-black text-lg pointer-events-none">
                                        {CURRENCY_SYMBOLS[currency] ?? "$"}
                                    </span>
                                    <input
                                        type="number"
                                        {...register("price", { valueAsNumber: true })}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        min={0}
                                        onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                                        placeholder="Enter amount…"
                                        className={cn(
                                            "w-full h-12 pl-10 pr-4 rounded-xl border bg-white text-xl font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 placeholder:font-medium",
                                            errors.price
                                                ? "border-red-400 focus:border-red-400"
                                                : "border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        )}
                                    />
                                    {transactionType === "FOR_RENT" && (
                                        <span className="absolute inset-y-0 right-4 flex items-center text-slate-400 font-bold text-sm pointer-events-none">
                                            / month
                                        </span>
                                    )}
                                </div>
                                {errors.price && (
                                    <p className="text-xs font-bold text-red-500">{errors.price.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Rental-only fields */}
                        {transactionType === "FOR_RENT" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-slate-100">
                                <div className="space-y-2">
                                    <Label>Lease Duration</Label>
                                    <select
                                        {...register("leaseDuration")}
                                        className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    >
                                        <option value="6 Months">6 Months</option>
                                        <option value="12 Months">12 Months (1 Year)</option>
                                        <option value="24 Months">24 Months (2 Years)</option>
                                        <option value="Flexible">Flexible / Short Term</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        Available from <span className="text-red-500">*</span>
                                    </Label>
                                    <input
                                        type="date"
                                        {...register("availableDate")}
                                        className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ── Virtual Tour / Floor Plan ── */}
                    <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight border-b border-slate-100 pb-5">
                            Virtual Tour & Floor Plan
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label>Virtual Tour URL</Label>
                                <input
                                    {...register("virtualTourUrl")}
                                    placeholder="Matterport, Vimeo embed link…"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Floor Plan URL</Label>
                                <input
                                    {...register("floorPlanUrl")}
                                    placeholder="Link to floor plan image or PDF…"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Viewing Availability ── */}
                    <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 pb-5">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <span className="material-icons-outlined text-primary text-xl">schedule</span>
                                Viewing Availability
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 font-medium">
                                Add specific dates or recurring days when the property is available for viewing.
                            </p>
                        </div>
                        <div className="space-y-2 max-w-md">
                            <Label>
                                Property time zone{" "}
                                <span className="text-slate-400 font-semibold normal-case">(IANA)</span>
                            </Label>
                            <select
                                {...register("timeZone")}
                                className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                            >
                                {PROPERTY_IANA_TIMEZONES.map((z) => (
                                    <option key={z.value} value={z.value}>
                                        {z.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <AvailabilityScheduler />
                    </section>

                </div>
            </div>

            {/* ── Sticky save footer ── */}
            <footer className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.08)]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            if (isFormDirty && !warnedRef.current) {
                                const ok = window.confirm("You have unsaved changes. Leave without saving?");
                                if (!ok) return;
                            }
                            router.back();
                        }}
                        className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <Button
                        type="button"
                        onClick={handleSubmit(onSubmit)}
                        disabled={isSaving || isUploading}
                        className={cn(
                            "flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all",
                            isSaving || isUploading
                                ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed"
                                : "bg-primary text-white shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                        )}
                    >
                        {isSaving || isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {isUploading ? "Uploading…" : "Saving…"}
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Save changes
                            </>
                        )}
                    </Button>
                </div>
            </footer>
        </FormProvider>
    );
}
