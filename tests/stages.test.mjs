import assert from "node:assert/strict";
import { courseFor, expandMatch, occurrenceDates } from "../js/recurrence.js";
import { courseStageList, matchDraft, packStageImage, stageDraft, stageSnapshot, venueDraft } from "../js/roles.js";
import { cleanLayout, stageEditorHtml, stagePicture } from "../js/stage-board.js";
import { isCourseBrief } from "../js/util.js";

const director = { id: "usr-ada", name: "Ada Quinn" };
const disciplines = ["PRS", "Outlaw"];
const fields = {
  name: "Basin Steel",
  startDate: "2026-11-28",
  endDate: "2026-11-28",
  venue: "Basin Range",
  address: "100 Range Road, Burns, OR",
  venueId: "ven-basin",
  discipline: "PRS",
  summary: "One-day club PRS with a prone bay and a barricade.",
  description: "Squads shoot a short course. The match book is a placeholder until the director posts it.",
  fee: "40",
  capacity: "28",
  rounds: "100-150",
  registrationStatus: "open",
  checkIn: "0800",
  firstShot: "0900",
};
const stageFields = {
  name: "Tank trap",
  shots: "10",
  time: "120 seconds",
  props: "Tank trap, ladder",
  distance: "44 yards, 1 inch",
  target: "Steel",
  restrictions: "None",
  startPosition: "Standing, rifle in hand",
  points: "10 per impact",
  description: "Start on the near plate.\nThen the far plate.",
};

assert.equal(isCourseBrief([{ name: "Course brief", distance: "See the match book" }]), true);
assert.equal(isCourseBrief([]), false);

const stage = stageDraft(director, stageFields);
assert.equal(stage.directorUserId, "usr-ada");
assert.equal(stage.shots, 10);
assert.equal(stage.description, "Start on the near plate.\nThen the far plate.");
assert.throws(() => stageDraft(director, { ...stageFields, description: "short" }), /Course of fire/);
assert.throws(() => stageDraft(director, { ...stageFields, shots: "0" }), /Round count/);
assert.throws(
  () => packStageImage({ src: `data:image/jpeg;base64,${"a".repeat(180001)}` }, "Tank trap"),
  /too large/,
);

