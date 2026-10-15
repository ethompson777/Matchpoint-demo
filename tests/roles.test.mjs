import assert from "node:assert/strict";
import { disciplines } from "../js/data/index.js";
import { isAdmin, isMatchDirector, matchDraft, roleLabel, venueDraft } from "../js/roles.js";
import { addDays, effectiveRegistrationStatus, registrationNotYetOpen, registrationOpensDate, todayISO } from "../js/util.js";

assert.equal(isAdmin({ role: "admin" }), true);
assert.equal(isAdmin({ role: "member" }), false);
assert.equal(isAdmin(null), false);

assert.equal(isMatchDirector({ permissions: { matchDirector: true } }), true);
assert.equal(isMatchDirector({ permissions: { matchDirector: false } }), false);
assert.equal(isMatchDirector({}), false);

assert.equal(roleLabel({ role: "admin", permissions: { matchDirector: false } }), "General admin");
assert.equal(roleLabel({ role: "member", permissions: { matchDirector: true } }), "Match director");
assert.equal(roleLabel({ role: "admin", permissions: { matchDirector: true } }), "Admin · Match director");
assert.equal(roleLabel({ role: "member", permissions: {} }), "Shooter");

const director = { id: "usr-ada", name: "Ada Quinn" };
const fields = {
  name: "Basin Steel",
  startDate: "2026-11-02",
  endDate: "2026-11-02",
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
};

const match = matchDraft(director, fields, disciplines);
assert.equal(match.directorUserId, "usr-ada");
assert.equal(match.matchDirector, "Ada Quinn");
assert.equal(match.origin, "director");
assert.equal(match.fee, 40);
assert.equal(match.capacity, 28);
assert.equal(match.schedule.rounds, "48");
assert.deepEqual(match.stages, []);
assert.equal(match.schedule.stageCount, 0);
assert.deepEqual(match.courses, {});
const ranged = matchDraft(director, { ...fields, rounds: "100-150" }, disciplines);
assert.equal(ranged.schedule.rounds, "100-150");
const short = matchDraft(director, { ...fields, rounds: "6" }, disciplines);
assert.equal(short.schedule.rounds, "6");
assert.throws(() => matchDraft(director, { ...fields, rounds: "   " }, disciplines), /round count/);
assert.throws(() => matchDraft(director, { ...fields, capacity: "0" }, disciplines), /Max shooters/);
assert.equal(match.integrations.impactMatchId, null);
assert.equal(match.results.published, false);
assert.equal(match.venueId, "ven-basin");
assert.equal(match.location.address, "100 Range Road, Burns, OR");

const venue = venueDraft(director, { name: "High Basin Range", address: "100 Range Road, Burns, OR" });
assert.equal(venue.directorUserId, "usr-ada");
assert.equal(venue.name, "High Basin Range");
assert.throws(
  () => venueDraft(director, { name: "Basin", address: "short" }),
  /Address/,
);
assert.throws(
  () => matchDraft(director, { ...fields, venueId: "" }, disciplines),
  /Choose a venue/,
);
assert.equal(match.recurrence, null);
assert.deepEqual(match.exceptions, {});

const edited = matchDraft(director, { ...fields, name: "Basin Steel Sunday", registrationStatus: "waitlist" }, disciplines, match);
assert.equal(edited.id, match.id);
assert.equal(edited.name, "Basin Steel Sunday");
assert.equal(edited.registrationStatus, "waitlist");
assert.equal(edited.registrationLeadDays, null);
assert.equal(edited.stages, match.stages);
const closedDraft = matchDraft(director, { ...fields, registrationStatus: "closed" }, disciplines);
assert.equal(closedDraft.registrationStatus, "closed");
assert.throws(
  () => matchDraft(director, { ...fields, registrationStatus: "full" }, disciplines),
  /registration status/,
);

const kept = matchDraft(
  director,
  { ...fields, repeat: "monthly" },
  disciplines,
  { ...match, registrationLeadDays: 21 },
);
assert.equal(kept.registrationLeadDays, 21);
assert.ok(kept.recurrence);
const dropped = matchDraft(
  director,
  fields,
  disciplines,
  { ...match, registrationLeadDays: 21, recurrence: kept.recurrence },
);
assert.equal(dropped.recurrence, null);
assert.equal(dropped.registrationLeadDays, null);
assert.equal(
  matchDraft(director, { ...fields, repeat: "monthly" }, disciplines, { ...match, registrationLeadDays: 400 }).registrationLeadDays,
  null,
);

const adminEditor = { id: "usr-admin", name: "MatchPoint Admin" };
const preserved = matchDraft(adminEditor, { ...fields, name: "Basin Steel Kept" }, disciplines, match);
assert.equal(preserved.directorUserId, "usr-ada");
assert.equal(preserved.matchDirector, "Ada Quinn");
assert.equal(preserved.name, "Basin Steel Kept");

assert.equal(addDays("2026-11-28", -14), "2026-11-14");
const gated = { origin: "director", startDate: "2026-11-28", registrationLeadDays: 14 };
assert.equal(registrationOpensDate(gated), "2026-11-14");
assert.equal(registrationNotYetOpen(gated, "2026-11-13"), true);
assert.equal(registrationNotYetOpen(gated, "2026-11-14"), false);
assert.equal(registrationOpensDate({ origin: "director", startDate: "2026-11-28" }), null);
assert.equal(registrationOpensDate({ registrationStatus: "closed", registrationOpens: "2026-12-01", startDate: "2027-01-16" }), null);
assert.equal(registrationOpensDate({
  origin: "director",
  registrationStatus: "closed",
  registrationLeadDays: 14,
  startDate: "2026-11-28",
}), "2026-11-14");
const moved = { origin: "director", startDate: "2026-12-05", registrationLeadDays: 14 };
assert.equal(registrationOpensDate(moved), "2026-11-21");

