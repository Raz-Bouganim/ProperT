import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FileWithPreview, MediaUploadResult, UploadError } from '../types/media';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { revokeObjectURL } from '../utils/imageCleanup';

export const useMediaUpload = () => {
    const [images, setImages] = useState<FileWithPreview[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Cleanup effect to prevent memory leaks (only on unmount)
    useEffect(() => {
        return () => {
            // Revoke all object URLs when component unmounts
            images.forEach(img => {
                revokeObjectURL(img.preview);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount/unmount, not on images changes

    const processFiles = (files: File[]) => {
        const newImages = files.map(file => {
            const fileWithPreview = file as FileWithPreview;
            fileWithPreview.preview = URL.createObjectURL(file);
            return fileWithPreview;
        });
        setImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (index: number) => {
        setImages(prev => {
            const newImages = [...prev];
            // Revoke URL to avoid memory leaks
            revokeObjectURL(newImages[index].preview);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const reorderImages = (dragIndex: number, hoverIndex: number) => {
        const newImages = [...images];
        const draggedImage = newImages[dragIndex];
        newImages.splice(dragIndex, 1);
        newImages.splice(hoverIndex, 0, draggedImage);
        setImages(newImages);
    };

    const uploadImages = async (): Promise<string[]> => {
        setIsUploading(true);
        const uploadedUrls: string[] = [];
        const errors: UploadError[] = [];

        try {
            for (const img of images) {
                try {
                    const res = await fetch(API_ENDPOINTS.presignedUrl(), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fileName: img.name, contentType: img.type }),
                    });

                    if (!res.ok) {
                        throw new Error("Failed to get presigned URL");
                    }

                    const { url, publicUrl } = await res.json();

                    await fetch(url, {
                        method: "PUT",
                        body: img,
                        headers: { "Content-Type": img.type },
                    });

                    uploadedUrls.push(publicUrl);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Upload failed";
                    errors.push({ file: img.name, message: errorMessage });
                    console.error(`Failed to upload ${img.name}:`, error);
                }
            }

            if (errors.length > 0) {
                toast.error(`Failed to upload ${errors.length} image(s)`);
            }

            return uploadedUrls;
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload images");
            return [];
        } finally {
            setIsUploading(false);
        }
    };

    return {
        images,
        setImages,
        processFiles,
        removeImage,
        reorderImages,
        uploadImages,
        isUploading
    };
};