const photo = { src: "data:image/jpeg;base64,aaaa", alt: "old", width: 12, height: 8 };
const snap = stageSnapshot({ ...stage, image: photo });
assert.equal(snap.sourceId, stage.id);
assert.equal(snap.image.src, photo.src);
assert.equal(snap.image.alt, "Tank trap");
assert.equal(courseStageList([snap])[0].name, "Tank trap");
const picture = cleanLayout([
  { kind: "barricade", x: 12, y: 30 },
  { kind: "made-up", x: 10, y: 10 },
  { kind: "plate", x: -8, y: 140 },
]);
assert.deepEqual(picture, [
  { kind: "barricade", x: 12, y: 30 },
  { kind: "plate", x: 4, y: 96 },
]);
assert.equal(cleanLayout([{ kind: "barricade", x: 20, y: 20, distance: "10 yds" }])[0].distance, undefined);
assert.deepEqual(cleanLayout([
  { kind: "barrel-horizontal", x: 30, y: 40, distance: "10" },
  { kind: "tire-horizontal", x: 50, y: 50, distance: "10" },
  { kind: "bucket", x: 70, y: 60, distance: "10" },
]), [
  { kind: "barrel-horizontal", x: 30, y: 40 },
  { kind: "tire-horizontal", x: 50, y: 50 },
  { kind: "bucket", x: 70, y: 60 },
]);
assert.equal(cleanLayout([{ kind: "plate", x: 40, y: 60, distance: "  44 yards  " }])[0].distance, "44 yards");
assert.equal(cleanLayout([{ kind: "kyl", x: 40, y: 50, distance: "40" }])[0].distance, "40");
assert.equal(cleanLayout([{ kind: "pyramid", x: 22, y: 70 }])[0].kind, "pyramid");
assert.equal(cleanLayout([{ kind: "tripod", x: 22, y: 70, distance: "10" }])[0].distance, undefined);
assert.equal(cleanLayout([{ kind: "chair", x: 22, y: 70, distance: "10" }])[0].distance, undefined);
assert.equal(cleanLayout([{ kind: "round-plate", x: 40, y: 50, distance: "50" }])[0].distance, "50");
assert.equal(cleanLayout([{ kind: "window", x: 22, y: 70 }])[0].kind, "window");
const palette = stageEditorHtml({});
for (const label of ["Cinderblock", "Cinderblocks x2", "6 ft ladder", "55-gal barrel", "Horizontal cradle", "Vertical cradle", "Rooftop", "Pyramid", "Tank trap", "Sawhorse", "Chair", "5-gal bucket", "2-gal bucket", "Tripod", "Tire", "Single hanger", "Double hanger", "KYL rack", "Round plate", "Square plate"]) {
  assert.match(palette, new RegExp(`>${label}<`));
}
assert.doesNotMatch(palette, /data-add-piece="window"/);
assert.doesNotMatch(palette, /data-add-piece="paper"/);
assert.match(palette, /data-add-piece="tire"/);
assert.equal(cleanLayout([{ kind: "double-hanger", x: 50, y: 40, distance: "180" }])[0].distance, "180");
assert.deepEqual(cleanLayout("nope"), []);
assert.equal(cleanLayout(new Array(30).fill({ kind: "tire", x: 50, y: 50 })).length, 24);
const drawn = stageDraft(director, { ...stageFields, layout: JSON.stringify(picture) });
assert.deepEqual(drawn.layout, picture);
const drawnSnap = stageSnapshot({ ...drawn, image: photo });
assert.deepEqual(drawnSnap.layout, picture);
assert.deepEqual(courseStageList([drawnSnap])[0].layout, picture);
const sheet = stagePicture({
  layout: [
    { kind: "plate", x: 30, y: 72, distance: "44 yards" },
    { kind: "plate", x: 62, y: 42, distance: "88 yards" },
  ],
  startPosition: "Rifle in hand",
  description: "Engage the near plate, then the far plate.",
});
assert.match(sheet, /stage-sheet/);
assert.match(sheet, /stage-bay/);
assert.match(sheet, /Start position/);
assert.match(sheet, /Rifle in hand/);
assert.match(sheet, /Description/);
assert.match(sheet, /Engage the near plate/);
assert.match(sheet, /44 yards/);
assert.match(sheet, /88 yards/);
assert.doesNotMatch(sheet, /44 yards yds/);
const numbered = stagePicture({
  layout: [
    { kind: "plate", x: 40, y: 55, distance: "75" },
    { kind: "double-hanger", x: 72, y: 32, distance: "100" },
    { kind: "paper", x: 55, y: 40, distance: "100 yds" },
  ],
}, { thumb: true });
assert.match(numbered, />75 yds</);
assert.match(numbered, />100 yds</);
assert.doesNotMatch(numbered, /100 yds yds/);
assert.equal(stagePicture({}), "");
const thumb = stagePicture({ layout: picture, startPosition: "Rifle in hand", distance: "44 yards" }, { thumb: true });
assert.match(thumb, /stage-thumb/);
assert.doesNotMatch(thumb, /Start position/);
assert.throws(() => courseStageList(new Array(31).fill(snap)), /30 stages/);

const series = matchDraft(director, { ...fields, repeat: "monthly" }, disciplines);
const dates = occurrenceDates(series, "2026-10-12");
assert.ok(dates.length >= 3);
assert.equal(dates[0], "2026-11-28");

const kept = matchDraft(director, { ...fields, repeat: "monthly" }, disciplines, {
  ...series,
  courses: {
    [dates[0]]: [snap],
    "1999-01-01": [snap],
  },
  stages: [{ name: "Course brief", shots: 10, time: "90 seconds", distance: "See the match book", target: "Steel", description: "x" }],
});
assert.equal(kept.courses["1999-01-01"], undefined);
assert.equal(kept.courses[dates[0]][0].name, "Tank trap");
assert.deepEqual(kept.stages, []);

