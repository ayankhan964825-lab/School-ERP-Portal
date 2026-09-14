import { atom } from 'nanostores';

export const isSearchOpen = atom(false);

export function toggleSearch() {
  isSearchOpen.set(!isSearchOpen.get());
}

export function openSearch() {
  isSearchOpen.set(true);
}

export function closeSearch() {
  isSearchOpen.set(false);
}
