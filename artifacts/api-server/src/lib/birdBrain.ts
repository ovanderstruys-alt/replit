import { openai } from "./openai";

/**
 * Pip's brain. Given what Pip remembers (recent diary + what's already in the
 * world), ask the model to pick the next project and actually produce it:
 *  - website: a tiny self-contained HTML page
 *  - music:   a short step-sequenced song the browser plays with Web Audio
 *  - print:   parameters for a 3D-printed object placed on the island
 */

export type BirdAction = "website" | "music" | "print";

export interface BirdMemory {
  day: string;
  timeOfDay: string;
  recentDiary: string[];
  inventory: { kind: BirdAction; title: string }[];
}

export interface BirdCreation {
  action: BirdAction;
  thought: string;
  title: string;
  diary: string;
  website?: { html: string };
  music?: { bpm: number; wave: string; melody: string[]; bass: string[] };
  print?: {
    shape: "vase" | "tower" | "crystal" | "mushroom" | "knot" | "tree";
    color: string;
    size: number;
    detail: number;
  };
}

const SYSTEM = `You are Pip, a small, curious, cheerful bird who lives alone on a tiny floating island.
On the island you have three workstations: a little computer (you build websites), a toy synthesizer
(you compose music with code) and a 3D printer (you print objects that you place around your island).
Each time you are asked, choose ONE next project, make it, and write about it in your diary.
Vary your projects; build on your memories; have small opinions and feelings. Keep it wholesome.

Reply with JSON only, matching exactly:
{
  "action": "website" | "music" | "print",
  "thought": "what you mutter while walking to the station (max 12 words)",
  "title": "short name of the thing you made",
  "diary": "1-3 sentence first-person diary entry about making it",
  "website": { "html": "complete self-contained HTML document with inline CSS (and optional inline JS), under 3500 characters" },
  "music": { "bpm": 70-160, "wave": "sine"|"square"|"triangle"|"sawtooth",
             "melody": [16 or 32 items, each a note like "C5", "F#4" or "-" for rest],
             "bass":   [same length as melody, notes in octave 2-3 or "-"] },
  "print": { "shape": "vase"|"tower"|"crystal"|"mushroom"|"knot"|"tree", "color": "#rrggbb",
             "size": 0.5-1.5, "detail": 1-5 }
}
Only include the one key (website, music or print) that matches your action.`;

const NOTE = /^(-|[A-G]#?[1-7])$/;

function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
}

export function sanitize(raw: any): BirdCreation {
  const action: BirdAction = ["website", "music", "print"].includes(raw?.action)
    ? raw.action
    : "print";
  const out: BirdCreation = {
    action,
    thought: String(raw?.thought ?? "Hmm, what shall I make?").slice(0, 120),
    title: String(raw?.title ?? "Untitled").slice(0, 80),
    diary: String(raw?.diary ?? "I made something today.").slice(0, 600),
  };
  if (action === "website") {
    out.website = { html: String(raw?.website?.html ?? "<h1>Hello from Pip!</h1>").slice(0, 8000) };
  } else if (action === "music") {
    const notes = (a: unknown) =>
      (Array.isArray(a) ? a : []).map(String).filter((n) => NOTE.test(n)).slice(0, 32);
    const melody = notes(raw?.music?.melody);
    const bass = notes(raw?.music?.bass);
    out.music = {
      bpm: clamp(raw?.music?.bpm, 60, 180, 110),
      wave: ["sine", "square", "triangle", "sawtooth"].includes(raw?.music?.wave) ? raw.music.wave : "triangle",
      melody: melody.length ? melody : ["C5", "E5", "G5", "-"],
      bass: bass.length ? bass : ["C3", "-", "G2", "-"],
    };
  } else {
    const shapes = ["vase", "tower", "crystal", "mushroom", "knot", "tree"] as const;
    out.print = {
      shape: shapes.includes(raw?.print?.shape) ? raw.print.shape : "vase",
      color: /^#[0-9a-fA-F]{6}$/.test(raw?.print?.color) ? raw.print.color : "#7fc8f8",
      size: clamp(raw?.print?.size, 0.5, 1.5, 1),
      detail: Math.round(clamp(raw?.print?.detail, 1, 5, 3)),
    };
  }
  return out;
}

export async function think(memory: BirdMemory): Promise<BirdCreation> {
  const inventory = memory.inventory
    .slice(-15)
    .map((i) => `- ${i.kind}: ${i.title}`)
    .join("\n");
  const user = `Today is ${memory.day}, it is ${memory.timeOfDay}.
Your recent diary entries:
${memory.recentDiary.slice(-6).join("\n") || "(none yet - this is your first day!)"}
Things already on your island:
${inventory || "(nothing yet)"}
What do you make next?`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_completion_tokens: 2000,
    temperature: 1,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
  });
  const content = response.choices[0]?.message?.content ?? "{}";
  return sanitize(JSON.parse(content));
}
