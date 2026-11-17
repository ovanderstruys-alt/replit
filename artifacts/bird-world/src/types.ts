export type Kind = "website" | "music" | "print";

export interface MusicData {
  bpm: number;
  wave: string;
  melody: string[];
  bass: string[];
}

export interface PrintData {
  shape: "vase" | "tower" | "crystal" | "mushroom" | "knot" | "tree";
  color: string;
  size: number;
  detail: number;
}

/** What the brain (AI or offline) hands back each time Pip decides to make something. */
export interface Creation {
  action: Kind;
  thought: string;
  title: string;
  /** Pip's scrapbook note about the thing itself. */
  caption?: string;
  diary: string;
  website?: { html: string };
  music?: MusicData;
  print?: PrintData;
}

/** A thing that now exists in Pip's world. */
export interface Item {
  id: string;
  kind: Kind;
  title: string;
  createdAt: number;
  byAI: boolean;
  /** Scrapbook caption written by Pip. */
  caption?: string;
  /** Snapshot taken in the 3D world (small JPEG data URL). */
  photo?: string;
  html?: string;
  music?: MusicData;
  print?: PrintData;
  /** Where a printed object sits on the island. */
  pos?: [number, number];
}

export interface DiaryEntry {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  text: string;
  itemId?: string;
}
