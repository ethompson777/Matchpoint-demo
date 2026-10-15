import { allArticles, allGear, articleById, articleSegments, conditions, disciplines, divisions, gearById, gearCategories, gearSegments, learningCategories, listingCategories, matchById } from "./data/index.js";
import { closeModal, modalShell, openModal } from "./dialogs.js";
import { courseFor, expandMatch, occurrenceDates } from "./recurrence.js";
import { articleDraft, catalogMatchDraft, courseStageDraft, gearDraft, isAdmin, isMatchDirector, listingDraft, matchDraft, roleLabel, stageDraft, stageSnapshot, venueDraft } from "./roles.js";
import {
  addGear,
  addListing,
  addSegment,
  currentUser,
  directedMatches,
  ensureAdmin,
  hideCatalogRecord,
  initStore,
  login,
  logout,
  registerForMatch,
  registerUser,
  removeDirectedMatch,
  removeGear,
  removeMatch,
  removeSegment,
  removeStage,
  removeVenue,
  removeHistory,
  removeListing,
  saveCatalogRecord,
  saveDirectedMatch,
  saveHistory,
  saveStage,
  saveVenue,
  setMatchCourse,
  setMatchDirector,
  signupIsWaitlist,
  setOccurrenceException,
  stages,
  updateDirectedLead,
  updateDirectedStatus,
  updateListing,
  updateProfile,
  venues,
  withdrawFromMatch,
} from "./store.js";
import { historyFor, listingById, upcomingRegistrations } from "./selectors.js";
import { announce, effectiveRegistrationStatus, esc, FEE_NOTE, formatDate, formatDateRange, isPast, money, option, registrationNotYetOpen, safeImageSrc, uid } from "./util.js";
import { bindStageBoard, stageEditorChanged } from "./stage-board.js";
import { stageFormFields, syncEndDate, syncRepeatFields, syncVenueAddress } from "./views/director.js";
import { articleSectionFields } from "./views/learning.js";
import { pageHtml, pageTitle, resultsHtml } from "./views/pages.js";
import { navList, shellHtml } from "./views/shell.js";
import { splashHtml } from "./views/splash.js";

const filters = {
  matches: { q: "", discipline: "all", when: "upcoming" },
  learning: { q: "", category: "all", level: "all" },
  equipment: { q: "", category: "all" },
  boards: { q: "", category: "all", type: "all" },
};

let shellMode = null;
let toastTimer = 0;

function route() {
  let raw = location.hash.replace(/^#/, "");
  if (!raw || raw === "/") raw = "/matches";
  const [pathPart, queryPart] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  let id = parts[1] ? decodeURIComponent(parts[1]) : null;
  if (id === "") id = null;
  return { name: parts[0] || "matches", id, edit: parts[2] === "edit", params: new URLSearchParams(queryPart || "") };
}

function paint({ focus = false } = {}) {
  const user = currentUser();
  const mode = user ? "app" : "auth";
  const app = document.getElementById("app");
  const switched = mode !== shellMode;
  if (switched) {
    shellMode = mode;
    app.innerHTML = mode === "auth" ? splashHtml() : shellHtml(user);
  }
  if (mode === "app") {
    const current = route();
    const main = document.querySelector("main#content");
    const apply = () => {
      main.innerHTML = pageHtml(current, filters);
      updateChrome(current, currentUser());
      document.title = `${pageTitle(current)} · MatchPoint`;
      hydrate();
    };
    apply();
    if (focus) {
      window.scrollTo(0, 0);
      focusHeading();
    }
  } else {
    document.title = "Sign in · MatchPoint";
    if (focus) {
      const heading = document.getElementById("auth-heading");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    }
  }
}

function refreshMain() {
  if (shellMode !== "app") return;
  const main = document.querySelector("main#content");
  const y = window.scrollY;
  const current = route();
  main.innerHTML = pageHtml(current, filters);
  updateChrome(current, currentUser());
  hydrate();
  window.scrollTo(0, y);
}

function updateResults() {
  const slot = document.getElementById("results");
  if (!slot) return;
  slot.innerHTML = resultsHtml(route(), filters);
}

function updateChrome(current, user) {
  if (user) {
    document.querySelectorAll("nav[aria-label='Primary']").forEach((nav) => {
      nav.innerHTML = navList(user);
    });
  }
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === current.name) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (!user) return;
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = user.name;
  });
  document.querySelectorAll("[data-user-role]").forEach((el) => {
    el.textContent = roleLabel(user);
  });
  document.querySelectorAll("[data-user-initials]").forEach((el) => {
    el.textContent = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "MP";
  });
  const count = upcomingRegistrations(user).length;
  document.querySelectorAll(".nav-count").forEach((el) => {
    el.hidden = count === 0;
    const num = el.querySelector("[data-count]");
    if (num) num.textContent = String(count);
  });
}

function hydrate() {
  const listing = document.getElementById("form-listing");
  if (listing) syncListingFields(listing);
  document.querySelectorAll("form.form-direct-match").forEach((form) => {
    syncRepeatFields(form);
    syncVenueAddress(form);
  });
}

function focusHeading() {
  const heading = document.querySelector("main#content h1");
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

function focusById(id) {
  const button = document.querySelector(`button[data-id="${CSS.escape(id)}"]`);
  const heading = document.querySelector("main#content h1");
  (button || heading)?.focus?.();
}

function setToastOffset() {
  const toast = document.getElementById("toast");
  const height = toast.hidden ? 0 : toast.offsetHeight;
  document.documentElement.style.setProperty("--toast-h", `${height}px`);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.hidden = false;
  toast.textContent = message;
  setToastOffset();
  announce(message);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
    toast.textContent = "";
    setToastOffset();
  }, 4200);
}

function showFormError(form, message) {
  const el = form.querySelector(".form-error");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.tabIndex = -1;
  el.focus();
}

