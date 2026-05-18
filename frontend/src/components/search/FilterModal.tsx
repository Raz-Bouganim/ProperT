'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface FilterModalFilters {
    beds: number | null;
    baths: number | null;
    minSqft: number | null;
    maxSqft: number | null;
    maxLeaseDuration: number | null;
    amenities: string[];
}

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFilters?: Partial<FilterModalFilters>;
    onApply: (filters: FilterModalFilters) => void;
    propertyType?: string | null;
    status?: string | null;
}

const BED_OPTIONS = [
    { label: 'Any', value: null },
    { label: '1+', value: 1 },
    { label: '2+', value: 2 },
    { label: '3+', value: 3 },
    { label: '4+', value: 4 },
    { label: '5+', value: 5 },
];

const LEASE_OPTIONS = [
    { label: 'Any', value: null },
    { label: '≤ 6 mo', value: 6 },
    { label: '≤ 12 mo', value: 12 },
    { label: '≤ 24 mo', value: 24 },
];

const AMENITY_OPTIONS: { value: string; label: string }[] = [
    { value: 'SWIMMING_POOL', label: 'Pool' },
    { value: 'GYM', label: 'Gym' },
    { value: 'PARKING', label: 'Parking' },
    { value: 'ELEVATOR', label: 'Elevator' },
    { value: 'BALCONY', label: 'Balcony' },
    { value: 'AIR_CONDITIONING', label: 'A/C' },
    { value: 'GARDEN', label: 'Garden' },
    { value: 'FIREPLACE', label: 'Fireplace' },
    { value: 'PET_FRIENDLY', label: 'Pet Friendly' },
    { value: 'FURNISHED', label: 'Furnished' },
    { value: 'WASHER_DRYER', label: 'Washer/Dryer' },
    { value: 'DISHWASHER', label: 'Dishwasher' },
];

export function FilterModal({ isOpen, onClose, initialFilters = {}, onApply, propertyType, status }: FilterModalProps) {
    const isOffice = propertyType === 'OFFICE';
    const isRent = status === 'FOR_RENT';

    const [beds, setBeds] = useState<number | null>(initialFilters.beds ?? null);
    const [baths, setBaths] = useState<number | null>(initialFilters.baths ?? null);
    const [minSqft, setMinSqft] = useState<string>(initialFilters.minSqft != null ? String(initialFilters.minSqft) : '');
    const [maxSqft, setMaxSqft] = useState<string>(initialFilters.maxSqft != null ? String(initialFilters.maxSqft) : '');
    const [sqftError, setSqftError] = useState<string | null>(null);
    const [maxLeaseDuration, setMaxLeaseDuration] = useState<number | null>(initialFilters.maxLeaseDuration ?? null);
    const [amenities, setAmenities] = useState<string[]>(initialFilters.amenities ?? []);

    useEffect(() => {
        if (isOpen) {
            setBeds(initialFilters.beds ?? null);
            setBaths(initialFilters.baths ?? null);
            setMinSqft(initialFilters.minSqft != null ? String(initialFilters.minSqft) : '');
            setMaxSqft(initialFilters.maxSqft != null ? String(initialFilters.maxSqft) : '');
            setSqftError(null);
            setMaxLeaseDuration(initialFilters.maxLeaseDuration ?? null);
            setAmenities(initialFilters.amenities ?? []);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleApply = () => {
        const minSqftNum = minSqft !== '' ? parseFloat(minSqft) : null;
        const maxSqftNum = maxSqft !== '' ? parseFloat(maxSqft) : null;

        if (minSqftNum !== null && maxSqftNum !== null && minSqftNum > maxSqftNum) {
            setSqftError('Min sqft cannot exceed max sqft');
            return;
        }

        onApply({
            beds: isOffice ? null : beds,
            baths: isOffice ? null : baths,
            minSqft: minSqftNum,
            maxSqft: maxSqftNum,
            maxLeaseDuration: isRent ? maxLeaseDuration : null,
            amenities,
        });
        onClose();
    };

    const handleReset = () => {
        setBeds(null);
        setBaths(null);
        setMinSqft('');
        setMaxSqft('');
        setSqftError(null);
        setMaxLeaseDuration(null);
        setAmenities([]);
    };

    const toggleAmenity = (value: string) => {
        setAmenities((prev) =>
            prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value],
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 sm:fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">All Filters</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                    {/* Bedrooms — hidden for offices */}
                    {!isOffice && (
                        <div>
                            <p className="text-sm font-semibold text-slate-700 mb-3">Bedrooms</p>
                            <div className="flex gap-2 flex-wrap">
                                {BED_OPTIONS.map((opt) => (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        onClick={() => setBeds(opt.value)}
                                        className={`h-10 px-4 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                                            beds === opt.value
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bathrooms — hidden for offices */}
                    {!isOffice && (
                        <div>
                            <p className="text-sm font-semibold text-slate-700 mb-3">Bathrooms</p>
                            <div className="flex gap-2 flex-wrap">
                                {BED_OPTIONS.map((opt) => (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        onClick={() => setBaths(opt.value)}
                                        className={`h-10 px-4 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                                            baths === opt.value
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sqft */}
                    <div>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Size (sqft)</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={minSqft}
                                    onChange={(e) => { setMinSqft(e.target.value); setSqftError(null); }}
                                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${sqftError ? 'border-red-400' : 'border-slate-200'}`}
                                    min={0}
                                />
                            </div>
                            <span className="text-slate-400 text-sm">–</span>
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={maxSqft}
                                    onChange={(e) => { setMaxSqft(e.target.value); setSqftError(null); }}
                                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${sqftError ? 'border-red-400' : 'border-slate-200'}`}
                                    min={0}
                                />
                            </div>
                        </div>
                        {sqftError && <p className="text-red-500 text-xs mt-2">{sqftError}</p>}
                    </div>

                    {/* Lease Duration — only for rentals */}
                    {isRent && (
                        <div>
                            <p className="text-sm font-semibold text-slate-700 mb-3">Lease duration</p>
                            <div className="flex gap-2 flex-wrap">
                                {LEASE_OPTIONS.map((opt) => (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        onClick={() => setMaxLeaseDuration(opt.value)}
                                        className={`h-10 px-4 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                                            maxLeaseDuration === opt.value
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Amenities */}
                    <div>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Amenities</p>
                        <div className="flex gap-2 flex-wrap">
                            {AMENITY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggleAmenity(opt.value)}
                                    className={`h-9 px-3 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                                        amenities.includes(opt.value)
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-sm font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        Reset all
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="flex-1 h-11 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Show results
                    </button>
                </div>
            </div>
        </div>
    );
}
