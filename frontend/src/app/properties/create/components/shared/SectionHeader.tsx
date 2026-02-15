import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  icon: LucideIcon | string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ icon: Icon, title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 font-display tracking-tight">
          {typeof Icon === 'string' ? (
            <span className="material-icons-outlined text-primary text-xl">{Icon}</span>
          ) : (
            <Icon className="text-primary w-5 h-5" />
          )}
          {title}
        </h2>
        {description && (
          <p className="text-slate-500 text-sm font-medium">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