function clearFormError(form) {
  const el = form?.querySelector?.(".form-error");
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

function setAuthTab(which) {
  document.querySelectorAll("#auth-tabs [role='tab']").forEach((tab) => {
    const on = tab.dataset.authTab === which;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
  });
  const signin = document.getElementById("panel-signin");
  const register = document.getElementById("panel-register");
  if (signin) signin.hidden = which !== "signin";
  if (register) register.hidden = which !== "register";
}

function syncConfirm(form) {
  const confirm = form.elements.confirm;
  if (!confirm) return;
  if (!confirm.value) {
    confirm.setCustomValidity("");
    return;
  }
  confirm.setCustomValidity(confirm.value !== form.elements.password.value ? "Passwords do not match." : "");
}

function syncListingFields(form) {
  const type = form.listingType.value;
  const sale = form.querySelector("[data-sale-field]");
  const trade = form.querySelector("[data-trade-field]");
  const showPrice = type !== "trade";
  const showTrade = type !== "sale";
  sale.hidden = !showPrice;
  trade.hidden = !showTrade;
  form.price.required = showPrice;
  form.tradePreference.required = type === "trade";
  if (!showPrice) form.price.value = "";
  if (!showTrade) form.tradePreference.value = "";
}

async function withSubmit(form, task) {
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    await task();
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}

function signOut() {
  logout();
  shellMode = null;
  paint({ focus: true });
  showToast("Signed out.");
}

function openRegister(id) {
  const match = matchById(id);
  const user = currentUser();
  if (!match || !user || isPast(match) || match.cancelled) return;
  if (registrationNotYetOpen(match)) return;
  if (effectiveRegistrationStatus(match) === "full" || effectiveRegistrationStatus(match) === "closed") return;
  const waitlist = signupIsWaitlist(match);
  const divisionsHtml = divisions.map((name) => option(name, name, user.division)).join("");
  openModal(modalShell({
    title: waitlist ? "Join the waitlist" : "Register",
    intent: "register",
    id: match.id,
    confirmLabel: waitlist ? "Join waitlist" : "Confirm registration",
    body: `
      <p>You are recording a spot at <strong>${esc(match.name)}</strong> for ${esc(formatDateRange(match.startDate, match.endDate))}.</p>
      <p class="meta">${esc(money(match.fee))} · ${esc(user.email)}</p>
      <div class="field">
        <label for="reg-division">Division</label>
        <select id="reg-division" name="division">${divisionsHtml}</select>
      </div>
      <p class="hint">${esc(FEE_NOTE)}</p>`,
  }));
}

function openWithdraw(id) {
  const match = matchById(id);
  if (!match) return;
  openModal(modalShell({
    title: "Withdraw from this match",
    intent: "withdraw",
    id: match.id,
    confirmLabel: "Withdraw",
    danger: true,
    body: `<p>This removes <strong>${esc(match.name)}</strong> from your upcoming list on this device.</p>`,
  }));
}

function openHistory(id) {
  const match = matchById(id);
  const user = currentUser();
  if (!match || !user) return;
  const existing = historyFor(user, match.id);
  openModal(modalShell({
    title: existing ? "Edit match log" : "Log attendance",
    intent: "history",
    id: match.id,
    confirmLabel: "Save to history",
    body: `
      <p>${esc(match.name)}</p>
      <div class="field">
        <label for="placement">Placement</label>
        <span id="placement-hint" class="hint">Optional. Example: 14 of 86.</span>
        <input id="placement" name="placement" type="text" maxlength="40" aria-describedby="placement-hint" value="${esc(existing?.placement || "")}">
      </div>
      <div class="field">
        <label for="hist-notes">Notes</label>
        <textarea id="hist-notes" name="notes" maxlength="500">${esc(existing?.notes || "")}</textarea>
      </div>`,
  }));
}

function openDeleteHistory(id) {
  const match = matchById(id);
  if (!match) return;
  openModal(modalShell({
    title: "Remove this log",
    intent: "delete-history",
    id: match.id,
    confirmLabel: "Remove log",
    danger: true,
    body: `<p>Remove ${esc(match.name)} from your past matches.</p>`,
  }));
}

function openDeleteGear(id) {
  const item = currentUser()?.gear.find((gear) => gear.id === id);
  if (!item) return;
  openModal(modalShell({
    title: "Remove this equipment",
    intent: "delete-gear",
    id: item.id,
    confirmLabel: "Remove",
    danger: true,
    body: `<p>Remove ${esc(item.makeModel)} from your profile.</p>`,
  }));
}

function openDeleteListing(id) {
  openModal(modalShell({
    title: "Remove this listing",
    intent: "delete-listing",
    id,
    confirmLabel: "Remove listing",
    danger: true,
    body: "<p>This takes the post off the board on this device.</p>",
  }));
}

async function handleModal(form) {
  if (!form.reportValidity()) return;
  const intent = form.dataset.intent;
  const id = form.dataset.id;
  const data = new FormData(form);
  try {
    if (intent === "register") {
      const match = matchById(id);
      const blocked = !match || match.cancelled || isPast(match) || registrationNotYetOpen(match)
        || effectiveRegistrationStatus(match) === "full" || effectiveRegistrationStatus(match) === "closed";
      if (blocked) {
        showFormError(form, match?.cancelled ? "That date is cancelled." : "Registration is not open for this match.");
        return;
      }
      const entry = registerForMatch(id, String(data.get("division") || ""), {
        waitlisted: effectiveRegistrationStatus(match) === "waitlist",
      });
      closeModal();
      refreshMain();
      focusById(id);
      showToast(entry.waitlisted
        ? `Waitlist saved for ${match.name}.`
        : `Registered for ${match.name}.`);
      return;
    }
    if (intent === "withdraw") {
      withdrawFromMatch(id);
      closeModal();
      refreshMain();
      focusById(id);
      showToast("Registration removed.");
      return;
    }
    if (intent === "history") {
      saveHistory(id, { placement: data.get("placement"), notes: data.get("notes") });
      closeModal();
      refreshMain();
      focusById(id);
      showToast("Match log saved.");
      return;
    }
    if (intent === "delete-history") {
      removeHistory(id);
      closeModal();
      refreshMain();
      focusById(id);
      showToast("Match log removed.");
      return;
    }
    if (intent === "delete-gear") {
      removeGear(id);
      closeModal();
      refreshMain();
      document.getElementById("add-gear")?.focus();
      showToast("Equipment removed.");
      return;
    }
    if (intent === "delete-directed") {
      removeDirectedMatch(id);
      closeModal();
      showToast("Match removed.");
      const viewing = route().name === "matches" && route().id && (route().id === id || route().id.startsWith(`${id}~`));
      if (viewing) location.hash = "#/director";
      else refreshMain();
      return;
    }
    if (intent === "cancel-occurrence") {
      setOccurrenceException(id, form.dataset.date, { cancelled: true, note: data.get("note") });
      finishOccurrence(id, "That date is cancelled.");
      return;
    }
    if (intent === "move-occurrence") {
      const startDate = String(data.get("startDate") || "");
      const endDate = String(data.get("endDate") || "");
      if (endDate < startDate) {
        showFormError(form, "End date is before the start date.");
        return;
      }
      setOccurrenceException(id, form.dataset.date, {
        startDate,
        endDate,
        note: data.get("note"),
      });
      finishOccurrence(id, "That date was moved.");
      return;
    }
    if (intent === "restore-occurrence") {
      setOccurrenceException(id, form.dataset.date, null);
      finishOccurrence(id, "That date is back on the calendar.");
      return;
    }
    if (intent === "save-venue") {
      const existing = id ? venues().find((venue) => venue.id === id) || null : null;
      const draft = venueDraft(currentUser(), {
        name: data.get("name"),
        address: data.get("address"),
      }, existing);
      saveVenue(draft);
      closeModal();
      refreshMain();
      document.getElementById(draft.id)?.focus();
      showToast(existing ? "Venue updated." : "Venue added.");
      return;
    }
    if (intent === "delete-venue") {
      removeVenue(id);
      closeModal();
      refreshMain();
      document.getElementById("add-venue")?.focus();
      showToast("Venue removed.");
      return;
    }
    if (intent === "save-stage") {
      await saveStageFromForm(form, data, id);
      return;
    }
    if (intent === "delete-stage") {
      removeStage(id);
      closeModal();
      refreshMain();
      document.getElementById("add-stage")?.focus();
      showToast("Stage removed.");
      return;
    }
    if (intent === "save-course-stage") {
      await saveCourseStageFromForm(form, data, id);
      return;
    }
    if (intent === "close-course") {
      closeModal();
      return;
    }
    if (intent === "delete-listing") {
      const removed = removeListing(id);
      closeModal();
      if (!removed) {
        showToast("That post could not be removed.");
        return;
      }
      showToast("Listing removed.");
      if (route().name === "boards" && route().id === id) location.hash = "#/boards";
      else refreshMain();
      return;
    }
    if (intent === "delete-match") {
      removeMatch(id);
      closeModal();
      showToast("Match removed.");
      const viewing = route().name === "matches" && route().id && (route().id === id || route().id.startsWith(`${id}~`));
      if (viewing) location.hash = "#/matches";
      else refreshMain();
      return;
    }
    if (intent === "delete-article") {
      hideCatalogRecord("articles", id);
      closeModal();
      showToast("Guide removed.");
      if (route().name === "learning" && route().id === id) location.hash = "#/learning";
      else refreshMain();
      return;
    }
    if (intent === "delete-suggested") {
      hideCatalogRecord("gear", id);
      closeModal();
      showToast("Equipment removed.");
      if (route().name === "equipment" && route().id === id) location.hash = "#/equipment";
      else refreshMain();
      return;
    }
    if (intent === "add-segment") {
      const seeds = id === "articles" ? learningCategories : gearCategories;
      const name = addSegment(id, data.get("name"), seeds);
      closeModal();
      updateResults();
      focusSegment(name);
      showToast("Segment added.");
      return;
    }
    if (intent === "remove-segment") {
      const seeds = id === "articles" ? learningCategories : gearCategories;
      const used = (id === "articles" ? allArticles() : allGear()).map((item) => item.category);
      removeSegment(id, form.dataset.date, seeds, used);
      closeModal();
      updateResults();
      document.querySelector("[data-action='add-segment']")?.focus();
      showToast("Segment removed.");
      return;
    }
  } catch (error) {
    showFormError(form, error.message || "Could not save that change.");
  }
}

async function readPhoto(file, { maxEdge = 960, quality = 0.72, maxLength = 0 } = {}) {
  if (!file || typeof file !== "object" || !file.size) return null;
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) throw new Error("Use a JPEG, PNG, WebP, or GIF.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image under 8 MB.");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not process that image.");
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  let src = canvas.toDataURL("image/jpeg", quality);
  if (maxLength && src.length > maxLength) src = canvas.toDataURL("image/jpeg", 0.45);
  if (!src.startsWith("data:image/jpeg")) throw new Error("Could not process that image.");
  if (maxLength && src.length > maxLength) throw new Error("That image is too large to store on this device.");
  return { src, width, height };
}

