import { esc } from "./util.js";
import { icon } from "./icons.js";

/** body is trusted HTML from our views. Callers escape any user or catalog text. */
export function modalShell({ title, body, confirmLabel, danger = false, intent, id = "", date = "" }) {
  return `
    <header class="modal-head">
      <h2 id="modal-title">${esc(title)}</h2>
      <form method="dialog">
        <button type="submit" class="icon-btn" aria-label="Close">${icon("close")}</button>
      </form>
    </header>
    <form id="modal-form" data-intent="${esc(intent)}" data-id="${esc(id)}" data-date="${esc(date)}">
      <div class="modal-body">
        <p class="form-error" role="alert" hidden></p>
        ${body}
      </div>
      <footer class="modal-foot">
        <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
        <button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"}">${esc(confirmLabel)}</button>
      </footer>
    </form>
  `;
}

export function openModal(html) {
  const dialog = document.getElementById("modal");
  dialog.innerHTML = html;
  dialog.setAttribute("aria-labelledby", "modal-title");
  if (!dialog.open) dialog.showModal();
}

export function closeModal() {
  const dialog = document.getElementById("modal");
  if (dialog.open) dialog.close();
}
