import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  step: number;
  label: string;
}

interface FormStepperProps {
  currentStep: number;
  steps: readonly Step[];
}

export function FormStepper({ currentStep, steps }: FormStepperProps) {
  return (
    <div className="hidden md:flex items-center gap-2">
      {steps.map((s) => {
        const isCompleted = currentStep > s.step;
        const isCurrent = currentStep === s.step;

        return (
          <div key={s.step} className="flex items-center">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
              isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : "",
              isCompleted ? "text-primary" : isCurrent ? "text-primary" : "text-slate-300"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors",
                isCompleted ? "bg-primary border-primary text-white" :
                  isCurrent ? "bg-primary text-white border-primary" :
                    "bg-transparent border-slate-300 text-slate-400"
              )}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.step}
              </div>
              <span className={cn(
                "text-sm font-bold",
                isCompleted || isCurrent ? "text-slate-900" : "text-slate-400"
              )}>
                {s.label}
              </span>
            </div>
            {s.step < steps.length && (
              <div className={cn(
                "w-8 h-0.5 mx-2 rounded-full transition-colors",
                currentStep > s.step ? "bg-primary" : "bg-slate-200"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
