import { useState } from "react";
import { toast } from "sonner";

export interface FileWithPreview extends File {
    preview?: string;
}

export const useMediaUpload = () => {
    const [images, setImages] = useState<FileWithPreview[]>([]);
    const [isUploading, setIsUploading] = useState(false);

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
            if (newImages[index].preview) {
                URL.revokeObjectURL(newImages[index].preview!);
            }
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

    const uploadImages = async () => {
        setIsUploading(true);
        const uploadedUrls: string[] = [];
        try {
            for (const img of images) {
                const res = await fetch("http://localhost:5000/media/presigned-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: img.name, contentType: img.type }),
                });
                if (!res.ok) throw new Error("Failed to get presigned URL");
                const { url, publicUrl } = await res.json();

                await fetch(url, {
                    method: "PUT",
                    body: img,
                    headers: { "Content-Type": img.type },
                });
                uploadedUrls.push(publicUrl);
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
