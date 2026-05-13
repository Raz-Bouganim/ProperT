"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Calendar, Clock, Loader2, MapPin, ScrollText, User, X } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "./ui/Button";

const VIEWING_SLOT_MINUTES = 30;

function propertyCoverUrl(images: Array<string | { url: string } | undefined> | undefined): string {
    const first = images?.[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) return first.url;
    return "/placeholder-property.svg";
}

export type BookingPatchBody = {
    status?: string;
    startTime?: string;
    endTime?: string;
    note: string;
};

export type BookingCardBooking = {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    noteHistory?: string | null;
    property: {
        id: string;
        title: string;
        address?: string;
        addressLine?: string;
        timeZone?: string;
        images: Array<string | { url: string }>;
        price: number | string;
    };
    seeker?: {
        firstName: string;
        lastName: string;
        email: string;
    };
};

interface BookingCardProps {
    booking: BookingCardBooking;
    role: "SEEKER" | "OWNER";
    onPatched?: (updated: unknown) => void;
}

type ModalAction =
    | "CONFIRMED"
    | "REJECTED"
    | "CANCELLED"
    | "COMPLETED"
    | "RESCHEDULE"
    | null;

export function BookingCard({ booking, role, onPatched }: BookingCardProps) {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const tz = booking.property.timeZone ?? "UTC";

    const [modal, setModal] = useState<ModalAction>(null);
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [rescheduleDate, setRescheduleDate] = useState<Date>(start);
    const [slots, setSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const closeModal = () => {
        setModal(null);
        setNote("");
        setSelectedSlot(null);
        setSubmitting(false);
    };

    useEffect(() => {
        if (modal === "RESCHEDULE") {
            setRescheduleDate(new Date(booking.startTime));
        }
    }, [modal, booking.startTime]);

    const dateKeyInZone = useMemo(
        () => DateTime.fromJSDate(rescheduleDate).setZone(tz).toFormat("yyyy-MM-dd"),
        [rescheduleDate, tz],
    );

    useEffect(() => {
        if (modal !== "RESCHEDULE" || !booking.property.id) return;
        let cancelled = false;
        setSlotsLoading(true);
        void api
            .get<string[]>(
                `/properties/${booking.property.id}/availability/slots?date=${dateKeyInZone}`,
            )
            .then((res) => {
                if (!cancelled) {
                    setSlots(res.data);
                    setSelectedSlot(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSlots([]);
                    toast.error("Could not load available slots.");
                }
            })
            .finally(() => {
                if (!cancelled) setSlotsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [modal, booking.property.id, dateKeyInZone]);

    const submitStatus = async (status: string) => {
        const text = note.trim();
        if (!text) {
            toast.error("Please add a short note for this change.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.patch(`/bookings/${booking.id}`, { status, note: text });
            onPatched?.(res.data);
            toast.success("Booking updated.");
            closeModal();
        } catch (e: unknown) {
            const msg =
                e && typeof e === "object" && "response" in e
                    ? (e as { response?: { data?: { message?: unknown } } }).response?.data?.message
                    : undefined;
            toast.error(typeof msg === "string" ? msg : "Could not update booking.");
        } finally {
            setSubmitting(false);
        }
    };

    const submitReschedule = async () => {
        const text = note.trim();
        if (!text) {
            toast.error("Please explain why you are proposing a new time.");
            return;
        }
        if (!selectedSlot) {
            toast.error("Pick an open slot for the selected day.");
            return;
        }
        const [y, mo, d] = dateKeyInZone.split("-").map(Number);
        const [hours, minutes] = selectedSlot.split(":").map(Number);
        const startDt = DateTime.fromObject(
            { year: y, month: mo, day: d, hour: hours, minute: minutes, second: 0 },
            { zone: tz },
        );
        if (!startDt.isValid) {
            toast.error("Invalid date or time.");
            return;
        }
        const startTime = startDt.toJSDate().toISOString();
        const endTime = startDt.plus({ minutes: VIEWING_SLOT_MINUTES }).toJSDate().toISOString();

        setSubmitting(true);
        try {
            const res = await api.patch(`/bookings/${booking.id}`, {
                startTime,
                endTime,
                note: text,
            });
            onPatched?.(res.data);
            toast.success("New time proposed; the owner will confirm.");
            closeModal();
        } catch (e: unknown) {
            const msg =
                e && typeof e === "object" && "response" in e
                    ? (e as { response?: { data?: { message?: unknown } } }).response?.data?.message
                    : undefined;
            toast.error(typeof msg === "string" ? msg : "Could not reschedule.");
        } finally {
            setSubmitting(false);
        }
    };

    const statusColors: Record<string, string> = {
        PENDING: "bg-yellow-100 text-yellow-800",
        CONFIRMED: "bg-green-100 text-green-800",
        REJECTED: "bg-red-100 text-red-800",
        CANCELLED: "bg-gray-100 text-gray-800",
        COMPLETED: "bg-emerald-100 text-emerald-900",
        LAPSED: "bg-orange-100 text-orange-900",
    };

    const terminal = ["REJECTED", "CANCELLED", "COMPLETED", "LAPSED"].includes(booking.status);

    return (
        <div className="flex flex-col md:flex-row gap-4 p-4 border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="w-full md:w-48 aspect-video md:aspect-square relative rounded-xl overflow-hidden bg-muted flex-shrink-0">
                <Image
                    src={propertyCoverUrl(booking.property.images)}
                    alt={booking.property.title}
                    fill
                    className="object-cover"
                />
            </div>

            <div className="flex-grow flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg line-clamp-1">{booking.property.title}</h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3" />{" "}
                                {booking.property.addressLine ?? booking.property.address ?? ""}
                            </div>
                        </div>
                        <span
                            className={clsx(
                                "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider",
                                statusColors[booking.status] ?? "bg-gray-100",
                            )}
                        >
                            {booking.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">{format(start, "EEEE, MMM do, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                                {format(start, "h:mm a")} - {format(end, "h:mm a")}
                            </span>
                        </div>
                        {role === "OWNER" && booking.seeker && (
                            <div className="flex items-center gap-2 sm:col-span-2 mt-2 pt-2 border-t text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span>
                                    Requested by{" "}
                                    <span className="font-bold text-foreground">
                                        {booking.seeker.firstName} {booking.seeker.lastName}
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>

                    {booking.noteHistory ? (
                        <div className="mt-4 rounded-xl border bg-muted/30 p-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                                <ScrollText className="w-4 h-4" /> Activity (newest first)
                            </div>
                            <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/90 max-h-40 overflow-y-auto">
                                {booking.noteHistory}
                            </pre>
                        </div>
                    ) : null}
                </div>

                {!terminal && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-end">
                        {role === "OWNER" && booking.status === "PENDING" && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={() => setModal("REJECTED")}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => setModal("CONFIRMED")}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Confirm
                                </Button>
                            </>
                        )}
                        {role === "OWNER" && booking.status === "CONFIRMED" && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={() => setModal("CANCELLED")}
                                    className="text-muted-foreground"
                                >
                                    Cancel booking
                                </Button>
                                <Button size="sm" type="button" onClick={() => setModal("COMPLETED")}>
                                    Mark completed
                                </Button>
                            </>
                        )}
                        {role === "SEEKER" &&
                            (booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        onClick={() => setModal("RESCHEDULE")}
                                    >
                                        Propose new time
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        onClick={() => setModal("CANCELLED")}
                                        className="text-muted-foreground"
                                    >
                                        Cancel
                                    </Button>
                                    {booking.status === "CONFIRMED" && (
                                        <Button size="sm" type="button" onClick={() => setModal("COMPLETED")}>
                                            Mark completed
                                        </Button>
                                    )}
                                </>
                            )}
                    </div>
                )}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                        <button
                            type="button"
                            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                            onClick={closeModal}
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h4 className="font-bold text-lg mb-2 pr-8">
                            {modal === "RESCHEDULE"
                                ? "Propose a new time"
                                : modal === "CONFIRMED"
                                  ? "Confirm viewing"
                                  : modal === "REJECTED"
                                    ? "Reject request"
                                    : modal === "CANCELLED"
                                      ? role === "OWNER"
                                          ? "Cancel booking (owner)"
                                          : "Cancel booking"
                                      : "Mark completed"}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            A note is required for the audit trail (shown to both parties in activity history).
                        </p>

                        {modal === "RESCHEDULE" && (
                            <div className="space-y-3 mb-4">
                                <label className="block text-sm font-medium">Date ({tz})</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                    value={dateKeyInZone}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (!v) return;
                                        const [yy, mm, dd] = v.split("-").map(Number);
                                        const next = DateTime.fromObject(
                                            { year: yy, month: mm, day: dd },
                                            { zone: tz },
                                        );
                                        if (next.isValid) setRescheduleDate(next.toJSDate());
                                    }}
                                />
                                <label className="block text-sm font-medium">Open slot</label>
                                {slotsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
                                    </div>
                                ) : slots.length === 0 ? (
                                    <p className="text-sm text-amber-700">
                                        No bookable slots on this day. Pick another date or ask the owner to update
                                        availability.
                                    </p>
                                ) : (
                                    <select
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                        value={selectedSlot ?? ""}
                                        onChange={(e) => setSelectedSlot(e.target.value || null)}
                                    >
                                        <option value="">Select a start time</option>
                                        {slots.map((s) => (
                                            <option key={s} value={s}>
                                                {s} ({VIEWING_SLOT_MINUTES} min)
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        <label className="block text-sm font-medium mb-1">Note</label>
                        <textarea
                            className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-2 text-sm mb-4"
                            placeholder="Explain this change…"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeModal}>
                                Back
                            </Button>
                            <Button
                                type="button"
                                disabled={submitting}
                                onClick={() => {
                                    if (modal === "RESCHEDULE") void submitReschedule();
                                    else if (modal) void submitStatus(modal);
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> Saving…
                                    </>
                                ) : (
                                    "Submit"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