const movedDate = matchDraft(director, { ...fields, startDate: "2026-11-29", endDate: "2026-11-29" }, disciplines, {
  ...matchDraft(director, fields, disciplines),
  courses: { "2026-11-28": [snap] },
});
assert.deepEqual(Object.keys(movedDate.courses), ["2026-11-29"]);
assert.equal(movedDate.stages[0].name, "Tank trap");
assert.equal(movedDate.schedule.stageCount, 1);

const legacy = {
  id: "mch-legacy",
  origin: "director",
  startDate: dates[0],
  endDate: dates[0],
  recurrence: series.recurrence,
  stages: [{ name: "Course brief", shots: 10, time: "90 seconds", distance: "See the match book", target: "Steel", description: "brief" }],
  schedule: { rounds: "120", stageCount: 1, checkIn: "0800", firstShot: "0900" },
  courses: { [dates[1]]: [{ ...snap, name: "Window" }] },
  exceptions: { [dates[0]]: { startDate: "2026-12-01", endDate: "2026-12-01", note: "Holiday" } },
};
const rows = expandMatch(legacy, "2026-10-12");
const holiday = rows.find((row) => row.occurrenceDate === dates[0]);
const posted = rows.find((row) => row.occurrenceDate === dates[1]);
const open = rows.find((row) => row.occurrenceDate === dates[2]);
assert.equal(holiday.startDate, "2026-12-01");
assert.equal(holiday.stages.length, 0);
assert.equal(holiday.schedule.rounds, "120");
assert.equal(posted.stages[0].name, "Window");
assert.equal(posted.schedule.stageCount, 1);
assert.equal(open.stages.length, 0);
assert.equal(courseFor(legacy, dates[1])[0].name, "Window");

const sample = { id: "sample", startDate: "2026-11-01", endDate: "2026-11-01", stages: [{ name: "A", shots: 10 }], schedule: { stageCount: 8, rounds: 80 } };
assert.equal(expandMatch(sample, "2026-10-12")[0], sample);

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
  ensureDirector,
  initStore,
  login,
  logout,
  registerUser,
  removeStage,
  saveDirectedMatch,
  saveStage,
  saveVenue,
  setMatchCourse,
  setMatchDirector,
  setOccurrenceException,
  stages,
} = await import("../js/store.js");

initStore();
await ensureAdmin();
const registered = await registerUser({ name: "Ada Quinn", email: "ada-stages@example.com", password: "range-pass" });
assert.equal(registered.ok, true);
const ada = currentUser();
logout();
assert.equal((await login({ email: "admin@matchpoint.local", password: "RangeAdmin" })).ok, true);
setMatchDirector(ada.id, true);
logout();
assert.equal((await login({ email: "ada-stages@example.com", password: "range-pass" })).ok, true);

const venue = venueDraft(ada, { name: "Basin Range", address: "100 Range Road, Burns, OR" });
saveVenue(venue);
const postedMatch = saveDirectedMatch(matchDraft(ada, {
  ...fields,
  venueId: venue.id,
  venue: venue.name,
  address: venue.address,
  repeat: "monthly",
}, disciplines));
const matchDates = occurrenceDates(postedMatch, "2026-10-12");
const library = saveStage({ ...stageDraft(ada, stageFields), image: photo });
setMatchCourse(postedMatch.id, matchDates[0], [stageSnapshot(library)]);
const renamed = saveStage(stageDraft(ada, { ...stageFields, name: "Roof peak" }, library));
renamed.image = { src: "data:image/jpeg;base64,bbbb", alt: "Roof peak", width: 12, height: 8 };
saveStage(renamed);
const stored = directedMatches().find((match) => match.id === postedMatch.id);
assert.equal(stored.courses[matchDates[0]][0].name, "Tank trap");
assert.equal(stored.courses[matchDates[0]][0].image.src, photo.src);
assert.equal(stages().find((item) => item.id === library.id).name, "Roof peak");
assert.equal(stages().find((item) => item.id === library.id).image.src, "data:image/jpeg;base64,bbbb");