async function imageFromStageForm(data, existing, name) {
  const photo = await readPhoto(data.get("photo"), { maxEdge: 720, quality: 0.62, maxLength: 160000 });
  if (photo) return { src: photo.src, alt: name, width: photo.width, height: photo.height };
  if (data.get("clearPhoto")) return { src: null, alt: name, width: null, height: null };
  const src = safeImageSrc(existing?.image?.src);
  if (src) {
    return {
      src,
      alt: name,
      width: existing.image.width || null,
      height: existing.image.height || null,
    };
  }
  return { src: null, alt: name, width: null, height: null };
}

function warnStageDismiss(dialog) {
  const note = dialog.querySelector(".stage-editor .stage-dismiss");
  if (!note || !stageEditorChanged(dialog)) return false;
  note.hidden = false;
  note.scrollIntoView({ block: "nearest" });
  note.querySelector("[data-keep-stage]")?.focus();
  return true;
}

function syncAriaInvalid(target) {
  if (!target?.matches?.("input, select, textarea")) return;
  if (!target.willValidate) return;
  if (target.matches(":user-invalid")) target.setAttribute("aria-invalid", "true");
  else target.removeAttribute("aria-invalid");
}

function bind() {
  const dialog = document.getElementById("modal");
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    if (warnStageDismiss(dialog)) return;
    dialog.close();
  });
  dialog.addEventListener("cancel", (event) => {
    if (!warnStageDismiss(dialog)) return;
    event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    dialog.innerHTML = "";
  });

  document.addEventListener("click", (event) => {
    const tab = event.target.closest?.("[data-auth-tab]");
    if (tab) {
      setAuthTab(tab.dataset.authTab);
      return;
    }
    const trigger = event.target.closest?.("[data-action]");
    if (!trigger) return;
    const { action, id = "", date = "" } = trigger.dataset;
    if (action === "close-modal") closeModal();
    else if (action === "sign-out") signOut();
    else if (action === "register") openRegister(id);
    else if (action === "withdraw") openWithdraw(id);
    else if (action === "log-attendance") openHistory(id);
    else if (action === "delete-history") openDeleteHistory(id);
    else if (action === "delete-gear") openDeleteGear(id);
    else if (action === "delete-listing") openDeleteListing(id);
    else if (action === "delete-directed") openDeleteDirected(id);
    else if (action === "delete-match") openDeleteMatch(id);
    else if (action === "delete-article") openDeleteArticle(id);
    else if (action === "delete-suggested") openDeleteSuggested(id);
    else if (action === "add-venue") openVenueForm();
    else if (action === "edit-venue") openVenueForm(id);
    else if (action === "delete-venue") openDeleteVenue(id);
    else if (action === "add-stage") openStageForm();
    else if (action === "edit-stage") openStageForm(id);
    else if (action === "delete-stage") openDeleteStage(id);
    else if (action === "edit-course") openCourse(id, date);
    else if (action === "course-import") importCourseStage(id, date);
    else if (action === "course-remove") changeCourse(id, date, (list, index) => list.filter((_, itemIndex) => itemIndex !== index), trigger.dataset.index, 0);
    else if (action === "course-up") changeCourse(id, date, (list, index) => moveCourseStage(list, index, -1), trigger.dataset.index, -1);
    else if (action === "course-down") changeCourse(id, date, (list, index) => moveCourseStage(list, index, 1), trigger.dataset.index, 1);
    else if (action === "course-edit") openCourseStageForm(id, date, trigger.dataset.index);
    else if (action === "cancel-occurrence") openCancelOccurrence(id, date);
    else if (action === "move-occurrence") openMoveOccurrence(id, date);
    else if (action === "restore-occurrence") openRestoreOccurrence(id, date);
    else if (action === "add-segment") openAddSegment(trigger.dataset.kind);
    else if (action === "remove-segment") openRemoveSegment(trigger.dataset.kind, trigger.dataset.name);
    else if (action === "add-article-section") addArticleSection(trigger.closest("form"));
  });

  document.addEventListener("keydown", (event) => {
    if (!event.target.closest?.("[role='tablist']")) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const tabs = [...document.querySelectorAll("#auth-tabs [role='tab']")];
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    next.focus();
    setAuthTab(next.dataset.authTab);
  });

  document.addEventListener("input", (event) => {
    const el = event.target;
    if (el.form?.id === "form-register" && (el.name === "password" || el.name === "confirm")) {
      syncConfirm(el.form);
    }
    if (el.form) clearFormError(el.form);
    if (el.form?.classList.contains("form-direct-match") && el.name === "startDate") {
      syncEndDate(el.form);
      syncRepeatFields(el.form);
    }
    if (el.form?.classList.contains("form-catalog-match") && el.name === "startDate") syncEndDate(el.form);
    if (el.form?.id === "modal-form" && el.name === "startDate" && el.form.elements.endDate) syncEndDate(el.form);
    if (el.name === "endDate" && el.form?.elements?.startDate) el.dataset.custom = "true";
    if (el.dataset?.filter === "q") {
      const key = route().name;
      if (!filters[key]) return;
      filters[key].q = el.value;
      updateResults();
    }
  });

  document.addEventListener("change", (event) => {
    const el = event.target;
    if (el?.form?.classList.contains("form-direct-match") && (el.name === "repeat" || el.name === "startDate")) {
      if (el.name === "startDate") syncEndDate(el.form);
      syncRepeatFields(el.form);
    }
    if (el?.form?.classList.contains("form-catalog-match") && el?.name === "startDate") syncEndDate(el.form);
    if (el?.form?.id === "modal-form" && el?.name === "startDate" && el.form.elements.endDate) syncEndDate(el.form);
    if (el?.name === "endDate" && el.form?.elements?.startDate) el.dataset.custom = "true";
    if (el?.form?.classList.contains("form-direct-match") && el.name === "venueId") {
      syncVenueAddress(el.form);
    }
    if (el?.name === "listingType" && el.form) {
      syncListingFields(el.form);
      return;
    }
    if (el?.dataset?.permission === "matchDirector") {
      handleDirectorToggle(el);
      return;
    }
    if (el?.dataset?.directStatus) {
      handleDirectStatus(el);
      return;
    }
    if (el?.dataset?.leadToggle) {
      handleLeadToggle(el);
      return;
    }
    if (el?.dataset?.leadDays) {
      handleLeadDays(el);
      return;
    }
    if (el?.dataset?.moveKind) {
      handleMoveSegment(el);
      return;
    }
    if (!el?.dataset?.filter || el.dataset.filter === "q") return;
    const key = route().name;
    if (!filters[key]) return;
    if (el.type === "radio" && !el.checked) return;
    filters[key][el.dataset.filter] = el.value;
    updateResults();
    const count = document.querySelector("#results [data-count-value]")?.dataset.countValue;
    if (count != null) announce(`${count} shown`);
  });

  document.addEventListener("blur", (event) => syncAriaInvalid(event.target), true);

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === "form-signin") {
      event.preventDefault();
      withSubmit(form, () => handleSignIn(form));
    } else if (form.id === "form-register") {
      event.preventDefault();
      withSubmit(form, () => handleRegister(form));
    } else if (form.id === "form-listing") {
      event.preventDefault();
      withSubmit(form, () => handleListing(form));
    } else if (form.classList.contains("form-catalog-match")) {
      event.preventDefault();
      withSubmit(form, () => handleCatalogMatch(form));
    } else if (form.classList.contains("form-article")) {
      event.preventDefault();
      withSubmit(form, () => handleArticle(form));
    } else if (form.id === "form-edit-gear") {
      event.preventDefault();
      withSubmit(form, () => handleSuggested(form));
    } else if (form.id === "form-gear") {
      event.preventDefault();
      withSubmit(form, () => handleGear(form));
    } else if (form.id === "form-profile") {
      event.preventDefault();
      withSubmit(form, () => handleProfile(form));
    } else if (form.classList.contains("form-direct-match")) {
      event.preventDefault();
      withSubmit(form, () => handleDirectMatch(form));
    } else if (form.id === "modal-form") {
      event.preventDefault();
      handleModal(form);
    }
  });
}

