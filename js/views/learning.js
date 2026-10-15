import { allArticles, articleById, articleSegments, relatedArticles } from "../data/index.js";
import { LEARNING_LEVELS, isAdmin, learningLevel } from "../roles.js";
import { currentUser } from "../store.js";
import { esc, option } from "../util.js";
import { backLink, chipSet, groupBySegment, notFoundPage, segmentChoices, segmentMove, segmentRails } from "./shared.js";

export function filterArticles(list, filters) {
  return list.filter((article) => {
    if (filters.category !== "all" && article.category !== filters.category) return false;
    if (filters.level && filters.level !== "all" && learningLevel(article.level) !== filters.level) return false;
    return true;
  });
}

export function learningPage(filters) {
  const admin = isAdmin(currentUser());
  const actions = admin
    ? `<div class="card-actions">
        <button type="button" class="btn btn-ghost" data-action="add-segment" data-kind="articles">New segment</button>
        <a class="btn btn-primary" href="#/learning/new">New lesson</a>
      </div>`
    : "";
  return `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Learning</h1>
          <p class="lede">Fieldcraft for match day: position, DOPE, wind, and how a squad is supposed to run.</p>
        </div>
        ${actions}
      </header>
      <search class="toolbar" aria-label="Filter guides">
        ${chipSet("Level", "level", [["all", "Any level"], ...LEARNING_LEVELS.map((level) => [level.name, level.name, level.tone])], filters.level || "all")}
      </search>
      <div id="results">${learningResults(filters)}</div>
    </div>`;
}

function levelTag(level) {
  const name = learningLevel(level);
  const tone = LEARNING_LEVELS.find((item) => item.name === name)?.tone;
  if (!name || !tone) return "";
  return `<p class="level-tag level-${tone}">${esc(name)}</p>`;
}

function guideCard(article, segments, admin) {
  const move = admin ? segmentMove("articles", article.id, article.title, article.category, segments) : "";
  return `
    <div class="segment-card">
      <a class="card card-link" href="#/learning/${esc(article.id)}">
        <h2>${esc(article.title)}</h2>
        <p class="summary">${esc(article.summary)}</p>
        ${levelTag(article.level)}
      </a>
      ${move}
    </div>`;
}

export function learningResults(filters) {
  const articles = allArticles();
  const list = filterArticles(articles, filters);
  const admin = isAdmin(currentUser());
  const segments = articleSegments();
  const narrowed = Boolean(filters.level && filters.level !== "all");
  const groups = groupBySegment(list, segments, { showEmpty: admin && !narrowed }).map((group) => ({
    ...group,
    kind: "articles",
    removable: admin,
    cards: group.items.map((article) => guideCard(article, segments, admin)).join(""),
  }));
  return segmentRails({
    noun: "guide",
    groups,
    emptyTitle: "No guides in this view",
    emptyText: "Try another level.",
  });
}

