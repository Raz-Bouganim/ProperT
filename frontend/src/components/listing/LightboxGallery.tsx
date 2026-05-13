'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Heart, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type LightboxGalleryProps = {
  images: string[];
  address?: string;
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
};

export function LightboxGallery({ images, address, isOpen, initialIndex = 0, onClose }: LightboxGalleryProps) {
  const safeImages = useMemo(() => (images?.length ? images : ['/placeholder-property.svg']), [images]);
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), safeImages.length - 1));
  const touchStartX = useRef<number | null>(null);
  const filmstripRef = useRef<HTMLDivElement | null>(null);
  const [imgVisible, setImgVisible] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => {
      setIndex(Math.min(Math.max(initialIndex, 0), safeImages.length - 1));
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, initialIndex, safeImages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % safeImages.length);
  }, [safeImages.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  }, [safeImages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, next, onClose, prev]);

  useEffect(() => {
    if (!isOpen) return;
    const strip = filmstripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`);
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index, isOpen]);

  const goTo = useCallback(
    (i: number) => {
      const nextIndex = Math.min(Math.max(i, 0), safeImages.length - 1);
      setImgVisible(false);
      setIndex(nextIndex);
      window.setTimeout(() => setImgVisible(true), 30);
    },
    [safeImages.length]
  );

  if (!isOpen) return null;

  const shareCurrent = async () => {
    const url = safeImages[index] ?? safeImages[0];
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        const nav = navigator as Navigator & { share?: (data: { url?: string }) => Promise<void> };
        await nav.share?.({ url });
        return;
      }
      if (typeof navigator !== 'undefined') {
        const nav = navigator as Navigator & { clipboard?: { writeText?: (text: string) => Promise<void> } };
        if (nav.clipboard?.writeText) await nav.clipboard.writeText(url);
      }
    } catch {
      // noop
    }
  };

  return (
    <div
      className="fixed inset-0 z-[3000] bg-black/90"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 flex flex-col"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Header bar */}
        <div className="relative flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <div className="grid grid-cols-2 gap-1">
                <span className="h-2 w-2 rounded-sm bg-white" />
                <span className="h-2 w-2 rounded-sm bg-white/70" />
                <span className="h-2 w-2 rounded-sm bg-white/70" />
                <span className="h-2 w-2 rounded-sm bg-white" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black tracking-widest text-white/55 uppercase">Property Gallery</div>
              <div className="text-sm font-bold text-white truncate">{address || ''}</div>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-1.5 text-white border border-white/10 backdrop-blur flex items-center gap-2 text-sm font-semibold">
            <span className="text-primary font-black">{index + 1}</span>
            <span className="text-white/40">/</span>
            <span>{safeImages.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLiked((v) => !v)}
              className={cn('rounded-xl text-white/80 hover:bg-white/10 hover:text-white cursor-pointer')}
              aria-label={liked ? 'Unsave photo' : 'Save photo'}
            >
              <Heart className={cn('w-4 h-4', liked && 'fill-red-500 text-red-500')} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={shareCurrent}
              className={cn('rounded-xl text-white/80 hover:bg-white/10 hover:text-white cursor-pointer')}
              aria-label="Share photo"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <div className="hidden sm:block w-px h-6 bg-white/15 mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={cn('rounded-xl text-white hover:bg-white/10 cursor-pointer')}
              aria-label="Close gallery"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main image area */}
        <div
          className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden"
          onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const startX = touchStartX.current;
            const endX = e.changedTouches[0]?.clientX ?? null;
            touchStartX.current = null;
            if (startX == null || endX == null) return;
            const dx = endX - startX;
            if (Math.abs(dx) < 40) return;
            if (dx < 0) next();
            else prev();
          }}
        >
          <div
            className={cn('relative w-full h-full flex items-center justify-center px-8 sm:px-12')}
          >
            <div
              className={cn('relative max-h-full w-auto rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.6)]')}
              style={{ maxWidth: 'calc(100% - 80px)' }}
            >
              <Image
                key={`${safeImages[index]}-${index}`}
                src={safeImages[index] ?? safeImages[0]}
                alt={`Photo ${index + 1} of ${safeImages.length}`}
                width={2000}
                height={1200}
                className={cn(
                  'max-h-[calc(100vh-220px)] w-auto object-contain',
                  'rounded-2xl',
                  'transition-opacity duration-300 ease-out',
                  imgVisible ? 'opacity-100' : 'opacity-0'
                )}
                priority
              />
            </div>
          </div>

          {safeImages.length > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={prev}
                className={cn(
                  'absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-xl text-white',
                  'bg-white/10 border border-white/15 backdrop-blur hover:bg-white/20 cursor-pointer'
                )}
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={next}
                className={cn(
                  'absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-xl text-white',
                  'bg-white/10 border border-white/15 backdrop-blur hover:bg-white/20 cursor-pointer'
                )}
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {/* Filmstrip */}
        {safeImages.length > 1 && (
          <div className="flex-shrink-0 bg-gradient-to-t from-black/70 to-transparent px-4 sm:px-6 pb-6 pt-3">
            <div
              ref={filmstripRef}
              className="flex gap-2 overflow-x-auto pb-1 no-scrollbar justify-center"
              aria-label="Photo thumbnails"
            >
              {safeImages.map((src, i) => {
                const isActive = i === index;
                return (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    data-thumb-index={i}
                    onClick={() => goTo(i)}
                    className={cn(
                      'relative flex-shrink-0 h-[60px] w-[88px] rounded-xl overflow-hidden border-2 transition-all cursor-pointer',
                      isActive
                        ? 'border-primary opacity-100 scale-[1.04]'
                        : 'border-transparent opacity-60 hover:opacity-90 hover:scale-[1.02]'
                    )}
                    aria-label={`Open photo ${i + 1}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <Image src={src} alt="" fill sizes="88px" className="object-cover" />
                    {isActive && <div className="pointer-events-none absolute inset-0 bg-primary/10" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

