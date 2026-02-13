"use client";

import { useState, Suspense, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import {
    Home, Building, Briefcase, MapPin, Upload, X, Check,
    ChevronRight, ChevronLeft, Search, Tag, LandPlot,
    FileText, Loader2, Plus, Minus
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { LivePreview } from "@/components/LivePreview";

// Dynamically import Map to avoid SSR issues
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
        </div>
    ),
});

// --- Schema Definition ---
const listingSchema = z.object({
    // Step 1: Basic Info
    transactionType: z.enum(["FOR_SALE", "FOR_RENT"]),
    type: z.enum(["APARTMENT", "HOUSE", "OFFICE"]),
    title: z.string().min(1, "field should not be empty").max(60, "Title max 60 chars"),
    description: z.string().min(1, "field should not be empty"),

    // Step 2: Details & Location
    address: z.string().min(1, "please enter a valid address"),
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    street: z.string().optional(),
    houseNumber: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    sqft: z.number().min(1, "Square footage must be positive"),
    beds: z.number().min(0),
    baths: z.number().min(0),
    yearBuilt: z.number().min(1800).max(new Date().getFullYear() + 5).optional(),
    features: z.array(z.string()).optional(),

    // Step 3: Media
    images: z.array(z.string()).min(1, "At least one image is required"),
    floorPlanUrl: z.string().optional(),
    virtualTourUrl: z.string().optional(),

    // Step 4: Pricing
    currency: z.string().default("USD"),
    price: z.number().min(1, "Price must be positive"),
    taxAnnual: z.number().optional(),
    hoaMonthly: z.number().optional(),
    customFees: z.any().optional(),
});

type ListingFormValues = z.infer<typeof listingSchema>;

// --- Constants ---
const PROPERTY_TYPES = [
    { id: "APARTMENT", label: "Apartment", icon: Building },
    { id: "HOUSE", label: "House", icon: Home },
    { id: "OFFICE", label: "Office", icon: Briefcase },
];

const AMENITIES = [
    "Swimming Pool", "Gym & Fitness", "Parking Spot", "High-Speed Wifi",
    "Air Conditioning", "Private Balcony", "Pet Friendly", "Elevator Access",
    "24/7 Security", "In-unit Laundry", "Dishwasher", "Fireplace"
];

interface FileWithPreview extends File {
    preview: string;
}

const STEPS = [
    { step: 1, label: "Basic Info" },
    { step: 2, label: "Details" },
    { step: 3, label: "Media" },
    { step: 4, label: "Review" }
];

