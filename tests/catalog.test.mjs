import assert from "node:assert/strict";
import { addDays, cleanSegmentName, composeSegments, listingExpired } from "../js/util.js";

const memory = new Map();
globalThis.localStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(key, String(value));
  },
  removeItem(key) {
    memory.delete(key);
  },
};

const {
  addListing,
  addSegment,
  currentUser,
  directedMatches,
  ensureAdmin,
  hideCatalogRecord,
  hiddenIds,
  initStore,
  login,
  logout,
  pruneExpiredListings,
  registerUser,
  removeListing,
  removeSegment,
  saveCatalogRecord,
  saveDirectedMatch,
  saveVenue,
  setMatchDirector,
  updateListing,
  userListings,
} = await import("../js/store.js");
const {
  allArticles,
  allGear,
  allMatches,
  articleSegments,
  gearSegments,
  articles,
  conditions,
  disciplines,
  gear,
  gearCategories,
  learningCategories,
  listingCategories,
  matches,
  seedListings,
} = await import("../js/data/index.js");
const { allListings } = await import("../js/selectors.js");
const { articleDraft, catalogMatchDraft, gearDraft, listingDraft, matchDraft, venueDraft } = await import("../js/roles.js");

const TODAY = "2026-10-12";

assert.deepEqual(
  composeSegments(["Rifles", "Optics"], { added: ["Night gear", "rifles"], removed: ["Optics"] }),
  ["Rifles", "Night gear"],
);
assert.throws(() => cleanSegmentName(" x "), /2 to 40/);
assert.equal(cleanSegmentName("  Night   gear "), "Night gear");

assert.equal(addDays("2026-10-12", 90), "2027-01-10");
assert.equal(listingExpired("2026-10-12", "2026-10-12"), false);
assert.equal(listingExpired("2026-10-12", "2027-01-10"), false);
assert.equal(listingExpired("2026-10-12", "2027-01-11"), true);
assert.equal(listingExpired("2026-10-12T15:00:00.000Z", "2027-01-11"), true);
assert.equal(listingExpired("", "2027-01-11"), false);
assert.equal(listingExpired("not-a-date", "2027-01-11"), false);

for (const listing of seedListings) {
  assert.equal(listingExpired(listing.createdAt, TODAY), false, listing.id);
}

initStore();
const adminLogin = await ensureAdmin().then(() => login({
  email: "admin@matchpoint.local",
  password: "RangeAdmin",
}));
assert.equal(adminLogin.ok, true);

assert.equal(matches.length, 0);
const sample = {
  id: "catalog-fixture",
  name: "Catalog Fixture Match",
  startDate: "2026-10-24",
  endDate: "2026-10-25",
  location: { venue: "Rio Vista Range", city: "Bend", region: "OR" },
  discipline: "PRS",
  summary: "A catalog-only record used to check the editor keeps stages and documents.",
  description: "This record is not on the built-in calendar. The editor still has to keep its stages.",
  registrationStatus: "open",
  capacity: 120,
  fee: 150,
  matchDirector: "Lena Ortiz",
  schedule: { checkIn: "7:15 a.m.", firstShot: "8:30 a.m.", rounds: 98, stageCount: 2 },
  stages: [{ name: "Tank trap" }, { name: "Roof peak" }],
  documents: [{ label: "Match book" }, { label: "Stage photos" }, { label: "Results" }],
};
const renamed = catalogMatchDraft({
  name: "Catalog Fixture Renamed",
  startDate: sample.startDate,
  endDate: sample.endDate,
  venue: sample.location.venue,
  city: sample.location.city,
  region: sample.location.region,
  discipline: sample.discipline,
  registrationStatus: sample.registrationStatus,
  fee: sample.fee,
  capacity: sample.capacity,
  rounds: sample.schedule.rounds,
  matchDirector: sample.matchDirector,
  checkIn: sample.schedule.checkIn,
  firstShot: sample.schedule.firstShot,
  summary: sample.summary,
  description: sample.description,
}, sample, disciplines);
assert.equal(renamed.id, sample.id);
assert.equal(renamed.name, "Catalog Fixture Renamed");
assert.equal(renamed.stages.length, sample.stages.length);
assert.equal(renamed.documents.length, sample.documents.length);
assert.equal(renamed.origin, undefined);
saveCatalogRecord("matches", renamed);
assert.equal(allMatches(TODAY).some((match) => match.id === sample.id), false);
hideCatalogRecord("matches", sample.id);
assert.ok(hiddenIds("matches").includes(sample.id));
assert.equal(allMatches(TODAY).some((match) => match.id === sample.id), false);
assert.equal(matches.length, 0);

