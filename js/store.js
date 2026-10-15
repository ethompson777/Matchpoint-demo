/**
 * Local account store.
 *
 * Everything lives in localStorage under matchpoint.v1. Password material is
 * a salted SHA-256 hash. This is a device-local account, not a server login.
 *
 * User.external is the hook for later Impact Scoring, NRL, and PRS sync.
 * User.standing stays null until a results source fills it.
 * User.role is "admin" or "member". User.permissions.matchDirector is granted
 * by the general admin.
 *
 * Reserved logins are repaired on boot when the email, role, or password drifts:
 * admin@matchpoint.local / RangeAdmin
 * matchdirector@matchpoint.local / MatchDirector
 */

import { cleanException, expandMatch, occurrenceDates } from "./recurrence.js";
import { DIRECTOR_STATUSES, courseStageList, isAdmin, isMatchDirector, packStageImage } from "./roles.js";
import { cleanLayout } from "./stage-board.js";
import { cleanSegmentName, composeSegments, effectiveRegistrationStatus, listingExpired, normalizeLeadDays, registrationNotYetOpen, safeImageSrc, todayISO, uid } from "./util.js";

const KEY = "matchpoint.v1";
const ADMIN_EMAIL = "admin@matchpoint.local";
const ADMIN_PASSWORD = "RangeAdmin";
const ADMIN_NAME = "MatchPoint Admin";
const DIRECTOR_EMAIL = "matchdirector@matchpoint.local";
const DIRECTOR_PASSWORD = "MatchDirector";
const DIRECTOR_NAME = "Match Director";
const DIRECTOR_ID = "usr-match-director";
const DEMO_VENUE_ID = "ven-demo-blgc";
const DEMO_MATCH_ID = "mch-demo-outlaw";

const DEMO_STAGES = [
  {
    id: "stg-demo-barrels",
    name: "Barrels",
    shots: 12,
    time: "120",
    layout: [
      { kind: "barrel-horizontal", x: 19.1, y: 75.1 },
      { kind: "plate", x: 43.3, y: 38.8, distance: "40" },
      { kind: "double-hanger", x: 79.2, y: 20.1, distance: "100" },
    ],
  },
  {
    id: "stg-demo-ladder",
    name: "Ladder",
    shots: 10,
    time: "120",
    layout: [
      { kind: "ladder", x: 18, y: 68.7 },
      { kind: "plate", x: 26.5, y: 42.5, distance: "40" },
      { kind: "plate", x: 50.5, y: 57.1, distance: "50" },
      { kind: "plate", x: 60.7, y: 32.1, distance: "85" },
    ],
  },
];

let state = blankState();

const CATALOG_KINDS = ["matches", "articles", "gear", "listings"];
const SEGMENT_KINDS = ["articles", "gear"];

function blankSegments() {
  return {
    articles: { added: [], removed: [] },
    gear: { added: [], removed: [] },
  };
}

function cleanStoredNames(list) {
  if (!Array.isArray(list)) return [];
  const names = [];
  for (const value of list) {
    const name = String(value ?? "").trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 40) continue;
    if (names.some((item) => item.toLowerCase() === name.toLowerCase())) continue;
    names.push(name);
  }
  return names;
}

function blankCatalog() {
  return {
    hidden: { matches: [], articles: [], gear: [], listings: [] },
    matches: {},
    articles: {},
    gear: {},
    listings: {},
    segments: blankSegments(),
  };
}

function normalizeCatalog(raw) {
  const catalog = blankCatalog();
  if (!raw || typeof raw !== "object") return catalog;
  for (const kind of CATALOG_KINDS) {
    const hidden = raw.hidden?.[kind];
    catalog.hidden[kind] = Array.isArray(hidden) ? hidden.filter((id) => typeof id === "string") : [];
    const records = raw[kind];
    if (!records || typeof records !== "object" || Array.isArray(records)) continue;
    for (const [id, record] of Object.entries(records)) {
      if (record && typeof record === "object" && !Array.isArray(record)) catalog[kind][id] = record;
    }
  }
  const segments = raw.segments;
  if (segments && typeof segments === "object") {
    for (const kind of SEGMENT_KINDS) {
      catalog.segments[kind] = {
        added: cleanStoredNames(segments[kind]?.added),
        removed: cleanStoredNames(segments[kind]?.removed),
      };
    }
  }
  return catalog;
}

function blankState() {
  return { users: [], sessionUserId: null, listings: [], directedMatches: [], venues: [], stages: [], catalog: blankCatalog() };
}

