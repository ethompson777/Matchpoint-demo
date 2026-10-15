/**
 * Stage picture: a white brief with the start position and description
 * on the left, and an oblique range grid on the right.
 * Piece positions are percentages of that grid. A target can carry its own distance.
 */

import { esc } from "./util.js";

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const MARKS = {
  barricade: `<path d="M8 40 24 8l16 32" ${stroke}/><path d="M14 28h20M11 35h26" ${stroke}/>`,
  tank: `<path d="M10 38 38 10M10 10l28 28" ${stroke}/><path d="M8 40h32" ${stroke}/>`,
  roof: `<path d="M6 28 24 8l18 20" ${stroke}/><path d="M12 28v12h24V28" ${stroke}/>`,
  window: `<rect x="10" y="6" width="28" height="36" ${stroke}/><path d="M24 6v36M10 24h28" ${stroke}/>`,
  ladder: `<path d="M16 6v36M32 6v36M16 14h16M16 22h16M16 30h16M16 38h16" ${stroke}/>`,
  tire: `<circle cx="24" cy="24" r="14" ${stroke}/><circle cx="24" cy="24" r="5" ${stroke}/>`,
  "tire-horizontal": `<ellipse cx="24" cy="26" rx="16" ry="8" ${stroke}/><ellipse cx="24" cy="26" rx="6" ry="3" ${stroke}/>`,
  table: `<path d="M8 16h32v6H8zM14 22v16M34 22v16" ${stroke}/>`,
  wall: `<rect x="14" y="6" width="20" height="36" ${stroke}/><path d="M14 16h20M14 26h20M14 36h20" ${stroke}/>`,
  tower: `<path d="M18 8h12v6" ${stroke}/><path d="M12 14h24" ${stroke}/><rect x="16" y="14" width="16" height="26" ${stroke}/>`,
  barrel: `<ellipse cx="24" cy="14" rx="12" ry="5" ${stroke}/><path d="M12 14v18c0 3 5 6 12 6s12-3 12-6V14" ${stroke}/>`,
  "barrel-horizontal": `<path d="M14 13h22a5 11 0 0 1 0 22H14" ${stroke}/><ellipse cx="14" cy="24" rx="5" ry="11" ${stroke}/><path d="M22 13.4v21.2M30 13.4v21.2" ${stroke}/>`,
  bucket: `<path d="M16 15c1-8 15-8 16 0" ${stroke}/><ellipse cx="24" cy="16" rx="13" ry="4.5" ${stroke}/><path d="M11 16 15 40h18l4-24" ${stroke}/>`,
  start: `<path d="M16 42V8h16l-4 6 4 6H16" ${stroke}/>`,
  plate: `<path d="M24 46V20" ${stroke}/><circle cx="24" cy="14" r="9" ${stroke}/><circle cx="24" cy="14" r="2" fill="currentColor" stroke="none"/>`,
  "small-plate": `<path d="M24 46V24" ${stroke}/><circle cx="24" cy="18" r="6" ${stroke}/><circle cx="24" cy="18" r="1.5" fill="currentColor" stroke="none"/>`,
  paper: `<path d="M24 46V22" ${stroke}/><rect x="13" y="6" width="22" height="18" ${stroke}/><circle cx="24" cy="15" r="4" ${stroke}/>`,
  kyl: `<path d="M24 46V28" ${stroke}/><rect x="8" y="8" width="6" height="20" ${stroke}/><rect x="16" y="12" width="6" height="16" ${stroke}/><rect x="24" y="16" width="6" height="12" ${stroke}/><rect x="32" y="20" width="6" height="8" ${stroke}/>`,
  square: `<path d="M24 46V26" ${stroke}/><rect x="12" y="8" width="24" height="18" ${stroke}/><circle cx="24" cy="17" r="1.8" fill="currentColor" stroke="none"/>`,
  "double-hanger": `<path d="M24 46V6" ${stroke}/><path d="M24 14H16" ${stroke}/><circle cx="11" cy="14" r="6" ${stroke}/><circle cx="11" cy="14" r="1.4" fill="currentColor" stroke="none"/><path d="M24 28H16" ${stroke}/><circle cx="11" cy="28" r="6" ${stroke}/><circle cx="11" cy="28" r="1.4" fill="currentColor" stroke="none"/>`,
};