const article = articles[0];
const articleTitle = article.title;
const articleEdit = articleDraft({
  title: "Updated guide title here",
  category: article.category,
  level: article.level,
  minutes: article.minutes,
  summary: article.summary,
  heading: article.sections.map((section) => section.heading),
  paragraphs: article.sections.map((section) => section.paragraphs.join("\n\n")),
  list: article.sections.map((section) => (section.list || []).join("\n")),
}, article, learningCategories);
assert.equal(articleEdit.sections.length, article.sections.length);
assert.deepEqual(articleEdit.sections[0].paragraphs, article.sections[0].paragraphs);
if (article.sections[0].list) assert.deepEqual(articleEdit.sections[0].list, article.sections[0].list);

for (const source of articles) {
  const roundTrip = articleDraft({
    title: source.title,
    category: source.category,
    level: source.level,
    minutes: source.minutes,
    summary: source.summary,
    heading: source.sections.map((section) => section.heading),
    paragraphs: source.sections.map((section) => (section.paragraphs || []).join("\n\n")),
    list: source.sections.map((section) => (section.list || []).join("\n")),
  }, source, learningCategories);
  assert.equal(roundTrip.level, source.level, source.id);
  assert.equal(roundTrip.minutes, source.minutes, source.id);
  assert.equal(roundTrip.sections.length, source.sections.length, source.id);
  source.sections.forEach((section, index) => {
    assert.deepEqual(roundTrip.sections[index].paragraphs, section.paragraphs, `${source.id} paragraphs`);
    assert.deepEqual(roundTrip.sections[index].list, section.list, `${source.id} list`);
  });
}
assert.equal(articleDraft({
  title: article.title,
  category: article.category,
  level: "Practice",
  summary: article.summary,
  heading: article.sections.map((section) => section.heading),
  paragraphs: article.sections.map((section) => (section.paragraphs || []).join("\n\n")),
  list: article.sections.map((section) => (section.list || []).join("\n")),
}, article, learningCategories).level, "Mid Level");
assert.equal(articleDraft({
  title: article.title,
  category: article.category,
  level: "Pro",
  summary: article.summary,
  heading: article.sections.map((section) => section.heading),
  paragraphs: article.sections.map((section) => (section.paragraphs || []).join("\n\n")),
  list: article.sections.map((section) => (section.list || []).join("\n")),
}, article, learningCategories).level, "Pro");
assert.throws(() => articleDraft({
  title: article.title,
  category: article.category,
  level: "Expert",
  summary: article.summary,
  heading: article.sections.map((section) => section.heading),
  paragraphs: article.sections.map((section) => (section.paragraphs || []).join("\n\n")),
  list: article.sections.map((section) => (section.list || []).join("\n")),
}, article, learningCategories), /level/);

saveCatalogRecord("articles", articleEdit);
assert.equal(allArticles().find((item) => item.id === article.id).title, "Updated guide title here");
assert.equal(articles.find((item) => item.id === article.id).title, articleTitle);
hideCatalogRecord("articles", article.id);
assert.equal(allArticles().some((item) => item.id === article.id), false);
assert.equal(articles.some((item) => item.id === article.id), true);

const item = gear[0];
const gearName = item.name;
const gearEdit = gearDraft({
  name: "Updated gear name",
  category: item.category,
  priceBand: "$400–$600",
  bestFor: item.bestFor,
  summary: item.summary,
  description: item.description,
  why: item.why,
}, item, gearCategories);
assert.equal(gearEdit.diagram, item.diagram);
assert.equal(gearEdit.image, item.image);
saveCatalogRecord("gear", gearEdit);
assert.equal(allGear().find((entry) => entry.id === item.id).priceBand, "$400–$600");
assert.equal(gear.find((entry) => entry.id === item.id).name, gearName);

