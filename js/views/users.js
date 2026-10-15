import { currentUser, listUsers } from "../store.js";
import { isAdmin } from "../roles.js";
import { esc } from "../util.js";
import { notFoundPage } from "./shared.js";

function accountKind(user) {
  return isAdmin(user) ? "General admin" : "Shooter";
}

export function usersPage() {
  const actor = currentUser();
  if (!isAdmin(actor)) {
    return notFoundPage(
      "Admin only",
      "The general admin account is the one that can change permissions.",
      "#/matches",
      "Back to matches",
    );
  }

  const users = listUsers();
  const rows = users.map((user) => {
    const checked = user.permissions?.matchDirector ? " checked" : "";
    return `
      <li class="panel account-row">
        <div class="account-id">
          <h2>${esc(user.name)}</h2>
          <p class="meta">${esc(user.email)}</p>
          <p class="kicker">${accountKind(user)}</p>
        </div>
        <label class="choice">
          <input type="checkbox" data-permission="matchDirector" data-id="${esc(user.id)}"${checked}>
          <span>Match director<span class="visually-hidden"> for ${esc(user.name)}</span></span>
        </label>
      </li>`;
  }).join("");

  const count = users.length === 1 ? "1 account" : `${users.length} accounts`;

  return `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Users</h1>
          <p class="lede">Accounts stored in this browser. Match director is the only permission so far. A director can post matches and change registration on the matches they run. They cannot open this list.</p>
        </div>
      </header>
      <p class="result-count">${count} on this device</p>
      <ul class="account-list">${rows}</ul>
    </div>`;
}
