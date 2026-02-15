export const isYearValid = (year: number | undefined): boolean => {
  if (!year) return false;
  const currentYear = new Date().getFullYear();
  return year >= 1800 && year <= currentYear;
};

export const isTimeRangeValid = (start: string, end: string): boolean => {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  return endMin > startMin;
};

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

export const hasTimeOverlap = (
  slot1: { startTime: string; endTime: string; dayOfWeek?: number; date?: string },
  slot2: { startTime: string; endTime: string; dayOfWeek?: number; date?: string }
): boolean => {
  // Check if slots are on the same day/date
  if (slot1.dayOfWeek !== undefined && slot2.dayOfWeek !== undefined) {
    if (slot1.dayOfWeek !== slot2.dayOfWeek) return false;
  } else if (slot1.date && slot2.date) {
    if (slot1.date !== slot2.date) return false;
  } else {
    // One is recurring, one is specific - no overlap
    return false;
  }

  // Check time overlap
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  return (start1 < end2 && end1 > start2);
};
