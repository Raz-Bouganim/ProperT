import { cn } from '@/lib/utils';

export const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'FILE'] as const;

export function MessageAttachment({
    mediaUrl,
    mediaType,
    variant,
}: {
    mediaUrl: string;
    mediaType: string;
    variant: 'self' | 'other';
}) {
    if (mediaType === 'IMAGE') {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={mediaUrl}
                alt=""
                className="mt-1 max-h-48 w-full rounded-lg object-contain"
            />
        );
    }
    if (mediaType === 'VIDEO') {
        return (
            <video
                src={mediaUrl}
                controls
                className="mt-1 max-h-48 w-full rounded-lg"
            />
        );
    }
    return (
        <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                'mt-1 block truncate text-xs underline',
                variant === 'self' ? 'text-primary-foreground/90' : 'text-primary',
            )}
        >
            File attachment
        </a>
    );
}