async function handleSignIn(form) {
  clearFormError(form);
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    const result = await login({ email: data.get("email"), password: data.get("password") });
    if (!result.ok) {
      showFormError(form, result.error);
      return;
    }
  } catch (error) {
    showFormError(form, error.message);
    return;
  }
  const name = currentUser()?.name?.split(/\s+/)[0] || "";
  shellMode = null;
  paint({ focus: true });
  showToast(name ? `Welcome back, ${name}.` : "Welcome back.");
}

async function handleRegister(form) {
  clearFormError(form);
  syncConfirm(form);
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    const result = await registerUser({
      name: data.get("name"),
      email: data.get("email"),
      password: data.get("password"),
    });
    if (!result.ok) {
      showFormError(form, result.error);
      return;
    }
  } catch (error) {
    showFormError(form, error.message);
    return;
  }
  shellMode = null;
  paint({ focus: true });
  showToast("Account created. Welcome to MatchPoint.");
}

async function handleListing(form) {
  clearFormError(form);
  syncListingFields(form);
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const type = String(data.get("listingType") || "sale");
  const priceRaw = String(data.get("price") || "").trim();
  const price = priceRaw === "" ? null : Number(priceRaw);
  if (type !== "trade" && (price == null || Number.isNaN(price))) {
    form.price.setCustomValidity("Enter a price.");
    form.reportValidity();
    form.price.setCustomValidity("");
    return;
  }
  const user = currentUser();
  const existingId = form.dataset.id || "";
  if (existingId) {
    const existing = listingById(existingId);
    if (!existing) {
      showFormError(form, "That post is no longer on the board.");
      return;
    }
    try {
      const draft = listingDraft({
        title: data.get("title"),
        description: data.get("description"),
        category: data.get("category"),
        condition: data.get("condition"),
        listingType: type,
        price,
        tradePreference: data.get("tradePreference"),
        contact: data.get("contact"),
        location: data.get("location"),
      }, existing, listingCategories, conditions);
      updateListing(draft);
    } catch (error) {
      showFormError(form, error.message || "Could not save that post.");
      return;
    }
    showToast("Post updated.");
    location.hash = `#/boards/${encodeURIComponent(existing.id)}`;
    return;
  }
  const id = uid("lst");
  try {
    addListing({
      id,
      title: String(data.get("title") || "").trim(),
      description: String(data.get("description") || "").trim(),
      category: String(data.get("category") || ""),
      condition: String(data.get("condition") || ""),
      listingType: type,
      price: type === "trade" ? null : price,
      tradePreference: type === "sale" ? "" : String(data.get("tradePreference") || "").trim(),
      contact: String(data.get("contact") || "").trim(),
      location: String(data.get("location") || "").trim(),
      sellerId: user.id,
      sellerName: user.name,
      createdAt: new Date().toISOString(),
      origin: "member",
    });
  } catch (error) {
    showFormError(form, error.message);
    return;
  }
  showToast("Listing posted.");
  location.hash = `#/boards/${encodeURIComponent(id)}`;
}

