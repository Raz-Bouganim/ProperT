interface StepContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function StepContainer({ title, description, children }: StepContainerProps) {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display drop-shadow-sm">
          {title}
        </h1>
        <p className="text-slate-500 text-lg font-medium">{description}</p>
      </div>
      {children}
    </div>
  );
}
