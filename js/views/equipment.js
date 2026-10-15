import { allGear, gearById, gearSegments, relatedGear } from "../data/index.js";
import { gearArt } from "../icons.js";
import { isAdmin } from "../roles.js";
import { currentUser } from "../store.js";
import { esc, option, safeRemoteSrc } from "../util.js";
import { backLink, documentList, groupBySegment, notFoundPage, segmentChoices, segmentMove, segmentRails } from "./shared.js";

export function filterGear(list, filters) {
  return list.filter((item) => filters.category === "all" || item.category === filters.category);
}

export function equipmentPage(filters) {
  const admin = isAdmin(currentUser());
  return `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Suggested equipment</h1>
          <p class="lede">Curated picks for match rifles and the gear around them. Prices are typical street ranges for planning.</p>
        </div>
        ${admin ? `<button type="button" class="btn btn-primary" data-action="add-segment" data-kind="gear">New segment</button>` : ""}
      </header>
      <div id="results">${equipmentResults(filters)}</div>
    </div>`;
}

function gearCard(item, segments, admin) {
  const move = admin ? segmentMove("gear", item.id, item.name, item.category, segments) : "";
  return `
    <div class="segment-card">
      <a class="card card-link" href="#/equipment/${esc(item.id)}">
        <div class="gear-art" aria-hidden="true">${gearArt(item.diagram)}</div>
        <h2>${esc(item.name)}</h2>
        <p class="summary">${esc(item.summary)}</p>
        <p class="meta">${esc(item.priceBand)}</p>
      </a>
      ${move}
    </div>`;
}

export function equipmentResults(filters) {
  const gear = allGear();
  const list = filterGear(gear, filters);
  const admin = isAdmin(currentUser());
  const segments = gearSegments();
  const groups = groupBySegment(list, segments, { showEmpty: admin }).map((group) => ({
    ...group,
    kind: "gear",
    removable: admin,
    cards: group.items.map((item) => gearCard(item, segments, admin)).join(""),
  }));
  return segmentRails({
    noun: "item",
    groups,
    emptyTitle: "No equipment yet",
    emptyText: "Suggested equipment shows up here.",
  });
}

export function equipmentDetail(id) {
  const item = gearById(id);
  if (!item) {
    return notFoundPage("Item not found", "That piece of gear is not on the list.", "#/equipment", "Back to equipment");
  }
  const photo = safeRemoteSrc(item.image?.src);
  const visual = photo
    ? `<img src="${esc(photo)}" alt="${esc(item.image.alt || item.name)}" width="800" height="450">`
    : `<div class="gear-art gear-art-lg" aria-hidden="true">${gearArt(item.diagram)}</div>`;
  const related = relatedGear(item).map((other) => `
    <a class="card card-link" href="#/equipment/${esc(other.id)}">
      <p class="kicker">${esc(other.category)}</p>
      <h3>${esc(other.name)}</h3>
      <p class="summary">${esc(other.summary)}</p>
    </a>`).join("");

  const admin = isAdmin(currentUser());
  const adminActions = admin
    ? `<div class="card-actions">
        <a class="btn btn-ghost" href="#/equipment/${esc(item.id)}/edit">Edit</a>
        <button type="button" class="btn btn-danger" data-action="delete-suggested" data-id="${esc(item.id)}">Remove</button>
      </div>`
    : "";
  return `
    <div class="page">
      ${backLink("#/equipment", "All equipment")}
      <div class="detail-layout">
        <div class="detail-main">
          <header>
            <p class="kicker">${esc(item.category)}</p>
            <h1>${esc(item.name)}</h1>
            <p class="lede">${esc(item.description)}</p>
          </header>
          <section>
            <h2>Why it is on the list</h2>
            <p>${esc(item.why)}</p>
          </section>
          ${related ? `<section><h2>Same category</h2><div class="card-grid">${related}</div></section>` : ""}
        </div>
        <aside class="detail-aside">
          <div class="panel">
            ${visual}
            <p class="fee">${esc(item.priceBand)}</p>
            <p><strong>Best for.</strong> ${esc(item.bestFor)}</p>
            ${adminActions}
            <h2>References</h2>
            <p class="hint">Product links and photos attach here when a catalog is connected.</p>
            ${documentList(item.links.map((link) => ({
              label: link.label,
              kind: "Link",
              href: link.href,
              status: link.href ? "Open" : "Not linked yet",
            })))}
          </div>
        </aside>
      </div>
    </div>`;
}

export function gearEditPage(id) {
  const item = gearById(id);
  if (!item) {
    return notFoundPage("Item not found", "That piece of gear is not on the list.", "#/equipment", "Back to equipment");
  }
  if (!isAdmin(currentUser())) {
    return notFoundPage("Admin only", "The general admin can edit or remove any suggested item.", `#/equipment/${encodeURIComponent(item.id)}`, "Back to the item");
  }
  const categories = segmentChoices(gearSegments(), item.category).map((name) => option(name, name, item.category)).join("");
  return `
    <div class="page narrow">
      ${backLink(`#/equipment/${esc(item.id)}`, "Back to the item")}
      <header class="page-head"><div><h1>Edit equipment</h1></div></header>
      <form id="form-edit-gear" class="form-grid panel" data-id="${esc(item.id)}">
        <p class="form-error" role="alert" hidden></p>
        <div class="field">
          <label for="gear-name">Name</label>
          <input id="gear-name" name="name" type="text" required minlength="2" maxlength="80" value="${esc(item.name)}">
        </div>
        <div class="form-split cols-2">
          <div class="field">
            <label for="gear-category-edit">Segment</label>
            <select id="gear-category-edit" name="category" required>${categories}</select>
          </div>
          <div class="field">
            <label for="gear-price">Price</label>
            <input id="gear-price" name="priceBand" type="text" required minlength="1" maxlength="40" value="${esc(item.priceBand)}">
          </div>
        </div>
        <div class="field">
          <label for="gear-best">Best for</label>
          <input id="gear-best" name="bestFor" type="text" required minlength="8" maxlength="200" value="${esc(item.bestFor)}">
        </div>
        <div class="field">
          <label for="gear-summary">Summary</label>
          <textarea id="gear-summary" name="summary" required minlength="10" maxlength="240">${esc(item.summary)}</textarea>
        </div>
        <div class="field">
          <label for="gear-description">Description</label>
          <textarea id="gear-description" name="description" required minlength="20" maxlength="2000">${esc(item.description)}</textarea>
        </div>
        <div class="field">
          <label for="gear-why">Why it is on the list</label>
          <textarea id="gear-why" name="why" required minlength="20" maxlength="2000">${esc(item.why)}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Save equipment</button>
      </form>
    </div>`;
}
