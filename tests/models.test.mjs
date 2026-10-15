import assert from "node:assert/strict";
import {
  articles,
  conditions,
  divisions,
  gear,
  gearCategories,
  learningCategories,
  listingCategories,
  matches,
  nextMatch,
  seedListings,
} from "../js/data/index.js";
const today = "2026-10-12";

function unique(items, label) {
  const ids = items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, `${label} ids are unique`);
}

unique(matches, "match");
unique(articles, "article");
unique(gear, "gear");
unique(seedListings, "listing");

assert.equal(matches.length, 0);
assert.equal(nextMatch(today), null);

for (const article of articles) {
  assert.ok(learningCategories.includes(article.category), article.category);
  assert.ok(["Essentials", "Mid Level", "Pro"].includes(article.level), article.id);
  assert.ok(article.sections.length >= 3, article.id);
  assert.equal(article.media.href, null);
}

for (const item of gear) {
  assert.ok(gearCategories.includes(item.category), item.category);
  assert.equal(item.links[0].href, null);
  assert.equal(item.image.src, null);
}

for (const listing of seedListings) {
  assert.ok(listingCategories.includes(listing.category));
  assert.ok(conditions.includes(listing.condition));
  assert.ok(listing.contact.includes("@"));
  assert.ok(["sale", "trade", "either"].includes(listing.listingType));
}

assert.ok(divisions.includes("Open"));
console.log(`models ok: ${matches.length} matches, ${articles.length} guides, ${gear.length} gear items, ${seedListings.length} listings`);
