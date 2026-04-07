/**
 * Format an ISO date or Date for <input type="datetime-local"> using the browser's
 * local timezone (avoids UTC drift from toISOString().slice(0, 16)).
 */
export function toDatetimeLocalValue(dateLike) {
  if (!dateLike) return "";
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse datetime-local string to UTC ISO for API. */
export function datetimeLocalToIsoUtc(val) {
  if (!val || !String(val).trim()) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
