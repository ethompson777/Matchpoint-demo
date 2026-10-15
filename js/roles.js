/**
 * Account kinds.
 *
 * role is "admin" or "member". The general admin is a single seeded account.
 * permissions.matchDirector is granted by that admin. More permission keys can
 * be added later without changing the user list.
 */

import { occurrenceDates, ruleFromChoice } from "./recurrence.js";
import { cleanLayout } from "./stage-board.js";
import { isCourseBrief, normalizeLeadDays, safeImageSrc, uid } from "./util.js";

export const DIRECTOR_STATUSES = ["open", "waitlist", "closed"];
export const CATALOG_STATUSES = ["open", "waitlist", "full", "closed", "completed"];

/** Learning guide levels. tone is the color class: green, yellow, blue. */
export const LEARNING_LEVELS = [
  { name: "Essentials", tone: "essentials" },
  { name: "Mid Level", tone: "mid" },
  { name: "Pro", tone: "pro" },
];

const LEARNING_LEVEL_ALIAS = new Map([
  ["essentials", "Essentials"],
  ["practice", "Mid Level"],
  ["mid", "Mid Level"],
  ["mid level", "Mid Level"],
  ["pro", "Pro"],
]);

export function learningLevel(value) {
  return LEARNING_LEVEL_ALIAS.get(String(value ?? "").trim().toLowerCase()) || "";
}

export function isAdmin(user) {
  return user?.role === "admin";
}

export function isMatchDirector(user) {
  return user?.permissions?.matchDirector === true;
}

export function roleLabel(user) {
  const director = isMatchDirector(user);
  if (isAdmin(user) && director) return "Admin · Match director";
  if (isAdmin(user)) return "General admin";
  if (director) return "Match director";
  return "Shooter";
}

function text(value, { min, max, label }) {
  const cleaned = String(value ?? "").trim().replace(/\s+/g, " ");
  if (cleaned.length < min) throw new Error(`${label} needs at least ${min} characters.`);
  return cleaned.slice(0, max);
}

