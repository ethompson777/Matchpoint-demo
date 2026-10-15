import { divisions, gearCategories } from "../data/index.js";
import { roleLabel } from "../roles.js";
import { currentUser } from "../store.js";
import { historyEntries, upcomingRegistrations } from "../selectors.js";
import { dash, esc, formatDate, formatDateRange, locationHtml, option, safeImageSrc } from "../util.js";
import { emptyState } from "./shared.js";

export function profilePage() {
  const user = currentUser();
  if (!user) return "";
  const divisionOptions = divisions.map((name) => option(name, name, user.division)).join("");
  const typeOptions = [`<option value="" selected disabled>Select a type</option>`]
    .concat([...gearCategories, "Other"].map((name) => option(name, name, ""))).join("");
  const upcoming = upcomingRegistrations(user);
  const history = historyEntries(user);
  const standing = user.standing || {};

  const gearCards = user.gear.length
    ? `<div class="gear-grid">${user.gear.map((item) => {
        const src = safeImageSrc(item.image?.src);
        const photo = src
          ? `<img class="thumb" src="${src}" alt="${esc(item.image.alt || item.makeModel)}" width="${Number(item.image.width) || 480}" height="${Number(item.image.height) || 360}">`
          : "";
        return `
          <article class="card" id="${esc(item.id)}" tabindex="-1">
            ${photo}
            <p class="kicker">${esc(item.type)}</p>
            <h3>${esc(item.makeModel)}</h3>
            ${item.notes ? `<p>${esc(item.notes)}</p>` : ""}
            <div class="card-actions">
              <button type="button" class="btn btn-danger" data-action="delete-gear" data-id="${esc(item.id)}">Remove</button>
            </div>
          </article>`;
      }).join("")}</div>`
    : emptyState("No equipment listed yet", "Add a rifle, optic, or the bag you actually shoot.", "", "");

  const upcomingCards = upcoming.length
    ? `<div class="card-grid">${upcoming.map((entry) => `
        <article class="card">
          <p class="kicker">${esc(entry.match.discipline)} · ${esc(entry.division)}</p>
          <h3><a href="#/matches/${esc(entry.match.id)}">${esc(entry.match.name)}</a></h3>
          <p class="meta">${esc(formatDateRange(entry.match.startDate, entry.match.endDate))}</p>
          ${entry.match.cancelled ? `<p class="meta">This date is cancelled.${entry.match.exceptionNote ? ` ${esc(entry.match.exceptionNote)}` : ""}</p>` : ""}
          ${entry.match.movedFrom ? `<p class="meta">Moved from ${esc(formatDate(entry.match.movedFrom))}</p>` : ""}
          <p class="meta">${locationHtml(entry.match.location)}</p>
          ${entry.waitlisted ? `<p class="meta">Waitlist</p>` : ""}
          <div class="card-actions">
            <a class="btn btn-ghost" href="#/matches/${esc(entry.match.id)}">Details</a>
            <button type="button" class="btn btn-ghost" data-action="withdraw" data-id="${esc(entry.match.id)}">Withdraw</button>
          </div>
        </article>`).join("")}</div>`
    : emptyState("No upcoming registrations", "Browse the calendar and claim a spot.", "#/matches", "Browse matches");

  const historyCards = history.length
    ? `<div class="card-grid">${history.map((entry) => `
        <article class="card">
          <p class="kicker">${esc(entry.match.discipline)}</p>
          <h3><a href="#/matches/${esc(entry.match.id)}">${esc(entry.match.name)}</a></h3>
          <p class="meta">${esc(formatDateRange(entry.match.startDate, entry.match.endDate))}</p>
          <p>${entry.placement ? esc(entry.placement) : "Placement not recorded"}</p>
          ${entry.notes ? `<p class="summary">${esc(entry.notes)}</p>` : ""}
        </article>`).join("")}</div>`
    : emptyState("No past matches logged", "Open a completed match and log that you shot it.", "#/matches", "See past matches");

  return `
    <div class="page">
      <header class="page-head">
        <div>
          <p class="kicker">${esc(roleLabel(user))}</p>
          <h1>Profile</h1>
          <p class="lede">The equipment you own, the matches you are shooting, and the shooter IDs a future sync can use.</p>
        </div>
      </header>
      <div class="profile-split">
        <section class="panel" aria-labelledby="shooter-heading">
          <h2 id="shooter-heading">Shooter profile</h2>
          <form id="form-profile" class="form-grid">
            <p class="form-error" role="alert" hidden></p>
            <div class="field">
              <label for="profile-name">Display name</label>
              <input id="profile-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="80" value="${esc(user.name)}">
              <span class="field-error">Enter at least 2 characters.</span>
            </div>
            <div class="field">
              <label for="profile-email">Email</label>
              <input id="profile-email" type="email" value="${esc(user.email)}" readonly>
            </div>
            <div class="field">
              <label for="profile-division">Usual division</label>
              <span id="profile-division-hint" class="hint">Series names differ. Pick the class you usually shoot. This is the default when you register.</span>
              <select id="profile-division" name="division" aria-describedby="profile-division-hint">${divisionOptions}</select>
            </div>
            <fieldset class="stack-fields">
              <legend>External profiles</legend>
              <p class="hint">Save your shooter IDs. MatchPoint can use them later to pull match history and classifications from Impact Scoring, NRL, and PRS. They stay on this device until a sync is connected.</p>
              <div class="field">
                <label for="impact-id">Impact Scoring shooter ID</label>
                <input id="impact-id" name="impactId" type="text" maxlength="64" spellcheck="false" autocomplete="off" value="${esc(user.external?.impactId || "")}" placeholder="Example: 12345">
              </div>
              <div class="field">
                <label for="nrl-id">NRL member ID</label>
                <input id="nrl-id" name="nrlId" type="text" maxlength="64" spellcheck="false" autocomplete="off" value="${esc(user.external?.nrlId || "")}">
              </div>
              <div class="field">
                <label for="prs-id">PRS shooter ID</label>
                <input id="prs-id" name="prsId" type="text" maxlength="64" spellcheck="false" autocomplete="off" value="${esc(user.external?.prsId || "")}">
              </div>
              <p class="meta">Sync status: not connected</p>
            </fieldset>
            <button type="submit" class="btn btn-primary">Save profile</button>
          </form>
        </section>
        <section class="panel" aria-labelledby="standing-heading">
          <h2 id="standing-heading">Standing</h2>
          <dl class="spec-list">
            <div><dt>Division</dt><dd>${esc(user.division)}</dd></div>
            <div><dt>Season rank</dt><dd>${dash(standing.rank)}</dd></div>
            <div><dt>Points</dt><dd>${dash(standing.points)}</dd></div>
            <div><dt>Classification</dt><dd>${standing.classification ? esc(standing.classification) : "Unclassified"}</dd></div>
          </dl>
          <p class="hint">Rank, points, and classification stay blank until a results source is connected. Your saved shooter IDs are the hook for that sync.</p>
        </section>
      </div>
      <section>
        <div class="section-head">
          <h2>Owned equipment</h2>
        </div>
        <details class="panel" id="add-gear-panel">
          <summary id="add-gear">Add equipment</summary>
          <form id="form-gear" class="form-grid">
            <p class="form-error" role="alert" hidden></p>
            <div class="field">
              <label for="gear-type">Type</label>
              <select id="gear-type" name="type" required>${typeOptions}</select>
              <span class="field-error">Choose a type.</span>
            </div>
            <div class="field">
              <label for="gear-model">Make and model</label>
              <input id="gear-model" name="makeModel" type="text" required minlength="2" maxlength="120" autocomplete="off">
              <span class="field-error">Enter the make and model.</span>
            </div>
            <div class="field">
              <label for="gear-notes">Notes</label>
              <textarea id="gear-notes" name="notes" maxlength="500"></textarea>
            </div>
            <div class="field">
              <label for="gear-photo">Photo</label>
              <span id="gear-photo-hint" class="hint">Optional. JPEG, PNG, WebP, or GIF. Stored only on this device.</span>
              <input id="gear-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-describedby="gear-photo-hint">
            </div>
            <button type="submit" class="btn btn-primary">Save equipment</button>
          </form>
        </details>
        ${gearCards}
      </section>
      <div class="profile-split">
        <section>
          <h2>Upcoming matches</h2>
          ${upcomingCards}
        </section>
        <section>
          <h2>Past matches</h2>
          ${historyCards}
        </section>
      </div>
    </div>`;
}