async function handleGear(form) {
  clearFormError(form);
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const makeModel = String(data.get("makeModel") || "").trim();
  const type = String(data.get("type") || "");
  let image = null;
  try {
    const photo = await readPhoto(data.get("photo"));
    if (photo) image = { ...photo, alt: `${type}: ${makeModel}` };
    const id = uid("gear");
    addGear({
      id,
      type,
      makeModel,
      notes: String(data.get("notes") || "").trim(),
      image,
      createdAt: new Date().toISOString(),
    });
    refreshMain();
    document.getElementById(id)?.focus();
    showToast("Equipment saved.");
  } catch (error) {
    showFormError(form, error.message || "Could not save that equipment.");
  }
}

async function handleProfile(form) {
  clearFormError(form);
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    updateProfile({
      name: data.get("name"),
      division: data.get("division"),
      external: {
        impactId: data.get("impactId"),
        nrlId: data.get("nrlId"),
        prsId: data.get("prsId"),
      },
    });
  } catch (error) {
    showFormError(form, error.message);
    return;
  }
  refreshMain();
  document.querySelector("#form-profile button[type='submit']")?.focus();
  showToast("Profile saved.");
}

function openVenueForm(id = "") {
  const venue = id ? venues().find((item) => item.id === id) : null;
  if (id && !venue) return;
  openModal(modalShell({
    title: venue ? "Edit venue" : "Add venue",
    intent: "save-venue",
    id: venue?.id || "",
    confirmLabel: venue ? "Save venue" : "Add Venue",
    body: `
      <div class="field">
        <label for="venue-name">Venue name</label>
        <input id="venue-name" name="name" type="text" required minlength="2" maxlength="80" autocomplete="organization" value="${esc(venue?.name || "")}">
        <span class="field-error">Enter at least 2 characters.</span>
      </div>
      <div class="field">
        <label for="venue-address">Address</label>
        <input id="venue-address" name="address" type="text" required minlength="8" maxlength="160" autocomplete="street-address" aria-describedby="venue-address-hint" value="${esc(venue?.address || "")}">
        <span class="hint" id="venue-address-hint">Street, city, and state.</span>
        <span class="field-error">Enter the street address.</span>
      </div>`,
  }));
  document.getElementById("venue-name")?.focus();
}

function stageFields(data, existing = null) {
  const kept = (name) => (data.has(name) ? data.get(name) : existing?.[name]);
  return {
    name: data.get("name"),
    shots: data.get("shots"),
    time: data.get("time"),
    points: kept("points"),
    props: kept("props"),
    distance: kept("distance"),
    target: kept("target"),
    restrictions: kept("restrictions"),
    startPosition: data.get("startPosition"),
    description: data.get("description"),
    layout: data.get("layout"),
  };
}

function openStageForm(id = "") {
  const stage = id ? stages().find((item) => item.id === id) : null;
  if (id && !stage) return;
  const user = currentUser();
  if (stage && stage.directorUserId !== user?.id) return;
  openModal(modalShell({
    title: stage ? "Edit stage" : "Add stage",
    intent: "save-stage",
    id: stage?.id || "",
    confirmLabel: stage ? "Save stage" : "Add stage",
    body: stageFormFields(stage),
  }));
  bindStageBoard(document.getElementById("modal"));
  document.getElementById("stage-name")?.focus();
}

function openDeleteStage(id) {
  const stage = stages().find((item) => item.id === id);
  if (!stage || stage.directorUserId !== currentUser()?.id) return;
  openModal(modalShell({
    title: "Remove this stage",
    intent: "delete-stage",
    id: stage.id,
    confirmLabel: "Remove stage",
    danger: true,
    body: `<p>Remove <strong>${esc(stage.name)}</strong>. Dates that already imported this stage keep their copy.</p>`,
  }));
}

async function saveStageFromForm(form, data, id) {
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    const existing = id ? stages().find((item) => item.id === id) || null : null;
    const user = currentUser();
    const fields = stageFields(data, existing);
    const draft = stageDraft(user, fields, existing);
    draft.image = await imageFromStageForm(data, existing, draft.name);
    saveStage(draft);
    closeModal();
    refreshMain();
    document.getElementById(draft.id)?.focus();
    showToast(existing ? "Stage updated." : "Stage added.");
  } catch (error) {
    if (button?.isConnected) button.disabled = false;
    throw error;
  }
}

function courseMatch(matchId) {
  const match = directedMatches().find((item) => item.id === matchId);
  if (!match) return null;
  const user = currentUser();
  const allowed = isAdmin(user) || (isMatchDirector(user) && match.directorUserId === user.id);
  if (!allowed) return null;
  return match;
}

function courseDates(match) {
  return match.recurrence ? occurrenceDates(match) : [match.startDate];
}

function courseStages(match, date) {
  if (Array.isArray(match.courses?.[date])) return match.courses[date].map((stage) => ({ ...stage, image: stage.image ? { ...stage.image } : stage.image }));
  return courseFor(match, date).map((stage) => ({ ...stage, image: stage.image ? { ...stage.image } : stage.image }));
}

function courseWhen(match, date) {
  if (!match.recurrence) return formatDateRange(match.startDate, match.endDate);
  const item = expandMatch(match).find((row) => row.occurrenceDate === date);
  return item ? formatDateRange(item.startDate, item.endDate) : formatDate(date);
}

