import { articleById, gearById, matchById } from "../data/index.js";
import { listingById } from "../selectors.js";
import { articleEditPage, articlePage, learningPage, learningResults, newLessonPage } from "./learning.js";
import { equipmentDetail, equipmentPage, equipmentResults, gearEditPage } from "./equipment.js";
import { boardResults, boardsPage, listingDetail, listingForm } from "./boards.js";
import { directorPage, matchEditPage, newMatchPage } from "./director.js";
import { matchDetail, matchResults, matchesPage } from "./matches.js";
import { profilePage } from "./profile.js";
import { notFoundPage } from "./shared.js";
import { usersPage } from "./users.js";

export function pageTitle(route) {
  if (route.edit && route.id) return "Edit";
  if (route.name === "matches" && route.id === "new") return "New match";
  if (route.name === "matches" && route.id) return matchById(route.id)?.name || "Match";
  if (route.name === "learning" && route.id === "new") return "New lesson";
  if (route.name === "learning" && route.id) return articleById(route.id)?.title || "Guide";
  if (route.name === "equipment" && route.id) return gearById(route.id)?.name || "Equipment";
  if (route.name === "boards" && route.id === "new") return "Create a post";
  if (route.name === "boards" && route.id) return listingById(route.id)?.title || "Listing";
  const titles = {
    matches: "Matches",
    learning: "Learning",
    equipment: "Suggested equipment",
    boards: "Equipment boards",
    profile: "Profile",
    director: "Match director",
    users: "Users",
  };
  return titles[route.name] || "Page not found";
}

export function pageHtml(route, filters) {
  switch (route.name) {
    case "matches":
      if (route.id === "new") return newMatchPage();
      if (route.edit && route.id) return matchEditPage(route.id);
      return route.id ? matchDetail(route.id) : matchesPage(filters.matches);
    case "learning":
      if (route.id === "new") return newLessonPage();
      if (route.edit && route.id) return articleEditPage(route.id);
      return route.id ? articlePage(route.id) : learningPage(filters.learning);
    case "equipment":
      if (route.edit && route.id) return gearEditPage(route.id);
      return route.id ? equipmentDetail(route.id) : equipmentPage(filters.equipment);
    case "boards":
      if (route.id === "new") return listingForm();
      if (route.edit && route.id) {
        const listing = listingById(route.id);
        if (!listing) return notFoundPage("Listing not found", "That post is no longer on the board.", "#/boards", "Back to the board");
        return listingForm(listing);
      }
      if (route.id) return listingDetail(route.id);
      return boardsPage(filters.boards);
    case "profile":
      return profilePage();
    case "director":
      return directorPage();
    case "users":
      return usersPage();
    default:
      return notFoundPage("Page not found", "That address does not match a page in MatchPoint.", "#/matches", "Back to matches");
  }
}

export function resultsHtml(route, filters) {
  switch (route.name) {
    case "matches":
      return route.id ? "" : matchResults(filters.matches);
    case "learning":
      return route.id ? "" : learningResults(filters.learning);
    case "equipment":
      return route.id ? "" : equipmentResults(filters.equipment);
    case "boards":
      return route.id ? "" : boardResults(filters.boards);
    default:
      return "";
  }
}
