import { disciplines, matchById } from "../data/index.js";
import {
  choiceFromRule,
  courseFor,
  expandMatch,
  repeatChoices,
  seriesLabel,
  upcomingOccurrences,
} from "../recurrence.js";
import { CATALOG_STATUSES, DIRECTOR_STATUSES, isAdmin, isMatchDirector } from "../roles.js";
import { stageEditorHtml, stagePicture } from "../stage-board.js";
import { currentUser, directedMatches, fieldCounts, rosterFor, stages, venues } from "../store.js";
import {
  STATUS_LABEL,
  esc,
  formatDate,
  formatDateRange,
  locationHtml,
  mapsUrl,
  money,
  normalizeLeadDays,
  option,
  registrationOpensDate,
  safeImageSrc,
  todayISO,
} from "../util.js";
import { backLink, notFoundPage } from "./shared.js";

function statusOptions(current) {
  const selected = DIRECTOR_STATUSES.includes(current) ? current : "open";
  return DIRECTOR_STATUSES.map((status) => option(status, STATUS_LABEL[status], selected)).join("");
}

function disciplineOptions(current) {
  const placeholder = `<option value=""${current ? "" : " selected"} disabled>Select a discipline</option>`;
  return placeholder + disciplines.map((name) => option(name, name, current || "")).join("");
}

function isSeries(match) {
  return Boolean(seriesLabel(match?.recurrence));
}

function repeatFields(match) {
  const suffix = match ? match.id : "new";
  const selected = choiceFromRule(match?.recurrence);
  const choices = repeatChoices(match?.startDate || "", match?.recurrence);
  const radios = choices.map((choice) => {
    const slug = choice.value ? choice.value.replace(":", "-") : "none";
    const id = `repeat-${slug}-${suffix}`;
    const checked = choice.value === selected ? " checked" : "";
    const monthly = choice.value === "monthly" ? " data-repeat-monthly" : "";
    const text = choice.value === "monthly"
      ? `<span data-repeat-label>${esc(choice.label)}</span>`
      : `<span>${esc(choice.label)}</span>`;
    return `<label class="choice" for="${id}"><input type="radio" id="${id}" name="repeat" value="${esc(choice.value)}"${checked}${monthly}>${text}</label>`;
  }).join("");
  const until = match?.recurrence?.until || "";
  const untilHidden = isSeries(match) ? "" : " hidden";
  return `
    <fieldset class="field" aria-describedby="repeat-hint-${suffix}">
      <legend>Repeats</legend>
      <div class="choice-list">${radios}</div>
      <p class="hint" id="repeat-hint-${suffix}">One date can be cancelled or moved later. The other dates stay on the series.</p>
    </fieldset>
    <div class="field" data-repeat-until${untilHidden}>
      <label for="repeat-until-${suffix}">Repeat until</label>
      <input id="repeat-until-${suffix}" name="repeatUntil" type="date" value="${esc(until)}" aria-describedby="repeat-until-hint-${suffix}">
      <span class="hint" id="repeat-until-hint-${suffix}">Leave blank to list about a year of dates.</span>
    </div>`;
}

export function syncEndDate(form) {
  const start = form?.elements?.startDate;
  const end = form?.elements?.endDate;
  if (!start || !end) return;
  const startValue = start.value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startValue)) return;
  end.min = startValue;
  const custom = end.dataset.custom === "true" && end.value >= startValue;
  if (custom) return;
  end.value = startValue;
  end.setCustomValidity("");
}

export function syncRepeatFields(form) {
  if (!form) return;
  const start = form.elements.startDate?.value || "";
  const label = form.querySelector("[data-repeat-label]");
  if (label) {
    const monthly = repeatChoices(start).find((choice) => choice.value === "monthly");
    label.textContent = monthly?.label || "Every matching day";
  }
  const selected = form.elements.repeat?.value || "";
  const untilWrap = form.querySelector("[data-repeat-until]");
  const until = form.elements.repeatUntil;
  if (until) until.min = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : "";
  if (!untilWrap) return;
  const on = selected !== "";
  untilWrap.hidden = !on;
  if (!on && until) {
    until.value = "";
    until.setCustomValidity("");
  }
}

