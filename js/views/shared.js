import { icon } from "../icons.js";
import { esc, option, STATUS_LABEL, safeRemoteSrc } from "../util.js";

export function statusPill(status) {
  const label = STATUS_LABEL[status] || status;
  return `<p class="status status-${esc(status)}">${esc(label)}</p>`;
}

export function backLink(href, label) {
  return `<p class="back-row"><a class="back" href="${href}">${icon("arrow")}<span>${esc(label)}</span></a></p>`;
}

export function emptyState(title, text, href, label) {
  return `
    <div class="empty">
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      ${href ? `<a class="btn btn-primary" href="${href}">${esc(label)}</a>` : ""}
    </div>`;
}

export function documentList(docs) {
  if (!docs?.length) return "";
  return `<ul class="doc-list">${docs.map((doc) => {
    const href = safeRemoteSrc(doc.href);
    const label = href
      ? `<a href="${esc(href)}" rel="noopener noreferrer">${esc(doc.label)}</a>`
      : `<span>${esc(doc.label)}</span>`;
    return `<li>${label}<span class="muted">${esc(doc.kind)} · ${esc(doc.status)}</span></li>`;
  }).join("")}</ul>`;
}

export function segmentChoices(names, current) {
  if (!current || names.some((name) => name.toLowerCase() === String(current).toLowerCase())) return names;
  return [...names, current];
}

export function groupBySegment(items, segments, { showEmpty = false } = {}) {
  const groups = segments.map((name) => ({ name, items: [], known: true }));
  const byKey = new Map(groups.map((group) => [group.name.toLowerCase(), group]));
  for (const item of items) {
    const key = String(item.category || "").trim().toLowerCase();
    let group = byKey.get(key);
    if (!group) {
      group = { name: item.category || "Unsorted", items: [], known: false };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.filter((group) => group.items.length || (showEmpty && group.known));
}

export function segmentMove(kind, id, label, current, names) {
  const choices = segmentChoices(names, current);
  const selectId = `move-${kind}-${id}`;
  const options = choices.map((name) => option(name, name, current)).join("");
  return `
    <div class="field segment-move">
      <label for="${esc(selectId)}">Segment</label>
      <select id="${esc(selectId)}" data-move-kind="${esc(kind)}" data-move-id="${esc(id)}" aria-label="Move ${esc(label)} to a segment">${options}</select>
    </div>`;
}

export function segmentRails({ noun, groups, emptyTitle, emptyText }) {
  if (!groups.length) {
    return `
      <p class="result-count" data-count-value="0">0 ${noun}s</p>
      ${emptyState(emptyTitle, emptyText, "", "")}`;
  }
  const count = groups.reduce((sum, group) => sum + group.items.length, 0);
  const sections = groups.map((group, index) => {
    const headingId = `segment-${noun}-${index}`;
    const remove = group.removable
      ? `<button type="button" class="btn btn-ghost" data-action="remove-segment" data-kind="${esc(group.kind)}" data-name="${esc(group.name)}">Remove segment</button>`
      : "";
    const row = group.items.length
      ? `<div class="segment-row">${group.cards}</div>`
      : `<p class="hint">No cards in this segment yet.</p>`;
    return `
      <section class="segment" aria-labelledby="${headingId}" data-segment-name="${esc(group.name)}" tabindex="-1">
        <div class="segment-head">
          <h2 id="${headingId}">${esc(group.name)}</h2>
          ${remove}
        </div>
        ${row}
      </section>`;
  }).join("");
  const label = count === 1 ? noun : `${noun}s`;
  return `
    <p class="result-count" data-count-value="${count}">${count} ${label}</p>
    <div class="segment-list">${sections}</div>`;
}

export function chipSet(legend, name, choices, current) {
  const chips = choices.map(([value, label, tone]) => {
    const id = `${name}-${String(value).replace(/[^A-Za-z0-9_-]+/g, "-")}`;
    const checked = value === current ? " checked" : "";
    const toneClass = tone ? ` chip-${tone}` : "";
    return `<label class="chip${toneClass}" for="${id}"><input type="radio" id="${id}" name="${name}" value="${esc(value)}" data-filter="${esc(name)}"${checked}>${esc(label)}</label>`;
  }).join("");
  return `<fieldset class="chip-set"><legend>${esc(legend)}</legend>${chips}</fieldset>`;
}

export function notFoundPage(title, lede, href, label) {
  return `
    <div class="page">
      <div class="empty">
        <h1>${esc(title)}</h1>
        <p>${esc(lede)}</p>
        <a class="btn btn-primary" href="${href}">${esc(label)}</a>
      </div>
    </div>`;
}