function isoDate(value, label) {
  const cleaned = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) throw new Error(`Enter a ${label}.`);
  const [year, month, day] = cleaned.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Enter a real ${label}.`);
  }
  return cleaned;
}

function whole(value, { min, max, label }) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  const number = Number(raw);
  if (number < min || number > max) throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  return number;
}

function optionalLine(value, max) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function estimate(value) {
  const cleaned = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) throw new Error("Enter an estimated round count.");
  return cleaned.slice(0, 40);
}

function block(value, max) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function readStageFields(fields) {
  const name = text(fields.name, { min: 2, max: 80, label: "Stage name" });
  const shots = whole(fields.shots, { min: 1, max: 200, label: "Round count" });
  const time = text(fields.time, { min: 1, max: 40, label: "Time" });
  const description = block(fields.description, 2000);
  if (description.length < 10) throw new Error("Course of fire needs at least 10 characters.");
  return {
    name,
    shots,
    time,
    props: block(fields.props, 240),
    distance: block(fields.distance, 500),
    target: block(fields.target, 500),
    restrictions: block(fields.restrictions, 240),
    startPosition: block(fields.startPosition, 240),
    points: optionalLine(fields.points, 80),
    description,
    layout: cleanLayout(fields.layout),
  };
}

export function packStageImage(image, alt) {
  const src = safeImageSrc(image?.src);
  if (src && src.length > 180000) throw new Error("That image is too large to store on this device.");
  const width = Number(image?.width);
  const height = Number(image?.height);
  return {
    src: src || null,
    alt: alt || "",
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : null,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : null,
  };
}

export function stageDraft(user, fields, existing = null) {
  const stage = readStageFields(fields);
  return {
    id: existing?.id || uid("stg"),
    ...stage,
    directorUserId: user.id,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
}

export function courseStageDraft(fields, existing = null) {
  return {
    sourceId: typeof existing?.sourceId === "string" ? existing.sourceId : null,
    ...readStageFields(fields),
  };
}

export function stageSnapshot(stage) {
  const name = text(stage?.name, { min: 2, max: 80, label: "Stage name" });
  const shots = Number(stage?.shots);
  if (!Number.isInteger(shots) || shots < 1 || shots > 200) {
    throw new Error("Round count must be a whole number from 1 to 200.");
  }
  return {
    sourceId: typeof stage?.id === "string" ? stage.id : null,
    name,
    shots,
    time: text(stage?.time, { min: 1, max: 40, label: "Time" }),
    props: block(stage?.props, 240),
    distance: block(stage?.distance, 500),
    target: block(stage?.target, 500),
    restrictions: block(stage?.restrictions, 240),
    startPosition: block(stage?.startPosition, 240),
    points: optionalLine(stage?.points, 80),
    description: block(stage?.description, 2000),
    image: packStageImage(stage?.image, name),
    layout: cleanLayout(stage?.layout),
  };
}

export function courseStageList(stages) {
  if (!Array.isArray(stages)) throw new Error("That course could not be saved.");
  if (stages.length > 30) throw new Error("A course can hold 30 stages.");
  return stages.map((stage) => {
    const drafted = courseStageDraft(stage, stage);
    if (drafted.description.length < 10) throw new Error("Course of fire needs at least 10 characters.");
    return { ...drafted, image: packStageImage(stage?.image, drafted.name) };
  });
}

function keptExceptions(existing, anchor) {
  const raw = existing?.exceptions;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  if (!anchor.recurrence) return { ...raw };
  const valid = new Set(occurrenceDates(anchor));
  return Object.fromEntries(Object.entries(raw).filter(([key]) => valid.has(key)));
}

function keptCourses(existing, anchor) {
  const raw = existing?.courses;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entries = Object.entries(raw).filter(([key, value]) => (
    /^\d{4}-\d{2}-\d{2}$/.test(key) && Array.isArray(value)
  ));
  if (!anchor.recurrence) {
    const current = entries.find(([key]) => key === anchor.startDate);
    if (current) return { [anchor.startDate]: current[1] };
    if (entries.length === 1) return { [anchor.startDate]: entries[0][1] };
    return {};
  }
  const valid = new Set(occurrenceDates({ startDate: anchor.startDate, recurrence: anchor.recurrence }));
  return Object.fromEntries(entries.filter(([key]) => valid.has(key)));
}

function publishedMatchStages(existing) {
  const stages = Array.isArray(existing?.stages) ? existing.stages : [];
  if (isCourseBrief(stages)) return [];
  return stages;
}

export function venueDraft(user, fields, existing = null) {
  const name = text(fields.name, { min: 2, max: 80, label: "Venue name" });
  const address = text(fields.address, { min: 8, max: 160, label: "Address" });
  return {
    id: existing?.id || uid("ven"),
    name,
    address,
    directorUserId: user.id,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
}

export function matchDraft(user, fields, disciplines, existing = null) {
  const name = text(fields.name, { min: 4, max: 80, label: "Match name" });
  const startDate = isoDate(fields.startDate, "start date");
  const endDate = isoDate(fields.endDate, "end date");
  if (endDate < startDate) throw new Error("End date is before the start date.");
  const venueId = String(fields.venueId || "").trim();
  if (!venueId) throw new Error("Choose a venue.");
  const venue = text(fields.venue, { min: 2, max: 80, label: "Venue" });
  const address = text(fields.address, { min: 8, max: 160, label: "Address" });
  const discipline = String(fields.discipline || "");
  if (!disciplines.includes(discipline)) throw new Error("Choose a discipline.");
  const summary = text(fields.summary, { min: 10, max: 240, label: "Short description" });
  const description = text(fields.description, { min: 20, max: 2000, label: "Description" });
  const fee = whole(fields.fee, { min: 0, max: 10000, label: "Fee" });
  const capacity = whole(fields.capacity, { min: 1, max: 500, label: "Max shooters" });
  const rounds = estimate(fields.rounds);
  const registrationStatus = String(fields.registrationStatus || "");
  if (!DIRECTOR_STATUSES.includes(registrationStatus)) throw new Error("Choose a registration status.");
  const checkIn = optionalLine(fields.checkIn, 40);
  const firstShot = optionalLine(fields.firstShot, 40);
  const repeat = String(fields.repeat ?? "");
  let until = null;
  if (repeat && String(fields.repeatUntil ?? "").trim()) {
    until = isoDate(fields.repeatUntil, "repeat-until date");
    if (until < startDate) throw new Error("Repeat until is before the start date.");
  }
  const recurrence = ruleFromChoice(repeat, startDate, until);
  if (repeat && !recurrence) throw new Error("Choose how this match repeats.");
  const exceptions = keptExceptions(existing, { startDate, endDate, recurrence });
  const courses = keptCourses(existing, { startDate, recurrence });

  const keepsDirector = existing?.directorUserId && existing.directorUserId !== user.id;
  const directorUserId = keepsDirector ? existing.directorUserId : user.id;
  const matchDirector = keepsDirector ? (existing.matchDirector || user.name) : user.name;

  const seriesStages = publishedMatchStages(existing);
  const dated = !recurrence && Array.isArray(courses[startDate]) ? courses[startDate] : null;
  const stages = dated || seriesStages;

  return {
    id: existing?.id || uid("mch"),
    name,
    startDate,
    endDate,
    location: { venue, address },
    venueId,
    discipline,
    summary,
    description,
    registrationStatus,
    registrationOpens: existing?.registrationOpens ?? null,
    registrationLeadDays: recurrence ? normalizeLeadDays(existing?.registrationLeadDays) : null,
    capacity,
    registeredCount: existing?.registeredCount ?? 0,
    fee,
    matchDirector,
    directorUserId,
    schedule: {
      checkIn,
      firstShot,
      rounds,
      stageCount: stages.length,
    },
    integrations: existing?.integrations || {
      impactMatchId: null,
      nrlEventId: null,
      prsEventId: null,
      practiscoreId: null,
    },
    documents: existing?.documents || [
      { label: "Match book", kind: "PDF", href: null, status: "Not posted" },
      { label: "Stage photos", kind: "Gallery", href: null, status: "Not posted" },
      { label: "Results", kind: "Impact Scoring", href: null, status: "After the match" },
    ],
    results: existing?.results || { source: null, href: null, published: false },
    stages,
    courses,
    origin: "director",
    recurrence,
    exceptions,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
}

function lines(value) {
  return Array.isArray(value) ? value : [value];
}

export function catalogMatchDraft(fields, existing, disciplines) {
  if (!existing?.id) throw new Error("That match is not on the calendar.");
  const name = text(fields.name, { min: 4, max: 80, label: "Match name" });
  const startDate = isoDate(fields.startDate, "start date");
  const endDate = isoDate(fields.endDate, "end date");
  if (endDate < startDate) throw new Error("End date is before the start date.");
  const venue = text(fields.venue, { min: 2, max: 80, label: "Venue" });
  const city = text(fields.city, { min: 2, max: 60, label: "City" });
  const region = text(fields.region, { min: 2, max: 40, label: "State" });
  const discipline = String(fields.discipline || "");
  if (!disciplines.includes(discipline)) throw new Error("Choose a discipline.");
  const registrationStatus = String(fields.registrationStatus || "");
  if (!CATALOG_STATUSES.includes(registrationStatus)) throw new Error("Choose a registration status.");
  const summary = text(fields.summary, { min: 10, max: 240, label: "Short description" });
  const description = text(fields.description, { min: 20, max: 2000, label: "Description" });
  const fee = whole(fields.fee, { min: 0, max: 10000, label: "Fee" });
  const capacity = whole(fields.capacity, { min: 1, max: 500, label: "Max shooters" });
  const rounds = estimate(fields.rounds);
  const matchDirector = text(fields.matchDirector, { min: 2, max: 80, label: "Match director" });
  return {
    ...existing,
    name,
    startDate,
    endDate,
    location: { venue, city, region },
    discipline,
    summary,
    description,
    registrationStatus,
    capacity,
    fee,
    matchDirector,
    schedule: {
      ...(existing.schedule || {}),
      checkIn: optionalLine(fields.checkIn, 40),
      firstShot: optionalLine(fields.firstShot, 40),
      rounds,
      stageCount: existing.schedule?.stageCount ?? existing.stages?.length ?? 1,
    },
  };
}

export function articleDraft(fields, existing, categories) {
  const created = !existing?.id;
  const title = text(fields.title, { min: 4, max: 120, label: "Title" });
  const category = String(fields.category || "");
  if (!categories.includes(category)) throw new Error("Choose a segment.");
  const level = learningLevel(fields.level);
  if (!LEARNING_LEVELS.some((item) => item.name === level)) throw new Error("Choose a level.");
  const minutes = fields.minutes == null || fields.minutes === ""
    ? (existing?.minutes ?? null)
    : whole(fields.minutes, { min: 1, max: 180, label: "Minutes" });
  const summary = text(fields.summary, { min: 10, max: 400, label: "Summary" });
  const headings = lines(fields.heading);
  const paragraphs = lines(fields.paragraphs);
  const lists = lines(fields.list);
  if (!headings.some((heading) => String(heading || "").trim())) throw new Error("Add a section heading.");
  const sections = headings.map((heading, index) => {
    const head = String(heading || "").trim();
    if (!head) return null;
    const body = String(paragraphs[index] ?? "")
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => paragraph.slice(0, 2000));
    const list = String(lists[index] ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.slice(0, 240));
    if (body.length < 1 && list.length < 1) throw new Error("Each section needs a paragraph or a list.");
    return {
      heading: text(head, { min: 2, max: 120, label: "Heading" }),
      ...(body.length ? { paragraphs: body } : {}),
      ...(list.length ? { list } : {}),
    };
  }).filter(Boolean);
  if (sections.length < 1) throw new Error("Add a section heading.");
  return {
    ...(existing || {}),
    id: existing?.id || uid("art"),
    title,
    category,
    level,
    minutes,
    summary,
    sections,
    media: existing?.media || { type: null, href: null, caption: "Media slot" },
    ...(created ? { origin: "admin" } : {}),
  };
}

export function gearDraft(fields, existing, categories) {
  if (!existing?.id) throw new Error("That piece of gear is not on the list.");
  const category = String(fields.category || "");
  if (!categories.includes(category)) throw new Error("Choose a segment.");
  return {
    ...existing,
    name: text(fields.name, { min: 2, max: 80, label: "Name" }),
    category,
    priceBand: text(fields.priceBand, { min: 1, max: 40, label: "Price" }),
    bestFor: text(fields.bestFor, { min: 8, max: 200, label: "Best for" }),
    summary: text(fields.summary, { min: 10, max: 240, label: "Summary" }),
    description: text(fields.description, { min: 20, max: 2000, label: "Description" }),
    why: text(fields.why, { min: 20, max: 2000, label: "Why it is on the list" }),
  };
}

export function listingDraft(fields, existing, categories, conditionChoices) {
  const title = text(fields.title, { min: 4, max: 120, label: "Title" });
  const description = text(fields.description, { min: 20, max: 2000, label: "Description" });
  const category = String(fields.category || "");
  if (!categories.includes(category)) throw new Error("Choose a category.");
  const condition = String(fields.condition || "");
  if (!conditionChoices.includes(condition)) throw new Error("Choose a condition.");
  const listingType = String(fields.listingType || "");
  if (!["sale", "trade", "either"].includes(listingType)) throw new Error("Choose an offer.");
  const price = listingType === "trade" ? null : whole(fields.price, { min: 0, max: 100000, label: "Price" });
  const tradePreference = listingType === "sale"
    ? ""
    : text(fields.tradePreference, { min: 2, max: 160, label: "Trade preference" });
  return {
    ...(existing || {}),
    id: existing?.id || uid("lst"),
    title,
    description,
    category,
    condition,
    listingType,
    price,
    tradePreference,
    contact: text(fields.contact, { min: 5, max: 120, label: "Contact method" }),
    location: optionalLine(fields.location, 80),
    sellerId: existing?.sellerId || "",
    sellerName: existing?.sellerName || "",
    createdAt: existing?.createdAt || new Date().toISOString(),
    origin: existing?.origin || "member",
  };
}
