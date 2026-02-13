import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Step3MediaProps {
    images: (File & { preview?: string })[];
    onImagesSelected: (files: File[]) => void;
    onImageRemove: (index: number) => void;
    onImageReorder: (dragIndex: number, hoverIndex: number) => void;
    onClearAll: () => void;
}

export function Step3Media({ images, onImagesSelected, onImageRemove, onImageReorder, onClearAll }: Step3MediaProps) {
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isDraggingFloorPlan, setIsDraggingFloorPlan] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [floorPlan, setFloorPlan] = useState<File | null>(null);
    const [virtualTourUrl, setVirtualTourUrl] = useState("");

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onImagesSelected(Array.from(e.target.files || []));
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        onImagesSelected(Array.from(e.dataTransfer.files));
    };

    const handleFloorPlanDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFloorPlan(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setFloorPlan(file);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (index: number) => {
        if (draggedIndex === null) return;
        onImageReorder(draggedIndex, index);
        setDraggedIndex(null);
    };

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display drop-shadow-sm">Upload Media.</h1>
                <p className="text-slate-500 text-lg font-medium">Showcase your property in its best light. High-resolution images attract 3x more views.</p>
            </div>

            {/* Primary Upload Zone */}
            <div className={cn(
                "rounded-xl p-1 transition-all duration-300 group",
                isDraggingOver ? "bg-primary/20 scale-[1.01] shadow-2xl shadow-primary/10" : "bg-primary/5 hover:bg-primary/10"
            )}>
                <label
                    className={cn(
                        "rounded-lg p-12 flex flex-col items-center justify-center text-center min-h-[300px] cursor-pointer relative overflow-hidden backdrop-blur-md border transition-all duration-300 w-full",
                        isDraggingOver ? "bg-white/90 border-primary shadow-inner" : "bg-white/70 border-white/60"
                    )}
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%231754CF33' stroke-width='2' stroke-dasharray='8%2c 8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")" }}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
                    onDrop={handleFileDrop}
                >
                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent pointer-events-none"></div>
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <span className="material-icons-outlined text-3xl">cloud_upload</span>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Drag & drop photos here</h3>
                    <p className="text-slate-500 mb-6 max-w-sm">
                        or <span className="text-primary font-medium hover:underline">browse files</span> from your computer.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-400 font-medium">
                        <span className="bg-white/50 px-2 py-1 rounded border border-slate-200">JPG</span>
                        <span className="bg-white/50 px-2 py-1 rounded border border-slate-200">PNG</span>
                        <span className="bg-white/50 px-2 py-1 rounded border border-slate-200">WEBP</span>
                        <span className="bg-white/50 px-2 py-1 rounded border border-slate-200">Max 20MB</span>
                    </div>
                </label>
            </div>

            {/* Image Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight">
                        <span className="material-icons-outlined text-primary">collections</span>
                        Uploaded Photos <span className="text-slate-400 font-medium text-sm ml-2">({images.length}/20)</span>
                    </h2>
                    {images.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1"
                        >
                            <span className="material-icons-outlined text-base">delete_sweep</span> Remove All
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((img, i) => (
                        <div
                            key={i}
                            draggable
                            onDragStart={() => handleDragStart(i)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(i)}
                            className={cn(
                                "relative group aspect-square rounded-lg overflow-hidden shadow-sm cursor-grab active:cursor-grabbing transition-all duration-300",
                                i === 0 ? "ring-2 ring-primary ring-offset-2" : "hover:shadow-lg",
                                draggedIndex === i ? "opacity-50 scale-95" : "opacity-100 scale-100"
                            )}
                        >
                            {i === 0 ? (
                                <div className="absolute top-2 left-2 z-10 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                    COVER PHOTO
                                </div>
                            ) : (
                                <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {i + 1}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onImageRemove(i); }}
                                className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 hover:bg-red-500 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/20 flex items-center justify-center"
                            >
                                <span className="material-icons-outlined text-sm">close</span>
                            </button>

                            <Image src={img.preview || ""} alt="Preview" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-sm text-slate-500 italic font-medium">
                    <span className="material-icons-outlined text-sm align-middle mr-1">info</span>
                    Tip: Drag images to reorder. The first image will be the cover photo.
                </p>
            </div>

            {/* Specialized Uploads Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Floor Plans */}
                <div className="bg-white/70 backdrop-blur-md border border-white/60 p-6 rounded-xl relative overflow-hidden group shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <span className="material-icons-outlined">layers</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Floor Plans</h3>
                                <p className="text-xs text-slate-500">PDF or Image formats</p>
                            </div>
                        </div>
                    </div>
                    <label
                        className={cn(
                            "border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300",
                            isDraggingFloorPlan ? "border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingFloorPlan(true); }}
                        onDragEnter={(e) => { e.preventDefault(); setIsDraggingFloorPlan(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDraggingFloorPlan(false); }}
                        onDrop={handleFloorPlanDrop}
                    >
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFloorPlan(e.target.files?.[0] || null)} className="hidden" />
                        <span className="material-icons-outlined text-slate-400 text-2xl mb-1">note_add</span>
                        <span className="text-sm font-medium text-primary">{floorPlan ? floorPlan.name : "Upload Plan"}</span>
                    </label>
                </div>

                {/* 3D Tour */}
                <div className="bg-white/70 backdrop-blur-md border border-white/60 p-6 rounded-xl relative overflow-hidden group shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <span className="material-icons-outlined">view_in_ar</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">3D Virtual Tour</h3>
                                <p className="text-xs text-slate-500">Matterport, Vimeo, etc.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-icons text-slate-400 text-sm">link</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Paste embed link here..."
                                value={virtualTourUrl}
                                onChange={(e) => setVirtualTourUrl(e.target.value)}
                                className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white/50 text-sm focus:ring-primary focus:border-primary placeholder-slate-400"
                            />
                        </div>
                        <button type="button" className="w-full py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">
                            Verify Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