function managedVenues() {
  const user = currentUser();
  return venues()
    .filter((venue) => venue.directorUserId === user?.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function venueField(list, currentId, id) {
  const current = list.find((venue) => venue.id === currentId);
  const placeholder = `<option value=""${current ? "" : " selected"} disabled>Select a venue</option>`;
  const options = list.map((venue) => {
    const selected = venue.id === currentId ? " selected" : "";
    return `<option value="${esc(venue.id)}" data-address="${esc(venue.address)}"${selected}>${esc(venue.name)}</option>`;
  }).join("");
  const hint = current
    ? esc(current.address)
    : (list.length
      ? "Pick a range you manage."
      : `Add a venue on the <a href="#/director">Match director</a> page first.`);
  return `
    <div class="field">
      <label for="${id}">Venue</label>
      <select id="${id}" name="venueId" required aria-describedby="${id}-address">${placeholder}${options}</select>
      <span class="field-error">Choose a venue.</span>
      <p class="hint" id="${id}-address" data-venue-address>${hint}</p>
    </div>`;
}

export function syncVenueAddress(form) {
  const select = form?.elements?.venueId;
  const hint = form?.querySelector?.("[data-venue-address]");
  if (!select || !hint) return;
  const address = select.selectedOptions?.[0]?.dataset?.address || "";
  if (address) {
    hint.textContent = address;
    return;
  }
  const available = [...select.options].some((item) => item.value && !item.disabled);
  if (!available) return;
  hint.textContent = "Pick a range you manage.";
}

function venueRow(venue, useCount) {
  const used = useCount > 0;
  const noun = useCount === 1 ? "match" : "matches";
  const href = mapsUrl({ venue: venue.name, address: venue.address });
  return `
    <li class="venue-row" id="${esc(venue.id)}" tabindex="-1">
      <div class="venue-id">
        <p class="venue-name">${esc(venue.name)}</p>
        <p class="meta"><a class="place-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(venue.address)}<span class="visually-hidden"> (opens in Google Maps)</span></a></p>
        ${used ? `<p class="hint">On ${useCount} ${noun}. Point ${useCount === 1 ? "that match" : "those matches"} at another venue before removing this one.</p>` : ""}
      </div>
      <div class="venue-actions">
        <button type="button" class="btn btn-ghost" data-action="edit-venue" data-id="${esc(venue.id)}">Edit</button>
        ${used ? "" : `<button type="button" class="btn btn-danger" data-action="delete-venue" data-id="${esc(venue.id)}">Remove</button>`}
      </div>
    </li>`;
}

function courseLabel(list) {
  const count = Array.isArray(list) ? list.length : 0;
  if (!count) return "Course not posted";
  const rounds = list.reduce((sum, stage) => sum + (Number(stage.shots) || 0), 0);
  const stageWord = count === 1 ? "stage" : "stages";
  const roundWord = rounds === 1 ? "round" : "rounds";
  return `${count} ${stageWord}, ${rounds} ${roundWord}`;
}

function stageCard(stage) {
  const picture = stagePicture(stage, { thumb: true });
  const src = safeImageSrc(stage.image?.src);
  const thumb = picture
    || (src ? `<img class="stage-thumb" src="${src}" alt="" width="688" height="398">` : `<div class="stage-thumb stage-thumb-empty" aria-hidden="true"></div>`);
  return `
    <article class="card stage-card" id="${esc(stage.id)}" tabindex="-1">
      <h3>${esc(stage.name)}</h3>
      <p class="meta">${esc(String(stage.shots))} rounds · ${esc(stage.time)}</p>
      <div class="stage-card-picture">${thumb}</div>
      <div class="card-actions">
        <button type="button" class="btn btn-ghost" data-action="edit-stage" data-id="${esc(stage.id)}">Edit</button>
        <button type="button" class="btn btn-danger" data-action="delete-stage" data-id="${esc(stage.id)}">Remove</button>
      </div>
    </article>`;
}

function stageBody(directorUserId) {
  const mine = stages()
    .filter((stage) => stage.directorUserId === directorUserId)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!mine.length) return `<div class="panel venue-box"><p class="venue-empty">No stages yet.</p></div>`;
  return `<div class="card-grid stage-card-grid">${mine.map(stageCard).join("")}</div>`;
}

export function stageFormFields(stage = null, index = null) {
  const hidden = index == null ? "" : `<input type="hidden" name="index" value="${Number(index)}">`;
  return `
    ${hidden}
    ${stageEditorHtml(stage)}`;
}

function matchForm(match) {
  const value = (field) => esc(match?.[field] ?? "");
  const editing = Boolean(match);
  const series = isSeries(match);
  const registrationLabel = series ? "Registration for every date" : "Registration";
  const capId = editing ? `edit-cap-${match.id}` : "direct-cap";
  const roundsId = editing ? `edit-rounds-${match.id}` : "direct-rounds";
  const roundsValue = match ? String(match.schedule?.rounds ?? "") : "";
  return `
    <form class="form-grid form-direct-match" ${editing ? `data-id="${esc(match.id)}"` : ""}>
      <p class="form-error" role="alert" hidden></p>
      <div class="field">
        <label for="${editing ? `edit-name-${match.id}` : "direct-name"}">Match name</label>
        <input id="${editing ? `edit-name-${match.id}` : "direct-name"}" name="name" type="text" required minlength="4" maxlength="80" value="${value("name")}">
        <span class="field-error">Enter at least 4 characters.</span>
      </div>
      <div class="form-split cols-2">
        <div class="field">
          <label for="${editing ? `edit-start-${match.id}` : "direct-start"}">Start date</label>
          <input id="${editing ? `edit-start-${match.id}` : "direct-start"}" name="startDate" type="date" required value="${value("startDate")}">
          <span class="field-error">Enter a start date.</span>
        </div>
        <div class="field">
          <label for="${editing ? `edit-end-${match.id}` : "direct-end"}">End date</label>
          <input id="${editing ? `edit-end-${match.id}` : "direct-end"}" name="endDate" type="date" required${match?.endDate && match.endDate !== match.startDate ? " data-custom=\"true\"" : ""} value="${value("endDate")}">
          <span class="field-error">End date is before the start date.</span>
        </div>
      </div>
      ${repeatFields(match)}
      ${venueField(editing && isAdmin(currentUser()) ? venues() : managedVenues(), match?.venueId || "", editing ? `edit-venue-${match.id}` : "direct-venue")}
      <div class="form-split cols-2">
        <div class="field">
          <label for="${editing ? `edit-discipline-${match.id}` : "direct-discipline"}">Discipline</label>
          <select id="${editing ? `edit-discipline-${match.id}` : "direct-discipline"}" name="discipline" required>${disciplineOptions(match?.discipline)}</select>
          <span class="field-error">Choose a discipline.</span>
        </div>
        <div class="field">
          <label for="${editing ? `edit-status-${match.id}` : "direct-status"}">${registrationLabel}</label>
          <select id="${editing ? `edit-status-${match.id}` : "direct-status"}" name="registrationStatus" required>${statusOptions(match?.registrationStatus || "open")}</select>
        </div>
      </div>
      <div class="form-split cols-3">
        <div class="field">
          <label for="${editing ? `edit-fee-${match.id}` : "direct-fee"}">Fee (USD)</label>
          <input id="${editing ? `edit-fee-${match.id}` : "direct-fee"}" name="fee" type="number" inputmode="numeric" min="0" max="10000" step="1" required value="${match ? String(match.fee) : ""}">
          <span class="field-error">Enter a whole-dollar fee.</span>
        </div>
        <div class="field">
          <label for="${capId}">Max Shooters</label>
          <input id="${capId}" name="capacity" class="no-spin" type="number" inputmode="numeric" min="1" max="500" step="1" required value="${match ? String(match.capacity) : ""}">
          <span class="field-error">Enter a whole number from 1 to 500.</span>
        </div>
        <div class="field">
          <label for="${roundsId}">Est Round Count</label>
          <input id="${roundsId}" name="rounds" type="text" required minlength="1" maxlength="40" autocomplete="off" value="${esc(roundsValue)}">
          <span class="field-error">Enter an estimated round count.</span>
        </div>
      </div>
      <div class="form-split cols-2">
        <div class="field">
          <label for="${editing ? `edit-checkin-${match.id}` : "direct-checkin"}">Check-in</label>
          <input id="${editing ? `edit-checkin-${match.id}` : "direct-checkin"}" name="checkIn" type="text" maxlength="40" value="${esc(match?.schedule?.checkIn || "")}" placeholder="7:00 a.m.">
        </div>
        <div class="field">
          <label for="${editing ? `edit-shot-${match.id}` : "direct-shot"}">First shot</label>
          <input id="${editing ? `edit-shot-${match.id}` : "direct-shot"}" name="firstShot" type="text" maxlength="40" value="${esc(match?.schedule?.firstShot || "")}" placeholder="8:00 a.m.">
        </div>
      </div>
      <div class="field">
        <label for="${editing ? `edit-summary-${match.id}` : "direct-summary"}">Short description</label>
        <input id="${editing ? `edit-summary-${match.id}` : "direct-summary"}" name="summary" type="text" required minlength="10" maxlength="240" value="${value("summary")}">
        <span class="field-error">Enter at least 10 characters.</span>
      </div>
      <div class="field">
        <label for="${editing ? `edit-description-${match.id}` : "direct-description"}">Description</label>
        <textarea id="${editing ? `edit-description-${match.id}` : "direct-description"}" name="description" required minlength="20" maxlength="2000">${value("description")}</textarea>
        <span class="field-error">Enter at least 20 characters.</span>
      </div>
      <button type="submit" class="btn btn-primary">${editing ? (series ? "Save series" : "Save match") : "Post match"}</button>
    </form>`;
}

function rosterSummary(match) {
  const { confirmed, waitlist } = fieldCounts(match.id);
  const waiting = waitlist ? ` ${waitlist} on the waitlist.` : "";
  return `<p class="meta">${confirmed} of ${match.capacity} shooters.${waiting}</p>`;
}

function rosterList(matchId) {
  const roster = rosterFor(matchId);
  if (!roster.length) return `<p class="hint">No registrations on this device yet.</p>`;
  return `
    <ul class="roster">${roster.map((entry) => `
      <li>
        <span>${esc(entry.name)}</span>
        <span class="muted">${esc(entry.email)} · ${esc(entry.division)}${entry.waitlisted ? " · Waitlist" : ""}</span>
      </li>`).join("")}
    </ul>`;
}

function nextPublicId(match) {
  if (!isSeries(match)) return match.id;
  const today = todayISO();
  const list = expandMatch(match, today);
  const open = list.find((item) => !item.cancelled && (item.endDate || item.startDate) >= today)
    || list.find((item) => !item.cancelled);
  return open?.id || match.id;
}

function datesSection(match) {
  const today = todayISO();
  const upcoming = upcomingOccurrences(match, today, 24);
  const shown = upcoming.slice(0, 8);
  const extra = upcoming.length - shown.length;
  const rows = shown.map((item) => {
    const original = item.occurrenceDate;
    const counts = fieldCounts(item.id);
    const waiting = counts.waitlist ? `, ${counts.waitlist} waiting` : "";
    const countLine = `${counts.confirmed} of ${match.capacity} shooters${waiting}`;
    const opens = item.cancelled ? null : registrationOpensDate(item);
    const opensLine = opens && today < opens
      ? `<p class="meta">Opens ${esc(formatDate(opens))}</p>`
      : (opens && match.registrationStatus === "closed" ? `<p class="meta">Registration open</p>` : "");
    const when = item.cancelled
      ? `<s>${esc(formatDate(original))}</s> · Cancelled`
      : `<a href="#/matches/${esc(item.id)}">${esc(formatDateRange(item.startDate, item.endDate))}</a>`;
    const courseLine = courseLabel(item.stages);
    const courseButton = `<button type="button" class="btn btn-ghost" data-action="edit-course" data-id="${esc(match.id)}" data-date="${esc(original)}">Edit CoF</button>`;
    const actions = item.cancelled
      ? `${courseButton}<button type="button" class="btn btn-ghost" data-action="restore-occurrence" data-id="${esc(match.id)}" data-date="${esc(original)}">Restore</button>`
      : `${courseButton}<button type="button" class="btn btn-ghost" data-action="move-occurrence" data-id="${esc(match.id)}" data-date="${esc(original)}">Move date</button>
         <button type="button" class="btn btn-danger" data-action="cancel-occurrence" data-id="${esc(match.id)}" data-date="${esc(original)}">Cancel date</button>`;
    return `
      <li class="occurrence">
        <div>
          <p class="meta">${when}</p>
          ${item.movedFrom ? `<p class="meta">Moved from ${esc(formatDate(item.movedFrom))}</p>` : ""}
          ${item.exceptionNote ? `<p class="meta">${esc(item.exceptionNote)}</p>` : ""}
          ${opensLine}
          <p class="meta">${esc(courseLine)}</p>
          <p class="meta">${esc(countLine)}</p>
        </div>
        <div class="card-actions">${actions}</div>
      </li>`;
  }).join("");
  const empty = shown.length ? "" : `<p class="hint">No upcoming dates in this series.</p>`;
  const more = extra > 0
    ? `<p class="hint">${extra} later ${extra === 1 ? "date is" : "dates are"} on the public calendar.</p>`
    : "";
  return `
    <section aria-labelledby="dates-${esc(match.id)}">
      <h4 id="dates-${esc(match.id)}">Dates</h4>
      ${empty}
      <ul class="occurrence-list">${rows}</ul>
      ${more}
    </section>`;
}

function seriesHasFutureDate(match) {
  const today = todayISO();
  return expandMatch(match, today).some((item) => !item.cancelled && (item.endDate || item.startDate) >= today);
}

function leadControl(match) {
  if (!isSeries(match) || !seriesHasFutureDate(match)) return "";
  const lead = normalizeLeadDays(match.registrationLeadDays);
  const id = esc(match.id);
  return `
    <div class="lead-open">
      <label class="choice" for="lead-on-${id}">
        <input type="checkbox" id="lead-on-${id}" data-lead-toggle="${id}"${lead ? " checked" : ""}>
        <span>Automatically open registration</span>
      </label>
      <label class="lead-days-wrap" for="lead-days-${id}">
        <input id="lead-days-${id}" class="no-spin lead-days" data-lead-days="${id}" type="number" inputmode="numeric" min="1" max="365" step="1" autocomplete="off" value="${lead ? String(lead) : ""}"${lead ? "" : " disabled"}>
        <span>days before the match</span>
      </label>
    </div>`;
}

function directedCard(match) {
  const series = isSeries(match);
  const publicId = nextPublicId(match);
  const when = series
    ? `${seriesLabel(match.recurrence)} · first date ${formatDate(match.startDate)}`
    : formatDateRange(match.startDate, match.endDate);
  return `
    <article class="panel direct-card" id="${esc(match.id)}" tabindex="-1">
      <div class="card-top">
        <p class="kicker">${esc(match.discipline)}</p>
        <p class="meta">${esc(money(match.fee))} · ${esc(String(match.schedule.rounds))} rounds</p>
      </div>
      <h3><a href="#/matches/${esc(publicId)}">${esc(match.name)}</a></h3>
      <p class="meta">${esc(when)}</p>
      <p class="meta">${locationHtml(match.location)}</p>
      <div class="field">
        <label for="quick-status-${esc(match.id)}">${series ? "Registration for every date" : "Registration"}</label>
        <select id="quick-status-${esc(match.id)}" data-direct-status="${esc(match.id)}">${statusOptions(match.registrationStatus)}</select>
      </div>
      ${leadControl(match)}
      ${series ? datesSection(match) : `
      <section aria-labelledby="course-${esc(match.id)}">
        <h4 id="course-${esc(match.id)}">Course of fire</h4>
        <p class="meta">${esc(courseLabel(courseFor(match, match.startDate)))}</p>
        <div class="card-actions">
          <button type="button" class="btn btn-ghost" data-action="edit-course" data-id="${esc(match.id)}" data-date="${esc(match.startDate)}">Edit CoF</button>
        </div>
      </section>
      <section aria-labelledby="roster-${esc(match.id)}">
        <h4 id="roster-${esc(match.id)}">Registered on this device</h4>
        ${rosterSummary(match)}
        ${rosterList(match.id)}
      </section>`}
      <details class="panel inset-details">
        <summary>${series ? "Edit series" : "Edit match"}</summary>
        ${matchForm(match)}
      </details>
      <div class="card-actions">
        <a class="btn btn-ghost" href="#/matches/${esc(publicId)}">Public page</a>
        <button type="button" class="btn btn-danger" data-action="delete-directed" data-id="${esc(match.id)}">${series ? "Remove series" : "Remove match"}</button>
      </div>
    </article>`;
}

export function newMatchPage() {
  const user = currentUser();
  if (!isMatchDirector(user)) {
    return notFoundPage(
      "Match directors post matches",
      "An admin has to grant match director permission before you can add a match.",
      "#/matches",
      "Back to matches",
    );
  }
  return `
    <div class="page narrow">
      ${backLink("#/matches", "All matches")}
      <header class="page-head">
        <div>
          <h1>New match</h1>
          <p class="lede">This match goes on the calendar under your name. Pick a venue you added on the Match director page. Set Repeats for a series, such as every 4th Saturday. One date can be cancelled or moved later. After the match is posted, import its course of fire from your stages.</p>
        </div>
      </header>
      <section class="panel" aria-labelledby="post-heading">
        <h2 id="post-heading" class="visually-hidden">Match details</h2>
        ${matchForm(null)}
      </section>
    </div>`;
}

export function directorPage() {
  const user = currentUser();
  if (!isMatchDirector(user)) {
    return notFoundPage(
      "Director desk is locked",
      "An admin has to grant match director permission before this desk opens.",
      "#/matches",
      "Back to matches",
    );
  }

  const mine = directedMatches()
    .filter((match) => match.directorUserId === user.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const list = mine.length
    ? `<div class="direct-list">${mine.map(directedCard).join("")}</div>`
    : `<p class="hint">Matches you post show up on the public calendar.</p>`;

  const mineVenues = managedVenues();
  const venueBody = mineVenues.length
    ? `<ul class="venue-list">${mineVenues.map((venue) => venueRow(
      venue,
      mine.filter((match) => match.venueId === venue.id).length,
    )).join("")}</ul>`
    : `<p class="venue-empty">No Existing Venues</p>`;

  return `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Match director</h1>
          <p class="lede">Create stages here, then import the ones you want onto each match date. Set registration to open, waitlist, or closed. On a repeating match, cancel or move one date when a holiday gets in the way.</p>
        </div>
        <a class="btn btn-primary" href="#/matches/new">New match</a>
      </header>
      <section class="venue-section" aria-labelledby="stages-heading">
        <h2 id="stages-heading">Stages</h2>
        ${stageBody(user.id)}
        <button type="button" class="btn btn-primary" id="add-stage" data-action="add-stage">Add stage</button>
      </section>
      <section class="venue-section" aria-labelledby="venues-heading">
        <h2 id="venues-heading">Venues</h2>
        <div class="panel venue-box">${venueBody}</div>
        <button type="button" class="btn btn-primary" id="add-venue" data-action="add-venue">Add Venue</button>
      </section>
      <section aria-labelledby="directed-heading">
        <h2 id="directed-heading">Matches you direct</h2>
        ${list}
      </section>
    </div>`;
}

function directedRecordById(id) {
  const seriesId = String(id || "").split("~")[0];
  return directedMatches().find((match) => match.id === seriesId) || null;
}

export function matchEditPage(id) {
  const user = currentUser();
  const directed = directedRecordById(id);
  const sample = directed ? null : matchById(String(id || "").split("~")[0]);
  const match = directed || sample;
  if (!match) {
    return notFoundPage("Match not found", "That match is not on the calendar.", "#/matches", "Back to matches");
  }
  const allowed = directed
    ? (isAdmin(user) || (isMatchDirector(user) && directed.directorUserId === user.id))
    : isAdmin(user);
  const back = `#/matches/${encodeURIComponent(directed ? directed.id : match.id)}`;
  if (!allowed) {
    return notFoundPage("Admin only", "The general admin can edit or remove any match.", back, "Back to the match");
  }
  if (directed) {
    return `
      <div class="page narrow">
        ${backLink(back, "Back to the match")}
        <header class="page-head"><div><h1>Edit match</h1></div></header>
        <section class="panel">${matchForm(directed)}</section>
      </div>`;
  }
  const end = match.endDate || match.startDate;
  const custom = match.endDate && match.endDate !== match.startDate ? " data-custom=\"true\"" : "";
  const place = match.location || {};
  const statuses = CATALOG_STATUSES.map((status) => option(status, STATUS_LABEL[status], match.registrationStatus)).join("");
  return `
    <div class="page narrow">
      ${backLink(back, "Back to the match")}
      <header class="page-head"><div><h1>Edit match</h1></div></header>
      <form class="form-grid form-catalog-match panel" data-id="${esc(match.id)}">
        <p class="form-error" role="alert" hidden></p>
        <div class="field">
          <label for="catalog-name">Match name</label>
          <input id="catalog-name" name="name" type="text" required minlength="4" maxlength="80" value="${esc(match.name)}">
        </div>
        <div class="form-split cols-2">
          <div class="field">
            <label for="catalog-start">Start date</label>
            <input id="catalog-start" name="startDate" type="date" required value="${esc(match.startDate)}">
          </div>
          <div class="field">
            <label for="catalog-end">End date</label>
            <input id="catalog-end" name="endDate" type="date" required${custom} value="${esc(end)}">
          </div>
        </div>
        <div class="form-split cols-2">
          <div class="field">
            <label for="catalog-discipline">Discipline</label>
            <select id="catalog-discipline" name="discipline" required>${disciplineOptions(match.discipline)}</select>
          </div>
          <div class="field">
            <label for="catalog-status">Registration</label>
            <select id="catalog-status" name="registrationStatus" required>${statuses}</select>
          </div>
        </div>
        <div class="form-split cols-3">
          <div class="field">
            <label for="catalog-fee">Fee (USD)</label>
            <input id="catalog-fee" name="fee" type="number" inputmode="numeric" min="0" max="10000" step="1" required value="${esc(String(match.fee ?? ""))}">
          </div>
          <div class="field">
            <label for="catalog-cap">Max Shooters</label>
            <input id="catalog-cap" name="capacity" class="no-spin" type="number" inputmode="numeric" min="1" max="500" step="1" required value="${esc(String(match.capacity ?? ""))}">
          </div>
          <div class="field">
            <label for="catalog-rounds">Rounds</label>
            <input id="catalog-rounds" name="rounds" type="text" required minlength="1" maxlength="40" autocomplete="off" value="${esc(String(match.schedule?.rounds ?? ""))}">
          </div>
        </div>
        <div class="field">
          <label for="catalog-venue">Venue</label>
          <input id="catalog-venue" name="venue" type="text" required minlength="2" maxlength="80" autocomplete="organization" value="${esc(place.venue || "")}">
        </div>
        <div class="form-split cols-2">
          <div class="field">
            <label for="catalog-city">City</label>
            <input id="catalog-city" name="city" type="text" required minlength="2" maxlength="60" autocomplete="address-level2" value="${esc(place.city || "")}">
          </div>
          <div class="field">
            <label for="catalog-region">State</label>
            <input id="catalog-region" name="region" type="text" required minlength="2" maxlength="40" autocomplete="address-level1" value="${esc(place.region || "")}">
          </div>
        </div>
        <div class="field">
          <label for="catalog-director">Match director</label>
          <input id="catalog-director" name="matchDirector" type="text" required minlength="2" maxlength="80" autocomplete="name" value="${esc(match.matchDirector || "")}">
        </div>
        <div class="form-split cols-2">
          <div class="field">
            <label for="catalog-checkin">Check-in</label>
            <input id="catalog-checkin" name="checkIn" type="text" maxlength="40" value="${esc(match.schedule?.checkIn || "")}">
          </div>
          <div class="field">
            <label for="catalog-shot">First shot</label>
            <input id="catalog-shot" name="firstShot" type="text" maxlength="40" value="${esc(match.schedule?.firstShot || "")}">
          </div>
        </div>
        <div class="field">
          <label for="catalog-summary">Short description</label>
          <input id="catalog-summary" name="summary" type="text" required minlength="10" maxlength="240" value="${esc(match.summary || "")}">
        </div>
        <div class="field">
          <label for="catalog-description">Description</label>
          <textarea id="catalog-description" name="description" required minlength="20" maxlength="2000">${esc(match.description || "")}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Save match</button>
      </form>
    </div>`;
}
