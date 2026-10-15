import { allMatches, disciplines, matchById } from "../data/index.js";
import { stageDiagram } from "../icons.js";
import { stagePicture } from "../stage-board.js";
import { isAdmin, isMatchDirector } from "../roles.js";
import { currentUser, fieldCounts, signupIsWaitlist } from "../store.js";
import { historyFor, registrationFor } from "../selectors.js";
import {
  FEE_NOTE,
  esc,
  formatDate,
  formatDateRange,
  isPast,
  locationHtml,
  money,
  option,
  effectiveRegistrationStatus,
  registrationNotYetOpen,
  registrationOpensDate,
  safeImageSrc,
  safeRemoteSrc,
  specList,
  todayISO,
} from "../util.js";
import { backLink, chipSet, documentList, emptyState, notFoundPage, statusPill } from "./shared.js";

function shownStatus(match) {
  const status = effectiveRegistrationStatus(match);
  if (match.origin === "director" && status !== "waitlist" && status !== "closed") return "open";
  return status;
}

function displayStatus(match) {
  if (match.cancelled) return "cancelled";
  if (isPast(match)) return "completed";
  if (registrationNotYetOpen(match)) return "closed";
  return signupIsWaitlist(match) ? "waitlist" : shownStatus(match);
}

function matchAction(match, user) {
  if (match.cancelled) return { type: "disabled", label: "Cancelled" };
  const past = isPast(match);
  const registered = registrationFor(user, match.id);
  const logged = historyFor(user, match.id);
  if (past) {
    if (logged) return { type: "history", label: "In your history" };
    return { type: "log", label: "Log attendance" };
  }
  if (registered) return { type: "registered", label: "Withdraw" };
  if (registrationNotYetOpen(match)) {
    return { type: "disabled", label: `Opens ${formatDate(registrationOpensDate(match))}` };
  }
  if (match.origin === "director" && effectiveRegistrationStatus(match) === "closed") {
    return { type: "disabled", label: "Registration closed" };
  }
  if (signupIsWaitlist(match)) return { type: "register", label: "Join waitlist" };
  if (shownStatus(match) === "open") return { type: "register", label: "Register" };
  if (match.registrationStatus === "full") return { type: "disabled", label: "Match full" };
  if (match.registrationStatus === "closed") {
    const opens = match.registrationOpens ? `Opens ${formatDate(match.registrationOpens)}` : "Registration closed";
    return { type: "disabled", label: opens };
  }
  return { type: "disabled", label: "Unavailable" };
}

function actionButton(match, user) {
  const action = matchAction(match, user);
  const id = esc(match.id);
  if (action.type === "register") {
    return `<button type="button" class="btn btn-primary" data-action="register" data-id="${id}">${esc(action.label)}</button>`;
  }
  if (action.type === "registered") {
    return `<button type="button" class="btn btn-ghost" data-action="withdraw" data-id="${id}">Withdraw</button>`;
  }
  if (action.type === "log") {
    return `<button type="button" class="btn btn-primary" data-action="log-attendance" data-id="${id}">Log attendance</button>`;
  }
  if (action.type === "history") {
    return `<a class="btn btn-ghost" href="#/profile">In your history</a>`;
  }
  return `<button type="button" class="btn btn-primary" disabled>${esc(action.label)}</button>`;
}

function statusRow(match, user) {
  const registered = registrationFor(user, match.id);
  const past = isPast(match);
  return `
    <div class="status-row">
      ${statusPill(displayStatus(match))}
      ${registered && !past ? statusPill("registered") : ""}
    </div>`;
}

export function filterMatches(list, filters) {
  const q = filters.q.trim().toLowerCase();
  const today = todayISO();
  return list.filter((match) => {
    if (match.cancelled) return false;
    const past = isPast(match, today);
    if (filters.when === "upcoming" && past) return false;
    if (filters.when === "past" && !past) return false;
    if (filters.discipline !== "all" && match.discipline !== filters.discipline) return false;
    if (!q) return true;
    const hay = [
      match.name,
      match.discipline,
      match.summary,
      match.matchDirector,
      match.location.venue,
      match.location.address,
      match.location.city,
      match.location.region,
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }).sort((a, b) => {
    if (filters.when === "past") return b.startDate.localeCompare(a.startDate);
    if (filters.when === "all") {
      const ap = isPast(a, today) ? 1 : 0;
      const bp = isPast(b, today) ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return ap ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate);
    }
    return a.startDate.localeCompare(b.startDate);
  });
}

