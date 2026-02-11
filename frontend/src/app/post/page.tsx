"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Bed, Bath, Square, MapPin, Upload, X, Check, ChevronRight, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const listingSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    price: z.number().min(1, "Price must be positive"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    beds: z.number().min(0),
    baths: z.number().min(0),
    sqft: z.number().min(1, "Square footage must be positive"),
    type: z.enum(["APARTMENT", "HOUSE", "STUDIO", "LAND", "OFFICE"]),
    status: z.enum(["FOR_SALE", "FOR_RENT"]),
});

type ListingFormValues = z.infer<typeof listingSchema>;

function PostListingContent() {
    const [step, setStep] = useState(1);
    const [images, setImages] = useState<{ file: File; preview: string; key?: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

    const form = useForm<ListingFormValues>({
        resolver: zodResolver(listingSchema),
        defaultValues: {
            type: "APARTMENT",
            status: "FOR_SALE",
            beds: 1,
            baths: 1,
        },
    });

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
                // 1. Get Presigned URL
                const res = await fetch("http://localhost:5000/media/presigned-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: img.file.name, contentType: img.file.type }),
                });
                const { url, publicUrl } = await res.json();

                // 2. Upload to S3/MinIO
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

        const listingData = {
            ...values,
            images: imageUrls,
            features: [], // Can expand this later
        };

        try {
            const res = await fetch("http://localhost:5000/listings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(listingData),
            });
            const data = await res.json();
            router.push(`/listings/${data.id}`);
        } catch (error) {
            console.error("Submission failed", error);
        }
    };

    const nextStep = async () => {
        const fields = step === 1
            ? ["title", "description", "price", "type"]
            : ["address", "beds", "baths", "sqft"];

        const isValid = await form.trigger(fields as any);
        if (isValid) setStep(prev => prev + 1);
    };

    return (
        <div className="min-h-screen bg-zinc-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <header className="mb-12 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest mb-4">
                        Step {step} of 3
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">List your Property</h1>
                    <div className="flex items-center justify-center gap-4 mt-8">
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1.5 w-12 rounded-full transition-all duration-500",
                                    step >= i ? "bg-primary" : "bg-zinc-200"
                                )}
                            />
                        ))}
                    </div>
                </header>

                <div className="bg-white rounded-[2rem] border shadow-2xl shadow-zinc-200/50 p-8 md:p-12 overflow-hidden relative">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                        {/* Step 1: Basics */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <Label>Property Title</Label>
                                        <Input
                                            placeholder="e.g. Modern Minimalist Penthouse"
                                            {...form.register("title")}
                                            error={form.formState.errors.title?.message}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Property Type</Label>
                                            <select
                                                className="h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                {...form.register("type")}
                                            >
                                                <option value="APARTMENT">Apartment</option>
                                                <option value="HOUSE">House</option>
                                                <option value="STUDIO">Studio</option>
                                                <option value="LAND">Land</option>
                                                <option value="OFFICE">Office</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Monthly Rent ($)</Label>
                                            <Input
                                                type="number"
                                                placeholder="2500"
                                                {...form.register("price", { valueAsNumber: true })}
                                                error={form.formState.errors.price?.message}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Listing Status</Label>
                                        <div className="flex bg-zinc-100 p-1 rounded-xl">
                                            {["FOR_SALE", "FOR_RENT"].map((status) => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => form.setValue("status", status as any)}
                                                    className={cn(
                                                        "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
                                                        form.watch("status") === status
                                                            ? "bg-white text-primary shadow-sm"
                                                            : "text-zinc-500 hover:text-zinc-700"
                                                    )}
                                                >
                                                    {status === "FOR_SALE" ? "For Sale" : "For Rent"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            placeholder="Describe the best features of your home..."
                                            {...form.register("description")}
                                            error={form.formState.errors.description?.message}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Location & Specs */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <Label>Full Address</Label>
                                        <Input
                                            placeholder="Enter the property address"
                                            {...form.register("address")}
                                            error={form.formState.errors.address?.message}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Beds</Label>
                                            <Input type="number" {...form.register("beds", { valueAsNumber: true })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Baths</Label>
                                            <Input type="number" {...form.register("baths", { valueAsNumber: true })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sq Ft</Label>
                                            <Input type="number" {...form.register("sqft", { valueAsNumber: true })} error={form.formState.errors.sqft?.message} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Media */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <Label>Property Photos</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {images.map((img, i) => (
                                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border group">
                                            <Image src={img.preview} alt="Preview" fill className="object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                                        <Upload className="w-6 h-6 text-zinc-400 group-hover:text-primary transition-colors" />
                                        <span className="text-xs font-bold text-zinc-500 group-hover:text-primary">Add Photo</span>
                                        <input type="file" multiple className="hidden" onChange={handleImageChange} accept="image/*" />
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-8 border-t">
                            {step > 1 ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep(prev => prev - 1)}
                                    className="rounded-full gap-2 px-6"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </Button>
                            ) : (
                                <div />
                            )}

                            {step < 3 ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    className="rounded-full gap-2 px-8 min-w-[140px]"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={isUploading || images.length === 0}
                                    className="rounded-full gap-2 px-8 min-w-[140px] shadow-lg shadow-primary/30"
                                >
                                    {isUploading ? "Uploading..." : "Publish Listing"}
                                    <Check className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
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