function PostListingContent() {
    const [step, setStep] = useState(1);
    // Media State
    const [images, setImages] = useState<FileWithPreview[]>([]);
    const [floorPlan, setFloorPlan] = useState<File | null>(null);
    const [virtualTourUrl, setVirtualTourUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isDraggingFloorPlan, setIsDraggingFloorPlan] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]);
    const [mapZoom, setMapZoom] = useState(13);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const router = useRouter();

    const form = useForm<ListingFormValues>({
        resolver: zodResolver(listingSchema) as any,
        defaultValues: {
            transactionType: "FOR_SALE",
            type: "APARTMENT",
            beds: 1,
            baths: 1,
            currency: "USD",
            features: [],
            price: 0,
        },
    });

    const { watch, setValue, register, formState: { errors }, trigger } = form;

    const toggleFeature = (feature: string) => {
        const current = watch("features") || [];
        if (current.includes(feature)) {
            setValue("features", current.filter(f => f !== feature));
        } else {
            setValue("features", [...current, feature]);
        }
    };

    const handleAddressSearch = async () => {
        const address = watch("address");
        if (!address || address.length < 1) return;

        setIsGeocoding(true);
        try {
            const res = await fetch(`http://localhost:5000/geo/search?q=${encodeURIComponent(address)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon, address: addrDetails } = data[0];
                const latitude = parseFloat(lat);
                const longitude = parseFloat(lon);

                setValue("latitude", latitude, { shouldValidate: true });
                setValue("longitude", longitude, { shouldValidate: true });
                setValue("country", addrDetails.country || "", { shouldValidate: true });
                setValue("city", addrDetails.city || addrDetails.town || addrDetails.village || addrDetails.city_district || addrDetails.hamlet || addrDetails.suburb || "", { shouldValidate: true });
                setValue("state", addrDetails.state || "", { shouldValidate: true });
                setValue("zipCode", addrDetails.postcode || "", { shouldValidate: true });
                setValue("street", addrDetails.road || "", { shouldValidate: true });
                setValue("houseNumber", addrDetails.house_number || "", { shouldValidate: true });

                // Update display address if detailed parts exist
                if (addrDetails.road && addrDetails.city) {
                    const fullAddr = [
                        addrDetails.house_number,
                        addrDetails.road,
                        addrDetails.city,
                        addrDetails.country
                    ].filter(Boolean).join(", ");
                    setValue("address", fullAddr, { shouldValidate: true });
                }

                setMapCenter([latitude, longitude]);
                setMapZoom(16);
                setSearchError(null);
            } else {
                setSearchError("Location not found. Try being more specific.");
            }
        } catch (error) {
            console.error("Geocoding failed", error);
            setSearchError("Search failed. Please try again.");
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleLocationSelect = async (lat: number, lng: number) => {
        setValue("latitude", lat, { shouldValidate: true });
        setValue("longitude", lng, { shouldValidate: true });
        setMapCenter([lat, lng]);

        setIsGeocoding(true);
        try {
            const res = await fetch(`http://localhost:5000/geo/reverse?lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.address) {
                const addrDetails = data.address;
                setValue("country", addrDetails.country || "", { shouldValidate: true });
                setValue("city", addrDetails.city || addrDetails.town || addrDetails.village || addrDetails.city_district || addrDetails.hamlet || addrDetails.suburb || "", { shouldValidate: true });
                setValue("state", addrDetails.state || "", { shouldValidate: true });
                setValue("zipCode", addrDetails.postcode || "", { shouldValidate: true });
                setValue("street", addrDetails.road || "", { shouldValidate: true });
                setValue("houseNumber", addrDetails.house_number || "", { shouldValidate: true });

                const fullAddr = [
                    addrDetails.house_number,
                    addrDetails.road,
                    addrDetails.city,
                    addrDetails.country
                ].filter(Boolean).join(", ");
                setValue("address", fullAddr, { shouldValidate: true });
                setSearchError(null);
            }
        } catch (error) {
            console.error("Reverse geocoding failed", error);
        } finally {
            setIsGeocoding(false);
        }
    };

    // --- Media Handlers ---
    const processFiles = (files: File[]) => {
        const newImages = files.map(file => {
            const fileWithPreview = file as FileWithPreview;
            fileWithPreview.preview = URL.createObjectURL(file);
            return fileWithPreview;
        });
        setImages(prev => [...prev, ...newImages]);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(Array.from(e.target.files || []));
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        processFiles(Array.from(e.dataTransfer.files));
    };

    const handleFloorPlanDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFloorPlan(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setFloorPlan(file);
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (index: number) => {
        if (draggedIndex === null) return;
        const newImages = [...images];
        const draggedItem = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, draggedItem);
        setImages(newImages);
        setDraggedIndex(null);
    };

    const uploadImages = async () => {
        setIsUploading(true);
        const uploadedUrls: string[] = [];
        try {
            for (const img of images) {
                const res = await fetch("http://localhost:5000/media/presigned-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: img.name, contentType: img.type }),
                });
                if (!res.ok) throw new Error("Failed to get presigned URL");
                const { url, publicUrl } = await res.json();

                await fetch(url, {
                    method: "PUT",
                    body: img,
                    headers: { "Content-Type": img.type },
                });
                uploadedUrls.push(publicUrl);
            }
            return uploadedUrls;
        } catch (error) {
            console.error("Upload failed", error);
            return [];
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = async (values: ListingFormValues) => {
        const imageUrls = await uploadImages();

        // Simple validation fallback
        if (imageUrls.length === 0 && images.length > 0) {
            console.warn("Images failed to upload properly");
        }

        const listingData = {
            ...values,
            images: imageUrls,
        };

        try {
            const res = await fetch("http://localhost:5000/listings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(listingData),
            });
            if (!res.ok) throw new Error("Failed to create listing");
            const data = await res.json();
            router.push(`/listings/${data.id}`);
        } catch (error) {
            console.error("Submission failed", error);
        }
    };

    const nextStep = async () => {
        let fields: (keyof ListingFormValues)[] = [];
        if (step === 1) fields = ["title", "description", "transactionType", "type", "address", "country", "city"];
        if (step === 2) fields = ["sqft", "beds", "baths", "yearBuilt"];
        // Step 3 media validation is manual mainly

        const isValid = await trigger(fields);
        if (isValid) {
            setStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            toast.error("Please fill in all required fields", {
                description: "Make sure you haven't missed any important information.",
                position: "bottom-right"
            });
        }
    };



    return (
        <div className="min-h-screen bg-[#f8f9fc] font-sans text-slate-800 flex flex-col">
            {/* Top Navigation / Progress Stepper (Clean) */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-16 z-40 transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-center">
                    {/* Progress Bar */}
                    <div className="flex-1 max-w-2xl px-4 md:px-12">
                        <div className="w-full">
                            <div className="flex items-center justify-between text-[11px] font-black mb-3 uppercase tracking-[0.2em] font-display">
                                {STEPS.map((s) => (
                                    <span key={s.step} className={cn(
                                        "transition-colors",
                                        step === s.step ? "text-primary" : "text-slate-300"
                                    )}>
                                        {s.label}
                                    </span>
                                ))}
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${(step / 4) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left Column: Form Content */}
                    <div className="lg:col-span-7 space-y-10">
                        {/* Step 1: Basic Info */}
                        {step === 1 && (
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
                        )}

                        {/* Step 2: Details */}
                        {step === 2 && (
                            <div className="space-y-10">
                                <div className="space-y-3">
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display drop-shadow-sm">Let&apos;s get into the details.</h1>
                                    <p className="text-slate-500 text-lg font-medium">Tell us what makes your property unique. Accurate details help match you with the right tenants.</p>
                                </div>

                                {/* Core Metrics Section */}
                                <section className="mb-16">
                                    <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight mb-6">
                                        <span className="material-icons-outlined text-primary">analytics</span>
                                        Property Specs
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Square Footage */}
                                        {/* Square Footage */}
                                        <div className="relative group p-1">
                                            <Label className="text-slate-500 font-semibold normal-case tracking-normal text-sm mb-2 block">Square Footage</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    {...register("sqft", { valueAsNumber: true })}
                                                    className={cn(
                                                        "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
                                                        errors.sqft ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Bedrooms */}
                                        <div className="relative group p-1">
                                            <Label className="text-slate-500 font-semibold normal-case tracking-normal text-sm mb-2 block">Bedrooms</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    {...register("beds", { valueAsNumber: true })}
                                                    className={cn(
                                                        "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
                                                        errors.beds ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
                                                    )}
                                                />
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
                                                    className={cn(
                                                        "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
                                                        errors.baths ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
                                                    )}
                                                />
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
                                                    className={cn(
                                                        "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
                                                        errors.yearBuilt ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="w-full h-px bg-slate-200 mb-16"></div>

                                {/* Amenities Section */}
                                <section className="mb-24 space-y-8">
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

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {AMENITIES.map((amenity) => {
                                            const isSelected = watch("features")?.includes(amenity);
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
                                                            {/* Placeholder icons based on amenity name logic or just consistent icons */}
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
                                                            {/* Fallback */}
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
                                </section>
                            </div>
                        )}

                        {/* Step 3: Media */}
                        {step === 3 && (
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display drop-shadow-sm">Upload Media.</h1>
                                    <p className="text-slate-500 text-lg font-medium">Showcase your property in its best light. High-resolution images attract 3x more views.</p>
                                </div>

                                {/* Primary Upload Zone */}
                                <div className={cn(
                                    "rounded-xl p-1 transition-all duration-300 group",
                                    isDraggingOver ? "bg-primary/20 scale-[1.01] shadow-2xl shadow-primary/10" : "bg-primary/5 hover:bg-primary/10"
                                )}>
                                    <label
                                        className={cn(
                                            "rounded-lg p-12 flex flex-col items-center justify-center text-center min-h-[300px] cursor-pointer relative overflow-hidden backdrop-blur-md border transition-all duration-300 w-full",
                                            isDraggingOver ? "bg-white/90 border-primary shadow-inner" : "bg-white/70 border-white/60"
                                        )}
                                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%231754CF33' stroke-width='2' stroke-dasharray='8%2c 8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")" }}
                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                        onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
                                        onDrop={handleFileDrop}
                                    >
                                        <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent pointer-events-none"></div>
                                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <span className="material-icons-outlined text-3xl">cloud_upload</span>
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Drag & drop photos here</h3>
                                        <p className="text-slate-500 mb-6 max-w-sm">
                                            or <span className="text-primary font-medium hover:underline">browse files</span> from your computer.
                                        </p>
                                        <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-400 font-medium">
                                            <span className="bg-white/50 px-2 py-1 rounded border border-slate-200">JPG</span>
                                            <span className="bg-white/50 px-2 py-1 rounded border border-slate-200">PNG</span>
                                            <span className="bg-white/50 px-2 py-1 rounded border border-slate-200">WEBP</span>
                                            <span className="bg-white/50 px-2 py-1 rounded border border-slate-200">Max 20MB</span>
                                        </div>
                                    </label>
                                </div>

                                {/* Image Grid */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight">
                                            <span className="material-icons-outlined text-primary">collections</span>
                                            Uploaded Photos <span className="text-slate-400 font-medium text-sm ml-2">({images.length}/20)</span>
                                        </h2>
                                        {images.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setImages([])}
                                                className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1"
                                            >
                                                <span className="material-icons-outlined text-base">delete_sweep</span> Remove All
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {images.map((img, i) => (
                                            <div
                                                key={i}
                                                draggable
                                                onDragStart={() => handleDragStart(i)}
                                                onDragOver={handleDragOver}
                                                onDrop={() => handleDrop(i)}
                                                className={cn(
                                                    "relative group aspect-square rounded-lg overflow-hidden shadow-sm cursor-grab active:cursor-grabbing transition-all duration-300",
                                                    i === 0 ? "ring-2 ring-primary ring-offset-2" : "hover:shadow-lg",
                                                    draggedIndex === i ? "opacity-50 scale-95" : "opacity-100 scale-100"
                                                )}
                                            >
                                                {i === 0 ? (
                                                    <div className="absolute top-2 left-2 z-10 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                                        COVER PHOTO
                                                    </div>
                                                ) : (
                                                    <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {i + 1}
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(i); }}
                                                    className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 hover:bg-red-500 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/20 flex items-center justify-center"
                                                >
                                                    <span className="material-icons-outlined text-sm">close</span>
                                                </button>

                                                <Image src={img.preview} alt="Preview" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />

                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-4 text-sm text-slate-500 italic font-medium">
                                        <span className="material-icons-outlined text-sm align-middle mr-1">info</span>
                                        Tip: Drag images to reorder. The first image will be the cover photo.
                                    </p>
                                </div>

                                {/* Specialized Uploads Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Floor Plans */}
                                    <div className="bg-white/70 backdrop-blur-md border border-white/60 p-6 rounded-xl relative overflow-hidden group shadow-sm">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                    <span className="material-icons-outlined">layers</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Floor Plans</h3>
                                                    <p className="text-xs text-slate-500">PDF or Image formats</p>
                                                </div>
                                            </div>
                                        </div>
                                        <label
                                            className={cn(
                                                "border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300",
                                                isDraggingFloorPlan ? "border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                                            )}
                                            onDragOver={(e) => { e.preventDefault(); setIsDraggingFloorPlan(true); }}
                                            onDragEnter={(e) => { e.preventDefault(); setIsDraggingFloorPlan(true); }}
                                            onDragLeave={(e) => { e.preventDefault(); setIsDraggingFloorPlan(false); }}
                                            onDrop={handleFloorPlanDrop}
                                        >
                                            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFloorPlan(e.target.files?.[0] || null)} className="hidden" />
                                            <span className="material-icons-outlined text-slate-400 text-2xl mb-1">note_add</span>
                                            <span className="text-sm font-medium text-primary">{floorPlan ? floorPlan.name : "Upload Plan"}</span>
                                        </label>
                                    </div>

                                    {/* 3D Tour */}
                                    <div className="bg-white/70 backdrop-blur-md border border-white/60 p-6 rounded-xl relative overflow-hidden group shadow-sm">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                                    <span className="material-icons-outlined">view_in_ar</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">3D Virtual Tour</h3>
                                                    <p className="text-xs text-slate-500">Matterport, Vimeo, etc.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="material-icons text-slate-400 text-sm">link</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Paste embed link here..."
                                                    value={virtualTourUrl}
                                                    onChange={(e) => setVirtualTourUrl(e.target.value)}
                                                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white/50 text-sm focus:ring-primary focus:border-primary placeholder-slate-400"
                                                />
                                            </div>
                                            <button type="button" className="w-full py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">
                                                Verify Link
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {step === 4 && (
                            <div className="space-y-10">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight font-display">Review & Publish.</h1>
                                    <p className="text-slate-500 text-lg font-medium">Set your price and go live today.</p>
                                </div>
                                <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Currency</Label>
                                            <select {...register("currency")} className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-bold shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none">
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Total Price</Label>
                                            <Input type="number" {...register("price", { valueAsNumber: true })}
                                                className={cn(
                                                    "h-12 bg-white text-2xl font-black rounded-xl transition-all",
                                                    errors.price ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:ring-primary/10"
                                                )}
                                                placeholder="0.00" />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-5 relative">
                        {step === 1 ? (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl sticky top-40 space-y-5">
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
                                            error={undefined} // Pass undefined to handle error display manually below
                                            placeholder="Enter address..."
                                            className={cn(
                                                "pl-12 pr-24 h-12 bg-white rounded-xl border-slate-200 font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all truncate",
                                                errors.address && "border-red-500 focus-visible:ring-red-500"
                                            )}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddressSearch();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddressSearch}
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
                                            images: images.map(img => img.preview)
                                        }] : []}
                                        center={mapCenter}
                                        zoom={mapZoom}
                                        onLocationSelect={handleLocationSelect}
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

                                {/* Hidden fields for other location details if not visible */}
                                <input type="hidden" {...register("city")} />
                                <input type="hidden" {...register("country")} />
                                <input type="hidden" {...register("state")} />
                                <input type="hidden" {...register("street")} />
                            </div>
                        ) : (
                            /* Live Preview for Step 2+ */
                            <div className="sticky top-40">
                                <LivePreview
                                    data={{
                                        title: watch("title"),
                                        price: watch("price"),
                                        address: watch("address"),
                                        beds: watch("beds"),
                                        baths: watch("baths"),
                                        sqft: watch("sqft"),
                                        image: images[0]?.preview,
                                        transactionType: watch("transactionType"),
                                        latitude: watch("latitude"),
                                        longitude: watch("longitude")
                                    }}
                                />
                                <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-3 text-slate-500">
                                    <span className="material-icons-outlined text-xl">visibility</span>
                                    <p className="text-xs font-medium">This is how your listing will appear to potential tenants.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </main>

            {/* Bottom Action Bar */}
            <footer className="bg-white border-t border-slate-200 py-3 sticky bottom-0 z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            if (step > 1) setStep(prev => prev - 1);
                            else router.back();
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs transition-all",
                            step === 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        )}
                        disabled={step === 1}
                    >
                        <ChevronLeft className="w-5 h-5" /> Back
                    </button>

                    <div className="flex items-center gap-8">
                        <span className="text-xs font-semibold text-slate-400 hidden sm:block">Step {step} of 4</span>
                        {step < 4 ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-2"
                            >
                                Continue to {STEPS[step]?.label || "Next"} <ChevronRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={form.handleSubmit(onSubmit as any)}
                                disabled={isUploading || images.length === 0}
                                className="bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all cursor-pointer flex items-center gap-2"
                            >
                                {isUploading ? "Publishing..." : "Finish & Publish"}
                                <Check className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </footer>
        </div >
    );
}

export default function PostListing() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PostListingContent />
        </Suspense>
    );
}
