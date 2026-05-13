import { useState, useEffect, useMemo, useCallback } from "react";
import { DateTime } from "luxon";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar as CalendarIcon, Clock, CheckCircle2, Loader2, ChevronLeft } from "lucide-react";
import { Button } from "./ui/Button";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import axios from "axios";

/** Keep in sync with backend `AVAILABILITY_SLOT_MINUTES` (30). */
const VIEWING_SLOT_MINUTES = 30;

/** Calendar day in the listing zone, aligned with the slots API `date=YYYY-MM-DD` parameter. */
function toPropertyDateKey(date: Date, zone: string): string {
    return DateTime.fromJSDate(date).setZone(zone).toFormat("yyyy-MM-dd");
}

interface BookingWizardProps {
    propertyId: string;
    /** IANA zone for the listing; date + slot `HH:mm` are interpreted in this zone (matches slots API). */
    propertyTimeZone?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function BookingWizard({
    propertyId,
    propertyTimeZone = "UTC",
    isOpen,
    onClose,
}: BookingWizardProps) {
    const [step, setStep] = useState(1);
    const [availabilityRules, setAvailabilityRules] = useState<{ dayOfWeek?: number | null; date?: string | null }[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [slots, setSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const { user } = useAuth();

    /** Listing-local “today” — must not be memoized across renders or past-midnight breaks. */
    const todayStartInPropertyZone = DateTime.now()
        .setZone(propertyTimeZone)
        .startOf("day")
        .toJSDate();

    /** Initial visible month when the modal opens (listing zone). */
    const defaultMonthInPropertyZone = useMemo(
        () => DateTime.now().setZone(propertyTimeZone).toJSDate(),
        [propertyTimeZone],
    );

    const fetchAvailability = useCallback(async () => {
        try {
            const res = await api.get(`/properties/${propertyId}/availability`);
            setAvailabilityRules(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load availability.");
        }
    }, [propertyId]);

    const fetchSlots = useCallback(
        async (date: Date) => {
            setLoading(true);
            setSelectedSlot(null); // Reset slot when date changes
            try {
                const dateStr = toPropertyDateKey(date, propertyTimeZone);
                const res = await api.get(`/properties/${propertyId}/availability/slots?date=${dateStr}`);
                setSlots(res.data);
            } catch (error) {
                console.error(error);
                setSlots([]);
                toast.error("Failed to load time slots.");
            } finally {
                setLoading(false);
            }
        },
        [propertyId, propertyTimeZone],
    );

    // Fetch availability rules when the wizard opens or listing changes.
    useEffect(() => {
        if (isOpen) {
            void fetchAvailability();
        }
    }, [isOpen, fetchAvailability]);

    // Fetch slots when date or listing time zone changes (date key must stay aligned with the API).
    useEffect(() => {
        if (selectedDate) {
            void fetchSlots(selectedDate);
        }
    }, [selectedDate, fetchSlots]);

    const isDateAvailable = (date: Date) => {
        // No owner-defined rules: do not grey out calendar days (no weekly/date restriction in the UI).
        // Slot generation still returns no windows until rules exist (see backend availability service).
        if (availabilityRules.length === 0) return true;

        const d = DateTime.fromJSDate(date).setZone(propertyTimeZone);
        const jsDay = d.weekday === 7 ? 0 : d.weekday;
        const dateStr = d.toFormat("yyyy-MM-dd");

        return availabilityRules.some((r) => {
            if (r?.date) {
                const ruleKey = DateTime.fromJSDate(new Date(r.date))
                    .setZone(propertyTimeZone)
                    .toFormat("yyyy-MM-dd");
                return ruleKey === dateStr;
            }
            if (r?.dayOfWeek === 0 || r?.dayOfWeek) {
                return Number(r.dayOfWeek) === jsDay;
            }
            return false;
        });
    };

    const handleBooking = async () => {
        if (!selectedDate || !selectedSlot) return;

        setSubmitting(true);
        try {
            const dateStr = toPropertyDateKey(selectedDate, propertyTimeZone);
            const [y, mo, d] = dateStr.split("-").map(Number);
            const [hours, minutes] = selectedSlot.split(":").map(Number);
            const startDt = DateTime.fromObject(
                { year: y, month: mo, day: d, hour: hours, minute: minutes, second: 0 },
                { zone: propertyTimeZone },
            );
            if (!startDt.isValid) {
                toast.error("Invalid date or time for this property.");
                return;
            }
            const startTime = startDt.toJSDate();
            const endTime = startDt.plus({ minutes: VIEWING_SLOT_MINUTES }).toJSDate();

            if (!user) {
                toast.error("You must be logged in to book a viewing.");
                return;
            }

            await api.post("/bookings", {
                propertyId,
                seekerId: user.id,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                notes: "Interested in viewing the property.",
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                // Reset state after animation
                setTimeout(() => {
                    setStep(1);
                    setSelectedDate(undefined);
                    setSelectedSlot(null);
                    setSuccess(false);
                }, 500);
            }, 2000);

        } catch (error: unknown) {
            const isAxios = axios.isAxiosError(error);
            const response = isAxios ? error.response : undefined;
            const data = response?.data;

            const shouldDebug =
                process.env.NODE_ENV !== "production" &&
                process.env.NEXT_PUBLIC_DEBUG_BOOKING_ERRORS === "1";

            if (shouldDebug) {
                // Use debug to avoid Next dev overlay noise.
                console.debug("Booking request failed", {
                    isAxios,
                    status: response?.status,
                    data,
                    axios: isAxios ? error.toJSON() : undefined,
                });
            }

            // Backend uses AllExceptionsFilter which nests exception payload under `data.message`.
            const payload = data?.message ?? data;
            const normalized =
                typeof payload === "string"
                    ? payload
                    : typeof payload?.message === "string"
                        ? payload.message
                        : Array.isArray(payload)
                            ? payload.filter((m: unknown) => typeof m === "string").join("\n")
                            : Array.isArray(payload?.message)
                                ? payload.message.filter((m: unknown) => typeof m === "string").join("\n")
                                : typeof payload?.error === "string"
                                    ? payload.error
                                    : null;

            toast.error(normalized || "Something went wrong. Please try again.");

            if (normalized?.toLowerCase().includes("slot") && selectedDate) {
                // If the slot was just taken, refresh the list.
                fetchSlots(selectedDate);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors z-10"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center py-12 text-center"
                            >
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-black mb-2">Request Sent!</h2>
                                <p className="text-muted-foreground">
                                    The owner will get back to you shortly.
                                </p>
                            </motion.div>
                        ) : step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <CalendarIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-bold">Select viewing date</h2>
                                </div>

                                <p className="text-xs text-muted-foreground mb-4 text-center px-2">
                                    Calendar uses the listing time zone ({propertyTimeZone}). Dates match availability
                                    and slots on the server.
                                </p>

                                <div className="flex justify-center mb-6">
                                    <DayPicker
                                        mode="single"
                                        timeZone={propertyTimeZone}
                                        noonSafe
                                        today={todayStartInPropertyZone}
                                        defaultMonth={defaultMonthInPropertyZone}
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={[
                                            { before: todayStartInPropertyZone },
                                            (date: Date) => {
                                                return !isDateAvailable(date);
                                            }
                                        ]}
                                        modifiersClassNames={{
                                            selected: "bg-primary text-white rounded-lg",
                                            today: "text-primary font-bold"
                                        }}
                                        classNames={{
                                            caption: "text-primary font-bold",
                                            head_cell: "text-muted-foreground uppercase text-xs font-extrabold"
                                        }}
                                    />
                                </div>

                                <Button
                                    className="w-full h-14 text-lg rounded-2xl font-bold cursor-pointer"
                                    disabled={!selectedDate}
                                    onClick={() => setStep(2)}
                                >
                                    Continue to slots
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-primary mb-6 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back to calendar
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Clock className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Select a time</h2>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedDate
                                                ? DateTime.fromJSDate(selectedDate)
                                                      .setZone(propertyTimeZone)
                                                      .toFormat("EEEE, MMM d")
                                                : ""}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-8 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                    {loading ? (
                                        <div className="col-span-3 py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span className="text-sm font-medium">Fetching slots...</span>
                                        </div>
                                    ) : slots.length > 0 ? (
                                        slots.map((slot) => (
                                            <button
                                                key={slot}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer ${selectedSlot === slot
                                                    ? "border-primary bg-primary/5 text-primary scale-[0.98]"
                                                    : "border-transparent bg-muted/40 hover:bg-muted text-muted-foreground"
                                                    }`}
                                            >
                                                {slot}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-3 py-12 text-center text-muted-foreground">
                                            <p className="font-medium">No slots available for this day.</p>
                                            <p className="text-xs">Try selecting another date.</p>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    className="w-full h-14 text-lg rounded-2xl font-bold cursor-pointer"
                                    disabled={!selectedSlot || submitting}
                                    onClick={handleBooking}
                                >
                                    {submitting ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" /> Confirming...
                                        </div>
                                    ) : (
                                        "Confirm Viewing"
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