export const STAGE_PIECES = [
  { kind: "barricade", label: "Barricade", group: "prop" },
  { kind: "tank", label: "Tank trap", group: "prop" },
  { kind: "roof", label: "Roof", group: "prop" },
  { kind: "window", label: "Window", group: "prop" },
  { kind: "ladder", label: "Ladder", group: "prop" },
  { kind: "tire", label: "Tire", group: "prop" },
  { kind: "tire-horizontal", label: "Horizontal tire", group: "prop" },
  { kind: "table", label: "Table", group: "prop" },
  { kind: "wall", label: "Wall", group: "prop" },
  { kind: "tower", label: "Tower", group: "prop" },
  { kind: "barrel", label: "Barrel", group: "prop" },
  { kind: "barrel-horizontal", label: "Horizontal barrel", group: "prop" },
  { kind: "bucket", label: "5 gal bucket", group: "prop" },
  { kind: "start", label: "Start", group: "prop" },
  { kind: "plate", label: "Plate", group: "target" },
  { kind: "small-plate", label: "Small plate", group: "target" },
  { kind: "paper", label: "Paper", group: "target" },
  { kind: "kyl", label: "KYL", group: "target" },
  { kind: "square", label: "Square", group: "target" },
  { kind: "double-hanger", label: "Double hanger", group: "target" },
];

const LABELS = new Map(STAGE_PIECES.map((piece) => [piece.kind, piece.label]));
const TARGETS = new Set(STAGE_PIECES.filter((piece) => piece.group === "target").map((piece) => piece.kind));
const MAX_PIECES = 24;
const BAY = { w: 688, h: 398 };
const ORIGIN = { x: 28, y: 232 };
const ACROSS = { x: 260, y: 150 };
const DEPTH = { x: 364, y: -210 };

function clampPercent(value) {
  return Math.min(96, Math.max(4, value));
}

export function cleanLayout(value) {
  let list = value;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const items = [];
  for (const item of list) {
    if (items.length >= MAX_PIECES) break;
    if (!item || typeof item !== "object" || !LABELS.has(item.kind)) continue;
    const x = Number(item.x);
    const y = Number(item.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const stored = {
      kind: item.kind,
      x: Math.round(clampPercent(x) * 10) / 10,
      y: Math.round(clampPercent(y) * 10) / 10,
    };
    const distance = TARGETS.has(item.kind) ? cleanDistance(item.distance) : "";
    if (distance) stored.distance = distance;
    items.push(stored);
  }
  return items;
}

function cleanDistance(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
}

function distanceLabel(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/(?:^|\d|\s)(yds?|yards?|meters?|metres?|m)\.?$/i.test(text)) return text;
  return `${text} yds`;
}

function iso(across, depth) {
  return {
    x: ORIGIN.x + ACROSS.x * across + DEPTH.x * depth,
    y: ORIGIN.y + ACROSS.y * across + DEPTH.y * depth,
  };
}

function isoInverse(px, py) {
  const vx = px - ORIGIN.x;
  const vy = py - ORIGIN.y;
  const det = ACROSS.x * DEPTH.y - ACROSS.y * DEPTH.x;
  return {
    across: (vx * DEPTH.y - vy * DEPTH.x) / det,
    depth: (ACROSS.x * vy - ACROSS.y * vx) / det,
  };
}

const PIECE_FRAC = 0.18;
const ICON = 48;
const POST_Y = 46;

