'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface FilterModalFilters {
    beds: number | null;
    baths: number | null;
    minPrice: number | null;
    maxPrice: number | null;
}

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFilters?: Partial<FilterModalFilters>;
    onApply: (filters: FilterModalFilters) => void;
}

const BED_OPTIONS = [
    { label: 'Any', value: null },
    { label: '1+', value: 1 },
    { label: '2+', value: 2 },
    { label: '3+', value: 3 },
    { label: '4+', value: 4 },
    { label: '5+', value: 5 },
];

export function FilterModal({ isOpen, onClose, initialFilters = {}, onApply }: FilterModalProps) {
    const [beds, setBeds] = useState<number | null>(initialFilters.beds ?? null);
    const [baths, setBaths] = useState<number | null>(initialFilters.baths ?? null);
    const [minPrice, setMinPrice] = useState<string>(initialFilters.minPrice != null ? String(initialFilters.minPrice) : '');
    const [maxPrice, setMaxPrice] = useState<string>(initialFilters.maxPrice != null ? String(initialFilters.maxPrice) : '');
    const [priceError, setPriceError] = useState<string | null>(null);

    // Reset to last-applied values each time the modal opens
    useEffect(() => {
        if (isOpen) {
            setBeds(initialFilters.beds ?? null);
            setBaths(initialFilters.baths ?? null);
            setMinPrice(initialFilters.minPrice != null ? String(initialFilters.minPrice) : '');
            setMaxPrice(initialFilters.maxPrice != null ? String(initialFilters.maxPrice) : '');
            setPriceError(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleApply = () => {
        const minPriceNum = minPrice !== '' ? parseFloat(minPrice) : null;
        const maxPriceNum = maxPrice !== '' ? parseFloat(maxPrice) : null;
        if (minPriceNum !== null && maxPriceNum !== null && minPriceNum > maxPriceNum) {
            setPriceError('Min price cannot exceed max price');
            return;
        }
        onApply({ beds, baths, minPrice: minPriceNum, maxPrice: maxPriceNum });
        onClose();
    };

    const handleReset = () => {
        setBeds(null);
        setBaths(null);
        setMinPrice('');
        setMaxPrice('');
        setPriceError(null);
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
                    {/* Bedrooms */}
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

                    {/* Bathrooms */}
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

                    {/* Price Range */}
                    <div>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Price range</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={minPrice}
                                    onChange={(e) => { setMinPrice(e.target.value); setPriceError(null); }}
                                    className={`w-full pl-7 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${priceError ? 'border-red-400' : 'border-slate-200'}`}
                                    min={0}
                                />
                            </div>
                            <span className="text-slate-400 text-sm">–</span>
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={maxPrice}
                                    onChange={(e) => { setMaxPrice(e.target.value); setPriceError(null); }}
                                    className={`w-full pl-7 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${priceError ? 'border-red-400' : 'border-slate-200'}`}
                                    min={0}
                                />
                            </div>
                        </div>
                        {priceError && <p className="text-red-500 text-xs mt-2">{priceError}</p>}
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
