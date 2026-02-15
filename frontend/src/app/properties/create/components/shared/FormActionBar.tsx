import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { FormStepper } from "./FormStepper";

interface FormActionBarProps {
  currentStep: number;
  totalSteps: number;
  isStepValid: boolean;
  isUploading?: boolean;
  steps: readonly { step: number; label: string }[];
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function FormActionBar({
  currentStep,
  totalSteps,
  isStepValid,
  isUploading = false,
  steps,
  onPrev,
  onNext,
  onSubmit
}: FormActionBarProps) {
  const isLastStep = currentStep === totalSteps;

  return (
    <footer className="bg-white border-t border-slate-200 sticky bottom-0 z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">

        {/* Mobile Progress (Text only) */}
        <div className="md:hidden w-full flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={onPrev}
            className={cn(
              "text-slate-500 hover:text-slate-900 font-bold text-xs flex items-center gap-1",
              currentStep === 1 && "invisible"
            )}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs font-bold text-slate-400">
            Step {currentStep} of {totalSteps}
          </span>
        </div>

        {/* Desktop Back Button */}
        <button
          type="button"
          onClick={onPrev}
          className={cn(
            "hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all",
            currentStep === 1
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          )}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-5 h-5" /> Back
        </button>

        {/* Desktop Stepper */}
        <FormStepper currentStep={currentStep} steps={steps} />

        {/* Next / Submit Button */}
        <div className="w-full md:w-auto flex justify-end">
          {!isLastStep ? (
            <Button
              type="button"
              onClick={onNext}
              disabled={!isStepValid}
              className={cn(
                "w-full md:w-auto text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2",
                !isStepValid
                  ? "bg-slate-300 shadow-none cursor-not-allowed opacity-70"
                  : "bg-primary shadow-primary/20 hover:bg-primary/90 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isUploading || !isStepValid}
              className={cn(
                "w-full md:w-auto text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2",
                (isUploading || !isStepValid)
                  ? "bg-slate-300 shadow-none cursor-not-allowed opacity-70"
                  : "bg-green-600 shadow-green-600/20 hover:bg-green-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  Finish & Publish <Check className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