const clock = todayISO();
const insideDate = addDays(clock, 10);
const outsideDate = addDays(clock, 40);
const autoClosed = {
  origin: "director",
  registrationStatus: "closed",
  registrationLeadDays: 30,
};
assert.equal(effectiveRegistrationStatus({ ...autoClosed, startDate: insideDate }, clock), "open");
assert.equal(registrationNotYetOpen({ ...autoClosed, startDate: insideDate }, clock), false);
assert.equal(effectiveRegistrationStatus({ ...autoClosed, startDate: outsideDate }, clock), "closed");
assert.equal(registrationNotYetOpen({ ...autoClosed, startDate: outsideDate }, clock), true);
assert.equal(effectiveRegistrationStatus({
  origin: "director",
  registrationStatus: "closed",
  startDate: insideDate,
}, clock), "closed");
assert.equal(effectiveRegistrationStatus({
  origin: "director",
  registrationStatus: "waitlist",
  registrationLeadDays: 30,
  startDate: insideDate,
}, clock), "waitlist");
assert.equal(effectiveRegistrationStatus({
  origin: "director",
  registrationStatus: "open",
  registrationLeadDays: 30,
  startDate: outsideDate,
}, clock), "closed");

assert.throws(
  () => matchDraft(director, { ...fields, endDate: "2026-10-01" }, disciplines),
  /End date is before the start date/,
);
assert.throws(
  () => matchDraft(director, { ...fields, discipline: "F-Class" }, disciplines),
  /Choose a discipline/,
);

const memory = new Map();
globalThis.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};

const {
  currentUser,
  directedMatches,
  ensureAdmin,
  initStore,
  login,
  logout,
  registerForMatch,
  registerUser,
  saveDirectedMatch,
  saveVenue,
  setMatchDirector,
  signupIsWaitlist,
  updateDirectedStatus,
} = await import("../js/store.js");

initStore();
await ensureAdmin();
assert.equal((await registerUser({ name: "Ada Quinn", email: "ada-closed@example.com", password: "range-pass" })).ok, true);
const ada = currentUser();
logout();
assert.equal((await registerUser({ name: "Sam Shooter", email: "sam-closed@example.com", password: "range-pass" })).ok, true);
logout();
assert.equal((await registerUser({ name: "Jo Lane", email: "jo-closed@example.com", password: "range-pass" })).ok, true);
logout();
assert.equal((await login({ email: "admin@matchpoint.local", password: "RangeAdmin" })).ok, true);
setMatchDirector(ada.id, true);
logout();
assert.equal((await login({ email: "ada-closed@example.com", password: "range-pass" })).ok, true);
const closedVenue = venueDraft(ada, { name: "Basin Range", address: "100 Range Road, Burns, OR" });
saveVenue(closedVenue);
const posted = saveDirectedMatch(matchDraft(ada, {
  ...fields,
  name: "Closed Basin",
  venueId: closedVenue.id,
  venue: closedVenue.name,
  address: closedVenue.address,
  capacity: "1",
  registrationStatus: "open",
}, disciplines));
logout();
assert.equal((await login({ email: "sam-closed@example.com", password: "range-pass" })).ok, true);
assert.equal(registerForMatch(posted.id, "Open").waitlisted, false);
logout();
assert.equal((await login({ email: "ada-closed@example.com", password: "range-pass" })).ok, true);
updateDirectedStatus(posted.id, "closed");
const closedRecord = directedMatches().find((item) => item.id === posted.id);
assert.equal(closedRecord.registrationStatus, "closed");
assert.equal(signupIsWaitlist(closedRecord), false);
assert.throws(() => updateDirectedStatus(posted.id, "full"), /registration status/);
logout();
assert.equal((await login({ email: "jo-closed@example.com", password: "range-pass" })).ok, true);
assert.throws(() => registerForMatch(posted.id, "Open"), /not open/);
logout();
assert.equal((await login({ email: "ada-closed@example.com", password: "range-pass" })).ok, true);
updateDirectedStatus(posted.id, "open");
logout();
assert.equal((await login({ email: "jo-closed@example.com", password: "range-pass" })).ok, true);
assert.equal(registerForMatch(posted.id, "Open").waitlisted, true);

logout();
assert.equal((await login({ email: "ada-closed@example.com", password: "range-pass" })).ok, true);
const near = saveDirectedMatch(matchDraft(ada, {
  ...fields,
  name: "Near auto open",
  startDate: insideDate,
  endDate: insideDate,
  venueId: closedVenue.id,
  venue: closedVenue.name,
  address: closedVenue.address,
  registrationStatus: "closed",
  capacity: "10",
}, disciplines));
const far = saveDirectedMatch(matchDraft(ada, {
  ...fields,
  name: "Far auto open",
  startDate: outsideDate,
  endDate: outsideDate,
  venueId: closedVenue.id,
  venue: closedVenue.name,
  address: closedVenue.address,
  registrationStatus: "closed",
  capacity: "10",
}, disciplines));
directedMatches().find((item) => item.id === near.id).registrationLeadDays = 30;
directedMatches().find((item) => item.id === far.id).registrationLeadDays = 30;
logout();
assert.equal((await login({ email: "jo-closed@example.com", password: "range-pass" })).ok, true);
assert.equal(registerForMatch(near.id, "Open").waitlisted, false);
assert.throws(() => registerForMatch(far.id, "Open"), /not open/);

console.log("roles ok");
