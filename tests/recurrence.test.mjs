import assert from "node:assert/strict";
import { disciplines } from "../js/data/index.js";
import { matchDraft } from "../js/roles.js";
import {
  cleanException,
  expandMatch,
  occurrenceDates,
  ordinalWeekday,
  repeatChoices,
  ruleFromChoice,
} from "../js/recurrence.js";
import { parseISODate } from "../js/util.js";
import { filterMatches } from "../js/views/matches.js";

function isoFrom(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fourthSaturday(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const delta = (6 - first.getDay() + 7) % 7;
  return isoFrom(new Date(year, monthIndex, 1 + delta + 21));
}

function nextDay(iso) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + 1);
  return isoFrom(date);
}

assert.equal(ruleFromChoice(undefined, "2026-11-28"), null);
assert.equal(ruleFromChoice("", "2026-11-28"), null);
assert.equal(ruleFromChoice(null, "2026-11-28"), null);
assert.equal(ruleFromChoice("daily", "2026-11-28"), null);

const start = fourthSaturday(2026, 10);
const position = ordinalWeekday(start);
assert.equal(position.byWeekday, 6);
assert.equal(position.bySetPos, 4);
assert.equal(position.label, "Every 4th Saturday");
assert.deepEqual(repeatChoices("2026-10-17").map((choice) => choice.label), [
  "Does not repeat",
  "Every 3rd Saturday",
]);
assert.deepEqual(repeatChoices("").map((choice) => choice.value), ["", "monthly"]);
const keptWeekly = repeatChoices("2026-11-07", {
  frequency: "weekly",
  interval: 2,
  byWeekday: 6,
  bySetPos: null,
  until: null,
});
assert.deepEqual(keptWeekly.map((choice) => choice.label), [
  "Does not repeat",
  "Every 1st Saturday",
  "Every 2 weeks",
]);

const monthly = ruleFromChoice("monthly", start, null);
assert.equal(monthly.frequency, "monthly");
assert.equal(monthly.bySetPos, 4);
const dates = occurrenceDates({
  startDate: start,
  endDate: start,
  recurrence: monthly,
}, "2026-10-12");
assert.ok(dates.length >= 2 && dates.length <= 24);
assert.equal(dates[0], start);
for (const iso of dates) {
  const date = parseISODate(iso);
  assert.equal(date.getDay(), 6, iso);
  assert.equal(Math.floor((date.getDate() - 1) / 7) + 1, 4, iso);
}
assert.equal(parseISODate(dates[1]).getMonth(), (parseISODate(start).getMonth() + 1) % 12);

let fifth = null;
for (let index = 0; index < 24 && !fifth; index += 1) {
  const year = 2026 + Math.floor(index / 12);
  const month = index % 12;
  const saturdays = [];
  for (let day = 1; day <= 31; day += 1) {
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) break;
    if (date.getDay() === 6) saturdays.push(isoFrom(date));
  }
  if (saturdays.length >= 5) fifth = saturdays[4];
}
assert.ok(fifth);
const last = ordinalWeekday(fifth);
assert.equal(last.bySetPos, -1);
assert.equal(last.label, "Every last Saturday");
const lastDates = occurrenceDates({
  startDate: fifth,
  endDate: fifth,
  recurrence: ruleFromChoice("monthly", fifth, null),
}, fifth);
for (const iso of lastDates) {
  const date = parseISODate(iso);
  const following = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
  assert.equal(date.getDay(), 6, iso);
  assert.notEqual(following.getMonth(), date.getMonth(), iso);
}

const weekly = ruleFromChoice("weekly:1", "2026-11-07", null);
const weeklyDates = occurrenceDates({
  startDate: "2026-11-07",
  endDate: "2026-11-07",
  recurrence: weekly,
}, "2026-11-07");
assert.equal(weeklyDates[1], "2026-11-14");
assert.equal(weeklyDates.length, 24);

const untilDates = occurrenceDates({
  startDate: "2026-11-07",
  endDate: "2026-11-08",
  recurrence: ruleFromChoice("weekly:1", "2026-11-07", "2026-11-21"),
}, "2026-11-07");
assert.deepEqual(untilDates, ["2026-11-07", "2026-11-14", "2026-11-21"]);

const end = nextDay(start);
const series = {
  id: "series-1",
  name: "Ranch Saturday",
  startDate: start,
  endDate: end,
  recurrence: monthly,
  exceptions: {
    [dates[1]]: { cancelled: true, note: "Holiday" },
    [dates[2]]: { startDate: "2027-01-02", endDate: "2027-01-03", note: "Moved off the holiday" },
  },
};
const expanded = expandMatch(series, "2026-10-12");
const cancelled = expanded.find((item) => item.occurrenceDate === dates[1]);
assert.equal(cancelled.cancelled, true);
assert.equal(cancelled.id, `series-1~${dates[1]}`);
assert.equal(cancelled.occurrenceDate, dates[1]);
const moved = expanded.find((item) => item.occurrenceDate === dates[2]);
assert.equal(moved.startDate, "2027-01-02");
assert.equal(moved.endDate, "2027-01-03");
assert.equal(moved.movedFrom, dates[2]);
assert.equal(moved.occurrenceDate, dates[2]);
assert.equal(moved.id, `series-1~${dates[2]}`);
assert.equal(moved.cancelled, false);
assert.equal(moved.seriesLabel, "Every 4th Saturday");
assert.equal(daySpanOf(expanded[0]), 1);

const visible = filterMatches(expanded, { q: "", discipline: "all", when: "all" });
assert.equal(visible.some((item) => item.cancelled), false);
assert.ok(visible.some((item) => item.id === moved.id && item.startDate === "2027-01-02"));

assert.throws(
  () => cleanException({ startDate: "2027-01-04", endDate: "2027-01-02", note: "" }),
  /End date is before the start date/,
);
assert.deepEqual(cleanException({ cancelled: true, note: "  Range closed  " }), {
  cancelled: true,
  note: "Range closed",
});

const director = { id: "usr-ada", name: "Ada Quinn" };
const fields = {
  name: "Basin Steel",
  startDate: start,
  endDate: end,
  venue: "High Basin Range",
  address: "100 Range Road, Burns, OR",
  venueId: "ven-basin",
  discipline: "PRS",
  summary: "One-day club PRS with a prone bay and a barricade.",
  description: "Squads shoot a short course. The match book is a placeholder until the director posts it.",
  fee: "40",
  capacity: "28",
  rounds: "48",
  registrationStatus: "open",
  checkIn: "7:00 a.m.",
  firstShot: "",
  repeat: "monthly",
};
const draft = matchDraft(director, fields, disciplines);
assert.equal(draft.recurrence.bySetPos, 4);
assert.equal(draft.recurrence.byWeekday, 6);
assert.deepEqual(draft.exceptions, {});

const edited = matchDraft(director, fields, disciplines, {
  ...draft,
  exceptions: {
    [dates[1]]: { cancelled: true, note: "Holiday" },
    "1999-01-01": { cancelled: true, note: "Stale" },
  },
});
assert.equal(edited.id, draft.id);
assert.equal(edited.exceptions[dates[1]].note, "Holiday");
assert.equal(edited.exceptions["1999-01-01"], undefined);

assert.throws(
  () => matchDraft(director, { ...fields, repeatUntil: "2020-01-01" }, disciplines),
  /Repeat until is before the start date/,
);

function daySpanOf(match) {
  const startDate = parseISODate(match.startDate);
  const endDate = parseISODate(match.endDate);
  return Math.round((endDate - startDate) / 86400000);
}

console.log("recurrence ok");
