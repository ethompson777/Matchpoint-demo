/** Shared formatting and DOM helpers. No network, no storage. */

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function uid(prefix) {
  const rand = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand.slice(0, 8)}`;
}

export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDate(iso) {
  if (!iso) return "";
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateRange(start, end) {
  if (!start) return "";
  const s = parseISODate(start);
  const md = { month: "short", day: "numeric" };
  const mdy = { month: "short", day: "numeric", year: "numeric" };
  if (!end || end === start) return s.toLocaleDateString("en-US", mdy);
  const e = parseISODate(end);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString("en-US", md)}–${e.getDate()}, ${s.getFullYear()}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString("en-US", md)} – ${e.toLocaleDateString("en-US", mdy)}`;
  }
  return `${s.toLocaleDateString("en-US", mdy)} – ${e.toLocaleDateString("en-US", mdy)}`;
}

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(value) {
  return moneyFmt.format(Number(value) || 0);
}

export function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() || "").join("");
  return letters || "MP";
}

export function isPast(match, today = todayISO()) {
  if (!match) return false;
  if (match.registrationStatus === "completed") return true;
  const end = match.endDate || match.startDate;
  return Boolean(end && end < today);
}

export function addDays(iso, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
  const count = Number(days);
  if (!Number.isInteger(count)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + count));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days, 1–365, or null when the series does not auto-open. */
export function normalizeLeadDays(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 365) return null;
  return number;
}

/** First day registration is open for this occurrence. Director series only. */
export function registrationOpensDate(match) {
  if (!match || match.origin !== "director") return null;
  const lead = normalizeLeadDays(match.registrationLeadDays);
  if (!lead) return null;
  return addDays(match.startDate, -lead) || null;
}

export function registrationNotYetOpen(match, today = todayISO()) {
  const opens = registrationOpensDate(match);
  return Boolean(opens && today < opens);
}

/**
 * Status a shooter sees for this date.
 * With automatic open turned on, a closed series stays closed until the lead
 * window, then that date opens. Closed without that setting stays closed.
 */
export function effectiveRegistrationStatus(match, today = todayISO()) {
  if (!match) return "";
  const scheduled = match.origin === "director" && normalizeLeadDays(match.registrationLeadDays);
  if (scheduled) {
    if (registrationNotYetOpen(match, today)) return "closed";
    if (match.registrationStatus === "closed") return "open";
  }
  return match.registrationStatus || "";
}

/** Segment names are the rows on Learning and Suggested equipment. */
export function cleanSegmentName(value) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) throw new Error("Segment name needs 2 to 40 characters.");
  return name;
}

export function composeSegments(seeds, { added = [], removed = [] } = {}) {
  const hidden = new Set(removed.map((name) => String(name).trim().toLowerCase()));
  const seen = new Set();
  const names = [];
  for (const value of [...seeds, ...added]) {
    const name = String(value ?? "").trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (!name || hidden.has(key) || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/** A board post stays up for this many days, then it leaves the board. */
export const LISTING_DAYS = 90;

export function listingExpired(createdAt, today = todayISO(), days = LISTING_DAYS) {
  const created = String(createdAt || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(created)) return false;
  const last = addDays(created, days);
  return Boolean(last && today > last);
}

export function safeImageSrc(src) {
  if (typeof src !== "string") return "";
  return /^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(src) ? src : "";
}

/** The placeholder stage match creation used before a director posted a real course. */
export function isCourseBrief(stages) {
  return Array.isArray(stages)
    && stages.length === 1
    && stages[0]?.name === "Course brief"
    && stages[0]?.distance === "See the match book";
}

export function safeRemoteSrc(src) {
  if (typeof src !== "string" || !src) return "";
  try {
    const url = new URL(src);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    return "";
  }
  return "";
}

export function announce(message) {
  const el = document.getElementById("live");
  if (!el) return;
  el.textContent = "";
  window.setTimeout(() => {
    el.textContent = message;
  }, 30);
}

export const STATUS_LABEL = {
  open: "Open",
  waitlist: "Waitlist",
  full: "Full",
  closed: "Closed",
  completed: "Completed",
  registered: "Registered",
  cancelled: "Cancelled",
};

export const FEE_NOTE = "The host club collects the match fee. MatchPoint records your registration on this device and does not take payment.";

export function specList(pairs) {
  return `<dl class="spec-list">${pairs
    .filter(([, value]) => value != null && value !== "")
    .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
    .join("")}</dl>`;
}

export function dash(value) {
  if (value == null || value === "") return "—";
  return esc(value);
}

export function option(value, label, current) {
  const selected = value === current ? " selected" : "";
  return `<option value="${esc(value)}"${selected}>${esc(label)}</option>`;
}

export function locationLine(location) {
  if (!location) return "";
  if (location.address) return `${location.venue}, ${location.address}`;
  const place = [location.city, location.region].filter(Boolean).join(", ");
  return place ? `${location.venue}, ${place}` : String(location.venue || "");
}

export function mapsUrl(location) {
  const query = locationLine(location);
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function locationHtml(location) {
  if (!location) return "";
  const url = mapsUrl(location);
  const place = location.address
    ? String(location.address)
    : [location.city, location.region].filter(Boolean).join(", ");
  const venue = esc(location.venue || "");
  if (!url || !place) return venue;
  const link = `<a class="place-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(place)}<span class="visually-hidden"> (opens in Google Maps)</span></a>`;
  return venue ? `${venue}, ${link}` : link;
}
