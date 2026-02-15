import { useState } from "react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  accept: string;
  onFileChange: (file: File | null) => void;
  currentFile?: File | null;
}

export function UploadZone({
  title,
  description,
  icon,
  iconColor,
  accept,
  onFileChange,
  currentFile
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="bg-white/70 backdrop-blur-md border border-white/60 p-6 rounded-xl relative overflow-hidden group shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", iconColor)}>
            <span className="material-icons-outlined">{icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
      </div>
      <label
        className={cn(
          "border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/5"
            : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
        )}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />
        <span className="material-icons-outlined text-slate-400 text-2xl mb-1">
          note_add
        </span>
        <span className="text-sm font-medium text-primary">
          {currentFile ? currentFile.name : `Upload ${title}`}
        </span>
      </label>
    </div>
  );
}