logout();
const shooter = await registerUser({
  name: "Shooter One",
  email: "shooter@example.com",
  password: "password1",
});
assert.equal(shooter.ok, true);
assert.throws(() => hideCatalogRecord("gear", item.id), /general admin/);
assert.equal(removeListing(seedListings[0].id), false);
assert.equal(allListings(TODAY).some((listing) => listing.id === seedListings[0].id), true);

const seller = currentUser();
addListing({
  id: "lst-old",
  title: "Old optic leaving the board",
  description: "This post is old enough to leave the equipment board.",
  category: "Optics",
  condition: "Good",
  listingType: "sale",
  price: 100,
  tradePreference: "",
  contact: "shooter@example.com",
  location: "Bend, OR",
  sellerId: seller.id,
  sellerName: seller.name,
  createdAt: "2026-06-01T12:00:00.000Z",
  origin: "member",
});
addListing({
  id: "lst-new",
  title: "Fresh bipod still on the board",
  description: "This post is inside the ninety day window and stays up.",
  category: "Bipods",
  condition: "Like new",
  listingType: "sale",
  price: 200,
  tradePreference: "",
  contact: "shooter@example.com",
  location: "Bend, OR",
  sellerId: seller.id,
  sellerName: seller.name,
  createdAt: "2026-10-01T12:00:00.000Z",
  origin: "member",
});
assert.equal(pruneExpiredListings(TODAY), 1);
assert.equal(userListings().some((listing) => listing.id === "lst-old"), false);
assert.equal(allListings(TODAY).some((listing) => listing.id === "lst-new"), true);
assert.equal(allListings("2027-02-01").some((listing) => listing.origin === "seed" || listing.id === "lst-new"), false);
assert.ok(seedListings.length > 0);

addListing({
  id: "lst-stale",
  title: "Stale post cleaned on boot",
  description: "This post is far past ninety days and leaves storage on boot.",
  category: "Other",
  condition: "Fair",
  listingType: "trade",
  price: null,
  tradePreference: "Any bag",
  contact: "shooter@example.com",
  location: "",
  sellerId: seller.id,
  sellerName: seller.name,
  createdAt: "2000-01-01T00:00:00.000Z",
  origin: "member",
});
initStore();
assert.equal(userListings().some((listing) => listing.id === "lst-stale"), false);
assert.equal(userListings().some((listing) => listing.id === "lst-new"), true);

