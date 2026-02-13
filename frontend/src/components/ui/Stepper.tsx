import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react";

interface StepperProps {
    steps: { label: string; description?: string }[];
    currentStep: number;
    className?: string;
    onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, className, onStepClick }: StepperProps) {
    return (
        <div className={cn("flex items-center gap-8 md:gap-12", className)}>
            {steps.map((step, index) => {
                const stepNum = index + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;

                return (
                    <div
                        key={step.label}
                        className={cn(
                            "flex items-center gap-2 group cursor-pointer select-none",
                            stepNum > currentStep ? "pointer-events-none" : ""
                        )}
                        onClick={() => onStepClick && stepNum <= currentStep && onStepClick(stepNum)}
                    >
                        <div
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 font-bold text-sm",
                                isActive ? "bg-primary border-primary text-white" :
                                    isCompleted ? "bg-primary/10 border-primary text-primary" : "border-slate-200 text-slate-300 bg-white"
                            )}
                        >
                            {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                        </div>
                        <span className={cn(
                            "hidden md:block text-sm font-bold uppercase tracking-wider transition-colors duration-300",
                            isActive ? "text-slate-900" : isCompleted ? "text-slate-900" : "text-slate-300"
                        )}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    )
}
