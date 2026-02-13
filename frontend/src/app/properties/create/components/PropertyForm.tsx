import { useState, useEffect } from "react";
import { FormProvider } from "react-hook-form";
import { useListingForm, ListingFormValues } from "../hooks/useListingForm";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { Button } from "@/components/ui/Button";
import { Step1BasicInfo } from "./steps/Step1BasicInfo";
import { Step2Details } from "./steps/Step2Details";
import { Step3Media } from "./steps/Step3Media";
import { Step4Pricing } from "./steps/Step4Pricing";
import { LocationPicker } from "./partials/LocationPicker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
    Loader2, ChevronLeft, ChevronRight, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LivePreview } from "@/components/LivePreview";

const STEPS = [
    { step: 1, label: "Basic Info" },
    { step: 2, label: "Details" },
    { step: 3, label: "Media" },
    { step: 4, label: "Review" }
];

export function PropertyForm() {
    const [currentStep, setCurrentStep] = useState(1);
    const form = useListingForm();
    const {
        images,
        processFiles,
        removeImage,
        reorderImages,
        uploadImages,
        isUploading,
        setImages
    } = useMediaUpload();
    const router = useRouter();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentStep]);

    const { trigger, handleSubmit, watch } = form;
    const formValues = watch();

    // Real-time validation for button state (matching old behavior)
    const isStepValid = (() => {
        if (currentStep === 1) {
            return !!(
                formValues.title?.trim() &&
                formValues.description?.trim() &&
                formValues.type &&
                formValues.transactionType &&
                formValues.address?.trim() &&
                formValues.latitude != null &&
                formValues.longitude != null
            );
        }
        if (currentStep === 2) {
            const yearValue = formValues.yearBuilt;
            const isYearValid = !!yearValue && (yearValue >= 1800 && yearValue <= new Date().getFullYear());
            return !!(formValues.address && formValues.sqft > 0 && formValues.beds >= 0 && formValues.baths >= 0 && isYearValid);
        }
        if (currentStep === 3) {
            return images.length > 0;
        }
        if (currentStep === 4) {
            const priceValid = formValues.price > 0;
            if (!priceValid) return false;
            return true;
        }
        return false;
    })();

    const nextStep = async () => {
        let fields: (keyof ListingFormValues)[] = [];
        if (currentStep === 1) fields = ["title", "description", "transactionType", "type", "address", "country", "city"];
        if (currentStep === 2) fields = ["sqft", "beds", "baths", "yearBuilt"];

        if (currentStep === 3) {
            if (images.length === 0) {
                toast.error("Please fill in all required fields", {
                    description: "Make sure you haven't missed any important information."
                });
                return;
            }
        }

        const isValid = await trigger(fields);
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
        } else {
            toast.error("Please fill in all required fields", {
                description: "Make sure you haven't missed any important information."
            });
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else {
            router.back();
        }
    };

    const onSubmit = async (values: ListingFormValues) => {
        if (images.length === 0) {
            toast.error("Upload at least one image");
            return;
        }

        try {
            const imageUrls = await uploadImages();

            const { sqft, beds, baths, transactionType, ...rest } = values;

            const listingData = {
                ...rest,
                status: transactionType,
                sqft: sqft,
                bedrooms: beds,
                bathrooms: baths,
                country: values.country || "Unknown",
                city: values.city || "Unknown",
                images: imageUrls,
            };

            const { data } = await api.post("/listings", listingData);
            router.push(`/listings/${data.id}`);
            toast.success("Listing published successfully!");
        } catch (error: any) {
            console.error("Submission failed", error);
            if (error.response?.data) {
                console.error("Validation Errors:", error.response.data);
                toast.error(`Error: ${JSON.stringify(error.response.data.message || "Validation failed")}`);
            } else {
                toast.error("Failed to publish listing. Please try again.");
            }
        }
    };

    return (
        <FormProvider {...form}>
            <div className="min-h-screen bg-[#f8f9fc] font-sans text-slate-800 flex flex-col">
                <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    <form onSubmit={handleSubmit(onSubmit as any)} className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {/* Left Column: Form Content */}
                        <div className="lg:col-span-7 space-y-10">
                            {currentStep === 1 && <Step1BasicInfo />}
                            {currentStep === 2 && <Step2Details />}
                            {currentStep === 3 && (
                                <Step3Media
                                    images={images}
                                    onImagesSelected={processFiles}
                                    onImageRemove={removeImage}
                                    onImageReorder={reorderImages}
                                    onClearAll={() => setImages([])}
                                />
                            )}
                            {currentStep === 4 && (
                                <Step4Pricing
                                    images={images}
                                    onEditStep={(step) => setCurrentStep(step)}
                                />
                            )}
                        </div>

                        {/* Right Column */}
                        <div className="lg:col-span-5 relative">
                            {currentStep === 1 ? (
                                <LocationPicker images={images} />
                            ) : (
                                /* Live Preview for Step 2+ */
                                <div className="sticky top-24">
                                    <LivePreview
                                        data={{
                                            title: formValues.title,
                                            price: formValues.price || 0,
                                            address: formValues.address || "Property Location",
                                            beds: formValues.beds || 0,
                                            baths: formValues.baths || 0,
                                            sqft: formValues.sqft || 0,
                                            image: images[0]?.preview,
                                            transactionType: formValues.transactionType,
                                            latitude: formValues.latitude ?? 0,
                                            longitude: formValues.longitude ?? 0,
                                            leaseDuration: formValues.leaseDuration
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
                <footer className="bg-white border-t border-slate-200 sticky bottom-0 z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">

                        {/* Mobile Progress (Text only) */}
                        <div className="md:hidden w-full flex items-center justify-between mb-2">
                            <button
                                type="button"
                                onClick={prevStep}
                                className={cn(
                                    "text-slate-500 hover:text-slate-900 font-bold text-xs flex items-center gap-1",
                                    currentStep === 1 && "invisible"
                                )}
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <span className="text-xs font-bold text-slate-400">Step {currentStep} of 4</span>
                        </div>

                        {/* Desktop Back Button */}
                        <button
                            type="button"
                            onClick={prevStep}
                            className={cn(
                                "hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                                currentStep === 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                            disabled={currentStep === 1}
                        >
                            <ChevronLeft className="w-5 h-5" /> Back
                        </button>

                        {/* Desktop Stepper */}
                        <div className="hidden md:flex items-center gap-2">
                            {STEPS.map((s) => {
                                const isCompleted = currentStep > s.step;
                                const isCurrent = currentStep === s.step;

                                return (
                                    <div key={s.step} className="flex items-center">
                                        <div className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                                            isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : "",
                                            isCompleted ? "text-primary" : isCurrent ? "text-primary" : "text-slate-300"
                                        )}>
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors",
                                                isCompleted ? "bg-primary border-primary text-white" :
                                                    isCurrent ? "bg-primary text-white border-primary" :
                                                        "bg-transparent border-slate-300 text-slate-400"
                                            )}>
                                                {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.step}
                                            </div>
                                            <span className={cn(
                                                "text-sm font-bold",
                                                isCompleted || isCurrent ? "text-slate-900" : "text-slate-400"
                                            )}>
                                                {s.label}
                                            </span>
                                        </div>
                                        {s.step < STEPS.length && (
                                            <div className={cn(
                                                "w-8 h-0.5 mx-2 rounded-full transition-colors",
                                                currentStep > s.step ? "bg-primary" : "bg-slate-200"
                                            )} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Next / Submit Button */}
                        <div className="w-full md:w-auto flex justify-end">
                            {currentStep < 4 ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={!isStepValid}
                                    className={cn(
                                        "w-full md:w-auto text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2",
                                        !isStepValid
                                            ? "bg-slate-300 shadow-none cursor-not-allowed opacity-70"
                                            : "bg-primary shadow-primary/20 hover:bg-primary/90 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleSubmit(onSubmit as any, (errors) => {
                                        const missingFields = Object.keys(errors).join(", ");
                                        toast.error("Please fill in all required fields", {
                                            description: `Missing or invalid: ${missingFields}`
                                        });
                                        console.error("Form validation errors:", errors);
                                    })}
                                    disabled={isUploading || !isStepValid}
                                    className={cn(
                                        "w-full md:w-auto text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2",
                                        (isUploading || !isStepValid)
                                            ? "bg-slate-300 shadow-none cursor-not-allowed opacity-70"
                                            : "bg-green-600 shadow-green-600/20 hover:bg-green-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                                        </>
                                    ) : (
                                        <>
                                            Finish & Publish <Check className="w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </footer>
            </div>
        </FormProvider>
    );
}
