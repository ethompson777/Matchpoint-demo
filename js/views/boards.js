import { conditions, listingCategories } from "../data/index.js";
import { isAdmin } from "../roles.js";
import { currentUser } from "../store.js";
import { allListings, listingById } from "../selectors.js";
import { LISTING_DAYS, addDays, esc, formatDate, money, option } from "../util.js";
import { backLink, chipSet, emptyState, notFoundPage } from "./shared.js";

export function offerLabel(listing, { short = false } = {}) {
  const price = listing.price != null ? money(listing.price) : null;
  if (listing.listingType === "trade") {
    if (short || !listing.tradePreference) return "Trade";
    return `Trade · ${listing.tradePreference}`;
  }
  if (listing.listingType === "either") return price ? `${price} or trade` : "Sale or trade";
  return price || "For sale";
}

export function filterListings(list, filters) {
  const q = filters.q.trim().toLowerCase();
  return list.filter((listing) => {
    if (filters.category !== "all" && listing.category !== filters.category) return false;
    if (filters.type === "sale" && listing.listingType === "trade") return false;
    if (filters.type === "trade" && listing.listingType === "sale") return false;
    if (!q) return true;
    const hay = [listing.title, listing.description, listing.category, listing.location, listing.sellerName, listing.condition].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function boardsPage(filters) {
  const categoryOptions = [`<option value="all"${filters.category === "all" ? " selected" : ""}>All categories</option>`]
    .concat(listingCategories.map((name) => option(name, name, filters.category)))
    .join("");
  return `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Equipment boards</h1>
          <p class="lede">Sell or trade gear with other shooters. A post stays on the board for ${LISTING_DAYS} days, then it comes off.</p>
        </div>
        <a class="btn btn-primary" href="#/boards/new">Create post</a>
      </header>
      <search class="toolbar" aria-label="Filter listings">
        <div class="field field-grow">
          <label for="board-search">Search</label>
          <input id="board-search" type="search" data-filter="q" value="${esc(filters.q)}" placeholder="Optic, bipod, town…" autocomplete="off" enterkeyhint="search">
        </div>
        <div class="field">
          <label for="board-category">Category</label>
          <select id="board-category" data-filter="category">${categoryOptions}</select>
        </div>
        ${chipSet("Offer", "type", [["all", "All"], ["sale", "For sale"], ["trade", "Trade"]], filters.type)}
      </search>
      <div id="results">${boardResults(filters)}</div>
    </div>`;
}

export function boardResults(filters) {
  const list = filterListings(allListings(), filters);
  if (!list.length) {
    return `
      <p class="result-count" data-count-value="0">0 posts</p>
      ${emptyState("No posts in this view", "Try another category, or create the post you were looking for.", "#/boards/new", "Create post")}`;
  }
  const cards = list.map((listing) => `
    <a class="card card-link" href="#/boards/${esc(listing.id)}">
      <div class="card-top">
        <p class="kicker">${esc(listing.category)}</p>
        <p class="offer">${esc(offerLabel(listing, { short: true }))}</p>
      </div>
      <h2>${esc(listing.title)}</h2>
      <p class="summary">${esc(listing.description)}</p>
      <p class="meta">${esc(listing.condition)} · ${esc(listing.location || "Location not listed")}</p>
      <p class="meta">Posted by ${esc(listing.sellerName)}</p>
    </a>`).join("");
  return `
    <p class="result-count" data-count-value="${list.length}">${list.length} ${list.length === 1 ? "post" : "posts"}</p>
    <div class="card-grid">${cards}</div>`;
}

export function listingDetail(id) {
  const listing = listingById(id);
  if (!listing) {
    return notFoundPage("Listing not found", "That post is no longer on the board.", "#/boards", "Back to the board");
  }
  const user = currentUser();
  const admin = isAdmin(user);
  const mine = user && listing.sellerId === user.id;
  const posted = String(listing.createdAt || "").slice(0, 10);
  const through = /^\d{4}-\d{2}-\d{2}$/.test(posted) ? addDays(posted, LISTING_DAYS) : "";
  const actions = [];
  if (admin) actions.push(`<a class="btn btn-ghost" href="#/boards/${esc(listing.id)}/edit">Edit</a>`);
  if (admin || mine) actions.push(`<button type="button" class="btn btn-danger" data-action="delete-listing" data-id="${esc(listing.id)}">Remove listing</button>`);
  const trade = listing.listingType !== "sale" && listing.tradePreference
    ? `<p><strong>Trade preference.</strong> ${esc(listing.tradePreference)}</p>`
    : "";
  return `
    <div class="page">
      ${backLink("#/boards", "All posts")}
      <article class="detail-layout">
        <div class="detail-main">
          <header>
            <p class="kicker">${esc(listing.category)} · ${esc(listing.condition)}</p>
            <h1>${esc(listing.title)}</h1>
            <p class="lede">${esc(listing.description)}</p>
          </header>
          ${trade}
        </div>
        <aside class="detail-aside">
          <div class="panel">
            <p class="fee">${esc(offerLabel(listing, { short: true }))}</p>
            <p class="meta">${esc(listing.location || "Location not listed")}</p>
            <p class="meta">Posted ${esc(formatDate(posted))} by ${esc(listing.sellerName)}${through ? `. On the board through ${esc(formatDate(through))}` : ""}</p>
            <h2>Contact</h2>
            <p class="contact">${esc(listing.contact)}</p>
            <p class="hint">Contact stays on the post. MatchPoint does not relay messages.</p>
            ${actions.length ? `<div class="card-actions">${actions.join("")}</div>` : ""}
          </div>
        </aside>
      </article>
    </div>`;
}

export function listingForm(existing = null) {
  const editing = Boolean(existing);
  if (editing && !isAdmin(currentUser())) {
    return notFoundPage("Admin only", "The general admin can edit or remove any board post.", `#/boards/${encodeURIComponent(existing.id)}`, "Back to the post");
  }
  const categories = [`<option value=""${editing ? "" : " selected"} disabled>Select a category</option>`]
    .concat(listingCategories.map((name) => option(name, name, existing?.category || ""))).join("");
  const conditionOptions = [`<option value=""${editing ? "" : " selected"} disabled>Select condition</option>`]
    .concat(conditions.map((name) => option(name, name, existing?.condition || ""))).join("");
  const type = existing?.listingType || "sale";
  const offer = (value, label) => `<label class="chip"><input type="radio" name="listingType" value="${value}"${type === value ? " checked" : ""}> ${label}</label>`;
  const postedOn = String(existing?.createdAt || "").slice(0, 10);
  const through = editing && /^\d{4}-\d{2}-\d{2}$/.test(postedOn) ? formatDate(addDays(postedOn, LISTING_DAYS)) : "";
  return `
    <div class="page narrow">
      ${backLink(editing ? `#/boards/${esc(existing.id)}` : "#/boards", editing ? "Back to the post" : "All posts")}
      <header>
        <h1>${editing ? "Edit post" : "Create a post"}</h1>
        <p class="lede">${through ? `This post stays on the board through ${esc(through)}.` : "List a rifle, optic, or piece of support gear for sale or trade."}</p>
      </header>
      <form id="form-listing" class="form-grid panel"${editing ? ` data-id="${esc(existing.id)}"` : ""}>
        <p class="form-error" role="alert" hidden></p>
        <div class="field">
          <label for="listing-title">Title</label>
          <input id="listing-title" name="title" type="text" required minlength="4" maxlength="120" autocomplete="off" value="${esc(existing?.title || "")}">
          <span class="field-error">Use at least 4 characters.</span>
        </div>
        <div class="field">
          <label for="listing-description">Description</label>
          <textarea id="listing-description" name="description" required minlength="20" maxlength="2000">${esc(existing?.description || "")}</textarea>
          <span class="field-error">Describe the item in at least 20 characters.</span>
        </div>
        <div class="field">
          <label for="listing-category">Category</label>
          <select id="listing-category" name="category" required>${categories}</select>
          <span class="field-error">Choose a category.</span>
        </div>
        <div class="field">
          <label for="listing-condition">Condition</label>
          <select id="listing-condition" name="condition" required>${conditionOptions}</select>
          <span class="field-error">Choose a condition.</span>
        </div>
        <fieldset class="chip-set">
          <legend>Offer</legend>
          ${offer("sale", "For sale")}
          ${offer("trade", "Trade")}
          ${offer("either", "Sale or trade")}
        </fieldset>
        <div class="field" data-sale-field>
          <label for="listing-price">Price (USD)</label>
          <input id="listing-price" name="price" type="number" inputmode="numeric" min="0" max="100000" step="1" value="${existing?.price == null ? "" : esc(String(existing.price))}">
          <span class="field-error">Enter a price, or switch the offer to trade.</span>
        </div>
        <div class="field" data-trade-field>
          <label for="listing-trade">Trade preference</label>
          <span id="listing-trade-hint" class="hint">What you want in return.</span>
          <input id="listing-trade" name="tradePreference" type="text" maxlength="160" aria-describedby="listing-trade-hint" value="${esc(existing?.tradePreference || "")}">
          <span class="field-error">Say what you want to trade for.</span>
        </div>
        <div class="field">
          <label for="listing-location">Location</label>
          <span id="listing-location-hint" class="hint">Optional. City and state are enough.</span>
          <input id="listing-location" name="location" type="text" maxlength="80" autocomplete="address-level2" aria-describedby="listing-location-hint" value="${esc(existing?.location || "")}">
        </div>
        <div class="field">
          <label for="listing-contact">Contact method</label>
          <span id="listing-contact-hint" class="hint">Email, phone, or a handle other shooters can use. Shown on the post.</span>
          <input id="listing-contact" name="contact" type="text" required minlength="5" maxlength="120" autocomplete="email" aria-describedby="listing-contact-hint" value="${esc(existing?.contact || "")}">
          <span class="field-error">Add a way for someone to reach you.</span>
        </div>
        <div class="card-actions">
          <button type="submit" class="btn btn-primary">${editing ? "Save post" : "Publish post"}</button>
          <a class="btn btn-ghost" href="#/boards">Cancel</a>
        </div>
      </form>
    </div>`;
}
