import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";

// --- Schema Definition ---
// --- Schema Definition ---
export const listingSchema = z.object({
    // Step 1: Basic Info & Location
    transactionType: z.enum(["FOR_SALE", "FOR_RENT"]),
    type: z.enum(["APARTMENT", "HOUSE", "OFFICE"]),
    title: z.string().min(1, "Title is required").max(60, "Title max 60 chars"),
    description: z.string().min(1, "Description is required"),
    address: z.string().min(1, "Address is required"),
    country: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    street: z.string().optional(),
    houseNumber: z.string().optional(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),

    // Step 2: Property Details
    sqft: z.number().min(1, "Square footage must be positive"),
    beds: z.number().min(0, "Bedrooms cannot be negative"),
    baths: z.number().min(0, "Bathrooms cannot be negative"),
    yearBuilt: z.number().min(1800).max(new Date().getFullYear()),
    features: z.array(z.string()).optional(),

    // Step 3: Media
    images: z.any().optional(), // validated manually or via check
    floorPlanUrl: z.string().optional(),
    virtualTourUrl: z.string().optional(),

    // Step 4: Pricing
    currency: z.string().default("USD"),
    price: z.number().min(1, "Price must be positive"),
    negotiable: z.boolean().default(true),
    availableDate: z.string().optional(),
    leaseDuration: z.string().optional(),

    customFees: z.array(z.object({
        name: z.string(),
        amount: z.number()
    })).optional(),

    // Availability
    availabilities: z.array(z.object({
        dayOfWeek: z.number().optional(),
        date: z.string().optional(),
        startTime: z.string(),
        endTime: z.string()
    })).optional()
});

export type ListingFormValues = z.infer<typeof listingSchema>;

export const useListingForm = () => {
    const form = useForm<ListingFormValues>({
        resolver: zodResolver(listingSchema) as any,
        defaultValues: {
            transactionType: "FOR_SALE",
            type: "APARTMENT",
            beds: 1,
            baths: 1,
            currency: "USD",
            features: [],
            price: undefined,
            negotiable: true,
            leaseDuration: "12 Months",
            images: [],
            availabilities: []
        },
        mode: "onChange"
    });

    return form;
};
