'use client';

import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FilterModal({ isOpen, onClose }: FilterModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold">Filters</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-6 w-6" />
                </Button>
            </div>

            <div className="flex-grow p-6 overflow-y-auto space-y-8">
                {/* Price Range */}
                <div>
                    <h3 className="text-sm font-medium mb-4">Price Range</h3>
                    <div className="flex items-center gap-4">
                        <input type="number" placeholder="Min" className="w-full p-2 border rounded-md" />
                        <span>-</span>
                        <input type="number" placeholder="Max" className="w-full p-2 border rounded-md" />
                    </div>
                </div>

                {/* Property Type */}
                <div>
                    <h3 className="text-sm font-medium mb-4">Property Type</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {['Apartment', 'House', 'Studio', 'Commercial'].map(type => (
                            <button key={type} className="p-3 border rounded-md hover:bg-muted text-sm font-medium transition-colors">
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bedrooms */}
                <div>
                    <h3 className="text-sm font-medium mb-4">Bedrooms</h3>
                    <div className="flex gap-2">
                        {['Any', '1', '2', '3', '4+'].map(num => (
                            <button key={num} className="h-10 w-10 border rounded-full flex items-center justify-center hover:bg-muted text-sm font-medium transition-colors">
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t bg-background">
                <Button className="w-full h-12 text-lg" onClick={onClose}>Show 124 Results</Button>
            </div>
        </div>
    );
}
