import { icon, logoMark } from "../icons.js";
import { isAdmin, isMatchDirector, roleLabel } from "../roles.js";
import { upcomingRegistrations } from "../selectors.js";
import { esc, initialsOf } from "../util.js";

const NAV = [
  { id: "matches", href: "#/matches", label: "Matches" },
  { id: "learning", href: "#/learning", label: "Learning" },
  { id: "equipment", href: "#/equipment", label: "Equipment" },
  { id: "boards", href: "#/boards", label: "Boards" },
  { id: "profile", href: "#/profile", label: "Profile" },
];

export function navItems(user) {
  const items = [...NAV];
  if (isMatchDirector(user)) items.push({ id: "director", href: "#/director", label: "Director" });
  if (isAdmin(user)) items.push({ id: "users", href: "#/users", label: "Users" });
  return items;
}

export function navList(user) {
  const upcoming = upcomingRegistrations(user).length;
  return `<ul class="nav-list">${navItems(user).map((item) => {
    const badge = item.id === "profile"
      ? `<span class="nav-count"${upcoming ? "" : " hidden"}><span data-count>${upcoming}</span><span class="visually-hidden"> upcoming registrations</span></span>`
      : "";
    return `<li><a class="nav-link" href="${item.href}" data-nav="${item.id}">${icon(item.id)}<span>${item.label}</span>${badge}</a></li>`;
  }).join("")}</ul>`;
}

export function shellHtml(user) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#/matches">${logoMark()}<span class="wordmark">MATCHPOINT</span></a>
        <button type="button" class="btn btn-ghost" data-action="sign-out">Sign out</button>
      </header>
      <div class="sidebar">
        <a class="brand" href="#/matches">${logoMark()}<span class="wordmark">MATCHPOINT</span></a>
        <p class="sidebar-tag">Precision rifle</p>
        <nav aria-label="Primary">${navList(user)}</nav>
        <div class="sidebar-foot">
          <div class="user-chip">
            <span class="avatar" data-user-initials>${esc(initialsOf(user.name))}</span>
            <span class="user-meta">
              <span class="user-name" data-user-name>${esc(user.name)}</span>
              <span class="user-role" data-user-role>${esc(roleLabel(user))}</span>
              <span class="user-email">${esc(user.email)}</span>
            </span>
          </div>
          <button type="button" class="btn btn-ghost btn-block" data-action="sign-out">Sign out</button>
        </div>
      </div>
      <main id="content" tabindex="-1"></main>
      <nav class="tabbar" aria-label="Primary">${navList(user)}</nav>
    </div>`;
}
