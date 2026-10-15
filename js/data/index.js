/**
 * MatchPoint domain catalog.
 *
 * Page layouts read these shapes. External systems should fill nullable
 * fields rather than introduce new screens.
 *
 * Match.integrations — Impact Scoring, NRL, PRS, Practiscore ids
 * Match.documents[].href — match book, stage photos, results
 * Match.results — published leaderboard once a source is connected
 * Stage.image.src — stage or target photo
 * Stage.layout — props and targets placed on the stage picture
 * Article.media — future video or audio
 * Gear.links[].href / Gear.image.src — product URL and photo
 * User.external — shooter ids saved on the profile (see store.js)
 * User.standing — rank, points, classification, source
 * User.role — "admin" or "member". One general admin is seeded on this device.
 * User.permissions.matchDirector — granted from the admin user list
 * Match.directorUserId — set when a match director posts the match
 * Match.origin — "director" for matches a director posts.
 * Match.recurrence — repeat rule for a director series. Null on a single date.
 * Match.exceptions — one original date cancelled or moved.
 * Venue — a range a match director manages on this device. Name and address.
 * Match.venueId — the director's venue for a posted match.
 * Match.location.address — copied from that venue.
 * Match.capacity — max confirmed shooters. On a director match, later signups waitlist.
 * Match.registrationLeadDays — director series only. Each date stays closed until this many days before it, then opens. Closed without this setting stays closed.
 * Match.schedule.rounds — estimated round count. Directors may enter a range such as 100-150.
 * Match.courses — director match only. Original date to the stages imported for that date.
 * A stage library lives on this device (state.stages). Importing a stage copies it onto the date.
 */

import { expandMatch } from "../recurrence.js";
import { catalogRecord, catalogRecords, directedMatches, hiddenIds, segmentLists } from "../store.js";
import { composeSegments, isPast, todayISO } from "../util.js";
import { matches } from "./matches.js";
import { articles } from "./learning.js";
import { gear } from "./equipment.js";
import { seedListings } from "./listings.js";

export { matches, articles, gear, seedListings };

export const disciplines = ["PRS", "NRL Hunter", "NRL22", "ELR", "Outlaw"];
export const learningCategories = ["Positions", "Data & DOPE", "Matchcraft", "Fundamentals"];
export const gearCategories = ["Rifles", "Optics", "Bags", "Bipods", "Tripods", "Support Gear"];
export const listingCategories = [...gearCategories, "Other"];

export function articleSegments() {
  return composeSegments(learningCategories, segmentLists("articles"));
}

export function gearSegments() {
  return composeSegments(gearCategories, segmentLists("gear"));
}
export const conditions = ["New", "Like new", "Good", "Fair", "For parts"];
export const divisions = ["Open", "Tactical", "Production", "Limited", "Sportsman", "Other"];

function applyCatalog(kind, item) {
  const edited = catalogRecord(kind, item.id);
  return edited ? { ...item, ...edited, id: item.id } : item;
}

export function allMatches(today = todayISO()) {
  const hidden = new Set(hiddenIds("matches"));
  const posted = directedMatches().filter((match) => !hidden.has(match.id));
  const postedIds = new Set(posted.map((match) => match.id));
  const expanded = posted.flatMap((match) => expandMatch(match, today));
  const seeds = matches
    .filter((match) => !postedIds.has(match.id) && !hidden.has(match.id))
    .map((match) => applyCatalog("matches", match));
  return [...seeds, ...expanded];
}

function publishedArticle(record) {
  if (!record || typeof record.id !== "string" || typeof record.title !== "string") return null;
  const sections = Array.isArray(record.sections)
    ? record.sections.filter((section) => section && section.heading)
    : [];
  if (!sections.length) return null;
  return {
    media: { type: null, href: null, caption: "Media slot" },
    ...record,
    id: record.id,
    sections,
  };
}

export function allArticles() {
  const hidden = new Set(hiddenIds("articles"));
  const seedIds = new Set(articles.map((article) => article.id));
  const seeds = articles
    .filter((article) => !hidden.has(article.id))
    .map((article) => applyCatalog("articles", article));
  const created = catalogRecords("articles")
    .filter((article) => !seedIds.has(article.id) && !hidden.has(article.id))
    .map(publishedArticle)
    .filter(Boolean);
  return [...seeds, ...created];
}

export function allGear() {
  const hidden = new Set(hiddenIds("gear"));
  return gear.filter((item) => !hidden.has(item.id)).map((item) => applyCatalog("gear", item));
}

export function matchById(id, today = todayISO()) {
  if (!id) return null;
  const list = allMatches(today);
  const exact = list.find((match) => match.id === id);
  if (exact) return exact;
  const series = list.filter((match) => match.seriesId === id);
  if (!series.length) return null;
  return series.find((match) => !match.cancelled && (match.endDate || match.startDate) >= today)
    || series.find((match) => !match.cancelled)
    || series[0];
}

export function articleById(id) {
  return allArticles().find((article) => article.id === id) || null;
}

export function gearById(id) {
  return allGear().find((item) => item.id === id) || null;
}

export function nextMatch(today = todayISO()) {
  return allMatches(today)
    .filter((match) => !match.cancelled && !isPast(match, today))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null;
}

export function relatedArticles(article) {
  const others = allArticles().filter((item) => item.id !== article.id);
  const same = others.filter((item) => item.category === article.category);
  const rest = others.filter((item) => item.category !== article.category);
  return [...same, ...rest].slice(0, 3);
}

export function relatedGear(item) {
  return allGear().filter((other) => other.id !== item.id && other.category === item.category).slice(0, 2);
}
