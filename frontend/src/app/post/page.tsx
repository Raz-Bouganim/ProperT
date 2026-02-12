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
    FileText, Loader2
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";

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

const STEPS = [
    { step: 1, label: "Basic Info" },
    { step: 2, label: "Details" },
    { step: 3, label: "Media" },
    { step: 4, label: "Review" }
];

function PostListingContent() {
    const [step, setStep] = useState(1);
    const [images, setImages] = useState<{ file: File; preview: string; key?: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
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
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
        }));
        setImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async () => {
        setIsUploading(true);
        const uploadedUrls: string[] = [];
        try {
            for (const img of images) {
                const res = await fetch("http://localhost:5000/media/presigned-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: img.file.name, contentType: img.file.type }),
                });
                if (!res.ok) throw new Error("Failed to get presigned URL");
                const { url, publicUrl } = await res.json();
                await fetch(url, {
                    method: "PUT",
                    body: img.file,
                    headers: { "Content-Type": img.file.type },
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
        <div className="min-h-screen bg-[#f6f6f8] font-sans text-slate-800 flex flex-col">
            {/* Top Navigation / Progress Stepper (Clean) */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-16 z-40 transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-center">
                    {/* Progress Bar */}
                    <div className="flex-1 max-w-2xl px-4 md:px-12">
                        <div className="w-full">
                            <div className="flex items-center justify-between text-[11px] font-black mb-2 uppercase tracking-[0.2em] font-display">
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
                    <div className="lg:col-span-7 space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <>
                                {/* Header Section */}
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight font-display">Let&apos;s get started.</h1>
                                    <p className="text-slate-500 text-lg font-medium">Tell us about your property. We&apos;ll help you fill in the details later.</p>
                                </div>

                                {/* Transaction Type */}
                                <section className="space-y-4">
                                    <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight">
                                        <Tag className="text-primary w-5 h-5" /> Transaction Type
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="cursor-pointer group">
                                            <input
                                                type="radio"
                                                value="FOR_SALE"
                                                {...register("transactionType")}
                                                className="sr-only peer"
                                            />
                                            <div className="p-6 rounded-2xl border-2 border-slate-200 bg-white transition-all peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary hover:border-primary/30 flex flex-col items-center justify-center text-center h-28">
                                                <span className="block text-xl font-bold">For Sale</span>
                                                <span className="text-xs font-medium text-slate-400 group-peer-checked:text-primary/70">I want to sell my property</span>
                                            </div>
                                        </label>
                                        <label className="cursor-pointer group">
                                            <input
                                                type="radio"
                                                value="FOR_RENT"
                                                {...register("transactionType")}
                                                className="sr-only peer"
                                            />
                                            <div className="p-6 rounded-2xl border-2 border-slate-200 bg-white transition-all peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary hover:border-primary/30 flex flex-col items-center justify-center text-center h-28">
                                                <span className="block text-xl font-bold">For Rent</span>
                                                <span className="text-xs font-medium text-slate-400 group-peer-checked:text-primary/70">I want to rent out my property</span>
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
                                            <label key={pt.id} className="cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    value={pt.id}
                                                    {...register("type")}
                                                    className="sr-only peer"
                                                />
                                                <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-200 bg-white text-slate-400 transition-all peer-checked:border-primary peer-checked:text-primary peer-checked:bg-primary/5 hover:border-primary/30 h-32 text-center shadow-sm">
                                                    <pt.icon className="w-8 h-8 mb-3 opacity-50 group-peer-checked:opacity-100" />
                                                    <span className="font-black text-sm font-display uppercase tracking-widest leading-none">{pt.label}</span>
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
                                            <Label className="text-slate-500 font-semibold ml-1 normal-case tracking-normal text-sm">Property Title</Label>
                                            <div className="relative">
                                                <Input
                                                    placeholder="e.g. Spacious 2-Bedroom Apartment with Ocean View"
                                                    {...register("title")}
                                                    error={errors.title?.message}
                                                    className="h-14 font-medium border-slate-200 focus:ring-primary/20 bg-white"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                                    {watch("title")?.length || 0}/60
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-slate-500 font-semibold ml-1 normal-case tracking-normal text-sm">Description</Label>
                                            <Textarea
                                                placeholder="Highlight the key features of your property..."
                                                {...register("description")}
                                                error={errors.description?.message}
                                                rows={6}
                                                className="font-medium bg-white border-slate-200 focus:ring-primary/20 resize-none"
                                            />
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* Step 2: Details */}
                        {step === 2 && (
                            <div className="space-y-10">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight font-display">Property Details.</h1>
                                    <p className="text-slate-500 text-lg font-medium">Specify your property specifications.</p>
                                </div>
                                <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 font-display">Square Feet</Label>
                                        <Input type="number" {...register("sqft", { valueAsNumber: true })} className="h-14 bg-white border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 font-display">Bedrooms</Label>
                                        <Input type="number" {...register("beds", { valueAsNumber: true })} className="h-14 bg-white border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 font-display">Bathrooms</Label>
                                        <Input type="number" {...register("baths", { valueAsNumber: true })} step="0.5" className="h-14 bg-white border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 font-display">Year Built</Label>
                                        <Input type="number" {...register("yearBuilt", { valueAsNumber: true })} placeholder="YYYY" className="h-14 bg-white border-slate-200" />
                                    </div>
                                </section>
                                <section className="space-y-4">
                                    <h2 className="text-xl font-black text-slate-900 border-b pb-2 font-display tracking-tight">Amenities</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {AMENITIES.map((amenity) => (
                                            <label key={amenity} className="cursor-pointer group flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-white hover:border-primary/20 transition-all select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={watch("features")?.includes(amenity)}
                                                    onChange={() => toggleFeature(amenity)}
                                                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary/20"
                                                />
                                                <span className="text-sm font-bold text-slate-600">{amenity}</span>
                                            </label>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* Step 3: Media */}
                        {step === 3 && (
                            <div className="space-y-10">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight font-display">Media Gallery.</h1>
                                    <p className="text-slate-500 text-lg font-medium">Upload high-quality photos to showcase your property.</p>
                                </div>
                                <div className="border-4 border-dashed border-slate-200 rounded-[2rem] p-16 bg-white flex flex-col items-center justify-center text-center group hover:border-primary/30 transition-all">
                                    <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                                        <Upload className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-2 text-slate-900 font-display">Click to upload photos</h3>
                                    <p className="text-slate-400 mb-8 font-medium">PNG, JPG or GIF (max. 10MB)</p>
                                    <label>
                                        <div className="px-12 py-4 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 cursor-pointer transition-all font-black text-[14px] uppercase tracking-widest font-display">
                                            Select Images
                                        </div>
                                        <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                    {images.map((img, i) => (
                                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-white shadow-lg">
                                            <Image src={img.preview} alt="Preview" fill className="object-cover" />
                                            <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                                            {i === 0 && <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">Main</div>}
                                        </div>
                                    ))}
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
                                            <select {...register("currency")} className="w-full h-14 rounded-xl border-slate-200 bg-slate-50 px-4 font-black">
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Total Price</Label>
                                            <Input type="number" {...register("price", { valueAsNumber: true })} className="h-14 bg-white border-slate-200 text-2xl font-black" />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-5">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl sticky top-40 space-y-5">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 font-display tracking-tight">
                                <MapPin className="text-primary w-6 h-6" /> Location
                            </h2>

                            {/* Address Search */}
                            <div className="relative group">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors z-10" />
                                    <Input
                                        type="text"
                                        {...register("address")}
                                        error={errors.address?.message}
                                        placeholder="Enter address..."
                                        className="pl-12 pr-28 h-14"
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
                                        className="absolute right-2 top-[7px] bg-primary text-white text-[10px] font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer uppercase tracking-widest flex items-center gap-2 z-10"
                                    >
                                        {isGeocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
                                    </button>
                                </div>
                            </div>

                            {searchError && (
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
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
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-600 leading-relaxed font-manrope">
                                        Drag the map to pinpoint the exact entrance location.
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                        Click map to move pin
                                    </p>
                                </div>
                            </div>

                            {/* Unit/Zip Fields */}
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <Input
                                    className="h-12 bg-slate-50 rounded-lg border border-slate-200 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 px-4 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 shadow-sm"
                                    placeholder="Unit Number"
                                    {...register("houseNumber")}
                                />
                                <Input
                                    className="h-12 bg-slate-50 rounded-lg border border-slate-200 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 px-4 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 shadow-sm"
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
                            "flex items-center gap-2 px-6 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all font-display",
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
                                className="bg-primary text-white text-xs font-bold px-6 py-2 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-3 uppercase tracking-wider"
                            >
                                Continue to {STEPS[step]?.label || "Next"} <ChevronRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={form.handleSubmit(onSubmit as any)}
                                disabled={isUploading || images.length === 0}
                                className="bg-green-600 text-white text-xs font-bold px-6 py-2 rounded-lg shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all cursor-pointer flex items-center gap-3 uppercase tracking-wider"
                            >
                                {isUploading ? "Publishing..." : "Finish & Publish"}
                                <Check className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default function PostListing() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PostListingContent />
        </Suspense>
    );
}