function renderSection(section) {
  const paragraphs = (section.paragraphs || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
  const list = section.list
    ? `<ul>${section.list.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
    : "";
  return `<section class="prose-section"><h2>${esc(section.heading)}</h2>${paragraphs}${list}</section>`;
}

export function articlePage(id) {
  const article = articleById(id);
  if (!article) {
    return notFoundPage("Guide not found", "That guide is not in the library.", "#/learning", "Back to learning");
  }
  const related = relatedArticles(article).map((item) => `
    <a class="card card-link" href="#/learning/${esc(item.id)}">
      <p class="kicker">${esc(item.category)}</p>
      <h3>${esc(item.title)}</h3>
      <p class="summary">${esc(item.summary)}</p>
    </a>`).join("");
  const media = article.media?.href
    ? `<figure class="stage-figure"><figcaption>${esc(article.media.caption || "Embedded media")}</figcaption></figure>`
    : `<p class="media-slot">Video and audio can attach to this guide later. The written brief stands on its own.</p>`;

  const admin = isAdmin(currentUser());
  const adminActions = admin
    ? `<div class="card-actions">
        <a class="btn btn-ghost" href="#/learning/${esc(article.id)}/edit">Edit</a>
        <button type="button" class="btn btn-danger" data-action="delete-article" data-id="${esc(article.id)}">Remove</button>
      </div>`
    : "";
  return `
    <div class="page">
      ${backLink("#/learning", "All guides")}
      <article class="prose">
        <header>
          <p class="kicker">${esc(article.category)}</p>
          <h1>${esc(article.title)}</h1>
          ${levelTag(article.level)}
          <p class="lede">${esc(article.summary)}</p>
          ${adminActions}
        </header>
        ${media}
        ${article.sections.map(renderSection).join("")}
      </article>
      <section>
        <h2>Keep reading</h2>
        <div class="card-grid">${related}</div>
      </section>
    </div>`;
}

export function articleSectionFields(index, section = {}) {
  const paragraphs = (section.paragraphs || []).join("\n\n");
  const list = (section.list || []).join("\n");
  return `
    <fieldset class="panel">
      <legend>Section ${index + 1}</legend>
      <div class="field">
        <label for="article-heading-${index}">Heading</label>
        <input id="article-heading-${index}" name="heading" type="text" required minlength="2" maxlength="120" value="${esc(section.heading || "")}">
      </div>
      <div class="field">
        <label for="article-body-${index}">Paragraphs</label>
        <textarea id="article-body-${index}" name="paragraphs" placeholder="Separate paragraphs with a blank line.">${esc(paragraphs)}</textarea>
      </div>
      <div class="field">
        <label for="article-list-${index}">List items</label>
        <textarea id="article-list-${index}" name="list" placeholder="One item on each line.">${esc(list)}</textarea>
      </div>
    </fieldset>`;
}

function articleForm(article) {
  const creating = !article?.id;
  const sections = article?.sections?.length ? article.sections : [{}];
  const names = articleSegments();
  const category = article?.category || names[0] || "";
  const topics = names.length
    ? segmentChoices(names, category).map((name) => option(name, name, category)).join("")
    : `<option value="" selected disabled>Add a segment first</option>`;
  const level = learningLevel(article?.level) || "Essentials";
  return `
    <form id="${creating ? "form-new-article" : "form-edit-article"}" class="form-grid form-article"${creating ? "" : ` data-id="${esc(article.id)}"`}>
      <p class="form-error" role="alert" hidden></p>
      <div class="field">
        <label for="article-title">Title</label>
        <input id="article-title" name="title" type="text" required minlength="4" maxlength="120" value="${esc(article?.title || "")}">
      </div>
      <div class="form-split cols-2">
        <div class="field">
          <label for="article-category">Segment</label>
          <select id="article-category" name="category" required>${topics}</select>
        </div>
        <div class="field">
          <label for="article-level">Level</label>
          <select id="article-level" name="level" required>${LEARNING_LEVELS.map((item) => option(item.name, item.name, level)).join("")}</select>
        </div>
      </div>
      <div class="field">
        <label for="article-summary">Summary</label>
        <textarea id="article-summary" name="summary" required minlength="10" maxlength="400">${esc(article?.summary || "")}</textarea>
      </div>
      ${sections.map((section, index) => articleSectionFields(index, section)).join("")}
      <div class="card-actions">
        <button type="button" class="btn btn-ghost" data-action="add-article-section">Add section</button>
        <button type="submit" class="btn btn-primary">${creating ? "Add lesson" : "Save guide"}</button>
      </div>
    </form>`;
}

export function newLessonPage() {
  if (!isAdmin(currentUser())) {
    return notFoundPage("Admin only", "The general admin can add a lesson.", "#/learning", "Back to learning");
  }
  return `
    <div class="page narrow">
      ${backLink("#/learning", "All guides")}
      <header class="page-head"><div><h1>New lesson</h1></div></header>
      ${articleForm(null)}
    </div>`;
}

export function articleEditPage(id) {
  const article = articleById(id);
  if (!article) {
    return notFoundPage("Guide not found", "That guide is not in the library.", "#/learning", "Back to learning");
  }
  if (!isAdmin(currentUser())) {
    return notFoundPage("Admin only", "The general admin can edit or remove any guide.", `#/learning/${encodeURIComponent(article.id)}`, "Back to the guide");
  }
  return `
    <div class="page narrow">
      ${backLink(`#/learning/${esc(article.id)}`, "Back to the guide")}
      <header class="page-head"><div><h1>Edit guide</h1></div></header>
      ${articleForm(article)}
    </div>`;
}

