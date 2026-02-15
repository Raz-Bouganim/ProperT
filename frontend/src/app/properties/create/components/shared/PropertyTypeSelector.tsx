import { useFormContext } from "react-hook-form";
import { LucideIcon } from "lucide-react";

interface PropertyTypeSelectorProps {
  name: string;
  options: readonly {
    id: string;
    label: string;
    icon?: LucideIcon;
    description?: string;
  }[];
  columns?: 2 | 3 | 4;
}

export function PropertyTypeSelector({
  name,
  options,
  columns = 3
}: PropertyTypeSelectorProps) {
  const { register } = useFormContext();

  const gridClass = columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {options.map((option) => (
        <label key={option.id} className="cursor-pointer group relative">
          <input
            type="radio"
            value={option.id}
            {...register(name)}
            className="sr-only peer"
          />
          {option.description ? (
            // Transaction type style (with description)
            <div className="p-6 rounded-2xl border-2 border-slate-100 bg-white peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary peer-checked:shadow-xl peer-checked:shadow-primary/10 hover:border-primary/30 flex flex-col items-center justify-center text-center h-32">
              <span className="block text-xl font-black font-display tracking-tight mb-1">
                {option.label}
              </span>
              <span className="text-xs font-bold text-slate-400 group-peer-checked:text-primary/70 uppercase tracking-widest">
                {option.description}
              </span>
            </div>
          ) : (
            // Property type style (with icon)
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-100 bg-white text-slate-400 peer-checked:border-primary peer-checked:text-primary peer-checked:bg-primary/5 peer-checked:shadow-xl peer-checked:shadow-primary/10 hover:border-primary/30 h-36 text-center">
              {option.icon && (
                <option.icon className="w-8 h-8 mb-4 opacity-50 group-peer-checked:opacity-100 transition-opacity" />
              )}
              <span className="font-black text-[13px] font-display uppercase tracking-widest leading-none">
                {option.label}
              </span>
            </div>
          )}
        </label>
      ))}
    </div>
  );
}