export function matchesPage(filters) {
  const user = currentUser();
  const disciplineOptions = [`<option value="all"${filters.discipline === "all" ? " selected" : ""}>All disciplines</option>`]
    .concat(disciplines.map((name) => option(name, name, filters.discipline)))
    .join("");
  const newMatch = isMatchDirector(user)
    ? `<a class="btn btn-primary" href="#/matches/new">New match</a>`
    : "";
  return `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Matches</h1>
          <p class="lede">Series qualifiers, ELR, and outlaw matches. Claim a spot and it shows up on your profile.</p>
        </div>
        ${newMatch}
      </header>
      <search class="toolbar" aria-label="Filter matches">
        <div class="field field-grow">
          <label for="match-search">Search</label>
          <input id="match-search" type="search" name="q" data-filter="q" value="${esc(filters.q)}" placeholder="Name, range, or town" autocomplete="off" enterkeyhint="search">
        </div>
        <div class="field">
          <label for="match-discipline">Discipline</label>
          <select id="match-discipline" data-filter="discipline">${disciplineOptions}</select>
        </div>
        ${chipSet("Schedule", "when", [["upcoming", "Upcoming"], ["past", "Past"], ["all", "All"]], filters.when)}
      </search>
      <div id="results">${matchResults(filters)}</div>
    </div>`;
}

export function matchResults(filters) {
  const user = currentUser();
  const list = filterMatches(allMatches(), filters);
  const noun = list.length === 1 ? "match" : "matches";
  if (!list.length) {
    return `
      <p class="result-count" data-count-value="0">0 matches</p>
      ${emptyState("No matches in this view", "Try another discipline, or switch the schedule filter.", "", "")}`;
  }
  const cards = list.map((match) => `
    <article class="card">
      <div class="card-top">
        <p class="kicker">${esc(match.discipline)}</p>
        ${statusRow(match, user)}
      </div>
      <h2><a href="#/matches/${esc(match.id)}">${esc(match.name)}</a></h2>
      <p class="meta">${esc(formatDateRange(match.startDate, match.endDate))}</p>
      ${seriesMeta(match)}
      <p class="meta">${locationHtml(match.location)}</p>
      <p class="summary">${esc(match.summary)}</p>
      <p class="meta">${esc(money(match.fee))} · ${esc(String(match.schedule.rounds))} rounds</p>
      <div class="card-actions">
        <a class="btn btn-ghost" href="#/matches/${esc(match.id)}">Details</a>
        ${actionButton(match, user)}
      </div>
    </article>`).join("");
  return `
    <p class="result-count" data-count-value="${list.length}">${list.length} ${noun}</p>
    <div class="card-grid">${cards}</div>`;
}

function seriesMeta(match) {
  return [
    match.seriesLabel ? `<p class="meta">${esc(match.seriesLabel)}</p>` : "",
    match.movedFrom ? `<p class="meta">Moved from ${esc(formatDate(match.movedFrom))}</p>` : "",
    match.exceptionNote ? `<p class="meta">${esc(match.exceptionNote)}</p>` : "",
  ].join("");
}

function stageFigure(stageItem, picture = stagePicture(stageItem)) {
  const src = safeImageSrc(stageItem.image?.src) || safeRemoteSrc(stageItem.image?.src);
  const alt = stageItem.image?.alt || stageItem.name;
  const diagram = picture
    ? `<figure class="stage-figure">${picture}</figure>`
    : "";
  if (picture) return diagram;
  if (src) {
    const width = Number(stageItem.image?.width) || 800;
    const height = Number(stageItem.image?.height) || 450;
    return `<figure class="stage-figure"><img src="${esc(src)}" alt="${esc(alt)}" width="${width}" height="${height}" loading="lazy"></figure>${diagram}`;
  }
  return `
    <figure class="stage-figure">
      <div class="diagram" aria-hidden="true">${stageDiagram(stageItem.image?.diagram || "gong")}</div>
      <figcaption>Photo not posted yet. ${esc(alt)}</figcaption>
    </figure>`;
}

