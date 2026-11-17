import type { Creation, DiaryEntry, Item, Kind, PrintData } from "./types";

export interface ThinkResult {
  creation: Creation;
  byAI: boolean;
}

/** Ask the AI (via our API server) what Pip makes next; fall back to the offline daydream brain. */
export async function think(items: Item[], diary: DiaryEntry[]): Promise<ThinkResult> {
  const hour = new Date().getHours();
  const timeOfDay = hour < 6 ? "the middle of the night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch("/api/bird/think", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        day: new Date().toDateString(),
        timeOfDay,
        recentDiary: diary.slice(-8).map((d) => `[${d.date} ${d.time}] ${d.text}`),
        inventory: items.slice(-20).map((i) => ({ kind: i.kind, title: i.title })),
      }),
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const creation = (await res.json()) as Creation;
    if (!creation?.action) throw new Error("bad reply");
    return { creation, byAI: true };
  } catch {
    return { creation: daydream(items), byAI: false };
  }
}

// ---------------------------------------------------------------------------
// Offline brain: procedural, so the world is alive even without an API key.
// ---------------------------------------------------------------------------

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

const PALETTES = [
  ["#fff8e7", "#2d3047", "#ff9f1c"],
  ["#eaf6ff", "#1b3a4b", "#4ea8de"],
  ["#fdf0f5", "#3d2c3e", "#e56b9a"],
  ["#f1fbef", "#21352a", "#56a35f"],
  ["#1d1b2f", "#f5f3ff", "#b69cff"],
];
const TOPICS = [
  { t: "Seed Reviews", h: "Seed Reviews", items: ["Sunflower: 10/10, crunchy", "Millet: reliable classic", "Pumpkin: too big for my beak"] },
  { t: "Cloud Watching Club", h: "Today's Clouds", items: ["One looked like a teapot", "One looked like me!", "One was just a cloud"] },
  { t: "Pip's Weather Station", h: "Forecast", items: ["Breezy with a chance of crumbs", "Sunny spells for sunbathing", "Puddles: excellent for splashing"] },
  { t: "Nest Decorating Tips", h: "Tips", items: ["Moss makes everything cozy", "Shiny things go by the door", "Never too many feathers"] },
  { t: "The Worm Times", h: "Headlines", items: ["Local worm spotted, escapes", "Rain expected; worms optimistic", "Opinion: are snails just slow worms?"] },
  { t: "My Favourite Songs", h: "Top Tunes", items: ["The one I made yesterday", "The wind in the tree", "The printer going brrr"] },
];
const SCALES = [
  ["C", "D", "E", "G", "A"],
  ["A", "C", "D", "E", "G"],
  ["D", "E", "F#", "A", "B"],
  ["F", "G", "A", "C", "D"],
];
const SONG_NAMES = ["Morning Chirp", "Puddle Hop", "Twig Waltz", "Breadcrumb Boogie", "Sleepy Feathers", "Printer Lullaby", "Sky Loop", "Worm Jazz"];
const PRINT_NAMES: Record<PrintData["shape"], string[]> = {
  vase: ["Wobbly Vase", "Flower Pot", "Rain Catcher"],
  tower: ["Lookout Tower", "Stacky Tower", "Twisty Spire"],
  crystal: ["Shiny Crystals", "Moon Gems", "Sparkle Rock"],
  mushroom: ["Big Mushroom", "Toadstool Seat", "Spotty Shroom"],
  knot: ["Mystery Knot", "Loopy Sculpture", "Brain Noodle"],
  tree: ["Tiny Pine", "Fake Tree (Shh)", "Christmas Tree"],
};

function nextKind(items: Item[]): Kind {
  // Prefer whatever Pip has made least of, with a bit of randomness.
  const counts: Record<Kind, number> = { website: 0, music: 0, print: 0 };
  items.forEach((i) => counts[i.kind]++);
  const kinds: Kind[] = ["website", "music", "print"];
  return Math.random() < 0.35 ? pick(kinds) : kinds.sort((a, b) => counts[a] - counts[b])[0];
}

