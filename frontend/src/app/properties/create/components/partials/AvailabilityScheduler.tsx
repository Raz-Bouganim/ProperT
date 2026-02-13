import { useFormContext } from "react-hook-form";
import { ListingFormValues } from "../../hooks/useListingForm";
import { useAvailability } from "../../hooks/useAvailability";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AvailabilityScheduler() {
    const { getValues, setValue, watch } = useFormContext<ListingFormValues>();
    const {
        selectedDate,
        setSelectedDate,
        startTime,
        setStartTime,
        endTime,
        setEndTime,
        isRecurring,
        setIsRecurring,
        addAvailabilitySlot,
        removeSlot
    } = useAvailability(getValues, setValue);

    const availabilities = watch("availabilities") || [];

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* Calendar & Input Area */}
            <div className="flex-1 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="bg-white p-4 rounded-lg shadow-sm"
                        disabled={{ before: new Date() }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</Label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full h-10 rounded-lg border-slate-200 bg-white font-bold text-slate-900 focus:border-primary focus:ring-primary/10"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</Label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full h-10 rounded-lg border-slate-200 bg-white font-bold text-slate-900 focus:border-primary focus:ring-primary/10"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <input
                        type="checkbox"
                        id="repeat-weekly"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-5 h-5 rounded text-primary focus:ring-primary/20 border-slate-300"
                    />
                    <label htmlFor="repeat-weekly" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                        Repeat every {selectedDate ? format(selectedDate, "EEEE") : "week"}
                    </label>
                </div>

                <Button
                    type="button"
                    onClick={addAvailabilitySlot}
                    disabled={!selectedDate || !startTime || !endTime}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Add Availability
                </Button>
            </div>

            {/* Added Slots List */}
            <div className="flex-1 border-l border-slate-100 pl-4 md:pl-8 space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Added Slots</h3>

                {availabilities.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <span className="material-icons-outlined text-4xl mb-2 opacity-50">event_busy</span>
                        <p className="text-sm">No availability slots added yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {availabilities.map((slot, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-primary/30 transition-all group">
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        slot.dayOfWeek !== undefined ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                                    )}>
                                        <span className="material-icons-outlined text-lg">
                                            {slot.dayOfWeek !== undefined ? "update" : "event"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">
                                            {slot.dayOfWeek !== undefined
                                                ? `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek]}`
                                                : slot.date ? format(new Date(slot.date), "MMM d, yyyy") : "Specific Date"
                                            }
                                        </p>
                                        <p className="text-xs font-medium text-slate-500">
                                            {slot.startTime} - {slot.endTime}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeSlot(index)}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