function normalizeStage(stage) {
  if (!stage || typeof stage !== "object") return null;
  if (typeof stage.id !== "string" || typeof stage.name !== "string" || typeof stage.directorUserId !== "string") return null;
  const shots = Number(stage.shots);
  if (!Number.isInteger(shots) || shots < 1 || shots > 200) return null;
  const src = safeImageSrc(stage.image?.src);
  return {
    id: stage.id,
    name: stage.name,
    shots,
    time: String(stage.time || ""),
    props: String(stage.props || ""),
    distance: String(stage.distance || ""),
    target: String(stage.target || ""),
    restrictions: String(stage.restrictions || ""),
    startPosition: String(stage.startPosition || ""),
    points: String(stage.points || ""),
    description: String(stage.description || ""),
    directorUserId: stage.directorUserId,
    createdAt: typeof stage.createdAt === "string" ? stage.createdAt : "",
    image: {
      src: src && src.length <= 180000 ? src : null,
      alt: stage.name,
      width: Number(stage.image?.width) || null,
      height: Number(stage.image?.height) || null,
    },
    layout: cleanLayout(stage.layout),
  };
}

function normalizeVenue(venue) {
  if (!venue || typeof venue !== "object") return null;
  if (typeof venue.id !== "string" || typeof venue.name !== "string" || typeof venue.address !== "string") return null;
  if (typeof venue.directorUserId !== "string") return null;
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    directorUserId: venue.directorUserId,
    createdAt: typeof venue.createdAt === "string" ? venue.createdAt : "",
  };
}

function blankUser(partial) {
  const permissions = {
    matchDirector: false,
    ...(partial.permissions || {}),
  };
  return {
    gear: [],
    registrations: [],
    history: [],
    division: "Open",
    role: "member",
    external: { impactId: "", nrlId: "", prsId: "" },
    standing: { rank: null, points: null, classification: null, source: null },
    ...partial,
    permissions,
  };
}

function normalizeUser(user) {
  return blankUser({
    ...user,
    role: user.role === "admin" ? "admin" : "member",
    permissions: {
      matchDirector: user.permissions?.matchDirector === true,
    },
    external: { impactId: "", nrlId: "", prsId: "", ...(user.external || {}) },
    standing: {
      rank: null,
      points: null,
      classification: null,
      source: null,
      ...(user.standing || {}),
    },
  });
}

export function initStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = {
      users: Array.isArray(parsed.users) ? parsed.users.map(normalizeUser) : [],
      sessionUserId: typeof parsed.sessionUserId === "string" ? parsed.sessionUserId : null,
      listings: Array.isArray(parsed.listings) ? parsed.listings : [],
      directedMatches: Array.isArray(parsed.directedMatches) ? parsed.directedMatches : [],
      venues: Array.isArray(parsed.venues) ? parsed.venues.map(normalizeVenue).filter(Boolean) : [],
      stages: Array.isArray(parsed.stages) ? parsed.stages.map(normalizeStage).filter(Boolean) : [],
      catalog: normalizeCatalog(parsed.catalog),
    };
  } catch {
    state = blankState();
  }
  if (state.sessionUserId && !state.users.some((user) => user.id === state.sessionUserId)) {
    state.sessionUserId = null;
  }
  pruneExpiredListings();
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function commit(rollback) {
  try {
    persist();
  } catch {
    rollback?.();
    throw new Error("Could not save changes in this browser. Storage may be full.");
  }
}

async function digest(salt, password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Sign-in needs a secure page (https or localhost).");
  }
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function requireUser() {
  const user = currentUser();
  if (!user) throw new Error("Sign in to continue.");
  return user;
}

async function passwordMatches(user, password) {
  if (!user?.salt || !user?.passwordHash) return false;
  return (await digest(user.salt, password)) === user.passwordHash;
}

export async function ensureAdmin() {
  const existing = state.users.find((user) => user.email === ADMIN_EMAIL);
  if (existing?.role === "admin" && await passwordMatches(existing, ADMIN_PASSWORD)) return;
  const salt = crypto.randomUUID();
  const passwordHash = await digest(salt, ADMIN_PASSWORD);
  if (existing) {
    existing.role = "admin";
    existing.salt = salt;
    existing.passwordHash = passwordHash;
    if (!existing.name) existing.name = ADMIN_NAME;
    commit();
    return;
  }
  state.users.push(blankUser({
    id: uid("usr"),
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    salt,
    passwordHash,
    role: "admin",
    createdAt: new Date().toISOString(),
  }));
  commit();
}

