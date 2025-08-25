import { tzOffset } from "@date-fns/tz";

const TIMEZONE = "America/Los_Angeles";

/**
 * Converts a time string like "10:00 a.m." into a Date object
 * in California local time (America/Los_Angeles).
 *
 * @param timeStr - e.g. "10:00 a.m." or "7:30 pm"
 * @param date - base date (defaults to today)
 */
export function parseTimeToTimestamp(timeStr: string, date: Date = new Date(), timezone: string = TIMEZONE): Date {
  // Normalize format
  const normalized = timeStr
    .replace(/\./g, "")       // remove dots (a.m. → am)
    .replace(/\bam\b/i, "AM") // unify case
    .replace(/\bpm\b/i, "PM");

  // Build full date-time string
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const full_date_str = `${dateStr} ${normalized.trim()}`;
  const datetime = new Date(full_date_str);

  const offset = tzOffset(timezone, date);
  datetime.setMinutes(datetime.getMinutes() - offset);

  // Convert into California local time
  return datetime;
}