function stageProse(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.split(/\n{2,}/).map((para) => `<p>${esc(para).replaceAll("\n", "<br>")}</p>`).join("");
}

function stageSpecs(stageItem, director, onSheet = false) {
  if (!director) {
    return specList([
      ["Shots", String(stageItem.shots)],
      ["Time", stageItem.time],
      ["Distance", stageItem.distance],
      ["Target", stageItem.target],
    ]);
  }
  const rows = [
    ["Rounds", stageItem.shots != null ? String(stageItem.shots) : ""],
    ["Time", stageItem.time],
    ["Ranges", stageItem.distance],
    ["Targets", stageItem.target],
    ["Props", stageItem.props],
    ["Restrictions", stageItem.restrictions],
  ];
  if (!onSheet) rows.push(["Start", stageItem.startPosition]);
  rows.push(["Points", stageItem.points]);
  return specList(rows);
}

function courseIntro(match) {
  const count = (match.stages || []).length;
  if (match.origin !== "director") {
    const shown = count === 1 ? "1 representative stage" : `${count} representative stages`;
    return `Showing ${shown} from a course of ${match.schedule.stageCount}. The match book carries the full course of fire.`;
  }
  if (!count) return "Course of fire is not posted for this date.";
  const rounds = (match.stages || []).reduce((sum, stageItem) => sum + (Number(stageItem.shots) || 0), 0);
  const stageWord = count === 1 ? "stage" : "stages";
  const roundWord = rounds === 1 ? "round" : "rounds";
  return `${count} ${stageWord}, ${rounds} ${roundWord}.`;
}

function detailActions(match, user) {
  const logged = historyFor(user, match.id);
  if (isPast(match) && logged) {
    return `
      ${logged.placement ? `<p><strong>Your placement.</strong> ${esc(logged.placement)}</p>` : `<p>Logged. Placement not recorded.</p>`}
      ${logged.notes ? `<p>${esc(logged.notes)}</p>` : ""}
      <div class="card-actions">
        <button type="button" class="btn btn-ghost" data-action="log-attendance" data-id="${esc(match.id)}">Edit log</button>
        <button type="button" class="btn btn-danger" data-action="delete-history" data-id="${esc(match.id)}">Remove log</button>
      </div>`;
  }
  const registration = registrationFor(user, match.id);
  const note = registration && !isPast(match)
    ? `<p>You are ${registration.waitlisted ? "on the waitlist" : "registered"} in ${esc(registration.division)}.</p>`
    : "";
  return `${note}<div class="card-actions">${actionButton(match, user)}</div>`;
}

function capacityLine(match) {
  if (match.origin === "director" && match.capacity != null) {
    const { confirmed, waitlist } = fieldCounts(match.id);
    const waiting = waitlist ? ` ${waitlist} on the waitlist.` : "";
    return `${confirmed} of ${match.capacity} shooters.${waiting}`;
  }
  if (match.registrationStatus === "waitlist") return `Field is full at ${match.capacity}. Waitlist is open.`;
  if (match.capacity == null) return "Field size is set by the club.";
  if (match.registeredCount == null) return `${match.capacity} shooter cap`;
  return `${match.registeredCount} of ${match.capacity} shooters`;
}