function seedDirectorStages(director) {
  let added = false;
  for (const sample of DEMO_STAGES) {
    if (state.stages.some((stage) => stage.id === sample.id)) continue;
    const stage = normalizeStage({
      ...sample,
      directorUserId: director.id,
      createdAt: "2026-10-15T00:00:00.000Z",
    });
    if (!stage) continue;
    state.stages.push(stage);
    added = true;
  }
  if (added) commit();
}

function seedDirectorMatch(director) {
  if (state.directedMatches.some((match) => match.id === DEMO_MATCH_ID)) return;
  if (state.directedMatches.some((match) => match.name === "Outlaw Rimfire Series")) return;
  let venue = state.venues.find((item) => item.id === DEMO_VENUE_ID);
  if (!venue) {
    venue = normalizeVenue({
      id: DEMO_VENUE_ID,
      name: "BLGC",
      address: "23195 Co Rd 105, Ramah, CO 80832",
      directorUserId: director.id,
      createdAt: "2026-10-15T00:00:00.000Z",
    });
    if (!venue) return;
    state.venues.push(venue);
  }
  state.directedMatches.unshift({
    id: DEMO_MATCH_ID,
    name: "Outlaw Rimfire Series",
    startDate: "2026-10-24",
    endDate: "2026-10-24",
    location: { venue: venue.name, address: venue.address },
    venueId: venue.id,
    discipline: "Outlaw",
    summary: "Beginner Friendly PRS Match!",
    description: "Beginner Friendly PRS Match!",
    registrationStatus: "closed",
    registrationOpens: null,
    registrationLeadDays: 30,
    capacity: 20,
    registeredCount: 0,
    fee: 20,
    matchDirector: director.name || DIRECTOR_NAME,
    directorUserId: director.id,
    schedule: { checkIn: "", firstShot: "", rounds: "120", stageCount: 0 },
    integrations: { impactMatchId: null, nrlEventId: null, prsEventId: null, practiscoreId: null },
    documents: [
      { label: "Match book", kind: "PDF", href: null, status: "Not posted" },
      { label: "Stage photos", kind: "Gallery", href: null, status: "Not posted" },
      { label: "Results", kind: "Impact Scoring", href: null, status: "After the match" },
    ],
    results: { source: null, href: null, published: false },
    stages: [],
    courses: {},
    origin: "director",
    recurrence: { frequency: "monthly", interval: 1, byWeekday: 6, bySetPos: 4, until: null },
    exceptions: {},
    createdAt: "2026-10-15T00:00:00.000Z",
  });
  commit();
}

export async function ensureDirector() {
  let director = state.users.find((user) => user.email === DIRECTOR_EMAIL);
  const healthy = director?.role === "member"
    && director.permissions?.matchDirector === true
    && await passwordMatches(director, DIRECTOR_PASSWORD);
  if (!healthy) {
    const salt = crypto.randomUUID();
    const passwordHash = await digest(salt, DIRECTOR_PASSWORD);
    if (director) {
      director.role = "member";
      director.permissions = { matchDirector: true };
      director.salt = salt;
      director.passwordHash = passwordHash;
      if (!director.name) director.name = DIRECTOR_NAME;
      commit();
    } else {
      const id = state.users.some((user) => user.id === DIRECTOR_ID) ? uid("usr") : DIRECTOR_ID;
      director = blankUser({
        id,
        name: DIRECTOR_NAME,
        email: DIRECTOR_EMAIL,
        salt,
        passwordHash,
        role: "member",
        permissions: { matchDirector: true },
        createdAt: new Date().toISOString(),
      });
      state.users.push(director);
      commit();
    }
  }
  seedDirectorStages(director);
  seedDirectorMatch(director);
}

export function currentUser() {
  return state.users.find((user) => user.id === state.sessionUserId) || null;
}

