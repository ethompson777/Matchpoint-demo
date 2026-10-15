/**
 * Repeat rules for matches a director posts.
 *
 * The series stores one rule. Each date on the calendar is generated from
 * that rule. exceptions is keyed by the original date, so cancelling or
 * moving one date leaves the rest of the series alone.
 * Match.courses is keyed by that same original date and holds the stages
 * imported for that date, so a moved date keeps its course of fire.
 *
 * A new series repeats on the start date's weekday in the month, such as
 * every 3rd Saturday. A 5th weekday is stored as the last weekday of the month.
 * Weekly rules already saved still expand.
 */

import { isCourseBrief, parseISODate, todayISO } from "./util.js";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS = ["", "1st", "2nd", "3rd", "4th"];
const MAX_DATES = 24;

function isRealISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return false;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isoFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return isoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function daySpan(start, end) {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  return Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000);
}

function addMonths(iso, months) {
  const [year, month, day] = iso.split("-").map(Number);
  const index = month - 1 + months;
  const nextYear = year + Math.floor(index / 12);
  const nextMonth = index % 12;
  const dim = new Date(nextYear, nextMonth + 1, 0).getDate();
  return isoFromParts(nextYear, nextMonth + 1, Math.min(day, dim));
}

function readRule(rule) {
  if (!rule || typeof rule !== "object") return null;
  const byWeekday = rule.byWeekday;
  if (!Number.isInteger(byWeekday) || byWeekday < 0 || byWeekday > 6) return null;
  let until = null;
  if (rule.until != null && rule.until !== "") {
    if (!isRealISO(rule.until)) return null;
    until = rule.until;
  }
  if (rule.frequency === "weekly" && [1, 2, 4].includes(rule.interval)) {
    return { frequency: "weekly", interval: rule.interval, byWeekday, bySetPos: null, until };
  }
  if (rule.frequency === "monthly" && [1, 2, 3, 4, -1].includes(rule.bySetPos)) {
    return { frequency: "monthly", interval: 1, byWeekday, bySetPos: rule.bySetPos, until };
  }
  return null;
}

export function ordinalWeekday(iso) {
  const date = parseISODate(iso);
  const byWeekday = date.getDay();
  const nth = Math.floor((date.getDate() - 1) / 7) + 1;
  if (nth >= 5) {
    return { byWeekday, bySetPos: -1, label: `Every last ${WEEKDAYS[byWeekday]}` };
  }
  return { byWeekday, bySetPos: nth, label: `Every ${ORDINALS[nth]} ${WEEKDAYS[byWeekday]}` };
}

export function seriesLabel(rule) {
  const readable = readRule(rule);
  if (!readable) return "";
  if (readable.frequency === "monthly") {
    if (readable.bySetPos === -1) return `Every last ${WEEKDAYS[readable.byWeekday]}`;
    return `Every ${ORDINALS[readable.bySetPos]} ${WEEKDAYS[readable.byWeekday]}`;
  }
  if (readable.interval === 1) return "Every week";
  if (readable.interval === 2) return "Every 2 weeks";
  return "Every 4 weeks";
}

export function repeatChoices(startDate, currentRule = null) {
  const monthlyLabel = isRealISO(startDate) ? ordinalWeekday(startDate).label : "Every matching day";
  const choices = [
    { value: "", label: "Does not repeat" },
    { value: "monthly", label: monthlyLabel },
  ];
  const current = choiceFromRule(currentRule);
  if (current.startsWith("weekly:")) {
    choices.push({ value: current, label: seriesLabel(currentRule) });
  }
  return choices;
}

export function choiceFromRule(rule) {
  const readable = readRule(rule);
  if (!readable) return "";
  if (readable.frequency === "monthly") return "monthly";
  return `weekly:${readable.interval}`;
}

export function ruleFromChoice(choice, startDate, until = null) {
  const picked = String(choice ?? "");
  if (!picked) return null;
  if (!isRealISO(startDate)) return null;
  let cleanUntil = null;
  if (until != null && String(until).trim() !== "") {
    if (!isRealISO(until)) return null;
    cleanUntil = until;
  }
  if (picked === "monthly") {
    const pos = ordinalWeekday(startDate);
    return {
      frequency: "monthly",
      interval: 1,
      byWeekday: pos.byWeekday,
      bySetPos: pos.bySetPos,
      until: cleanUntil,
    };
  }
  const weekly = /^weekly:(1|2|4)$/.exec(picked);
  if (!weekly) return null;
  return {
    frequency: "weekly",
    interval: Number(weekly[1]),
    byWeekday: parseISODate(startDate).getDay(),
    bySetPos: null,
    until: cleanUntil,
  };
}

