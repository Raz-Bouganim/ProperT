'use client';

import { useState, useEffect } from 'react';
import { X, Download, FileText, Play } from 'lucide-react';
import { cn } from '@/lib/utils';


function Lightbox({
    children,
    mediaUrl,
    onClose,
}: {
    children: React.ReactNode;
    mediaUrl: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div className="relative" onClick={(e) => e.stopPropagation()}>
                <div className="absolute -top-10 right-0 flex gap-2">
                    <a
                        href={mediaUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
                    >
                        <Download size={16} />
                    </a>
                    <button
                        type="button"
                        title="Close"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function MessageAttachment({
    mediaUrl,
    mediaType,
    variant,
}: {
    mediaUrl: string;
    mediaType: string;
    variant: 'self' | 'other';
}) {
    const [open, setOpen] = useState(false);

    if (mediaType === 'IMAGE') {
        return (
            <>
                <button
                    type="button"
                    className="mt-1 block cursor-pointer overflow-hidden rounded-lg"
                    onClick={() => setOpen(true)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={mediaUrl}
                        alt=""
                        className="max-h-48 w-full object-contain transition-opacity hover:opacity-90"
                    />
                </button>
                {open && (
                    <Lightbox mediaUrl={mediaUrl} onClose={() => setOpen(false)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={mediaUrl}
                            alt=""
                            className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
                        />
                    </Lightbox>
                )}
            </>
        );
    }

    if (mediaType === 'VIDEO') {
        return (
            <>
                <button
                    type="button"
                    className="relative mt-1 block cursor-pointer overflow-hidden rounded-lg"
                    onClick={() => setOpen(true)}
                >
                    <video
                        src={mediaUrl}
                        preload="metadata"
                        className="max-h-48 w-full rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white">
                            <Play size={20} fill="white" />
                        </div>
                    </div>
                </button>
                {open && (
                    <Lightbox mediaUrl={mediaUrl} onClose={() => setOpen(false)}>
                        <video
                            src={mediaUrl}
                            controls
                            autoPlay
                            className="max-h-[85vh] max-w-[85vw] rounded-lg"
                        />
                    </Lightbox>
                )}
            </>
        );
    }

    return (
        <a
            href={mediaUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                'mt-1 flex items-center gap-1.5 truncate text-xs underline',
                variant === 'self' ? 'text-primary-foreground/90' : 'text-primary',
            )}
        >
            <FileText size={12} className="shrink-0" />
            File attachment
            <Download size={12} className="ml-auto shrink-0" />
        </a>
    );
}