function iconBox(item) {
  const cx = (item.x / 100) * BAY.w;
  const cy = (item.y / 100) * BAY.h;
  const side = Math.min(PIECE_FRAC * BAY.w, PIECE_FRAC * BAY.h);
  return { x: cx - side / 2, y: cy - side / 2, w: side, h: side };
}

function postBase(item) {
  const box = iconBox(item);
  return { x: box.x + box.w / 2, y: box.y + (POST_Y / ICON) * box.h };
}

function labelAnchor(point, side) {
  const span = Math.hypot(ACROSS.x, ACROSS.y) || 1;
  const ux = ACROSS.x / span;
  const uy = ACROSS.y / span;
  let nx = -ACROSS.y / span;
  let ny = ACROSS.x / span;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const dir = side === "end" ? -1 : 1;
  return {
    x: point.x + ux * 16 * dir + nx * 11,
    y: point.y + uy * 16 * dir + ny * 11,
  };
}

function fitLabel(at, side, text) {
  const pad = 8;
  let point = at;
  for (let pass = 0; pass < 2; pass += 1) {
    const quad = labelQuad(text, point, side);
    let dx = 0;
    let dy = 0;
    for (const corner of quad) {
      if (corner.x < pad) dx = Math.max(dx, pad - corner.x);
      if (corner.x > BAY.w - pad) dx = Math.min(dx, BAY.w - pad - corner.x);
      if (corner.y < pad) dy = Math.max(dy, pad - corner.y);
      if (corner.y > BAY.h - pad) dy = Math.min(dy, BAY.h - pad - corner.y);
    }
    if (!dx && !dy) break;
    point = { x: point.x + dx, y: point.y + dy };
  }
  return point;
}

function labelQuad(text, at, side) {
  const fontSize = 22;
  const width = Math.max(fontSize, String(text).length * fontSize * 0.62) + 8;
  const ascent = fontSize * 0.82;
  const descent = fontSize * 0.28;
  const x0 = side === "end" ? -width : -4;
  const x1 = side === "end" ? 4 : width;
  const y0 = -ascent;
  const y1 = descent;
  const rad = Math.atan2(ACROSS.y, ACROSS.x);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([lx, ly]) => ({
    x: at.x + lx * cos - ly * sin,
    y: at.y + lx * sin + ly * cos,
  }));
}

function quadsOverlap(quad, box) {
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h },
    { x: box.x, y: box.y + box.h },
  ];
  const axes = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: quad[1].x - quad[0].x, y: quad[1].y - quad[0].y },
    { x: quad[3].x - quad[0].x, y: quad[3].y - quad[0].y },
  ];
  return axes.every((axis) => {
    const len = Math.hypot(axis.x, axis.y) || 1;
    const ax = axis.x / len;
    const ay = axis.y / len;
    let minQ = Infinity;
    let maxQ = -Infinity;
    let minB = Infinity;
    let maxB = -Infinity;
    for (const point of quad) {
      const t = point.x * ax + point.y * ay;
      minQ = Math.min(minQ, t);
      maxQ = Math.max(maxQ, t);
    }
    for (const point of corners) {
      const t = point.x * ax + point.y * ay;
      minB = Math.min(minB, t);
      maxB = Math.max(maxB, t);
    }
    return maxQ >= minB && maxB >= minQ;
  });
}

