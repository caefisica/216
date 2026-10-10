import { DESK_LIST_ID, DESK_SEARCH_ID } from "../constants";

/**
 * Moves focus to where the next decision starts, because the row that held it is gone. After a
 * decision made from a search the search is ready to be typed over; otherwise the list takes focus
 * and the arrow keys walk its rows.
 */
export function resumeDesk() {
  const search = document.getElementById(DESK_SEARCH_ID) as HTMLInputElement | null;
  if (search?.value) {
    search.focus();
    search.select();
  } else {
    document.getElementById(DESK_LIST_ID)?.focus();
  }
}