export function daydream(items: Item[]): Creation {
  const kind = nextKind(items);
  if (kind === "website") {
    const [bg, fg, accent] = pick(PALETTES);
    const topic = pick(TOPICS);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${topic.t}</title><style>
body{margin:0;font-family:Georgia,serif;background:${bg};color:${fg};display:grid;place-items:center;min-height:100vh}
main{max-width:480px;padding:32px;text-align:center}h1{color:${accent};font-size:2.4em;margin:.2em 0}
li{list-style:none;margin:.6em 0;padding:.6em 1em;border:2px solid ${accent};border-radius:999px}
button{background:${accent};color:${bg};border:0;padding:.7em 1.4em;border-radius:999px;font-size:1em;cursor:pointer}
</style></head><body><main><div style="font-size:3em">🐦</div><h1>${topic.t}</h1><h3>${topic.h}</h3><ul>${topic.items
      .map((x) => `<li>${x}</li>`)
      .join("")}</ul><button onclick="this.textContent='Tweet! x'+(+(this.dataset.n=(+this.dataset.n||0)+1))">Tweet!</button>
<p><small>made by Pip, a bird</small></p></main></body></html>`;
    return {
      action: "website",
      thought: pick(["Time to do some web design!", "I have an idea for a website...", "Click clack, beak on keys!"]),
      title: topic.t,
      caption: pick([
        `My website about ${topic.h.toLowerCase()}. Press the button, it tweets!`,
        `I picked these colours myself. The button is my favourite part.`,
        `A whole page of ${topic.items.length} important facts. You're welcome, internet.`,
      ]),
      diary: pick([
        `Built a website called "${topic.t}". Typing with a beak is hard but I'm getting faster.`,
        `Made "${topic.t}" on my little computer. I think the colours are very me.`,
        `New website: "${topic.t}". Someday a real person might visit it!`,
      ]),
      website: { html },
    };
  }
  if (kind === "music") {
    const scale = pick(SCALES);
    const len = pick([16, 32]);
    let idx = Math.floor(Math.random() * scale.length);
    const melody: string[] = [];
    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.25) {
        melody.push("-");
        continue;
      }
      idx = Math.max(0, Math.min(scale.length * 2 - 1, idx + pick([-2, -1, -1, 0, 1, 1, 2])));
      melody.push(`${scale[idx % scale.length]}${4 + Math.floor(idx / scale.length)}`);
    }
    const root = scale[0];
    const fifth = scale[3] ?? scale[2];
    const bass = melody.map((_, i) => (i % 4 === 0 ? `${i % 8 === 0 ? root : fifth}2` : "-"));
    const title = pick(SONG_NAMES);
    return {
      action: "music",
      thought: pick(["I hear a melody in my head!", "Let's make some noise!", "Beep boop, compose mode."]),
      title,
      caption: pick([
        `${melody.filter((n) => n !== "-").length} notes, all hand-picked. Best enjoyed while hopping.`,
        `A little tune in ${scale[0]}. It sounds like a sunny branch.`,
        `I wrote this one in code! Play it loud.`,
      ]),
      diary: pick([
        `Composed "${title}" on the synth. I wrote it as code, one note at a time.`,
        `Made a song called "${title}". I bobbed my head the whole time.`,
        `"${title}" is my newest tune. It's stuck in my head now.`,
      ]),
      music: { bpm: 80 + Math.floor(Math.random() * 60), wave: pick(["triangle", "square", "sine"]), melody, bass },
    };
  }
  const shape = pick(["vase", "tower", "crystal", "mushroom", "knot", "tree"] as const);
  const title = pick(PRINT_NAMES[shape]);
  const hue = Math.floor(Math.random() * 360);
  return {
    action: "print",
    thought: pick(["The printer is calling me.", "I'll print something for the island!", "Needs more decorations here..."]),
    title,
    caption: pick([
      `Printed layer by layer. It's ${["wobbly", "perfect", "a bit lopsided", "very shiny"][Math.floor(Math.random() * 4)]} and I love it.`,
      `Lives on my island now. Please do not peck.`,
      `My printer and I made this together. Teamwork!`,
    ]),
    diary: pick([
      `3D printed a "${title}" and put it somewhere nice on my island.`,
      `The printer whirred for ages, but now I have a "${title}". The island looks cozier.`,
      `Printed "${title}". I sat next to it for a while to admire it.`,
    ]),
    print: { shape, color: hslHex(hue, 60, 62), size: 0.7 + Math.random() * 0.6, detail: 1 + Math.floor(Math.random() * 5) },
  };
}

function hslHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
