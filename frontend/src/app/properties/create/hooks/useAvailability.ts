import { useState } from "react";
import { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { ListingFormValues } from "./useListingForm";
import { toast } from "sonner";

export const useAvailability = (
    getValues: UseFormGetValues<ListingFormValues>,
    setValue: UseFormSetValue<ListingFormValues>
) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [isRecurring, setIsRecurring] = useState(false);

    const addAvailabilitySlot = () => {
        if (!startTime || !endTime) return;

        const startMin = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1]);
        const endMin = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);

        if (startMin >= endMin) {
            toast.error("End time must be after start time");
            return;
        }

        const currentSlots = getValues("availabilities") || [];

        // Helper to check overlap
        const hasOverlap = currentSlots.some(slot => {
            const slotStart = parseInt(slot.startTime.split(":")[0]) * 60 + parseInt(slot.startTime.split(":")[1]);
            const slotEnd = parseInt(slot.endTime.split(":")[0]) * 60 + parseInt(slot.endTime.split(":")[1]);

            // Check time overlap first
            if (startMin < slotEnd && endMin > slotStart) {
                // Check day/date collision
                if (isRecurring && selectedDate) {
                    if (slot.dayOfWeek === selectedDate.getDay()) return true;
                } else if (selectedDate) {
                    if (slot.date && slot.date.split("T")[0] === selectedDate.toISOString().split("T")[0]) return true;
                    if (slot.dayOfWeek === selectedDate.getDay()) return true;
                }
            }

            return false;
        });

        if (hasOverlap) {
            toast.error("This slot overlaps with an existing availability.");
            return;
        }

        let newSlot;
        if (isRecurring && selectedDate) {
            newSlot = {
                dayOfWeek: selectedDate.getDay(),
                startTime,
                endTime
            };
        } else if (selectedDate) {
            newSlot = {
                date: selectedDate.toISOString(),
                startTime,
                endTime
            };
        } else {
            toast.error("Please select a date");
            return;
        }

        // Type-safe addition of availability slot
        setValue("availabilities", [...currentSlots, newSlot] as typeof currentSlots);
        toast.success("Availability slot added");
    };

    const removeSlot = (index: number) => {
        const currentSlots = getValues("availabilities") || [];
        const newSlots = [...currentSlots];
        newSlots.splice(index, 1);
        setValue("availabilities", newSlots);
    };

    return {
        selectedDate,
        setSelectedDate,
        startTime,
        setStartTime,
        endTime,
        setEndTime,
        isRecurring,
        setIsRecurring,
        addAvailabilitySlot,
        removeSlot
    };
};