function pieceSvg(kind) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${MARKS[kind] || MARKS.plate}</svg>`;
}

function joinNames(items) {
  const names = items.map((item) => {
    const name = LABELS.get(item.kind);
    return item.distance ? `${name} at ${distanceLabel(item.distance)}` : name;
  });
  if (names.length < 2) return names[0] || "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function gridSvg(items) {
  const rows = 14;
  const cols = 10;
  const lines = [];
  for (let row = 0; row <= rows; row += 1) {
    const depth = row / rows;
    const start = iso(0, depth);
    const end = iso(1, depth);
    lines.push(`<line x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="#c5c5c5" stroke-width="1"/>`);
  }
  for (let col = 0; col <= cols; col += 1) {
    const across = col / cols;
    const start = iso(across, 0);
    const end = iso(across, 1);
    lines.push(`<line x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="#c5c5c5" stroke-width="1"/>`);
  }
  const angle = Math.atan2(ACROSS.y, ACROSS.x) * 180 / Math.PI;
  const list = items || [];
  const targetBoxes = list
    .filter((item) => TARGETS.has(item.kind))
    .map((item) => {
      const box = iconBox(item);
      const pad = 6;
      return { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
    });
  const marks = list.filter((item) => item.distance).map((item) => {
    const base = postBase(item);
    const depth = isoInverse(base.x, base.y).depth;
    const start = iso(0, depth);
    const end = iso(1, depth);
    const left = labelAnchor(start, "end");
    const right = labelAnchor(end, "start");
    const label = distanceLabel(item.distance);
    const onRight = targetBoxes.some((box) => quadsOverlap(labelQuad(label, left, "end"), box));
    const anchor = onRight ? "start" : "end";
    const at = fitLabel(onRight ? right : left, anchor, label);
    return `<line x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="#e07a2f" stroke-width="2.6"/>
      <text x="${at.x.toFixed(1)}" y="${at.y.toFixed(1)}" fill="#1c1e18" stroke="#fff" stroke-width="5" paint-order="stroke" font-size="22" font-weight="700" font-family="Source Sans 3, Segoe UI, sans-serif" text-anchor="${anchor}" transform="rotate(${angle.toFixed(2)} ${at.x.toFixed(1)} ${at.y.toFixed(1)})">${esc(label)}</text>`;
  });
  return `<svg viewBox="0 0 ${BAY.w} ${BAY.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${lines.join("")}${marks.join("")}</svg>`;
}

function briefText(value) {
  return String(value || "").trim();
}

function briefHtml(start, description) {
  const blocks = [];
  if (start) {
    blocks.push(`<p class="stage-brief-label">Start position</p><p>${esc(start).replaceAll("\n", "<br>")}</p>`);
  }
  if (description) {
    const paragraphs = description
      .split(/\n{2,}/)
      .map((para) => `<p>${esc(para).replaceAll("\n", "<br>")}</p>`)
      .join("");
    blocks.push(`<p class="stage-brief-label">Description</p>${paragraphs}`);
  }
  return blocks.join("");
}

function viewGlyph(item) {
  return `<div class="stage-piece" style="left:${item.x}%;top:${item.y}%">${pieceSvg(item.kind)}</div>`;
}

function pieceControl(item, index, selected) {
  const label = LABELS.get(item.kind);
  const where = item.distance ? `, ${distanceLabel(item.distance)}` : "";
  return `<button type="button" class="stage-piece${selected ? " is-selected" : ""}" data-index="${index}" data-kind="${esc(item.kind)}" style="left:${item.x}%;top:${item.y}%" aria-pressed="${selected ? "true" : "false"}" aria-label="${esc(`${label}${where}. Arrow keys move it. Delete removes it.`)}">${pieceSvg(item.kind)}</button>`;
}

function bayHtml(items, { thumb = false, label = "" } = {}) {
  const thumbClass = thumb ? " stage-thumb" : "";
  const named = label
    ? ` role="img" aria-label="${esc(label)}"`
    : ` aria-hidden="true"`;
  return `
    <div class="stage-bay stage-bay-view${thumbClass}"${named}>
      <div class="stage-grid">${gridSvg(items)}</div>
      <div class="stage-pieces">${items.map(viewGlyph).join("")}</div>
    </div>`;
}