export function listUsers() {
  return [...state.users].sort((a, b) => {
    if (isAdmin(a) !== isAdmin(b)) return isAdmin(a) ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function directedMatches() {
  return state.directedMatches;
}

export function venues() {
  return state.venues;
}

export function stages() {
  return state.stages;
}

export function rosterFor(matchId) {
  return state.users.flatMap((user) => {
    const entry = user.registrations.find((item) => item.matchId === matchId);
    if (!entry) return [];
    return [{
      name: user.name,
      email: user.email,
      division: entry.division,
      registeredAt: entry.registeredAt,
      waitlisted: entry.waitlisted === true,
    }];
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function fieldCounts(matchId) {
  let confirmed = 0;
  let waitlist = 0;
  for (const user of state.users) {
    const entry = user.registrations.find((item) => item.matchId === matchId);
    if (!entry) continue;
    if (entry.waitlisted === true) waitlist += 1;
    else confirmed += 1;
  }
  return { confirmed, waitlist };
}

function directedRecord(matchId) {
  const id = String(matchId || "");
  const exact = state.directedMatches.find((match) => match.id === id);
  if (exact) return exact;
  const seriesId = id.split("~")[0];
  if (seriesId === id) return null;
  return state.directedMatches.find((match) => match.id === seriesId) || null;
}

function oldestWaitlist(matchId) {
  let oldest = null;
  for (const user of state.users) {
    const entry = user.registrations.find((item) => item.matchId === matchId && item.waitlisted === true);
    if (!entry) continue;
    if (!oldest || String(entry.registeredAt) < String(oldest.registeredAt)) oldest = entry;
  }
  return oldest;
}

function fillMatchSpots(match, matchId) {
  const occurrence = postedOccurrence(matchId) || match;
  if (!match || effectiveRegistrationStatus(occurrence) !== "open") return [];
  const promoted = [];
  while (fieldCounts(matchId).confirmed < Number(match.capacity)) {
    const next = oldestWaitlist(matchId);
    if (!next) break;
    next.waitlisted = false;
    promoted.push(next);
  }
  return promoted;
}

function fillOpenSpots(match) {
  if (!match) return [];
  if (!normalizeLeadDays(match.registrationLeadDays) && match.registrationStatus !== "open") return [];
  const ids = new Set([match.id]);
  const prefix = `${match.id}~`;
  for (const user of state.users) {
    for (const entry of user.registrations) {
      if (entry.matchId === match.id || String(entry.matchId).startsWith(prefix)) ids.add(entry.matchId);
    }
  }
  return [...ids].flatMap((id) => fillMatchSpots(match, id));
}

function restoreWaitlist(entries) {
  for (const entry of entries) entry.waitlisted = true;
}

export function signupIsWaitlist(match) {
  if (!match || registrationNotYetOpen(match)) return false;
  const status = effectiveRegistrationStatus(match);
  if (status === "closed" || status === "full") return false;
  if (status === "waitlist") return true;
  if (match.origin !== "director") return false;
  return fieldCounts(match.id).confirmed >= Number(match.capacity);
}

export function setMatchDirector(userId, enabled) {
  const actor = requireUser();
  if (!isAdmin(actor)) throw new Error("Only the general admin can change permissions.");
  const user = state.users.find((item) => item.id === userId);
  if (!user) throw new Error("That account is not on this device.");
  const previous = user.permissions.matchDirector;
  user.permissions.matchDirector = Boolean(enabled);
  commit(() => {
    user.permissions.matchDirector = previous;
  });
  return user;
}

export function saveVenue(venue) {
  const user = requireUser();
  if (!isMatchDirector(user)) throw new Error("Match director permission is required.");
  if (venue.directorUserId !== user.id) throw new Error("You can only change venues you manage.");
  const index = state.venues.findIndex((item) => item.id === venue.id);
  const location = { venue: venue.name, address: venue.address };
  const affected = state.directedMatches.filter((match) => match.venueId === venue.id && match.directorUserId === user.id);
  const previousLocations = affected.map((match) => match.location);
  const applyLocation = () => {
    affected.forEach((match) => {
      match.location = { ...location };
    });
  };
  if (index >= 0) {
    const previous = state.venues[index];
    if (previous.directorUserId !== user.id) throw new Error("You can only change venues you manage.");
    state.venues[index] = venue;
    applyLocation();
    commit(() => {
      state.venues[index] = previous;
      affected.forEach((match, i) => {
        match.location = previousLocations[i];
      });
    });
    return venue;
  }
  state.venues.unshift(venue);
  commit(() => {
    state.venues.shift();
  });
  return venue;
}

export function saveStage(stage) {
  const user = requireUser();
  if (!isMatchDirector(user)) throw new Error("Match director permission is required.");
  if (stage.directorUserId !== user.id) throw new Error("You can only change stages you built.");
  const stored = {
    id: stage.id,
    name: stage.name,
    shots: stage.shots,
    time: stage.time,
    props: stage.props || "",
    distance: stage.distance || "",
    target: stage.target || "",
    restrictions: stage.restrictions || "",
    startPosition: stage.startPosition || "",
    points: stage.points || "",
    description: stage.description || "",
    directorUserId: stage.directorUserId,
    createdAt: stage.createdAt || new Date().toISOString(),
    image: packStageImage(stage.image, stage.name),
    layout: cleanLayout(stage.layout),
  };
  const index = state.stages.findIndex((item) => item.id === stored.id);
  if (index >= 0) {
    const previous = state.stages[index];
    if (previous.directorUserId !== user.id) throw new Error("You can only change stages you built.");
    state.stages[index] = stored;
    commit(() => {
      state.stages[index] = previous;
    });
    return stored;
  }
  state.stages.unshift(stored);
  commit(() => {
    state.stages.shift();
  });
  return stored;
}

export function removeStage(id) {
  const user = requireUser();
  if (!isMatchDirector(user)) throw new Error("Match director permission is required.");
  const index = state.stages.findIndex((item) => item.id === id && item.directorUserId === user.id);
  if (index < 0) throw new Error("You can only remove stages you built.");
  const [removed] = state.stages.splice(index, 1);
  commit(() => {
    state.stages.splice(index, 0, removed);
  });
}

export function setMatchCourse(matchId, originalDate, stages) {
  const user = requireUser();
  const admin = isAdmin(user);
  if (!admin && !isMatchDirector(user)) throw new Error("Match director permission is required.");
  const match = state.directedMatches.find((item) => item.id === matchId && (admin || item.directorUserId === user.id));
  if (!match) throw new Error("You can only change matches you direct.");
  const date = String(originalDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("That date is not on this match.");
  const allowed = match.recurrence ? occurrenceDates(match) : [match.startDate];
  if (!allowed.includes(date)) throw new Error("That date is not on this match.");
  const nextStages = courseStageList(stages);
  const previousCourses = match.courses;
  const previousStages = match.stages;
  const previousSchedule = match.schedule;
  const courses = { ...(previousCourses && typeof previousCourses === "object" && !Array.isArray(previousCourses) ? previousCourses : {}) };
  courses[date] = nextStages;
  match.courses = courses;
  if (!match.recurrence) {
    match.stages = nextStages;
    match.schedule = { ...(match.schedule || {}), stageCount: nextStages.length };
  }
  commit(() => {
    match.courses = previousCourses;
    match.stages = previousStages;
    match.schedule = previousSchedule;
  });
  return nextStages;
}

export function removeVenue(id) {
  const user = requireUser();
  if (!isMatchDirector(user)) throw new Error("Match director permission is required.");
  if (state.directedMatches.some((match) => match.venueId === id && match.directorUserId === user.id)) {
    throw new Error("That venue is on a match. Point the match at another venue first.");
  }
  const index = state.venues.findIndex((item) => item.id === id && item.directorUserId === user.id);
  if (index < 0) throw new Error("You can only remove venues you manage.");
  const [removed] = state.venues.splice(index, 1);
  commit(() => {
    state.venues.splice(index, 0, removed);
  });
}

export function saveDirectedMatch(match) {
  const user = requireUser();
  const admin = isAdmin(user);
  if (!admin && !isMatchDirector(user)) throw new Error("Match director permission is required.");
  if (!admin && match.directorUserId !== user.id) throw new Error("You can only change matches you direct.");
  const venue = state.venues.find((item) => item.id === match.venueId && (admin || item.directorUserId === user.id));
  if (!venue) throw new Error("Choose a venue you manage.");
  const posted = {
    ...match,
    venueId: venue.id,
    location: { venue: venue.name, address: venue.address },
  };
  const index = state.directedMatches.findIndex((item) => item.id === posted.id);
  if (index >= 0) {
    const previous = state.directedMatches[index];
    if (!admin && previous.directorUserId !== user.id) throw new Error("You can only change matches you direct.");
    state.directedMatches[index] = posted;
    const promoted = fillOpenSpots(posted);
    commit(() => {
      state.directedMatches[index] = previous;
      restoreWaitlist(promoted);
    });
    return posted;
  }
  state.directedMatches.unshift(posted);
  commit(() => {
    state.directedMatches.shift();
  });
  return posted;
}

export function updateDirectedStatus(id, status) {
  const user = requireUser();
  if (!isMatchDirector(user)) throw new Error("Match director permission is required.");
  if (!DIRECTOR_STATUSES.includes(status)) throw new Error("Choose a registration status.");
  const match = state.directedMatches.find((item) => item.id === id && item.directorUserId === user.id);
  if (!match) throw new Error("You can only change matches you direct.");
  const previous = match.registrationStatus;
  match.registrationStatus = status;
  const promoted = fillOpenSpots(match);
  commit(() => {
    match.registrationStatus = previous;
    restoreWaitlist(promoted);
  });
}

export function updateDirectedLead(id, days) {
  const user = requireUser();
  if (!isMatchDirector(user)) throw new Error("Match director permission is required.");
  const match = state.directedMatches.find((item) => item.id === id && item.directorUserId === user.id);
  if (!match) throw new Error("You can only change matches you direct.");
  if (!match.recurrence) throw new Error("Automatic registration is for a repeating match.");
  const clearing = days == null || days === "";
  const next = clearing ? null : normalizeLeadDays(days);
  if (!clearing && next == null) throw new Error("Enter a whole number of days from 1 to 365.");
  const previous = normalizeLeadDays(match.registrationLeadDays);
  match.registrationLeadDays = next;
  commit(() => {
    match.registrationLeadDays = previous;
  });
}

function postedOccurrence(matchId) {
  const record = directedRecord(matchId);
  if (!record) return null;
  if (record.id === matchId) return record;
  return expandMatch(record).find((item) => item.id === matchId) || null;
}

export function setOccurrenceException(seriesId, originalDate, exception) {
  const user = requireUser();
  if (!isMatchDirector(user)) throw new Error("Match director permission is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(originalDate || ""))) {
    throw new Error("That date is not in this series.");
  }
  const match = state.directedMatches.find((item) => item.id === seriesId && item.directorUserId === user.id);
  if (!match?.recurrence) throw new Error("That match does not repeat.");
  if (!occurrenceDates(match).includes(originalDate)) throw new Error("That date is not in this series.");
  const nextException = cleanException(exception);
  const previous = match.exceptions;
  const next = { ...(previous && typeof previous === "object" ? previous : {}) };
  if (nextException == null) delete next[originalDate];
  else next[originalDate] = nextException;
  match.exceptions = next;
  commit(() => {
    match.exceptions = previous;
  });
}

export function removeDirectedMatch(id) {
  const user = requireUser();
  const admin = isAdmin(user);
  if (!admin && !isMatchDirector(user)) throw new Error("Match director permission is required.");
  const index = state.directedMatches.findIndex((item) => item.id === id && (admin || item.directorUserId === user.id));
  if (index < 0) throw new Error("You can only remove matches you direct.");
  const [removed] = state.directedMatches.splice(index, 1);
  commit(() => {
    state.directedMatches.splice(index, 0, removed);
  });
}

export function userListings() {
  return state.listings;
}

export function hiddenIds(kind) {
  return [...(state.catalog?.hidden?.[kind] || [])];
}

export function catalogRecord(kind, id) {
  return state.catalog?.[kind]?.[id] || null;
}

export function catalogRecords(kind) {
  const bucket = state.catalog?.[kind];
  if (!bucket || typeof bucket !== "object") return [];
  return Object.values(bucket).filter((record) => record && typeof record.id === "string");
}

export function segmentLists(kind) {
  const bucket = state.catalog?.segments?.[kind];
  return {
    added: [...(bucket?.added || [])],
    removed: [...(bucket?.removed || [])],
  };
}

function requireSegmentKind(kind) {
  if (!SEGMENT_KINDS.includes(kind)) throw new Error("That segment cannot be changed.");
  return state.catalog.segments[kind];
}

export function addSegment(kind, name, seeds) {
  const user = requireUser();
  if (!isAdmin(user)) throw new Error("Only the general admin can change that.");
  const bucket = requireSegmentKind(kind);
  const cleaned = cleanSegmentName(name);
  const current = composeSegments(seeds, bucket);
  if (current.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
    throw new Error("That segment already exists.");
  }
  const previous = { added: [...bucket.added], removed: [...bucket.removed] };
  bucket.removed = bucket.removed.filter((item) => item.toLowerCase() !== cleaned.toLowerCase());
  const isSeed = (seeds || []).some((item) => String(item).toLowerCase() === cleaned.toLowerCase());
  if (!isSeed) bucket.added.push(cleaned);
  commit(() => {
    bucket.added = previous.added;
    bucket.removed = previous.removed;
  });
  return cleaned;
}

export function removeSegment(kind, name, seeds, usedNames) {
  const user = requireUser();
  if (!isAdmin(user)) throw new Error("Only the general admin can change that.");
  const bucket = requireSegmentKind(kind);
  const cleaned = String(name || "").trim();
  if (!cleaned) throw new Error("That segment cannot be changed.");
  if ((usedNames || []).some((item) => String(item).toLowerCase() === cleaned.toLowerCase())) {
    throw new Error("Move the cards out of this segment first.");
  }
  const previous = { added: [...bucket.added], removed: [...bucket.removed] };
  bucket.added = bucket.added.filter((item) => item.toLowerCase() !== cleaned.toLowerCase());
  const isSeed = (seeds || []).some((item) => String(item).toLowerCase() === cleaned.toLowerCase());
  if (isSeed && !bucket.removed.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
    bucket.removed.push(cleaned);
  }
  commit(() => {
    bucket.added = previous.added;
    bucket.removed = previous.removed;
  });
}

export function saveCatalogRecord(kind, record) {
  const user = requireUser();
  if (!isAdmin(user)) throw new Error("Only the general admin can change that.");
  if (!CATALOG_KINDS.includes(kind) || !record?.id) throw new Error("That item cannot be edited.");
  const bucket = state.catalog[kind];
  const previous = Object.prototype.hasOwnProperty.call(bucket, record.id) ? bucket[record.id] : null;
  bucket[record.id] = record;
  commit(() => {
    if (previous) bucket[record.id] = previous;
    else delete bucket[record.id];
  });
  return record;
}

export function hideCatalogRecord(kind, id) {
  const user = requireUser();
  if (!isAdmin(user)) throw new Error("Only the general admin can remove that.");
  if (!CATALOG_KINDS.includes(kind) || !id) throw new Error("That item cannot be removed.");
  const list = state.catalog.hidden[kind];
  if (list.includes(id)) return;
  list.push(id);
  commit(() => {
    list.pop();
  });
}

export function removeMatch(id) {
  const seriesId = String(id || "").split("~")[0];
  if (state.directedMatches.some((item) => item.id === seriesId)) return removeDirectedMatch(seriesId);
  hideCatalogRecord("matches", seriesId);
}

export function pruneExpiredListings(today = todayISO()) {
  const next = state.listings.filter((item) => !listingExpired(item.createdAt, today));
  if (next.length === state.listings.length) return 0;
  const previous = state.listings;
  const removed = previous.length - next.length;
  state.listings = next;
  commit(() => {
    state.listings = previous;
  });
  return removed;
}

export function updateListing(listing) {
  const user = requireUser();
  if (!isAdmin(user)) throw new Error("Only the general admin can change that.");
  const index = state.listings.findIndex((item) => item.id === listing.id);
  if (index >= 0) {
    const previous = state.listings[index];
    state.listings[index] = {
      ...previous,
      ...listing,
      id: previous.id,
      sellerId: previous.sellerId,
      sellerName: previous.sellerName,
      createdAt: previous.createdAt,
      origin: previous.origin || "member",
    };
    commit(() => {
      state.listings[index] = previous;
    });
    return state.listings[index];
  }
  return saveCatalogRecord("listings", {
    ...listing,
    createdAt: listing.createdAt,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
  });
}

export async function registerUser({ name, email, password }) {
  const normalized = String(email || "").trim().toLowerCase();
  const display = String(name || "").trim();
  if (display.length < 2) return { ok: false, error: "Enter the name you use at matches." };
  if (normalized === ADMIN_EMAIL) {
    return { ok: false, error: "That email is the staff account. Sign in instead." };
  }
  if (normalized === DIRECTOR_EMAIL) {
    return { ok: false, error: "That email is the match director account. Sign in instead." };
  }
  if (state.users.some((user) => user.email === normalized)) {
    return { ok: false, error: "An account with that email already exists. Sign in instead." };
  }
  const salt = crypto.randomUUID();
  const passwordHash = await digest(salt, password);
  const user = blankUser({
    id: uid("usr"),
    name: display,
    email: normalized,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  state.users.push(user);
  state.sessionUserId = user.id;
  try {
    commit(() => {
      state.users.pop();
      state.sessionUserId = null;
    });
  } catch (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function login({ email, password }) {
  const normalized = String(email || "").trim().toLowerCase();
  const user = state.users.find((item) => item.email === normalized);
  if (!user) {
    await digest("missing-account", password);
    return { ok: false, error: "Email or password is incorrect." };
  }
  const hash = await digest(user.salt, password);
  if (hash !== user.passwordHash) {
    return { ok: false, error: "Email or password is incorrect." };
  }
  state.sessionUserId = user.id;
  commit();
  return { ok: true };
}

export function logout() {
  state.sessionUserId = null;
  commit();
}

export function updateProfile({ name, division, external }) {
  const user = requireUser();
  const previous = {
    name: user.name,
    division: user.division,
    external: { ...user.external },
  };
  const display = String(name || "").trim();
  if (display.length < 2) throw new Error("Enter the name you use at matches.");
  user.name = display;
  if (division) user.division = division;
  if (external) {
    user.external = {
      impactId: String(external.impactId || "").trim().slice(0, 64),
      nrlId: String(external.nrlId || "").trim().slice(0, 64),
      prsId: String(external.prsId || "").trim().slice(0, 64),
    };
  }
  const renamed = state.directedMatches
    .filter((match) => match.directorUserId === user.id && match.matchDirector !== display)
    .map((match) => ({ match, name: match.matchDirector }));
  for (const item of renamed) item.match.matchDirector = display;
  commit(() => {
    user.name = previous.name;
    user.division = previous.division;
    user.external = previous.external;
    for (const item of renamed) item.match.matchDirector = item.name;
  });
}

export function addGear(gear) {
  const user = requireUser();
  user.gear.unshift(gear);
  commit(() => {
    user.gear.shift();
  });
}

export function removeGear(id) {
  const user = requireUser();
  const index = user.gear.findIndex((item) => item.id === id);
  if (index < 0) return;
  const [removed] = user.gear.splice(index, 1);
  commit(() => {
    user.gear.splice(index, 0, removed);
  });
}

export function registerForMatch(matchId, division, { waitlisted = false } = {}) {
  const user = requireUser();
  const existing = user.registrations.find((item) => item.matchId === matchId);
  if (existing) return existing;
  const record = directedRecord(matchId);
  const occurrence = postedOccurrence(matchId);
  const target = occurrence || record;
  if (target && registrationNotYetOpen(target)) {
    throw new Error("Registration is not open for this match.");
  }
  const status = target ? effectiveRegistrationStatus(target) : "";
  if (status === "full" || status === "closed") {
    throw new Error("Registration is not open for this match.");
  }
  const capped = record
    && status !== "waitlist"
    && status !== "closed"
    && status !== "full"
    && (record.origin === "director" || status === "open");
  const onWaitlist = Boolean(waitlisted)
    || status === "waitlist"
    || (capped && fieldCounts(matchId).confirmed >= Number(record.capacity));
  const previousDivision = user.division;
  const entry = {
    matchId,
    division: division || user.division,
    registeredAt: new Date().toISOString(),
    waitlisted: onWaitlist,
  };
  user.registrations.push(entry);
  if (division) user.division = division;
  commit(() => {
    user.registrations.pop();
    user.division = previousDivision;
  });
  return entry;
}

export function withdrawFromMatch(matchId) {
  const user = requireUser();
  const index = user.registrations.findIndex((item) => item.matchId === matchId);
  if (index < 0) return;
  const [removed] = user.registrations.splice(index, 1);
  const promoted = removed.waitlisted ? [] : fillMatchSpots(directedRecord(matchId), matchId);
  commit(() => {
    user.registrations.splice(index, 0, removed);
    restoreWaitlist(promoted);
  });
}

export function saveHistory(matchId, { placement = "", notes = "" } = {}) {
  const user = requireUser();
  const entry = {
    matchId,
    placement: String(placement || "").trim().slice(0, 40),
    notes: String(notes || "").trim().slice(0, 500),
    recordedAt: new Date().toISOString(),
  };
  const index = user.history.findIndex((item) => item.matchId === matchId);
  const previous = index >= 0 ? user.history[index] : null;
  if (index >= 0) user.history[index] = entry;
  else user.history.unshift(entry);
  commit(() => {
    if (previous) user.history[index] = previous;
    else user.history.shift();
  });
}

export function removeHistory(matchId) {
  const user = requireUser();
  const index = user.history.findIndex((item) => item.matchId === matchId);
  if (index < 0) return;
  const [removed] = user.history.splice(index, 1);
  commit(() => {
    user.history.splice(index, 0, removed);
  });
}

export function addListing(listing) {
  state.listings.unshift(listing);
  commit(() => {
    state.listings.shift();
  });
}

export function removeListing(id) {
  const user = requireUser();
  const index = state.listings.findIndex((item) => item.id === id);
  if (index >= 0) {
    if (state.listings[index].sellerId !== user.id && !isAdmin(user)) return false;
    const [removed] = state.listings.splice(index, 1);
    commit(() => {
      state.listings.splice(index, 0, removed);
    });
    return true;
  }
  if (!isAdmin(user)) return false;
  hideCatalogRecord("listings", id);
  return true;
}
