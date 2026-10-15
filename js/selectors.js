import { matchById, seedListings } from "./data/index.js";
import { catalogRecord, hiddenIds, userListings } from "./store.js";
import { isPast, listingExpired, todayISO } from "./util.js";

export function allListings(today = todayISO()) {
  const hidden = new Set(hiddenIds("listings"));
  return [...userListings(), ...seedListings]
    .map((listing) => {
      const edited = catalogRecord("listings", listing.id);
      if (!edited) return listing;
      return {
        ...listing,
        ...edited,
        id: listing.id,
        createdAt: listing.createdAt,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
      };
    })
    .filter((listing) => !hidden.has(listing.id) && !listingExpired(listing.createdAt, today))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function listingById(id) {
  return allListings().find((listing) => listing.id === id) || null;
}

export function upcomingRegistrations(user) {
  if (!user) return [];
  const today = todayISO();
  return user.registrations
    .map((entry) => ({ ...entry, match: matchById(entry.matchId) }))
    .filter((entry) => entry.match && !isPast(entry.match, today))
    .sort((a, b) => a.match.startDate.localeCompare(b.match.startDate));
}

export function historyEntries(user) {
  if (!user) return [];
  return user.history
    .map((entry) => ({ ...entry, match: matchById(entry.matchId) }))
    .filter((entry) => entry.match)
    .sort((a, b) => b.match.startDate.localeCompare(a.match.startDate));
}

export function registrationFor(user, matchId) {
  return user?.registrations.find((entry) => entry.matchId === matchId) || null;
}

export function historyFor(user, matchId) {
  return user?.history.find((entry) => entry.matchId === matchId) || null;
}