export function stagePicture(stage, { thumb = false } = {}) {
  const items = cleanLayout(stage?.layout);
  const start = briefText(stage?.startPosition);
  const description = briefText(stage?.description);
  if (thumb) return items.length ? bayHtml(items, { thumb: true }) : "";
  if (!items.length && !start && !description) return "";
  const label = items.length ? `Stage picture with ${joinNames(items)}` : "Stage picture";
  return `
    <div class="stage-sheet stage-sheet-view">
      <div class="stage-brief">${briefHtml(start, description)}</div>
      ${bayHtml(items, { label })}
    </div>`;
}

function palette(group, title) {
  const buttons = STAGE_PIECES
    .filter((piece) => piece.group === group)
    .map((piece) => `<button type="button" class="piece-add" data-add-piece="${piece.kind}">${pieceSvg(piece.kind)}<span>${esc(piece.label)}</span></button>`)
    .join("");
  return `
    <div>
      <p class="kicker">${title}</p>
      <div class="piece-palette">${buttons}</div>
    </div>`;
}

export function stageEditorHtml(stage) {
  const items = cleanLayout(stage?.layout);
  const start = esc(stage?.startPosition ?? "");
  const description = esc(stage?.description ?? "");
  const name = esc(stage?.name ?? "");
  const shots = stage?.shots != null && stage.shots !== "" ? esc(String(stage.shots)) : "";
  const time = esc(stage?.time ?? "");
  return `
    <fieldset class="stage-editor" data-stage-editor>
      <div class="stage-dismiss" role="alert" hidden>
        <p>Closing from outside drops this stage edit.</p>
        <div class="stage-dismiss-actions">
          <button type="button" class="btn btn-ghost" data-keep-stage>Keep editing</button>
          <button type="button" class="btn btn-danger" data-action="close-modal">Discard</button>
        </div>
      </div>
      <legend>Stage picture</legend>
      <div class="stage-sheet">
        <div class="stage-head">
          <div class="field stage-name-field">
            <label for="stage-name">Stage name</label>
            <input id="stage-name" name="name" type="text" required minlength="2" maxlength="80" autocomplete="off" value="${name}">
            <span class="field-error">Enter at least 2 characters.</span>
          </div>
          <div class="field">
            <label for="stage-shots">Round count</label>
            <input id="stage-shots" class="no-spin" name="shots" type="number" inputmode="numeric" required min="1" max="200" step="1" value="${shots}">
            <span class="field-error">Enter a whole number from 1 to 200.</span>
          </div>
          <div class="field">
            <label for="stage-time">Time</label>
            <input id="stage-time" name="time" type="text" required minlength="1" maxlength="40" value="${time}">
            <span class="field-error">Enter the time limit.</span>
          </div>
        </div>
        <div class="stage-brief">
          <div class="field">
            <label for="stage-start">Start position</label>
            <textarea id="stage-start" class="compact" name="startPosition" maxlength="240">${start}</textarea>
          </div>
          <div class="field">
            <label for="stage-description">Description</label>
            <textarea id="stage-description" name="description" required minlength="10" maxlength="2000" rows="14">${description}</textarea>
            <span class="field-error">Enter at least 10 characters.</span>
          </div>
        </div>
        <div class="stage-range">
          <div class="stage-bay-stack">
            <div class="stage-bay">
              <div class="stage-grid">${gridSvg(items)}</div>
              <div class="stage-pieces">${items.map((item, index) => pieceControl(item, index, false)).join("")}</div>
            </div>
            <div class="field stage-piece-distance" hidden>
              <label for="piece-distance">Distance</label>
              <div class="distance-with-unit">
                <input id="piece-distance" type="text" maxlength="24" autocomplete="off" placeholder="44" aria-describedby="piece-distance-unit" disabled>
                <span id="piece-distance-unit" class="distance-unit">yds</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="stage-tools">
        <button type="button" class="btn btn-ghost" data-remove-piece hidden>Remove</button>
      </div>
      ${palette("prop", "Props")}
      ${palette("target", "Targets")}
      <input type="hidden" name="layout" value="${esc(JSON.stringify(items))}">
    </fieldset>`;
}

