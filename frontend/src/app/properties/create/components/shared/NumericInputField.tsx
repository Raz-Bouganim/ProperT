import { useFormContext } from "react-hook-form";
import { Input, Label } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface NumericInputFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  min?: number;
  step?: number;
  suffix?: string;
}

export function NumericInputField({
  label,
  name,
  placeholder = "0",
  min = 0,
  step = 1,
  suffix
}: NumericInputFieldProps) {
  const { register, formState: { errors } } = useFormContext();

  const error = errors[name]?.message as string | undefined;

  return (
    <div className="relative group p-1">
      <Label className="text-slate-500 font-semibold normal-case tracking-normal text-sm mb-2 block">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          placeholder={placeholder}
          {...register(name, { valueAsNumber: true })}
          onWheel={(e) => e.currentTarget.blur()}
          min={min}
          step={step}
          onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
          className={cn(
            "block w-full px-4 py-4 rounded-xl border-slate-200 bg-white text-slate-900 text-xl font-medium focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/30 h-16",
            error ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200 focus:border-primary"
          )}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 font-medium text-sm">
            {suffix}
          </div>
        )}
        {error && (
          <p className="text-red-500 text-xs font-semibold mt-1 pl-1">{error}</p>
        )}
      </div>
    </div>
  );
}
