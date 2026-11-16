import type { DiaryEntry, Item } from "./types";

const KEY = "pips-nest-v1";

export interface SaveState {
  items: Item[];
  diary: DiaryEntry[];
}

export function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as SaveState;
      if (Array.isArray(s.items) && Array.isArray(s.diary)) return s;
    }
  } catch {
    /* private mode or corrupt data: start fresh */
  }
  return { items: [], diary: [] };
}

export function save(s: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: keep running in memory */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const clock = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
