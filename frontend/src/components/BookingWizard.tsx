import { useState, useEffect } from "react";
import { format, addMonths, startOfToday } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar as CalendarIcon, Clock, CheckCircle2, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "./ui/Button";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface BookingWizardProps {
    listingId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function BookingWizard({ listingId, isOpen, onClose }: BookingWizardProps) {
    const [step, setStep] = useState(1);
    const [availabilityRules, setAvailabilityRules] = useState<{ dayOfWeek: number }[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [slots, setSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const { user } = useAuth();

    // Fetch availability rules on mount
    useEffect(() => {
        if (isOpen) {
            fetchAvailability();
        }
    }, [isOpen, listingId]);

    const fetchAvailability = async () => {
        try {
            const res = await api.get(`/listings/${listingId}/availability`);
            setAvailabilityRules(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load availability.");
        }
    };

    // Fetch slots when date changes
    useEffect(() => {
        if (selectedDate) {
            fetchSlots(selectedDate);
        }
    }, [selectedDate]);

    const fetchSlots = async (date: Date) => {
        setLoading(true);
        setSelectedSlot(null); // Reset slot when date changes
        try {
            const dateStr = format(date, "yyyy-MM-dd");
            const res = await api.get(`/listings/${listingId}/availability/slots?date=${dateStr}`);
            setSlots(res.data);
        } catch (error) {
            console.error(error);
            setSlots([]);
            toast.error("Failed to load time slots.");
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async () => {
        if (!selectedDate || !selectedSlot) return;

        setSubmitting(true);
        try {
            const startTime = new Date(selectedDate);
            const [hours, minutes] = selectedSlot.split(":").map(Number);
            startTime.setHours(hours, minutes, 0, 0);

            const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min duration

            if (!user) {
                toast.error("You must be logged in to book a viewing.");
                return;
            }

            await api.post("/bookings", {
                listingId,
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

        } catch (error) {
            console.error(error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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

                                <div className="flex justify-center mb-6">
                                    <DayPicker
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={[
                                            { before: startOfToday() },
                                            (date: Date) => {
                                                if (availabilityRules.length === 0) return false;
                                                const day = date.getDay();
                                                return !availabilityRules.some(r => r.dayOfWeek === day);
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
                                    className="w-full h-14 text-lg rounded-2xl font-bold"
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
                                            {selectedDate ? format(selectedDate, "EEEE, MMM do") : ""}
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
                                                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${selectedSlot === slot
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
                                    className="w-full h-14 text-lg rounded-2xl font-bold"
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
