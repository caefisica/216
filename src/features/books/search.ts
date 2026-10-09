/**
 * Lowercases, strips accents and collapses spacing. SQLite's `LIKE` ignores case for ASCII only,
 * so the stored `books.search` text and the query both pass through this before they are compared.
 */
export function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function bookSearchText(title: string, author: string | null) {
  return normalizeSearch(author ? `${title} ${author}` : title);
}

/** A string like `cafg.1.05` or `calb01.1`: the start of a book or copy code. */
export function looksLikeCode(query: string) {
  return /^ca[a-z]{2}[.\d]/i.test(query.trim());
}

/** The text the list orders titles by: normalised, and without the quotes or `¿` a title opens with. */
export function titleKey(title: string) {
  return normalizeSearch(title).replace(/^[^\p{L}\p{N}]+/u, "");
}

/** The half-open range of codes that start with `prefix`, for a comparison that uses the code index. */
export function codeRange(prefix: string): [from: string, to: string] {
  const from = prefix.trim().toUpperCase();
  return [from, from.slice(0, -1) + String.fromCharCode(from.charCodeAt(from.length - 1) + 1)];
}

/** The columns of a title that the app derives from its title and author; every write sets them. */
export function derivedTitleColumns(title: string, author: string | null) {
  return { search: bookSearchText(title, author), titleKey: titleKey(title) };
}
