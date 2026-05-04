import { permanentRedirect } from "next/navigation";
import PropertyDetailClient from "./PropertyDetailClient";

/** UUID shape used by Prisma `id` (slug URLs do not match this pattern). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PropertyPage(props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const { id } = params;

    if (UUID_RE.test(id)) {
        const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
        try {
            const res = await fetch(`${base}/properties/${encodeURIComponent(id)}`, {
                cache: "no-store",
                headers: { Accept: "application/json" },
            });
            if (res.ok) {
                const p = await res.json();
                if (p?.slug && typeof p.slug === "string" && p.slug !== id) {
                    const q = new URLSearchParams();
                    for (const [k, v] of Object.entries(searchParams)) {
                        if (v === undefined) continue;
                        if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
                        else q.set(k, v);
                    }
                    const qs = q.toString();
                    permanentRedirect(qs ? `/properties/${p.slug}?${qs}` : `/properties/${p.slug}`);
                }
            }
        } catch {
            /* Client may still load the listing if the server fetch fails. */
        }
    }

    return <PropertyDetailClient params={props.params} />;
}