const expanded = expandMatch(stored, "2026-10-12");
assert.equal(expanded.find((row) => row.occurrenceDate === matchDates[0]).stages[0].props, "Tank trap, ladder");
assert.equal(expanded.find((row) => row.occurrenceDate === matchDates[1]).stages.length, 0);

setOccurrenceException(postedMatch.id, matchDates[0], { startDate: "2026-12-01", endDate: "2026-12-01", note: "Holiday" });
const afterMove = expandMatch(directedMatches().find((match) => match.id === postedMatch.id), "2026-10-12")
  .find((row) => row.occurrenceDate === matchDates[0]);
assert.equal(afterMove.startDate, "2026-12-01");
assert.equal(afterMove.stages[0].name, "Tank trap");

removeStage(library.id);
assert.equal(stages().some((item) => item.id === library.id), false);
assert.equal(directedMatches().find((match) => match.id === postedMatch.id).courses[matchDates[0]][0].name, "Tank trap");

logout();
const shooter = await registerUser({ name: "Sam Shooter", email: "sam-stages@example.com", password: "range-pass" });
assert.equal(shooter.ok, true);
assert.throws(() => saveStage(stageDraft(currentUser(), stageFields)), /Match director permission/);
assert.throws(() => setMatchCourse(postedMatch.id, matchDates[1], []), /Match director permission/);

logout();
assert.equal((await login({ email: "admin@matchpoint.local", password: "RangeAdmin" })).ok, true);
const adminSnap = stageSnapshot({
  id: "stg-window",
  name: "Window",
  shots: 8,
  time: "90 seconds",
  description: "Shoot from the window ledge.",
});
setMatchCourse(postedMatch.id, matchDates[1], [adminSnap]);
const adminSaved = directedMatches().find((match) => match.id === postedMatch.id);
assert.equal(adminSaved.directorUserId, ada.id);
assert.equal(adminSaved.courses[matchDates[1]][0].name, "Window");
assert.equal(adminSaved.courses[matchDates[0]][0].name, "Tank trap");

logout();
await ensureDirector();
const directorLogin = await login({ email: "matchdirector@matchpoint.local", password: "MatchDirector" });
assert.equal(directorLogin.ok, true);
const demoDirector = currentUser();
assert.equal(demoDirector.role, "member");
assert.equal(demoDirector.permissions.matchDirector, true);
assert.equal(demoDirector.name, "Match Director");
const barrels = stages().find((item) => item.id === "stg-demo-barrels");
const ladder = stages().find((item) => item.id === "stg-demo-ladder");
assert.equal(barrels.name, "Barrels");
assert.equal(barrels.shots, 12);
assert.equal(barrels.time, "120");
assert.equal(barrels.directorUserId, demoDirector.id);
assert.deepEqual(barrels.layout, [
  { kind: "barrel-horizontal", x: 19.1, y: 75.1 },
  { kind: "plate", x: 43.3, y: 38.8, distance: "40" },
  { kind: "double-hanger", x: 79.2, y: 20.1, distance: "100" },
]);
assert.equal(ladder.name, "Ladder");
assert.equal(ladder.shots, 10);
assert.equal(ladder.time, "120");
assert.equal(ladder.directorUserId, demoDirector.id);
assert.equal(ladder.layout.filter((item) => item.distance).map((item) => item.distance).join(","), "40,50,85");
const before = stages().length;
await ensureDirector();
assert.equal(stages().filter((item) => item.id === "stg-demo-barrels").length, 1);
assert.equal(stages().length, before);
demoDirector.salt = "broken";
demoDirector.passwordHash = "broken";
demoDirector.role = "admin";
demoDirector.permissions.matchDirector = false;
await ensureDirector();
assert.equal((await login({ email: "matchdirector@matchpoint.local", password: "MatchDirector" })).ok, true);
assert.equal(currentUser().role, "member");
assert.equal(currentUser().permissions.matchDirector, true);
assert.equal(stages().filter((item) => item.id === "stg-demo-ladder").length, 1);
logout();
const reserved = await registerUser({ name: "Other Director", email: "matchdirector@matchpoint.local", password: "range-pass" });
assert.equal(reserved.ok, false);
assert.match(reserved.error, /match director account/);

console.log("stages ok");
