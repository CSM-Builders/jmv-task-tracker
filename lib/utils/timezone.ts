function partsFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function dateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = partsFor(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dateOnlyToZonedEndOfDay(value: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid date.");
  const [year, month, day] = value.split("-").map(Number);
  let result = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = partsFor(result, timeZone);
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const wanted = Date.UTC(year, month - 1, day, 23, 59, 59);
    result = new Date(result.getTime() + wanted - represented);
  }
  if (dateKeyInTimeZone(result, timeZone) !== value)
    throw new Error("The date does not exist in the selected timezone.");
  return result.toISOString();
}

export function formatDateInTimeZone(
  value: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(new Date(value));
}