const adaJoin = await registerUser({
  name: "Ada Quinn",
  email: "ada@example.com",
  password: "password1",
});
assert.equal(adaJoin.ok, true);
const ada = currentUser();
logout();
assert.equal((await login({ email: "admin@matchpoint.local", password: "RangeAdmin" })).ok, true);
setMatchDirector(ada.id, true);
logout();
assert.equal((await login({ email: "ada@example.com", password: "password1" })).ok, true);
const venue = venueDraft(ada, { name: "Basin Range", address: "100 Range Road, Burns, OR" });
saveVenue(venue);
const fields = {
  name: "Basin Steel",
  startDate: "2026-11-02",
  endDate: "2026-11-02",
  venue: venue.name,
  address: venue.address,
  venueId: venue.id,
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
const posted = matchDraft(ada, fields, disciplines);
saveDirectedMatch(posted);
logout();
assert.equal((await login({ email: "admin@matchpoint.local", password: "RangeAdmin" })).ok, true);
const edited = matchDraft(currentUser(), { ...fields, name: "Admin kept director" }, disciplines, posted);
assert.equal(edited.directorUserId, ada.id);
assert.equal(edited.matchDirector, "Ada Quinn");
saveDirectedMatch(edited);
const stored = directedMatches().find((match) => match.id === posted.id);
assert.equal(stored.directorUserId, ada.id);
assert.equal(stored.matchDirector, "Ada Quinn");
assert.equal(stored.name, "Admin kept director");
assert.ok(allMatches(TODAY).some((match) => match.id === posted.id && match.name === "Admin kept director"));
assert.equal(allMatches(TODAY).some((match) => match.origin !== "director"), false);

const fresh = userListings().find((listing) => listing.id === "lst-new");
const revised = listingDraft({
  title: "Fresh bipod retitled by admin",
  description: fresh.description,
  category: fresh.category,
  condition: fresh.condition,
  listingType: fresh.listingType,
  price: fresh.price,
  tradePreference: fresh.tradePreference,
  contact: fresh.contact,
  location: fresh.location,
}, { ...fresh, createdAt: "2099-01-01T00:00:00.000Z" }, listingCategories, conditions);
updateListing(revised);
const keptFresh = userListings().find((listing) => listing.id === "lst-new");
assert.equal(keptFresh.title, "Fresh bipod retitled by admin");
assert.equal(keptFresh.createdAt, fresh.createdAt);
assert.equal(keptFresh.sellerId, fresh.sellerId);

const seed = seedListings.find((listing) => listing.id === "seed-atacr");
const seedTitle = seed.title;
const seedDraft = listingDraft({
  title: "Nightforce ATACR renamed by admin",
  description: seed.description,
  category: seed.category,
  condition: seed.condition,
  listingType: seed.listingType,
  price: seed.price,
  tradePreference: seed.tradePreference,
  contact: seed.contact,
  location: seed.location,
}, seed, listingCategories, conditions);
assert.equal(seedDraft.createdAt, seed.createdAt);
assert.equal(seedDraft.sellerId, seed.sellerId);
updateListing(seedDraft);
const shownSeed = allListings(TODAY).find((listing) => listing.id === seed.id);
assert.equal(shownSeed.title, "Nightforce ATACR renamed by admin");
assert.equal(shownSeed.createdAt, seed.createdAt);
assert.equal(seedListings.find((listing) => listing.id === seed.id).title, seedTitle);
assert.equal(removeListing("seed-atlas"), true);
assert.equal(allListings(TODAY).some((listing) => listing.id === "seed-atlas"), false);
assert.equal(seedListings.some((listing) => listing.id === "seed-atlas"), true);

assert.deepEqual(gearSegments(), ["Rifles", "Optics", "Bags", "Bipods", "Tripods", "Support Gear"]);
assert.equal(addSegment("gear", "  Night gear ", gearCategories), "Night gear");
assert.equal(gearSegments().at(-1), "Night gear");
assert.throws(() => addSegment("gear", "rifles", gearCategories), /already exists/);
const hit = allGear().find((item) => item.id === "seekins-hit");
saveCatalogRecord("gear", { ...hit, category: "Night gear" });
assert.equal(allGear().find((item) => item.id === "seekins-hit").category, "Night gear");
assert.throws(
  () => removeSegment("gear", "Night gear", gearCategories, allGear().map((item) => item.category)),
  /Move the cards/,
);
saveCatalogRecord("gear", { ...allGear().find((item) => item.id === "seekins-hit"), category: "Rifles" });
removeSegment("gear", "Night gear", gearCategories, allGear().map((item) => item.category));
assert.equal(gearSegments().includes("Night gear"), false);
removeSegment("gear", "Tripods", gearCategories, ["Rifles"]);
assert.equal(gearSegments().includes("Tripods"), false);
addSegment("gear", "Tripods", gearCategories);
assert.deepEqual(gearSegments(), ["Rifles", "Optics", "Bags", "Bipods", "Tripods", "Support Gear"]);
assert.equal(addSegment("articles", "Night firing", learningCategories), "Night firing");
assert.equal(articleSegments().at(-1), "Night firing");
removeSegment("articles", "Night firing", learningCategories, []);
assert.equal(articleSegments().includes("Night firing"), false);

const lesson = articleDraft({
  title: "Calling a wind hold",
  category: "Fundamentals",
  level: "Pro",
  summary: "A short lesson on committing to one wind call.",
  heading: ["Make the call"],
  paragraphs: ["Pick a value and shoot it. Changing systems mid-stage costs the points."],
  list: [""],
}, null, learningCategories);
assert.equal(lesson.origin, "admin");
assert.equal(lesson.level, "Pro");
assert.equal(lesson.sections.length, 1);
saveCatalogRecord("articles", lesson);
assert.equal(allArticles().find((item) => item.id === lesson.id)?.title, "Calling a wind hold");
hideCatalogRecord("articles", lesson.id);
assert.equal(allArticles().some((item) => item.id === lesson.id), false);

console.log("catalog ok");
