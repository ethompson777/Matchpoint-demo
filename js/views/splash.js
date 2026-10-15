import { nextMatch } from "../data/index.js";
import { logoMark } from "../icons.js";
import { esc, formatDateRange, locationHtml } from "../util.js";

export function splashHtml() {
  const match = nextMatch();
  const feature = match ? `
    <article class="splash-feature">
      <p class="kicker">Next on the calendar</p>
      <h2>${esc(match.name)}</h2>
      <p class="meta">${esc(formatDateRange(match.startDate, match.endDate))}</p>
      <p class="meta">${locationHtml(match.location)}</p>
      <p>${esc(match.summary)}</p>
      <p class="hint">Sign in to open the course of fire and register.</p>
    </article>` : "";

  return `
    <main class="splash" id="content" tabindex="-1">
      <div class="splash-inner">
        <section class="splash-copy">
          <p class="brand brand-lockup">${logoMark()}<span class="wordmark">MATCHPOINT</span></p>
          <hr class="accent-rule">
          <h1>The firing line, organized.</h1>
          <p class="lede">Find the next precision rifle match, study the work that wins stages, and keep your rifles and history in one place.</p>
          <ul class="pillars">
            <li><span class="pillar-index">01</span><span><strong>Matches</strong>PRS, NRL Hunter, NRL22, ELR, and Outlaw.</span></li>
            <li><span class="pillar-index">02</span><span><strong>Learning</strong>Position, DOPE, wind, and how a squad is supposed to run.</span></li>
            <li><span class="pillar-index">03</span><span><strong>Your profile</strong>Gear you own, matches you shoot, and shooter IDs ready for a later sync.</span></li>
          </ul>
          ${feature}
        </section>
        <section class="auth-card" aria-labelledby="auth-heading">
          <h2 id="auth-heading">Sign in to continue</h2>
          <p class="hint">Use the email you want on match records.</p>
          <div class="tabs" id="auth-tabs" role="tablist" aria-label="Account">
            <button type="button" role="tab" id="tab-signin" data-auth-tab="signin" aria-selected="true" aria-controls="panel-signin" tabindex="0">Sign in</button>
            <button type="button" role="tab" id="tab-register" data-auth-tab="register" aria-selected="false" aria-controls="panel-register" tabindex="-1">Register</button>
          </div>
          <div id="panel-signin" role="tabpanel" aria-labelledby="tab-signin">
            <form id="form-signin" class="form-grid">
              <p class="form-error" role="alert" hidden></p>
              <div class="field">
                <label for="signin-email">Email</label>
                <input id="signin-email" name="email" type="email" autocomplete="email" inputmode="email" spellcheck="false" required>
                <span class="field-error">Enter a valid email address.</span>
              </div>
              <div class="field">
                <label for="signin-password">Password</label>
                <input id="signin-password" name="password" type="password" autocomplete="current-password" required minlength="8">
                <span class="field-error">Enter your password.</span>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Sign in</button>
            </form>
          </div>
          <div id="panel-register" role="tabpanel" aria-labelledby="tab-register" hidden>
            <form id="form-register" class="form-grid">
              <p class="form-error" role="alert" hidden></p>
              <div class="field">
                <label for="register-name">Name</label>
                <span id="register-name-hint" class="hint">The name you use on a squad sheet.</span>
                <input id="register-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="80" aria-describedby="register-name-hint">
                <span class="field-error">Enter at least 2 characters.</span>
              </div>
              <div class="field">
                <label for="register-email">Email</label>
                <input id="register-email" name="email" type="email" autocomplete="email" inputmode="email" spellcheck="false" required>
                <span class="field-error">Enter a valid email address.</span>
              </div>
              <div class="field">
                <label for="register-password">Password</label>
                <span id="register-password-hint" class="hint">At least 8 characters. Stored only as a hash on this device.</span>
                <input id="register-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" aria-describedby="register-password-hint">
                <span class="field-error">Use at least 8 characters.</span>
              </div>
              <div class="field">
                <label for="register-confirm">Confirm password</label>
                <input id="register-confirm" name="confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="128">
                <span class="field-error">Passwords do not match.</span>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Create account</button>
            </form>
          </div>
          <p class="fine-print">Accounts, registrations, gear, and board posts stay in this browser.</p>
        </section>
      </div>
    </main>`;
}
