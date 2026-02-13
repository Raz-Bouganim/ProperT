import { Heading, Text } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { LucideIcon } from "lucide-react";

interface PropertyTypeCardProps {
    id: string;
    label: string;
    icon: LucideIcon;
    selected: boolean;
    onClick: () => void;
}

export function PropertyTypeCard({ id, label, icon: Icon, selected, onClick }: PropertyTypeCardProps) {
    return (
        <Card
            selected={selected}
            onClick={onClick}
            className="flex flex-col items-center justify-center p-6 h-36 text-center transition-all bg-white"
        >
            <Icon className={`w-8 h-8 mb-4 transition-opacity ${selected ? "opacity-100 text-primary" : "opacity-50 text-slate-400"}`} />
            <span className={`font-black text-[13px] font-display uppercase tracking-widest leading-none ${selected ? "text-primary" : "text-slate-400"}`}>
                {label}
            </span>
        </Card>
    );
}