function openCourse(matchId, date, focusId = "") {
  const match = courseMatch(matchId);
  if (!match || !courseDates(match).includes(date)) return;
  const list = courseStages(match, date);
  const library = stages()
    .filter((stage) => stage.directorUserId === match.directorUserId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const rows = list.length
    ? `<ol class="course-picked">${list.map((stage, index) => `
        <li id="course-stage-${index}" tabindex="-1">
          <p class="venue-name">${esc(stage.name)}</p>
          <p class="meta">${esc(String(stage.shots))} rounds · ${esc(stage.time)}</p>
          <div class="card-actions">
            ${index > 0 ? `<button type="button" class="btn btn-ghost" data-action="course-up" data-id="${esc(match.id)}" data-date="${esc(date)}" data-index="${index}">Move up</button>` : ""}
            ${index < list.length - 1 ? `<button type="button" class="btn btn-ghost" data-action="course-down" data-id="${esc(match.id)}" data-date="${esc(date)}" data-index="${index}">Move down</button>` : ""}
            <button type="button" class="btn btn-ghost" data-action="course-edit" data-id="${esc(match.id)}" data-date="${esc(date)}" data-index="${index}">Edit</button>
            <button type="button" class="btn btn-danger" data-action="course-remove" data-id="${esc(match.id)}" data-date="${esc(date)}" data-index="${index}">Remove</button>
          </div>
        </li>`).join("")}</ol>`
    : `<p>No stages on this date.</p>`;
  const importer = library.length
    ? `<div class="course-import">
        <div class="field">
          <label for="import-stage">Import a stage</label>
          <select id="import-stage">${library.map((stage) => `<option value="${esc(stage.id)}">${esc(stage.name)} · ${esc(String(stage.shots))} rounds</option>`).join("")}</select>
        </div>
        <button type="button" class="btn btn-primary" data-action="course-import" data-id="${esc(match.id)}" data-date="${esc(date)}">Import</button>
      </div>`
    : `<p>No stages to import.</p>`;
  openModal(modalShell({
    title: `Course · ${courseWhen(match, date)}`,
    intent: "close-course",
    id: match.id,
    date,
    confirmLabel: "Done",
    body: `${rows}${importer}`,
  }));
  const focus = focusId ? document.getElementById(focusId) : document.getElementById("import-stage");
  (focus || document.getElementById("import-stage"))?.focus();
}

function importCourseStage(matchId, date) {
  const match = courseMatch(matchId);
  if (!match || !courseDates(match).includes(date)) return;
  const sourceId = document.getElementById("import-stage")?.value || "";
  const source = stages().find((stage) => stage.id === sourceId && stage.directorUserId === match.directorUserId);
  if (!source) {
    showToast("Add a stage first.");
    return;
  }
  try {
    const next = [...courseStages(match, date), stageSnapshot(source)];
    setMatchCourse(match.id, date, next);
    refreshMain();
    openCourse(match.id, date, `course-stage-${next.length - 1}`);
    showToast("Stage imported.");
  } catch (error) {
    showToast(error.message || "Could not import that stage.");
  }
}

function moveCourseStage(list, index, step) {
  const target = index + step;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function changeCourse(matchId, date, update, indexValue, step) {
  const match = courseMatch(matchId);
  if (!match || !courseDates(match).includes(date)) return;
  const index = Number(indexValue);
  const list = courseStages(match, date);
  if (!Number.isInteger(index) || index < 0 || index >= list.length) return;
  try {
    const next = update(list, index);
    if (next === list) return;
    setMatchCourse(match.id, date, next);
    refreshMain();
    const focusAt = next.length < list.length ? Math.min(index, next.length - 1) : index + step;
    openCourse(match.id, date, next.length ? `course-stage-${focusAt}` : "");
    showToast(next.length < list.length ? "Stage removed from this date." : "Stage order saved.");
  } catch (error) {
    showToast(error.message || "Could not update that course.");
  }
}

function openCourseStageForm(matchId, date, indexValue) {
  const match = courseMatch(matchId);
  if (!match || !courseDates(match).includes(date)) return;
  const index = Number(indexValue);
  const stage = courseStages(match, date)[index];
  if (!stage) return;
  openModal(modalShell({
    title: "Edit stage on this date",
    intent: "save-course-stage",
    id: match.id,
    date,
    confirmLabel: "Save stage",
    body: stageFormFields(stage, index),
  }));
  bindStageBoard(document.getElementById("modal"));
  document.getElementById("stage-name")?.focus();
}

async function saveCourseStageFromForm(form, data, matchId) {
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    const date = form.dataset.date;
    const match = courseMatch(matchId);
    if (!match || !courseDates(match).includes(date)) throw new Error("That date is not on this match.");
    const index = Number(data.get("index"));
    const list = courseStages(match, date);
    const existing = list[index];
    if (!existing) throw new Error("That stage is no longer on this date.");
    const draft = courseStageDraft(stageFields(data, existing), existing);
    draft.image = await imageFromStageForm(data, existing, draft.name);
    list[index] = draft;
    setMatchCourse(match.id, date, list);
    refreshMain();
    openCourse(match.id, date, `course-stage-${index}`);
    showToast("Stage updated on this date.");
  } catch (error) {
    if (button?.isConnected) button.disabled = false;
    throw error;
  }
}

function openDeleteVenue(id) {
  const venue = venues().find((item) => item.id === id);
  if (!venue) return;
  openModal(modalShell({
    title: "Remove this venue",
    intent: "delete-venue",
    id: venue.id,
    confirmLabel: "Remove venue",
    danger: true,
    body: `<p>Remove ${esc(venue.name)} from the venues you manage.</p>`,
  }));
}

function segmentChoices(names, current) {
  if (!current || names.some((name) => name.toLowerCase() === String(current).toLowerCase())) return names;
  return [...names, current];
}

function focusSegment(name) {
  const target = [...document.querySelectorAll("[data-segment-name]")].find((el) => el.dataset.segmentName === name);
  target?.focus();
}

function openAddSegment(kind) {
  if (kind !== "articles" && kind !== "gear") return;
  openModal(modalShell({
    title: "New segment",
    intent: "add-segment",
    id: kind,
    confirmLabel: "Add segment",
    body: `
      <div class="field">
        <label for="segment-name">Name</label>
        <input id="segment-name" name="name" type="text" required minlength="2" maxlength="40" autocomplete="off">
        <span class="field-error">Use 2 to 40 characters.</span>
      </div>`,
  }));
  document.getElementById("segment-name")?.focus();
}

function openRemoveSegment(kind, name) {
  if (!name || (kind !== "articles" && kind !== "gear")) return;
  const used = (kind === "articles" ? allArticles() : allGear()).some((item) => String(item.category).toLowerCase() === name.toLowerCase());
  if (used) {
    showToast(kind === "articles"
      ? "Move the lessons out of this segment first."
      : "Move the cards out of this segment first.");
    return;
  }
  openModal(modalShell({
    title: "Remove this segment",
    intent: "remove-segment",
    id: kind,
    date: name,
    confirmLabel: "Remove segment",
    danger: true,
    body: `<p>Remove the <strong>${esc(name)}</strong> segment.</p>`,
  }));
}

function handleMoveSegment(select) {
  const kind = select.dataset.moveKind;
  const id = select.dataset.moveId;
  const category = select.value;
  try {
    const item = kind === "articles" ? articleById(id) : gearById(id);
    if (!item) throw new Error("That card is no longer on the page.");
    if (item.category === category) return;
    const names = kind === "articles" ? articleSegments() : gearSegments();
    if (!names.some((name) => name.toLowerCase() === category.toLowerCase())) throw new Error("Choose a segment.");
    saveCatalogRecord(kind, { ...item, category });
    updateResults();
    document.getElementById(`move-${kind}-${id}`)?.focus();
    showToast(`Moved to ${category}.`);
  } catch (error) {
    showToast(error.message || "Could not move that card.");
    updateResults();
  }
}

function addArticleSection(form) {
  if (!form) return;
  const index = form.querySelectorAll("fieldset").length;
  const holder = document.createElement("template");
  holder.innerHTML = articleSectionFields(index);
  const fieldset = holder.content.firstElementChild;
  const actions = form.querySelector(".card-actions");
  if (!fieldset || !actions) return;
  form.insertBefore(fieldset, actions);
  fieldset.querySelector("input")?.focus();
}

function openDeleteMatch(id) {
  const match = matchById(id);
  if (!match) return;
  const series = Boolean(match.seriesId || match.recurrence);
  openModal(modalShell({
    title: series ? "Remove this series" : "Remove this match",
    intent: "delete-match",
    id: match.seriesId || match.id,
    confirmLabel: series ? "Remove series" : "Remove match",
    danger: true,
    body: series
      ? `<p>Remove <strong>${esc(match.name)}</strong> and every date in the series.</p>`
      : `<p>Remove <strong>${esc(match.name)}</strong> from the calendar.</p>`,
  }));
}

function openDeleteArticle(id) {
  const article = articleById(id);
  if (!article) return;
  openModal(modalShell({
    title: "Remove this guide",
    intent: "delete-article",
    id: article.id,
    confirmLabel: "Remove guide",
    danger: true,
    body: `<p>Remove <strong>${esc(article.title)}</strong> from Learning.</p>`,
  }));
}

function openDeleteSuggested(id) {
  const item = gearById(id);
  if (!item) return;
  openModal(modalShell({
    title: "Remove this item",
    intent: "delete-suggested",
    id: item.id,
    confirmLabel: "Remove item",
    danger: true,
    body: `<p>Remove <strong>${esc(item.name)}</strong> from Suggested equipment.</p>`,
  }));
}

function openDeleteDirected(id) {
  const match = directedMatches().find((item) => item.id === id);
  if (!match) return;
  const series = Boolean(match.recurrence);
  openModal(modalShell({
    title: series ? "Remove this series" : "Remove this match",
    intent: "delete-directed",
    id: match.id,
    confirmLabel: series ? "Remove series" : "Remove match",
    danger: true,
    body: series
      ? `<p>Remove ${esc(match.name)} and every date in the series. Registrations on this device will no longer point at a match page.</p>`
      : `<p>Remove ${esc(match.name)} from the calendar. Registrations on this device will no longer point at a match page.</p>`,
  }));
}

function occurrenceSeries(seriesId) {
  return directedMatches().find((item) => item.id === seriesId) || null;
}

function openCancelOccurrence(seriesId, date) {
  const series = occurrenceSeries(seriesId);
  if (!series || !date) return;
  openModal(modalShell({
    title: "Cancel this date",
    intent: "cancel-occurrence",
    id: series.id,
    date,
    confirmLabel: "Cancel this date",
    danger: true,
    body: `
      <p>Cancel only <strong>${esc(formatDate(date))}</strong>. The other dates stay on the calendar.</p>
      <div class="field">
        <label for="exception-note">Reason</label>
        <span id="exception-note-hint" class="hint">Optional. Shown on that date.</span>
        <input id="exception-note" name="note" type="text" maxlength="160" aria-describedby="exception-note-hint">
      </div>`,
  }));
}

function openMoveOccurrence(seriesId, date) {
  const series = occurrenceSeries(seriesId);
  if (!series || !date) return;
  const occurrence = expandMatch(series).find((item) => item.occurrenceDate === date && !item.cancelled);
  if (!occurrence) return;
  openModal(modalShell({
    title: "Move this date",
    intent: "move-occurrence",
    id: series.id,
    date,
    confirmLabel: "Move date",
    body: `
      <p>Move only <strong>${esc(formatDate(date))}</strong>. The series still repeats on the same schedule.</p>
      <div class="field">
        <label for="move-start">New start</label>
        <input id="move-start" name="startDate" type="date" required value="${esc(occurrence.startDate)}">
      </div>
      <div class="field">
        <label for="move-end">New end</label>
        <input id="move-end" name="endDate" type="date" required${occurrence.endDate !== occurrence.startDate ? " data-custom=\"true\"" : ""} value="${esc(occurrence.endDate)}">
      </div>
      <div class="field">
        <label for="move-note">Note</label>
        <span id="move-note-hint" class="hint">Optional. Shown on that date.</span>
        <input id="move-note" name="note" type="text" maxlength="160" aria-describedby="move-note-hint" value="${esc(occurrence.exceptionNote || "")}">
      </div>`,
  }));
}

function openRestoreOccurrence(seriesId, date) {
  const series = occurrenceSeries(seriesId);
  if (!series || !date) return;
  openModal(modalShell({
    title: "Restore this date",
    intent: "restore-occurrence",
    id: series.id,
    date,
    confirmLabel: "Restore this date",
    body: `<p>Put <strong>${esc(formatDate(date))}</strong> back on the calendar. The other dates stay as they are.</p>`,
  }));
}

function finishOccurrence(seriesId, message) {
  closeModal();
  refreshMain();
  document.getElementById(seriesId)?.focus();
  showToast(message);
}

function handleDirectorToggle(input) {
  const id = input.dataset.id;
  try {
    const subject = setMatchDirector(id, input.checked);
    showToast(input.checked
      ? `${subject.name} is a match director.`
      : `${subject.name} is no longer a match director.`);
  } catch (error) {
    input.checked = !input.checked;
    showToast(error.message);
    return;
  }
  updateChrome(route(), currentUser());
  if (id === currentUser()?.id && route().name === "director" && !isMatchDirector(currentUser())) {
    refreshMain();
  }
}

function handleDirectStatus(select) {
  const id = select.dataset.directStatus;
  try {
    updateDirectedStatus(id, select.value);
    showToast("Registration status updated.");
  } catch (error) {
    showToast(error.message);
  }
  refreshMain();
  document.getElementById(`quick-status-${id}`)?.focus();
}

function handleDirectLead(id, days) {
  try {
    updateDirectedLead(id, days);
    showToast(days == null
      ? "Automatic registration is off."
      : `Registration opens ${days} days before each match.`);
  } catch (error) {
    showToast(error.message);
  }
  refreshMain();
  document.getElementById(days == null ? `lead-on-${id}` : `lead-days-${id}`)?.focus();
}

function handleLeadToggle(box) {
  const id = box.dataset.leadToggle;
  if (!box.checked) {
    handleDirectLead(id, null);
    return;
  }
  const daysInput = document.getElementById(`lead-days-${id}`);
  const value = Number(daysInput?.value);
  const days = Number.isInteger(value) && value >= 1 && value <= 365 ? value : 14;
  if (daysInput) daysInput.value = String(days);
  handleDirectLead(id, days);
}

function handleLeadDays(input) {
  const id = input.dataset.leadDays;
  const box = document.getElementById(`lead-on-${id}`);
  if (!box?.checked) return;
  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 1 || value > 365) {
    showToast("Enter a whole number of days from 1 to 365.");
    refreshMain();
    document.getElementById(`lead-days-${id}`)?.focus();
    return;
  }
  handleDirectLead(id, value);
}