function nthWeekday(year, monthIndex, weekday, setPos) {
  if (setPos === -1) {
    const last = new Date(year, monthIndex + 1, 0);
    const delta = (last.getDay() - weekday + 7) % 7;
    return isoFromParts(year, monthIndex + 1, last.getDate() - delta);
  }
  const first = new Date(year, monthIndex, 1);
  const delta = (weekday - first.getDay() + 7) % 7;
  const day = 1 + delta + (setPos - 1) * 7;
  const date = new Date(year, monthIndex, day);
  if (date.getMonth() !== monthIndex) return null;
  return isoFromParts(year, monthIndex + 1, day);
}

function capWindow(dates, today) {
  if (dates.length <= MAX_DATES) return dates;
  const upcoming = dates.filter((iso) => iso >= today);
  if (upcoming.length >= MAX_DATES) return upcoming.slice(0, MAX_DATES);
  const past = dates.filter((iso) => iso < today);
  return [...past.slice(-(MAX_DATES - upcoming.length)), ...upcoming];
}

export function occurrenceDates(match, today = todayISO()) {
  const rule = readRule(match?.recurrence);
  if (!rule || !isRealISO(match.startDate)) return [match?.startDate].filter(Boolean);
  const anchor = match.startDate > today ? match.startDate : today;
  const defaultHorizon = addMonths(anchor, 12);
  const horizon = rule.until && rule.until < defaultHorizon ? rule.until : defaultHorizon;
  const dates = [];
  if (rule.frequency === "weekly") {
    const step = 7 * rule.interval;
    let cursor = match.startDate;
    for (let i = 0; i < 520 && cursor <= horizon; i += 1) {
      dates.push(cursor);
      cursor = shiftDays(cursor, step);
    }
  } else {
    const start = parseISODate(match.startDate);
    let year = start.getFullYear();
    let month = start.getMonth();
    for (let i = 0; i < 36; i += 1) {
      const iso = nthWeekday(year, month, rule.byWeekday, rule.bySetPos);
      if (iso && iso > horizon) break;
      if (iso && iso >= match.startDate) dates.push(iso);
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
  }
  return capWindow(dates, today);
}

export function courseFor(match, originalDate) {
  if (!match || match.origin !== "director") return Array.isArray(match?.stages) ? match.stages : [];
  const key = originalDate || match.occurrenceDate || match.startDate;
  const stored = match.courses && typeof match.courses === "object" && !Array.isArray(match.courses)
    ? match.courses[key]
    : undefined;
  if (Array.isArray(stored)) return stored;
  if (match.recurrence || match.seriesId) return [];
  if (isCourseBrief(match.stages)) return [];
  return Array.isArray(match.stages) ? match.stages : [];
}

function withCourse(match, originalDate) {
  if (!match || match.origin !== "director") return match;
  const stages = courseFor(match, originalDate);
  return {
    ...match,
    stages,
    schedule: { ...(match.schedule || {}), stageCount: stages.length },
  };
}

export function expandMatch(match, today = todayISO()) {
  if (!match || match.seriesId || match.occurrenceDate) return match ? [match] : [];
  const rule = readRule(match.recurrence);
  if (!rule) return [withCourse(match, match.startDate)];
  const span = Math.max(0, daySpan(match.startDate, match.endDate || match.startDate));
  const exceptions = match.exceptions && typeof match.exceptions === "object" ? match.exceptions : {};
  return occurrenceDates(match, today).map((originalDate) => {
    const exception = exceptions[originalDate] || null;
    const cancelled = exception?.cancelled === true;
    let startDate = originalDate;
    let endDate = shiftDays(originalDate, span);
    let movedFrom = null;
    if (!cancelled && isRealISO(exception?.startDate)) {
      startDate = exception.startDate;
      endDate = isRealISO(exception.endDate) ? exception.endDate : exception.startDate;
      movedFrom = originalDate;
    }
    return withCourse({
      ...match,
      id: `${match.id}~${originalDate}`,
      seriesId: match.id,
      occurrenceDate: originalDate,
      startDate,
      endDate,
      cancelled,
      movedFrom,
      exceptionNote: typeof exception?.note === "string" ? exception.note : "",
      seriesLabel: seriesLabel(rule),
    }, originalDate);
  });
}

export function upcomingOccurrences(match, today = todayISO(), limit = 8) {
  return expandMatch(match, today).filter((item) => {
    const original = item.occurrenceDate || item.startDate;
    if (item.cancelled) return original >= today;
    return (item.endDate || item.startDate) >= today;
  }).slice(0, limit);
}

export function cleanException(raw) {
  if (raw == null) return null;
  const note = String(raw.note ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
  if (raw.cancelled === true) return { cancelled: true, note };
  if (!isRealISO(raw.startDate) || !isRealISO(raw.endDate)) {
    throw new Error("Enter a real start and end date.");
  }
  if (raw.endDate < raw.startDate) throw new Error("End date is before the start date.");
  return { startDate: raw.startDate, endDate: raw.endDate, note };
}
