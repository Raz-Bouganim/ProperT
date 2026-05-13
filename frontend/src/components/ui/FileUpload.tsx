import * as React from "react"
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import Image from "next/image";

interface FileUploadProps {
    onFilesSelected: (files: File[]) => void;
    accept?: Record<string, string[]>;
    maxFiles?: number;
    title?: string;
    description?: string;
    className?: string;
    existingFiles?: (File & { preview?: string })[];
    onRemove?: (index: number) => void;
}

export function FileUpload({
    onFilesSelected,
    accept = { 'image/*': [] },
    maxFiles = 10,
    title = "Click to upload or drag and drop",
    description = "SVG, PNG, JPG or GIF (max. 800x400px)",
    className,
    existingFiles = [],
    onRemove
}: FileUploadProps) {
    const onDrop = React.useCallback((acceptedFiles: File[]) => {
        onFilesSelected(acceptedFiles);
    }, [onFilesSelected]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxFiles,
    });

    return (
        <div className={cn("space-y-4", className)}>
            <div
                {...getRootProps()}
                className={cn(
                    "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer bg-slate-50 transition-colors hover:bg-slate-100",
                    isDragActive ? "border-primary bg-primary/5" : "border-slate-300",
                )}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className={cn(
                        "p-4 rounded-full mb-4 transition-colors",
                        isDragActive ? "bg-primary/20 text-primary" : "bg-white text-slate-400 shadow-sm"
                    )}>
                        <Upload className="w-8 h-8" />
                    </div>
                    <p className="mb-2 text-sm text-slate-500 font-semibold">
                        <span className="font-bold text-slate-900">{title}</span>
                    </p>
                    <p className="text-xs text-slate-400">{description}</p>
                </div>
            </div>

            {/* Preview Grid */}
            {existingFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                    {existingFiles.map((file, index) => (
                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                            <Image
                                src={file.preview || URL.createObjectURL(file)}
                                alt={`Preview ${index}`}
                                fill
                                className="object-cover"
                                onLoad={() => {
                                    if (!file.preview) URL.revokeObjectURL(URL.createObjectURL(file));
                                }}
                            />
                            {onRemove && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(index)}
                                    className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 shadow-sm"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
