"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "sonner";

export function GlobalToaster() {
    const pathname = usePathname();
    // The post page has a sticky footer, so we need more offset to avoid overlap
    const isPostPropertyPage = pathname?.startsWith("/properties/create");

    return (
        <Toaster
            position="bottom-right"
            // Keep the horizontal alignment (offset) consistent at 24px
            offset={24}
            richColors
            closeButton
            // Specifically on the post property page, we lift the individual toasts 
            // vertically using transform. This doesn't affect the right-aligned distance.
            toastOptions={{
                style: isPostPropertyPage ? { transform: 'translateY(-60px)' } : undefined
            }}
        />
    );
}