async function handleCatalogMatch(form) {
  clearFormError(form);
  const start = form.elements.startDate;
  const end = form.elements.endDate;
  if (start?.value && end?.value && end.value < start.value) end.setCustomValidity("End date is before the start date.");
  else end?.setCustomValidity("");
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const existing = matchById(form.dataset.id);
  try {
    const draft = catalogMatchDraft({
      name: data.get("name"),
      startDate: data.get("startDate"),
      endDate: data.get("endDate"),
      venue: data.get("venue"),
      city: data.get("city"),
      region: data.get("region"),
      discipline: data.get("discipline"),
      registrationStatus: data.get("registrationStatus"),
      fee: data.get("fee"),
      capacity: data.get("capacity"),
      rounds: data.get("rounds"),
      matchDirector: data.get("matchDirector"),
      checkIn: data.get("checkIn"),
      firstShot: data.get("firstShot"),
      summary: data.get("summary"),
      description: data.get("description"),
    }, existing, disciplines);
    saveCatalogRecord("matches", draft);
    showToast("Match updated.");
    location.hash = `#/matches/${encodeURIComponent(draft.id)}`;
  } catch (error) {
    showFormError(form, error.message || "Could not save that match.");
  }
}

async function handleArticle(form) {
  clearFormError(form);
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const existing = form.dataset.id ? articleById(form.dataset.id) : null;
  if (form.dataset.id && !existing) {
    showFormError(form, "That guide is not in the library.");
    return;
  }
  try {
    const draft = articleDraft({
      title: data.get("title"),
      category: data.get("category"),
      level: data.get("level"),
      summary: data.get("summary"),
      heading: data.getAll("heading"),
      paragraphs: data.getAll("paragraphs"),
      list: data.getAll("list"),
    }, existing, segmentChoices(articleSegments(), existing?.category || data.get("category")));
    saveCatalogRecord("articles", draft);
    showToast(existing ? "Guide updated." : "Lesson added.");
    location.hash = `#/learning/${encodeURIComponent(draft.id)}`;
  } catch (error) {
    showFormError(form, error.message || "Could not save that guide.");
  }
}

