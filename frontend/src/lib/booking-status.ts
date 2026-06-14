export const BOOKING_STATUS_STYLES: Record<string, { badge: string; bar: string }> = {
    PENDING:   { badge: "bg-amber-100 text-amber-800",     bar: "bg-amber-400" },
    CONFIRMED: { badge: "bg-green-100 text-green-800",     bar: "bg-green-500" },
    REJECTED:  { badge: "bg-red-100 text-red-700",         bar: "bg-red-400" },
    CANCELLED: { badge: "bg-slate-100 text-slate-600",     bar: "bg-slate-300" },
    COMPLETED: { badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
    LAPSED:    { badge: "bg-orange-100 text-orange-800",   bar: "bg-orange-400" },
};
