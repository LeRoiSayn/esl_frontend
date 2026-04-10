/**
 * datetimeLocal.js
 *
 * All time-related utilities for the ESL frontend.
 *
 * Core principle
 * ──────────────
 * The institution's timezone is the ONLY reference.  Browser/OS timezone is
 * never used for business logic.  The institution timezone is loaded from the
 * system settings (set by the Registrar) and stored in this module via
 * setAppTimezone().
 *
 * Storage format
 * ──────────────
 * Datetimes are stored in the database as naive ISO strings with NO timezone
 * suffix, e.g. "2024-01-01T18:00:00".  They represent wall-clock time in the
 * institution's timezone.  The backend enforces the same rule via
 * AppServiceProvider.
 */

// ─── Institution timezone ─────────────────────────────────────────────────────

let _tz = localStorage.getItem('app_timezone') || null;

/** Called once at app startup with the value from /api/system-settings/public */
export function setAppTimezone(tz) {
  _tz = tz || null;
  if (tz) localStorage.setItem('app_timezone', tz);
}

export function getAppTimezone() {
  return _tz;
}

// ─── Core conversion: naive string → UTC milliseconds ────────────────────────

/**
 * Convert a naive datetime string ("YYYY-MM-DDTHH:MM[:SS]") to an absolute
 * UTC timestamp in milliseconds, by interpreting it as wall-clock time in
 * the institution's timezone.
 *
 * This is browser-timezone-independent: Date.now() returns UTC ms, and this
 * function returns UTC ms, so comparisons like:
 *
 *   Date.now() > naiveToMs(quiz.available_from)
 *
 * work correctly regardless of the user's operating system timezone.
 *
 * Falls back to browser-local interpretation if no institution timezone is set.
 */
export function naiveToMs(naiveStr, tz = _tz) {
  if (!naiveStr) return null;
  const s = String(naiveStr).trim();

  if (!tz) {
    // No institution tz configured: treat as browser-local (legacy behaviour)
    const [dp, tp] = s.split('T');
    const [y, mo, dy] = dp.split('-').map(Number);
    const [h = 0, mi = 0, sec = 0] = (tp || '00:00:00').split(':').map(Number);
    return new Date(y, mo - 1, dy, h, mi, sec).getTime();
  }

  try {
    // Step 1 — Anchor: pretend the naive string is UTC to get a Date object.
    const anchor = new Date(s + 'Z');

    // Step 2 — Ask Intl what the institution clock shows at this anchor UTC moment.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(anchor);

    const p = {};
    parts.forEach(({ type, value }) => { p[type] = value; });
    // Handle the rare "24:00" edge case some browsers emit
    const hour = p.hour === '24' ? '00' : p.hour;

    // Step 3 — Parse that local reading back as UTC to get its ms value.
    const localMs = new Date(
      `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}Z`
    ).getTime();

    // Step 4 — The offset: how many ms does the institution lead/lag UTC?
    //   e.g. UTC+1: anchor (UTC) - localMs (tz) = -3600000
    const offsetMs = anchor.getTime() - localMs;

    // Step 5 — The naive string means wall-clock in tz, so shift anchor by offset.
    //   "18:00 UTC+1" = 17:00 UTC = anchor(18:00 UTC) + (-1h) = 17:00 UTC ✓
    return anchor.getTime() + offsetMs;
  } catch (_) {
    // Intl not supported or invalid tz — treat as browser-local
    const [dp, tp] = s.split('T');
    const [y, mo, dy] = dp.split('-').map(Number);
    const [h = 0, mi = 0, sec = 0] = (tp || '00:00:00').split(':').map(Number);
    return new Date(y, mo - 1, dy, h, mi, sec).getTime();
  }
}

/**
 * Return the CURRENT time as a naive "YYYY-MM-DDTHH:MM" string in the
 * institution's timezone.  Useful as the `min` value on datetime-local inputs
 * so teachers cannot schedule sessions in the past (institution-time).
 */
export function institutionNowForInput(tz = _tz) {
  const now = new Date();
  const locale = 'en-CA';
  const options = {
    timeZone: tz || undefined,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  };
  try {
    const parts = new Intl.DateTimeFormat(locale, options).formatToParts(now);
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = value; });
    const hour = p.hour === '24' ? '00' : p.hour;
    return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
  } catch (_) {
    // Fallback: browser local
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
}

// ─── Input helpers ────────────────────────────────────────────────────────────

/**
 * Convert a stored naive datetime string (or Date) to the value expected by
 * <input type="datetime-local">, keeping wall-clock time as-is.
 * The input will show whatever the teacher/user originally entered.
 */
export function toDatetimeLocalValue(dateLike) {
  if (!dateLike) return '';
  let ms;
  if (typeof dateLike === 'string') {
    const naive = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateLike);
    if (naive) return dateLike.slice(0, 16); // already a naive string
    ms = new Date(dateLike).getTime();
  } else if (dateLike instanceof Date) {
    ms = dateLike.getTime();
  } else {
    return '';
  }
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  const tz = _tz;
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(d);
      const p = {};
      parts.forEach(({ type, value }) => { p[type] = value; });
      const hour = p.hour === '24' ? '00' : p.hour;
      return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
    } catch (_) {}
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert a datetime-local input value to a naive ISO string for the API.
 * No UTC conversion — the server receives wall-clock time and interprets it
 * in the institution timezone via AppServiceProvider.
 */
export function datetimeLocalToIsoUtc(val) {
  if (!val || !String(val).trim()) return null;
  const s = String(val).trim();
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) return s;
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s + ':00';
  return s;
}

// ─── Display formatting ───────────────────────────────────────────────────────

/**
 * Format a stored naive datetime string for display in the institution timezone.
 * Completely independent of the browser/OS timezone.
 *
 * @param {string|null} val     — stored naive datetime string
 * @param {'24h'|'12h'} fmt     — desired clock format
 * @param {string}      locale  — BCP-47 locale (default 'fr-FR')
 */
export function formatDisplayTime(val, fmt = '24h', locale = 'fr-FR') {
  if (!val) return '—';
  const ms = naiveToMs(String(val).trim());
  if (ms === null || Number.isNaN(ms)) return String(val);
  const tz = _tz;
  const opts = {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: fmt === '12h',
    ...(tz ? { timeZone: tz } : {}),
  };
  return new Date(ms).toLocaleString(locale, opts);
}
