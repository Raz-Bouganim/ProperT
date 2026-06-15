import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { FileWithPreview } from "@/app/properties/create/types/media";
import { revokeObjectURL } from "@/app/properties/create/utils/imageCleanup";

export type EditableImage =
    | { kind: "existing"; url: string; id: string }
    | { kind: "new"; file: FileWithPreview; preview: string };

interface UseEditMediaUploadOptions {
    initialImages?: Array<{ url: string; id: string }>;
}

export function useEditMediaUpload({
    initialImages = [],
}: UseEditMediaUploadOptions = {}) {
    const [images, setImages] = useState<EditableImage[]>(() =>
        initialImages.map((img) => ({
            kind: "existing" as const,
            url: img.url,
            id: img.id,
        }))
    );
    const [isUploading, setIsUploading] = useState(false);

    // Revoke only new-file preview URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach((img) => {
                if (img.kind === "new") revokeObjectURL(img.preview);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_FILE_BYTES = 20 * 1024 * 1024;

    const addFiles = (files: File[]) => {
        const valid = files.filter((file) => {
            if (file.size > MAX_FILE_BYTES) {
                toast.error(`${file.name} exceeds the 20 MB limit`);
                return false;
            }
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                toast.error(`${file.name} is not a supported image type (JPG, PNG, WEBP, GIF)`);
                return false;
            }
            return true;
        });
        const next: EditableImage[] = valid.map((file) => ({
            kind: "new" as const,
            file: file as FileWithPreview,
            preview: URL.createObjectURL(file),
        }));
        setImages((prev) => [...prev, ...next]);
    };

    const removeImage = (index: number) => {
        setImages((prev) => {
            const updated = [...prev];
            const img = updated[index];
            if (img.kind === "new") revokeObjectURL(img.preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const reorderImages = (dragIndex: number, hoverIndex: number) => {
        setImages((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(dragIndex, 1);
            updated.splice(hoverIndex, 0, moved);
            return updated;
        });
    };

    const clearAll = () => {
        setImages((prev) => {
            prev.forEach((img) => {
                if (img.kind === "new") revokeObjectURL(img.preview);
            });
            return [];
        });
    };

    const UPLOAD_CONCURRENCY = 4;

    /**
     * Uploads only new images to S3 via presigned URLs, then returns the
     * final ordered list of public URLs (existing in-place, new replaced).
     * Returns null if any upload fails so the caller can abort the PATCH.
     * Uploads are batched to avoid overwhelming the network.
     */
    const buildFinalUrls = async (): Promise<string[] | null> => {
        setIsUploading(true);
        let anyFailed = false;

        const tasks = images.map((img): (() => Promise<string | null>) => {
            if (img.kind === "existing") return () => Promise.resolve(img.url);
            return async () => {
                try {
                    const {
                        data: { url, publicUrl },
                    } = await api.post<{ url: string; publicUrl: string }>(
                        "/media/presigned-url",
                        { fileName: img.file.name, contentType: img.file.type }
                    );
                    const res = await fetch(url, {
                        method: "PUT",
                        body: img.file,
                        headers: { "Content-Type": img.file.type },
                    });
                    if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
                    return publicUrl;
                } catch (err) {
                    anyFailed = true;
                    toast.error(`Failed to upload ${img.file.name}`);
                    console.error(err);
                    return null;
                }
            };
        });

        const results: (string | null)[] = [];
        for (let i = 0; i < tasks.length; i += UPLOAD_CONCURRENCY) {
            const batch = tasks.slice(i, i + UPLOAD_CONCURRENCY);
            const batchResults = await Promise.all(batch.map((t) => t()));
            results.push(...batchResults);
        }

        setIsUploading(false);

        if (anyFailed) return null;
        return results.filter((r): r is string => r !== null);
    };

    const previewSrc = (img: EditableImage) =>
        img.kind === "existing" ? img.url : img.preview;

    return {
        images,
        setImages,
        addFiles,
        removeImage,
        reorderImages,
        clearAll,
        buildFinalUrls,
        isUploading,
        previewSrc,
    };
}