function readItems(input) {
  return cleanLayout(input.value);
}

const stageBaselines = new WeakMap();

function stageFormState(editor) {
  const data = new FormData(editor.closest("form") || undefined);
  return JSON.stringify({
    name: String(data.get("name") ?? ""),
    shots: String(data.get("shots") ?? ""),
    time: String(data.get("time") ?? ""),
    startPosition: String(data.get("startPosition") ?? ""),
    description: String(data.get("description") ?? ""),
    layout: String(data.get("layout") ?? ""),
  });
}

export function stageEditorChanged(root) {
  const editor = root?.querySelector?.("[data-stage-editor]");
  if (!editor) return false;
  const baseline = stageBaselines.get(editor);
  if (baseline == null) return true;
  return stageFormState(editor) !== baseline;
}

export function bindStageBoard(root) {
  const editor = root?.querySelector?.("[data-stage-editor]");
  if (!editor || editor.dataset.bound) return;
  editor.dataset.bound = "1";
  stageBaselines.set(editor, stageFormState(editor));
  const bay = editor.querySelector(".stage-bay");
  const pieces = editor.querySelector(".stage-pieces");
  const input = editor.querySelector('input[name="layout"]');
  const removeBtn = editor.querySelector("[data-remove-piece]");
  const distanceWrap = editor.querySelector(".stage-piece-distance");
  const distanceInput = editor.querySelector("#piece-distance");
  const distanceUnit = editor.querySelector(".distance-unit");
  let items = readItems(input);
  let selected = -1;
  let drag = null;

  function drawGrid() {
    const grid = bay.querySelector(".stage-grid");
    if (grid) grid.innerHTML = gridSvg(items);
  }

  function syncDistance() {
    const item = items[selected];
    const onTarget = Boolean(item && TARGETS.has(item.kind));
    if (distanceWrap) distanceWrap.hidden = !onTarget;
    if (!distanceInput) return;
    distanceInput.disabled = !onTarget;
    if (!onTarget) {
      distanceInput.value = "";
      syncUnit();
      return;
    }
    if (document.activeElement !== distanceInput) {
      distanceInput.value = item.distance || "";
    }
    syncUnit();
  }

  function syncUnit() {
    if (!distanceUnit || !distanceInput) return;
    const text = distanceInput.value.trim();
    distanceUnit.hidden = Boolean(text) && distanceLabel(text) === text;
  }

  function clearSelection() {
    if (selected < 0) return;
    selected = -1;
    pieces.querySelectorAll(".stage-piece").forEach((el) => {
      el.classList.remove("is-selected");
      el.setAttribute("aria-pressed", "false");
    });
    removeBtn.hidden = true;
    syncDistance();
    if (document.activeElement?.closest?.(".stage-piece")) document.activeElement.blur();
  }

  function paint(focus) {
    input.value = JSON.stringify(items);
    pieces.innerHTML = items.map((item, index) => pieceControl(item, index, index === selected)).join("");
    drawGrid();
    removeBtn.hidden = selected < 0;
    syncDistance();
    editor.querySelectorAll("[data-add-piece]").forEach((button) => {
      button.disabled = items.length >= MAX_PIECES;
    });
    if (focus) {
      (pieces.querySelector(".is-selected") || editor.querySelector("[data-add-piece]"))?.focus();
    }
  }

  distanceInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") event.preventDefault();
  });
  distanceInput?.addEventListener("input", () => {
    const item = items[selected];
    if (!item || !TARGETS.has(item.kind)) return;
    const distance = cleanDistance(distanceInput.value);
    if (distance) item.distance = distance;
    else delete item.distance;
    input.value = JSON.stringify(items);
    drawGrid();
    syncUnit();
    const piece = pieces.querySelector(`.stage-piece[data-index="${selected}"]`);
    if (piece) {
      const where = distance ? `, ${distanceLabel(distance)}` : "";
      piece.setAttribute("aria-label", `${LABELS.get(item.kind)}${where}. Arrow keys move it. Delete removes it.`);
    }
  });

  editor.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-piece]");
    if (add && !add.disabled) {
      if (items.length >= MAX_PIECES || !LABELS.has(add.dataset.addPiece)) return;
      const slot = items.length;
      items.push({
        kind: add.dataset.addPiece,
        x: Math.round(clampPercent(42 + (slot % 5) * 8) * 10) / 10,
        y: Math.round(clampPercent(38 + (slot % 4) * 8) * 10) / 10,
      });
      selected = items.length - 1;
      paint(true);
      return;
    }
    if (event.target.closest("[data-remove-piece]") && selected >= 0) {
      items.splice(selected, 1);
      selected = items.length ? Math.min(selected, items.length - 1) : -1;
      paint(true);
    }
  });

  editor.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (!event.target.closest(".stage-dismiss")) {
      const note = editor.querySelector(".stage-dismiss");
      if (note) note.hidden = true;
    }
    if (event.target.closest(".stage-piece, .stage-piece-distance, [data-remove-piece], [data-add-piece], .stage-dismiss")) return;
    clearSelection();
  });

  editor.querySelector("[data-keep-stage]")?.addEventListener("click", () => {
    const note = editor.querySelector(".stage-dismiss");
    if (note) note.hidden = true;
    document.getElementById("stage-name")?.focus();
  });

  bay.addEventListener("pointerdown", (event) => {
    const piece = event.target.closest(".stage-piece");
    if (!piece || event.button !== 0) return;
    const index = Number(piece.dataset.index);
    if (!items[index]) return;
    selected = index;
    pieces.querySelectorAll(".stage-piece").forEach((el) => {
      const on = Number(el.dataset.index) === selected;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
    removeBtn.hidden = false;
    syncDistance();
    const rect = bay.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      index,
      offsetX: event.clientX - (rect.left + (items[index].x / 100) * rect.width),
      offsetY: event.clientY - (rect.top + (items[index].y / 100) * rect.height),
    };
    piece.setPointerCapture(event.pointerId);
  });

  bay.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const piece = pieces.querySelector(`.stage-piece[data-index="${drag.index}"]`);
    if (!piece?.hasPointerCapture(event.pointerId)) return;
    const rect = bay.getBoundingClientRect();
    const x = clampPercent(((event.clientX - drag.offsetX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - drag.offsetY - rect.top) / rect.height) * 100);
    items[drag.index].x = Math.round(x * 10) / 10;
    items[drag.index].y = Math.round(y * 10) / 10;
    piece.style.left = `${items[drag.index].x}%`;
    piece.style.top = `${items[drag.index].y}%`;
    piece.classList.add("dragging");
    input.value = JSON.stringify(items);
    if (TARGETS.has(items[drag.index].kind) && items[drag.index].distance) drawGrid();
  });

  bay.addEventListener("lostpointercapture", (event) => {
    event.target.classList?.remove("dragging");
    drag = null;
  });

  bay.addEventListener("keydown", (event) => {
    const piece = event.target.closest?.(".stage-piece");
    if (!piece) return;
    const index = Number(piece.dataset.index);
    const item = items[index];
    if (!item) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      items.splice(index, 1);
      selected = items.length ? Math.min(index, items.length - 1) : -1;
      paint(true);
      return;
    }
    const step = event.shiftKey ? 6 : 2;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return;
    event.preventDefault();
    item.x = Math.round(clampPercent(item.x + dx) * 10) / 10;
    item.y = Math.round(clampPercent(item.y + dy) * 10) / 10;
    piece.style.left = `${item.x}%`;
    piece.style.top = `${item.y}%`;
    input.value = JSON.stringify(items);
    if (TARGETS.has(item.kind) && item.distance) drawGrid();
  });
}