async function handleSuggested(form) {
  clearFormError(form);
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const existing = gearById(form.dataset.id);
  try {
    const draft = gearDraft({
      name: data.get("name"),
      category: data.get("category"),
      priceBand: data.get("priceBand"),
      bestFor: data.get("bestFor"),
      summary: data.get("summary"),
      description: data.get("description"),
      why: data.get("why"),
    }, existing, segmentChoices(gearSegments(), existing?.category));
    saveCatalogRecord("gear", draft);
    showToast("Equipment updated.");
    location.hash = `#/equipment/${encodeURIComponent(draft.id)}`;
  } catch (error) {
    showFormError(form, error.message || "Could not save that item.");
  }
}

async function handleDirectMatch(form) {
  clearFormError(form);
  const start = form.elements.startDate;
  const end = form.elements.endDate;
  const until = form.elements.repeatUntil;
  const repeating = Boolean(form.elements.repeat?.value);
  if (start?.value && end?.value && end.value < start.value) end.setCustomValidity("End date is before the start date.");
  else end?.setCustomValidity("");
  if (until && repeating && until.value && start?.value && until.value < start.value) {
    until.setCustomValidity("Repeat until is before the start date.");
  } else until?.setCustomValidity("");
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const user = currentUser();
  const existing = form.dataset.id
    ? directedMatches().find((match) => match.id === form.dataset.id) || null
    : null;
  const picked = venues().find((venue) => venue.id === String(data.get("venueId") || "") && (isAdmin(user) || venue.directorUserId === user?.id));
  if (!picked) {
    showFormError(form, "Choose a venue you manage.");
    return;
  }
  try {
    const draft = matchDraft(user, {
      name: data.get("name"),
      startDate: data.get("startDate"),
      endDate: data.get("endDate"),
      venue: picked.name,
      address: picked.address,
      venueId: picked.id,
      discipline: data.get("discipline"),
      summary: data.get("summary"),
      description: data.get("description"),
      fee: data.get("fee"),
      capacity: data.get("capacity"),
      rounds: data.get("rounds"),
      registrationStatus: data.get("registrationStatus"),
      checkIn: data.get("checkIn"),
      firstShot: data.get("firstShot"),
      repeat: data.get("repeat"),
      repeatUntil: data.get("repeatUntil"),
    }, disciplines, existing);
    saveDirectedMatch(draft);
    const series = Boolean(draft.recurrence);
    showToast(existing ? (series ? "Series updated." : "Match updated.") : (series ? "Series posted." : "Match posted."));
    if (!existing || route().edit) {
      location.hash = !existing && series ? "#/director" : `#/matches/${encodeURIComponent(draft.id)}`;
      return;
    }
    refreshMain();
    document.getElementById(draft.id)?.focus();
  } catch (error) {
    showFormError(form, error.message || "Could not save that match.");
  }
}

async function boot() {
  initStore();
  try {
    await ensureAdmin();
  } catch (error) {
    console.error(error);
  }
  if (!location.hash) history.replaceState(null, "", "#/matches");
  bind();
  paint();
  window.addEventListener("hashchange", () => paint({ focus: true }));
}

boot();
