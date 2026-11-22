export type FormatOptions = {
  /** IANA time zone; defaults to the runtime's local zone. */
  timeZone?: string;
  /** BCP 47 locale; defaults to the runtime's locale. */
  locale?: string;
};

/** Formats a UTC [start, end) range for display, showing the date once when both ends fall on the same local day. */
export function formatShiftRange(start: string, end: string, options: FormatOptions = {}): string {
  const { timeZone, locale } = options;
  const dateFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });

  const startDate = new Date(start);
  const endDate = new Date(end);
  const startDay = dateFormat.format(startDate);
  const endDay = dateFormat.format(endDate);
  const startTime = timeFormat.format(startDate);
  const endTime = timeFormat.format(endDate);

  return startDay === endDay
    ? `${startDay}, ${startTime} – ${endTime}`
    : `${startDay}, ${startTime} – ${endDay}, ${endTime}`;
}
