import { EMPTY_REPERTOIRE, parseRepertoire, serializeRepertoire, type RepertoireData } from "./repertoire";

/** The only place the repertoire and its drill record are kept. */
export const REPERTOIRE_KEY = "knightly_repertoire_v1";

/** Reads the saved repertoire; empty when nothing is saved or storage cannot be read. */
export function loadRepertoire(): RepertoireData {
  try {
    const raw = localStorage.getItem(REPERTOIRE_KEY);
    return raw ? parseRepertoire(JSON.parse(raw)) : EMPTY_REPERTOIRE;
  } catch {
    return EMPTY_REPERTOIRE;
  }
}

/** Saves the repertoire. False when the browser refused (private mode, storage full). */
export function saveRepertoire(data: RepertoireData): boolean {
  try {
    localStorage.setItem(REPERTOIRE_KEY, serializeRepertoire(data));
    return true;
  } catch {
    return false;
  }
}
