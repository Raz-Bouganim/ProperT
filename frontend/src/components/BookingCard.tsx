"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "./ui/Button";

interface BookingCardProps {
    booking: {
        id: string;
        startTime: string;
        endTime: string;
        status: string;
        listing: {
            id: string;
            title: string;
            address: string;
            images: string[];
            price: number;
        };
        seeker?: {
            firstName: string;
            lastName: string;
            email: string;
        };
    };
    role: "SEEKER" | "OWNER";
    onStatusChange?: (id: string, newStatus: string) => void;
}

export function BookingCard({ booking, role, onStatusChange }: BookingCardProps) {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    const statusColors = {
        PENDING: "bg-yellow-100 text-yellow-800",
        CONFIRMED: "bg-green-100 text-green-800",
        REJECTED: "bg-red-100 text-red-800",
        CANCELLED: "bg-gray-100 text-gray-800",
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 p-4 border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow">
            {/* Image */}
            <div className="w-full md:w-48 aspect-video md:aspect-square relative rounded-xl overflow-hidden bg-muted flex-shrink-0">
                <Image
                    src={booking.listing.images[0] || "/placeholder-property.svg"}
                    alt={booking.listing.title}
                    fill
                    className="object-cover"
                />
            </div>

            {/* Content */}
            <div className="flex-grow flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg line-clamp-1">{booking.listing.title}</h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3" /> {booking.listing.address}
                            </div>
                        </div>
                        <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider",
                            statusColors[booking.status as keyof typeof statusColors] || "bg-gray-100"
                        )}>
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
                        {role === 'OWNER' && booking.seeker && (
                            <div className="flex items-center gap-2 sm:col-span-2 mt-2 pt-2 border-t text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span>Requested by <span className="font-bold text-foreground">{booking.seeker.firstName} {booking.seeker.lastName}</span></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2 justify-end">
                    {role === 'OWNER' && booking.status === 'PENDING' && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStatusChange?.(booking.id, 'REJECTED')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                Reject
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => onStatusChange?.(booking.id, 'CONFIRMED')}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Confirm Request
                            </Button>
                        </>
                    )}
                    {role === 'SEEKER' && booking.status === 'PENDING' && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusChange?.(booking.id, 'CANCELLED')}
                        >
                            Cancel Request
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
