"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Loader2, MapPin, User, X } from "lucide-react";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "./ui/Button";
import { BOOKING_STATUS_STYLES } from "@/lib/booking-status";

const VIEWING_SLOT_MINUTES = 30;

function propertyCoverUrl(
    images: Array<string | { url: string; isPrimary?: boolean } | undefined> | undefined,
): string {
    if (!images?.length) return "/placeholder-property.svg";
    const primary = images.find(
        (img) => img && typeof img === "object" && "isPrimary" in img && img.isPrimary,
    );
    const first = primary ?? images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) return first.url;
    return "/placeholder-property.svg";
}

function extractApiError(e: unknown): unknown {
    return e && typeof e === "object" && "response" in e
        ? (e as { response?: { data?: { message?: unknown } } }).response?.data?.message
        : undefined;
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
    property: {
        id: string;
        slug?: string;
        title: string;
        address?: string;
        addressLine?: string;
        timeZone?: string;
        images: Array<string | { url: string; isPrimary?: boolean }>;
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

type ModalAction = "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "RESCHEDULE" | null;

export function BookingCard({ booking, role, onPatched }: BookingCardProps) {
    const start = new Date(booking.startTime);
    const end   = new Date(booking.endTime);
    const tz    = booking.property.timeZone ?? "UTC";

    const [modal,              setModal]              = useState<ModalAction>(null);
    const [note,               setNote]               = useState("");
    const [submitting,         setSubmitting]         = useState(false);
    const [rescheduleDate,     setRescheduleDate]     = useState<Date>(start);
    const [slots,              setSlots]              = useState<string[]>([]);
    const [selectedSlot,       setSelectedSlot]       = useState<string | null>(null);
    const [slotsLoading,       setSlotsLoading]       = useState(false);
    const [availabilityRules,  setAvailabilityRules]  = useState<{ dayOfWeek?: number | null; date?: string | null }[]>([]);

    const closeModal = useCallback(() => {
        setModal(null);
        setNote("");
        setSelectedSlot(null);
        setSubmitting(false);
    }, []);

    useEffect(() => {
        if (modal === "RESCHEDULE") setRescheduleDate(new Date(booking.startTime));
    }, [modal, booking.startTime]);

    useEffect(() => {
        if (modal !== "RESCHEDULE" || !booking.property.id) return;
        let cancelled = false;
        void api
            .get<{ dayOfWeek?: number | null; date?: string | null }[]>(`/properties/${booking.property.id}/availability`)
            .then((res) => { if (!cancelled) setAvailabilityRules(res.data); })
            .catch(() => { /* silently ignore — all days stay enabled */ });
        return () => { cancelled = true; };
    }, [modal, booking.property.id]);

    const isDateAvailable = useCallback((date: Date) => {
        if (availabilityRules.length === 0) return true;
        const d = DateTime.fromJSDate(date).setZone(tz);
        const jsDay = d.weekday === 7 ? 0 : d.weekday;
        const dateStr = d.toFormat("yyyy-MM-dd");
        return availabilityRules.some((r) => {
            if (r?.date) {
                return DateTime.fromJSDate(new Date(r.date)).setZone(tz).toFormat("yyyy-MM-dd") === dateStr;
            }
            if (r?.dayOfWeek !== undefined && r?.dayOfWeek !== null) {
                return Number(r.dayOfWeek) === jsDay;
            }
            return false;
        });
    }, [availabilityRules, tz]);

    const dateKeyInZone = useMemo(
        () => DateTime.fromJSDate(rescheduleDate).setZone(tz).toFormat("yyyy-MM-dd"),
        [rescheduleDate, tz],
    );

    const disabledDates = useMemo(() => [
        { before: DateTime.now().setZone(tz).startOf("day").toJSDate() },
        (date: Date) => !isDateAvailable(date),
    ], [isDateAvailable, tz]);

    useEffect(() => {
        if (modal !== "RESCHEDULE" || !booking.property.id) return;
        let cancelled = false;
        setSlotsLoading(true);
        void api
            .get<string[]>(`/properties/${booking.property.id}/availability/slots?date=${dateKeyInZone}`)
            .then((res) => { if (!cancelled) { setSlots(res.data); setSelectedSlot(null); } })
            .catch(() => { if (!cancelled) { setSlots([]); toast.error("Could not load available slots."); } })
            .finally(() => { if (!cancelled) setSlotsLoading(false); });
        return () => { cancelled = true; };
    }, [modal, booking.property.id, dateKeyInZone]);

    const submitStatus = async (status: string) => {
        const text = note.trim();
        if (!text) { toast.error("Please add a short note for this change."); return; }
        setSubmitting(true);
        try {
            const res = await api.patch(`/bookings/${booking.id}`, { status, note: text });
            onPatched?.(res.data);
            toast.success("Booking updated.");
            closeModal();
        } catch (e: unknown) {
            const msg = extractApiError(e);
            toast.error(typeof msg === "string" ? msg : "Could not update booking.");
        } finally {
            setSubmitting(false);
        }
    };

    const submitReschedule = async () => {
        const text = note.trim();
        if (!text)         { toast.error("Please explain why you are proposing a new time."); return; }
        if (!selectedSlot) { toast.error("Pick an open slot for the selected day."); return; }
        const [y, mo, d]       = dateKeyInZone.split("-").map(Number);
        const [hours, minutes] = selectedSlot.split(":").map(Number);
        const startDt = DateTime.fromObject(
            { year: y, month: mo, day: d, hour: hours, minute: minutes, second: 0 },
            { zone: tz },
        );
        if (!startDt.isValid) { toast.error("Invalid date or time."); return; }
        const startTime = startDt.toJSDate().toISOString();
        const endTime   = startDt.plus({ minutes: VIEWING_SLOT_MINUTES }).toJSDate().toISOString();

        setSubmitting(true);
        try {
            const res = await api.patch(`/bookings/${booking.id}`, { startTime, endTime, note: text });
            onPatched?.(res.data);
            toast.success("New time proposed; the owner will confirm.");
            closeModal();
        } catch (e: unknown) {
            const msg = extractApiError(e);
            toast.error(typeof msg === "string" ? msg : "Could not reschedule.");
        } finally {
            setSubmitting(false);
        }
    };

    const terminal      = ["REJECTED", "CANCELLED", "COMPLETED", "LAPSED"].includes(booking.status);
    const style         = BOOKING_STATUS_STYLES[booking.status] ?? BOOKING_STATUS_STYLES["CANCELLED"];
    const propertyHref  = `/properties/${booking.property.slug ?? booking.property.id}`;

    return (
        <>
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <div className={clsx("h-[3px] w-full", style.bar)} />

                <div className="flex items-stretch min-h-[130px]">
                    {/* Calendar date column */}
                    <div className="flex flex-col items-center justify-center w-[90px] flex-shrink-0 border-r border-border/60 bg-muted/20 py-5 px-3 gap-0.5 select-none">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                            {format(start, "EEE")}
                        </span>
                        <span className="text-[2rem] font-black text-foreground leading-none my-0.5">
                            {format(start, "d")}
                        </span>
                        <span className="text-[9px] font-bold uppercase text-muted-foreground leading-none">
                            {format(start, "MMM yyyy")}
                        </span>
                        <div className="w-5 h-px bg-border/70 my-2" />
                        <span className="text-[9px] font-semibold text-foreground leading-snug text-center">
                            {format(start, "h:mm a")}
                        </span>
                        <span className="text-[8px] text-muted-foreground leading-none">–</span>
                        <span className="text-[9px] font-semibold text-foreground leading-snug text-center">
                            {format(end, "h:mm a")}
                        </span>
                    </div>

                    {/* Property info */}
                    <div className="flex-grow flex items-center px-5 py-5 min-w-0">
                        <div className="flex-grow min-w-0">
                            <Link href={propertyHref} className="hover:underline block min-w-0 mb-2">
                                <h3 className="font-black text-[17px] leading-tight line-clamp-2 text-foreground">
                                    {booking.property.title}
                                </h3>
                            </Link>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">
                                    {booking.property.addressLine ?? booking.property.address ?? ""}
                                </span>
                            </p>
                            {role === "OWNER" && booking.seeker && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                                    <User className="w-3 h-3 flex-shrink-0" />
                                    <span className="font-semibold text-foreground">
                                        {booking.seeker.firstName} {booking.seeker.lastName}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Property image — right side, status badge overlaid */}
                    <Link
                        href={propertyHref}
                        className="relative w-64 flex-shrink-0 bg-muted overflow-hidden group block"
                    >
                        <Image
                            src={propertyCoverUrl(booking.property.images)}
                            alt={booking.property.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Blend left edge into card */}
                        <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card/50 to-transparent pointer-events-none" />
                        {/* Status badge */}
                        <div className="absolute top-3 right-3">
                            <span
                                className={clsx(
                                    "text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider shadow-sm backdrop-blur-sm",
                                    style.badge,
                                )}
                            >
                                {booking.status}
                            </span>
                        </div>
                    </Link>
                </div>

                {!terminal && (
                    <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 flex flex-wrap items-center justify-end gap-2">
                        {role === "OWNER" && booking.status === "PENDING" && (
                            <>
                                <Button
                                    size="sm" variant="outline" type="button"
                                    onClick={() => setModal("REJECTED")}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20 text-xs h-7"
                                >
                                    Reject
                                </Button>
                                <Button
                                    size="sm" type="button"
                                    onClick={() => setModal("CONFIRMED")}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                >
                                    Confirm Viewing
                                </Button>
                            </>
                        )}
                        {role === "OWNER" && booking.status === "CONFIRMED" && (
                            <>
                                <Button
                                    size="sm" variant="outline" type="button"
                                    onClick={() => setModal("CANCELLED")}
                                    className="text-muted-foreground text-xs h-7"
                                >
                                    Cancel
                                </Button>
                                <Button size="sm" type="button" onClick={() => setModal("COMPLETED")} className="text-xs h-7">
                                    Mark Completed
                                </Button>
                            </>
                        )}
                        {role === "SEEKER" && (booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                            <>
                                <Button
                                    size="sm" variant="outline" type="button"
                                    onClick={() => setModal("RESCHEDULE")}
                                    className="text-xs h-7"
                                >
                                    Propose New Time
                                </Button>
                                <Button
                                    size="sm" variant="outline" type="button"
                                    onClick={() => setModal("CANCELLED")}
                                    className="text-muted-foreground text-xs h-7"
                                >
                                    Cancel
                                </Button>
                                {booking.status === "CONFIRMED" && (
                                    <Button size="sm" type="button" onClick={() => setModal("COMPLETED")} className="text-xs h-7">
                                        Mark Completed
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                        <button
                            type="button"
                            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
                            onClick={closeModal}
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <h4 className="font-black text-base mb-1 pr-8">
                            {modal === "RESCHEDULE" ? "Propose a new time"
                                : modal === "CONFIRMED" ? "Confirm viewing"
                                : modal === "REJECTED"  ? "Reject request"
                                : modal === "CANCELLED"
                                    ? (role === "OWNER" ? "Cancel booking (owner)" : "Cancel booking")
                                    : "Mark completed"}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                            A note is required for the audit trail — visible to both parties in activity history.
                        </p>

                        {modal === "RESCHEDULE" && (
                            <div className="space-y-3 mb-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Date ({tz})
                                </label>
                                <div className="flex justify-center">
                                    <DayPicker
                                        mode="single"
                                        timeZone={tz}
                                        noonSafe
                                        today={DateTime.now().setZone(tz).startOf("day").toJSDate()}
                                        selected={rescheduleDate}
                                        onSelect={(date) => { if (date) setRescheduleDate(date); }}
                                        disabled={disabledDates}
                                        modifiersClassNames={{
                                            selected: "bg-primary text-white rounded-lg",
                                            today: "text-primary font-bold",
                                        }}
                                        classNames={{
                                            caption: "text-primary font-bold",
                                            head_cell: "text-muted-foreground uppercase text-xs font-extrabold",
                                        }}
                                    />
                                </div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Available slot
                                </label>
                                {slotsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
                                    </div>
                                ) : slots.length === 0 ? (
                                    <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
                                        No bookable slots on this day. Try a different date or ask the owner to update availability.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-[150px] overflow-y-auto pr-1">
                                        {slots.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setSelectedSlot(s)}
                                                className={clsx(
                                                    "p-2.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer",
                                                    selectedSlot === s
                                                        ? "border-primary bg-primary/5 text-primary scale-[0.98]"
                                                        : "border-transparent bg-muted/40 hover:bg-muted text-muted-foreground",
                                                )}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Note
                        </label>
                        <textarea
                            className="w-full min-h-[90px] rounded-xl border bg-background px-3 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            placeholder="Explain this change…"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl text-xs">
                                Back
                            </Button>
                            <Button
                                type="button"
                                disabled={submitting}
                                className="rounded-xl text-xs"
                                onClick={() => {
                                    if (modal === "RESCHEDULE") void submitReschedule();
                                    else if (modal) void submitStatus(modal);
                                }}
                            >
                                {submitting
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 inline" /> Saving…</>
                                    : "Submit"
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
