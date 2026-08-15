export const DEFAULT_APPOINTMENT_TIMEZONE = 'Africa/Lusaka';

interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function zonedParts(date: Date, timeZone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function sameParts(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute;
}

/** Converts a timezone-free datetime-local value into its UTC instant. */
export function localDateTimeToUtc(value: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Enter a valid appointment date and time.');

  const desired: LocalDateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const wallClockAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  );
  const validated = new Date(wallClockAsUtc);
  if (
    validated.getUTCFullYear() !== desired.year ||
    validated.getUTCMonth() + 1 !== desired.month ||
    validated.getUTCDate() !== desired.day ||
    validated.getUTCHours() !== desired.hour ||
    validated.getUTCMinutes() !== desired.minute
  ) {
    throw new Error('Enter a valid appointment date and time.');
  }

  // Iterating the represented wall clock handles non-integer offsets and DST.
  let candidate = wallClockAsUtc;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const represented = zonedParts(new Date(candidate), timeZone);
    const representedAsUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
    );
    const next = candidate + (wallClockAsUtc - representedAsUtc);
    if (next === candidate) break;
    candidate = next;
  }

  const result = new Date(candidate);
  if (!sameParts(zonedParts(result, timeZone), desired)) {
    throw new Error(`That local time does not exist in ${timeZone}. Choose another time.`);
  }
  return result;
}
