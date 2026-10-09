import { Cron } from "croner";
import { HTTPException } from "hono/http-exception";

export const DEFAULT_SCHEDULE_TIMEZONE = "UTC";

// The scheduler ticks once a minute, so a seconds field could never match.
// "5-part" rejects 6- and 7-part patterns instead of accepting them silently.
export function createScheduleCron(schedule: string, timezone: string | null) {
  return new Cron(schedule, {
    paused: true,
    mode: "5-part",
    timezone: timezone || DEFAULT_SCHEDULE_TIMEZONE,
  });
}

export function resolveTimezone(timezone: string | null | undefined): string {
  const candidate = timezone || DEFAULT_SCHEDULE_TIMEZONE;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_SCHEDULE_TIMEZONE;
  }
}

// undefined: field omitted, leave as is. null: cleared.
export function normalizeSchedule(
  schedule: string | null | undefined,
  timezone: string | null,
): string | null | undefined {
  if (schedule === undefined) return undefined;
  const trimmed = schedule?.trim();
  if (!trimmed) return null;

  try {
    const cron = createScheduleCron(trimmed, timezone);
    // croner treats a string containing ":" as a one-off date, not a pattern.
    if (cron.getPattern() === undefined) {
      throw new TypeError("Only recurring cron patterns are supported");
    }
  } catch (error) {
    throw new HTTPException(400, {
      message: `Invalid cron schedule: ${
        error instanceof Error ? error.message : "could not be parsed"
      }. Use a 5-field cron expression such as "0 9 * * 1-5".`,
    });
  }

  return trimmed;
}

export function normalizeScheduleTimezone(
  timezone: string | null | undefined,
): string | null | undefined {
  if (timezone === undefined) return undefined;
  const trimmed = timezone?.trim();
  if (!trimmed) return null;

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: trimmed });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    throw new HTTPException(400, {
      message: `Invalid timezone "${trimmed}". Use an IANA name such as "Europe/Berlin".`,
    });
  }

  return trimmed;
}
