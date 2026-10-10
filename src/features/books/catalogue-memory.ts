const KEY = "216:catalogue";

/** The catalogue URL query (search, filters, page) the reader last had open, for this tab. */
export function rememberCatalogue(query: string) {
  try {
    sessionStorage.setItem(KEY, query);
  } catch {
    // Storage can be blocked; going back then lands on the unfiltered catalogue.
  }
}

/** Where "Catálogo" should lead so the reader finds the list as they left it. */
export function recalledCatalogue(): string {
  try {
    const query = sessionStorage.getItem(KEY);
    return query ? `/?${query}` : "/";
  } catch {
    return "/";
  }
}