export function matchDetail(id) {
  const match = matchById(id);
  if (!match) {
    return notFoundPage("Match not found", "That match is not on the calendar.", "#/matches", "Back to matches");
  }
  const user = currentUser();
  const directorCourse = match.origin === "director";
  const stages = (match.stages || []).map((stageItem, index) => {
    const picture = stagePicture(stageItem);
    return `
    <li class="panel">
      <p class="kicker">Stage ${index + 1} of ${match.stages.length}${directorCourse ? "" : " shown"}</p>
      <h3>${esc(stageItem.name)}</h3>
      ${stageSpecs(stageItem, directorCourse, Boolean(picture))}
      ${picture ? "" : stageProse(stageItem.description)}
      ${stageFigure(stageItem, picture)}
    </li>`;
  }).join("");
  const ownsCourse = directorCourse && (
    (match.directorUserId && match.directorUserId === user?.id && isMatchDirector(user))
    || isAdmin(user)
  );
  const courseDate = match.occurrenceDate || match.startDate;
  const courseButton = ownsCourse
    ? `<div class="card-actions"><button type="button" class="btn btn-ghost" data-action="edit-course" data-id="${esc(match.seriesId || match.id)}" data-date="${esc(courseDate)}">Edit CoF</button></div>`
    : "";

  return `
    <div class="page">
      ${backLink("#/matches", "All matches")}
      <header>
        <div class="card-top">
          <p class="kicker">${esc(match.discipline)}</p>
          ${statusRow(match, user)}
        </div>
        <h1>${esc(match.name)}</h1>
        ${match.seriesLabel ? `<p class="meta">${esc(match.seriesLabel)}</p>` : ""}
        <p class="lede">${esc(match.description)}</p>
      </header>
      <div class="detail-layout">
        <div class="detail-main">
          <section>
            <h2>Course of fire</h2>
            <p>${courseIntro(match)}</p>
            ${courseButton}
            ${specList([
              [match.origin === "director" ? "Est Round Count" : "Rounds", String(match.schedule.rounds)],
              ["Stages", String(directorCourse ? match.stages.length : match.schedule.stageCount)],
              ["Check-in", match.schedule.checkIn],
              ["First shot", match.schedule.firstShot],
              ["Match director", match.matchDirector],
            ])}
            ${stages ? `<ol class="stage-list">${stages}</ol>` : ""}
          </section>
          <section>
            <h2>Documents and results</h2>
            <p class="hint">These slots are ready for a match book, a stage gallery, and a results link from Impact Scoring or Practiscore.</p>
            ${documentList(match.documents)}
          </section>
        </div>
        <aside class="detail-aside">
          <div class="panel register-card">
            <h2>Registration</h2>
            <p class="fee">${esc(money(match.fee))}</p>
            <p class="meta">${esc(formatDateRange(match.startDate, match.endDate))}</p>
            ${match.movedFrom ? `<p class="meta">Moved from ${esc(formatDate(match.movedFrom))}</p>` : ""}
            ${match.cancelled
              ? `<p>This date is cancelled.${match.exceptionNote ? ` ${esc(match.exceptionNote)}` : ""}</p>`
              : (match.exceptionNote ? `<p>${esc(match.exceptionNote)}</p>` : "")}
            <p class="meta">${locationHtml(match.location)}</p>
            <p>${esc(capacityLine(match))}</p>
            ${match.directorUserId && match.directorUserId === user?.id && isMatchDirector(user) ? `<p><a href="#/director">You direct this match.</a></p>` : ""}
            ${isAdmin(user) ? `<div class="card-actions"><a class="btn btn-ghost" href="#/matches/${esc(match.seriesId || match.id)}/edit">Edit</a><button type="button" class="btn btn-danger" data-action="delete-match" data-id="${esc(match.seriesId || match.id)}">${match.seriesId || match.recurrence ? "Remove series" : "Remove match"}</button></div>` : ""}
            ${registrationNotYetOpen(match) ? `<p>Registration opens ${esc(formatDate(registrationOpensDate(match)))}.</p>` : ""}
            ${!registrationNotYetOpen(match) && match.registrationOpens && match.registrationStatus === "closed" ? `<p>Registration opens ${esc(formatDate(match.registrationOpens))}.</p>` : ""}
            ${detailActions(match, user)}
            <p class="hint">${esc(FEE_NOTE)}</p>
          </div>
        </aside>
      </div>
    </div>`;
}
