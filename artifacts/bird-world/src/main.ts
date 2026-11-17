import "./style.css";
import * as THREE from "three";
import { think } from "./brain";
import * as music from "./music";
import { clearSave, clock, load, save, today } from "./store";
import type { Creation, Item, Kind } from "./types";
import { World } from "./world";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const state = load();
const world = new World($<HTMLCanvasElement>("#scene"));
const bubble = $("#bubble");
const statusEl = $("#status");

let soundOn = false;
let restSeconds = 20;
let wakeEarly: (() => void) | null = null;
let viewDate = today(); // which diary page is open
let perPage = 2; // scrapbook photos per page (1 when the book is short, e.g. iPad portrait)
let page = 0; // journal page; 0 = title page
let flipping = false;
let journalOpen = false;
let generation = 0; // bumps on reset so an in-flight life loop stops cleanly

// ---------------------------------------------------------------------------
// Restore the world
// ---------------------------------------------------------------------------
state.items.filter((i) => i.kind === "print" && i.pos).forEach((i) => world.placePrint(i));
const lastSite = [...state.items].reverse().find((i) => i.kind === "website");
if (lastSite) world.drawScreen(lastSite.title);

function persist() {
  save(state);
  renderDiary();
  renderJournal();
}

function writeDiary(text: string, itemId?: string) {
  const now = new Date();
  state.diary.push({ date: today(now), time: clock(now), text, itemId });
  viewDate = today(now);
  persist();
}

if (!state.diary.length) {
  writeDiary("Moved into my new floating island today! I have a computer, a synthesizer and a 3D printer. I wonder what I'll make.");
}

// ---------------------------------------------------------------------------
// Speech bubble
// ---------------------------------------------------------------------------
let bubbleUntil = 0;
function say(text: string, seconds = 4) {
  bubble.textContent = text;
  bubble.classList.add("show");
  bubbleUntil = world.time + seconds;
}

function setStatus(text: string, mode: "ai" | "offline" | "busy") {
  statusEl.textContent = text;
  statusEl.dataset.mode = mode;
}

// ---------------------------------------------------------------------------
// Pip's life loop: think → walk → make → place → write diary → rest
// ---------------------------------------------------------------------------
let restToken = 0; // bumps when a rest period ends, so a background stroll stops steering Pip

async function wander(active: () => boolean) {
  const hops = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < hops && active(); i++) {
    await world.bird.walkTo(world.randomWanderPoint());
    if (!active()) return;
    if (Math.random() < 0.4) say(pick(["La la la~", "*chirp*", "Nice day!", "Hmm...", "♪ ♫", "*ruffles feathers*"]), 2.5);
    await world.wait(1 + Math.random() * 2);
  }
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

async function makeSomething(gen: number) {
  say("🤔 Hmm, what should I make…", 30);
  setStatus("Pip is thinking…", "busy");
  const { creation, byAI } = await think(state.items, state.diary);
  if (gen !== generation) return;
  setStatus(byAI ? "🧠 AI brain connected" : "💭 Daydreaming offline (no AI key)", byAI ? "ai" : "offline");
  say(creation.thought, 4);

  const item: Item = {
    id: Math.random().toString(36).slice(2, 10),
    kind: creation.action,
    title: creation.title,
    caption: creation.caption,
    createdAt: Date.now(),
    byAI,
    html: creation.website?.html,
    music: creation.music,
    print: creation.print,
  };

  await world.bird.walkTo(world.stations[item.kind]);
  if (gen !== generation) return;
  await work(item, creation, gen);
  if (gen !== generation) return;

  // Off to the diary
  await world.bird.walkTo(world.stations.diary);
  world.bird.faceTowards(new THREE.Vector3(0, 0, 2.2));
  world.bird.mode = "write";
  say("✏️ Dear diary…", 3);
  await world.wait(3);
  world.bird.mode = "idle";
  if (gen !== generation) return;
  writeDiary(creation.diary, item.id);
}

/** Pip poses (turns to the camera, or steps beside a print) and snaps a photo for the scrapbook. */
async function takePhoto(item: Item) {
  const plan = world.photoPlan(item);
  if (plan.stand) await world.bird.walkTo(plan.stand);
  world.bird.faceTowards(plan.from);
  say("📸 Say cheese!", 1.5);
  await world.wait(0.7);
  try {
    item.photo = world.photoOf(item);
  } catch {
    /* no photo this time; the scrapbook re-takes it later */
  }
  const flash = $("#flash");
  flash.classList.remove("go");
  void flash.offsetWidth; // restart the CSS animation
  flash.classList.add("go");
}

async function work(item: Item, creation: Creation, gen: number) {
  const bird = world.bird;
  if (item.kind === "website") {
    bird.faceTowards(new THREE.Vector3(-3.2, 0, -2.2));
    bird.mode = "work";
    say("💻 click clack…", 6);
    const colors = ["#ffd6a5", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff"];
    for (let i = 0; i < 6 && gen === generation; i++) {
      world.drawScreen("Building" + ".".repeat((i % 3) + 1), pick(colors), "#2b2d42");
      await world.wait(1);
    }
    world.drawScreen(item.title);
    bird.mode = "idle";
    await takePhoto(item);
    state.items.push(item);
    persist();
    say(`Done! "${item.title}" is live 🌐`, 4);
    await world.wait(2);
  } else if (item.kind === "music") {
    bird.faceTowards(new THREE.Vector3(3.2, 0, -2.2));
    bird.mode = "work";
    say("🎹 composing…", 5);
    for (let i = 0; i < 10 && gen === generation; i++) {
      world.spawnNote();
      await world.wait(0.5);
    }
    bird.mode = "dance";
    world.spawnNote();
    world.spawnNote();
    await world.wait(0.5);
    await takePhoto(item);
    state.items.push(item);
    persist();
    say(`🎶 "${item.title}"`, 6);
    if (soundOn) {
      await music.play(item.music!, (i) => i % 2 === 0 && world.spawnNote());
    } else {
      for (let i = 0; i < 12 && gen === generation; i++) {
        world.spawnNote();
        await world.wait(0.4);
      }
    }
    bird.mode = "idle";
  } else {
    bird.faceTowards(new THREE.Vector3(0, 0, -4));
    bird.mode = "work";
    say("🖨️ brrrrr…", 8);
    const obj = world.startPrint(item);
    const secs = 8;
    const steps = 40;
    for (let i = 1; i <= steps && gen === generation; i++) {
      await world.wait(secs / steps);
      world.setPrintProgress(obj, i / steps);
    }
    world.parkNozzle();
    bird.mode = "idle";
    if (gen !== generation) return;
    world.pickUp(obj);
    say(`Got my ${item.title}!`, 3);
    item.pos = world.freeSpot(state.items.filter((i) => i.pos).map((i) => i.pos!));
    const spot = new THREE.Vector3(item.pos[0], 0, item.pos[1]);
    const stand = spot.clone().add(new THREE.Vector3(0, 0, 0).sub(spot).setLength(0.7));
    await bird.walkTo(stand);
    if (gen !== generation) return;
    bird.faceTowards(spot);
    world.placePrint(item, obj);
    say("Perfect spot ✨", 2);
    await world.wait(1);
    await takePhoto(item);
    state.items.push(item);
    persist();
    await world.wait(1);
  }
}

async function life() {
  const gen = generation;
  await world.wait(1.5);
  while (gen === generation) {
    await makeSomething(gen);
    if (gen !== generation) return;

    // Rest & wander until the next project (or until "Make something now")
    const token = ++restToken;
    const active = () => token === restToken && gen === generation;
    let woke = false;
    const woken = new Promise<void>((r) => (wakeEarly = () => ((woke = true), r())));
    const restEnd = world.time + restSeconds;
    while (!woke && world.time < restEnd && active()) {
      await Promise.race([wander(active), woken]);
      if (woke || !active()) break;
      await Promise.race([world.wait(Math.min(3, Math.max(0.1, restEnd - world.time))), woken]);
    }
    restToken++;
    wakeEarly = null;
  }
}

// ---------------------------------------------------------------------------
// Side panel: diary
// ---------------------------------------------------------------------------
function diaryDates(): string[] {
  return [...new Set(state.diary.map((d) => d.date))].sort();
}

function renderDiary() {
  const dates = diaryDates();
  if (!dates.includes(viewDate)) viewDate = dates[dates.length - 1] ?? today();
  const idx = dates.indexOf(viewDate);
  const d = new Date(viewDate + "T12:00:00");
  $("#diary-date").textContent = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  $<HTMLButtonElement>("#diary-prev").disabled = idx <= 0;
  $<HTMLButtonElement>("#diary-next").disabled = idx >= dates.length - 1;
  const entries = state.diary.filter((e) => e.date === viewDate);
  const made = entries.filter((e) => e.itemId).length;
  $("#diary-summary").textContent = made ? `Made ${made} thing${made === 1 ? "" : "s"} this day` : "";
  const byId = new Map(state.items.map((i) => [i.id, i]));
  $("#diary-entries").innerHTML = entries
    .map((e) => {
      const item = e.itemId ? byId.get(e.itemId) : undefined;
      return `<article class="entry"><time>${e.time}</time><p>${esc(e.text)}</p>${
        item ? `<button class="chip" data-open="${item.id}">${icon(item.kind)} ${esc(item.title)}</button>` : ""
      }</article>`;
    })
    .join("");
}

$("#diary-prev").onclick = () => {
  const ds = diaryDates();
  viewDate = ds[Math.max(0, ds.indexOf(viewDate) - 1)];
  renderDiary();
};
$("#diary-next").onclick = () => {
  const ds = diaryDates();
  viewDate = ds[Math.min(ds.length - 1, ds.indexOf(viewDate) + 1)];
  renderDiary();
};

// ---------------------------------------------------------------------------
// Side panel: Pip's scrapbook journal
// ---------------------------------------------------------------------------
const icon = (k: Kind) => ({ website: "🌐", music: "🎵", print: "🧊" })[k];
const verb = (k: Kind) => ({ website: "Visit", music: "Play", print: "Find it" })[k];

function pageCount() {
  return 1 + Math.ceil(state.items.length / perPage);
}

/** Fit 1 or 2 photos per page depending on how tall the book is. */
function fitPerPage() {
  const h = $("#book").clientHeight;
  if (!h) return; // journal hidden
  const next = h >= 470 ? 2 : 1;
  if (next === perPage) return;
  const firstItem = page > 0 ? (page - 1) * perPage : -1; // keep the same photo in view
  perPage = next;
  page = firstItem < 0 ? 0 : 1 + Math.floor(firstItem / perPage);
  if (journalOpen && !flipping) $("#page").innerHTML = pageHtml(page);
  renderPager();
}
window.addEventListener("resize", fitPerPage);

/** Small stable number from an id, for each scrap's tilt and tape colour. */
function hash(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Older items (or ones from before photos existed) get their photo taken now. */
function ensurePhoto(item: Item) {
  if (item.photo) return;
  try {
    item.photo = world.photoOf(item);
    save(state);
  } catch {
    /* draw the placeholder instead */
  }
}

function captionFor(item: Item) {
  return item.caption || state.diary.find((d) => d.itemId === item.id)?.text || "Something I made!";
}

function titlePageHtml() {
  const n = (k: Kind) => state.items.filter((i) => i.kind === k).length;
  const first = state.diary[0]?.date ?? today();
  const since = new Date(first + "T12:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return `<div class="title-page">
    <div class="stamp">🐦</div>
    <h2>Pip's Scrapbook</h2>
    <p class="hand">Things I made, with photos!</p>
    <p class="since">started ${esc(since)}</p>
    <ul class="tally">
      <li>🌐 ${n("website")} website${n("website") === 1 ? "" : "s"}</li>
      <li>🎵 ${n("music")} song${n("music") === 1 ? "" : "s"}</li>
      <li>🧊 ${n("print")} print${n("print") === 1 ? "" : "s"}</li>
    </ul>
    <p class="hand turn">${state.items.length ? "turn the page →" : "nothing yet… I'm about to make my first thing!"}</p>
  </div>`;
}

function scrapHtml(item: Item, i: number) {
  ensurePhoto(item);
  const h = hash(item.id);
  const tilt = ((h % 7) - 3) * 1.1 * (i % 2 ? -1 : 1);
  const tapes = ["#f7c8d0cc", "#bde0fecc", "#cdeac0cc", "#ffe8a3cc", "#d9c6f5cc"];
  const when = new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const photo = item.photo
    ? `<img src="${item.photo}" alt="Photo of ${esc(item.title)}" loading="lazy" />`
    : `<div class="no-photo">${icon(item.kind)}</div>`;
  return `<figure class="scrap ${i % 2 ? "alt" : ""}">
    <button class="polaroid" data-open="${item.id}" style="--tilt:${tilt}deg" aria-label="${verb(item.kind)} ${esc(item.title)}">
      <span class="tape" style="--tape:${tapes[h % tapes.length]}"></span>
      ${photo}
      <span class="name">${esc(item.title)}</span>
    </button>
    <figcaption class="note">
      <p class="hand">${esc(captionFor(item))}</p>
      <div class="meta"><span class="sticker">${icon(item.kind)}</span><span>${esc(when)}</span>
        <button class="link" data-open="${item.id}">${verb(item.kind)} →</button></div>
    </figcaption>
  </figure>`;
}

function pageHtml(p: number) {
  if (p === 0) return titlePageHtml();
  const items = state.items.slice((p - 1) * perPage, p * perPage);
  return `<div class="scraps">${items.map(scrapHtml).join("")}</div><div class="folio">${p}</div>`;
}

function renderPager() {
  const total = pageCount();
  page = Math.min(page, total - 1);
  $("#count").textContent = String(state.items.length);
  const pager = $("#pager");
  pager.hidden = total <= 1;
  $("#pg-label").textContent = page === 0 ? `Cover · ${total - 1} page${total - 1 === 1 ? "" : "s"}` : `Page ${page} of ${total - 1}`;
  $<HTMLButtonElement>("#pg-prev").disabled = page <= 0;
  $<HTMLButtonElement>("#pg-next").disabled = page >= total - 1;
}

/** Re-draw the current page in place (new creations, reset…). */
function renderJournal() {
  renderPager();
  if (!journalOpen || flipping) return;
  $("#page").innerHTML = pageHtml(page);
}

/** Turn the page with a paper-flip animation. */
function turnTo(next: number) {
  const total = pageCount();
  if (flipping || next < 0 || next >= total || next === page) return;
  const forward = next > page;
  const pageEl = $("#page");
  const flip = $("#flip");
  const oldHtml = pageEl.innerHTML;
  const newHtml = pageHtml(next);
  flipping = true;
  if (forward) {
    // the current page lifts off the right edge and folds over the spine…
    flip.innerHTML = oldHtml;
    pageEl.innerHTML = newHtml;
  } else {
    // …or the previous page swings back in from the spine
    flip.innerHTML = newHtml;
  }
  flip.className = `sheet flip ${forward ? "turn-fwd" : "turn-back"}`;
  page = next;
  renderPager();
  flip.addEventListener(
    "animationend",
    () => {
      pageEl.innerHTML = newHtml;
      flip.className = "sheet flip";
      flip.innerHTML = "";
      flipping = false;
    },
    { once: true },
  );
}

$("#pg-prev").onclick = () => turnTo(page - 1);
$("#pg-next").onclick = () => turnTo(page + 1);
$("#journal").addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") turnTo(page - 1);
  if (e.key === "ArrowRight") turnTo(page + 1);
});
// Swipe to turn pages (handy on iPad)
let swipeX: number | null = null;
$("#book").addEventListener("pointerdown", (e) => (swipeX = e.clientX));
$("#book").addEventListener("pointerup", (e) => {
  if (swipeX === null) return;
  const dx = e.clientX - swipeX;
  swipeX = null;
  if (Math.abs(dx) > 50) turnTo(page + (dx < 0 ? 1 : -1));
});

/** Opening the journal: the cover swings open to reveal the page. */
function openBook() {
  const book = $("#book");
  journalOpen = true;
  fitPerPage();
  $("#page").innerHTML = pageHtml(page);
  renderPager();
  book.classList.remove("opening");
  void book.offsetWidth; // restart the CSS animation every time the tab is opened
  book.classList.add("opening");
}

function openItem(id: string) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  if (item.kind === "website") {
    $("#site-title").textContent = item.title;
    $<HTMLIFrameElement>("#site-frame").srcdoc = item.html ?? "";
    $<HTMLDialogElement>("#site-dialog").showModal();
  } else if (item.kind === "music") {
    if (music.isPlaying()) {
      music.stop();
      return;
    }
    say(`🎶 Playing "${item.title}"`, 4);
    void music.play(item.music!, (i) => i % 2 === 0 && world.spawnNote());
  } else {
    world.focusOn(item.id);
    say(`That's my ${item.title}!`, 3);
  }
}

document.addEventListener("click", (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>("[data-open]");
  if (t) openItem(t.dataset.open!);
});
$("#site-close").onclick = () => $<HTMLDialogElement>("#site-dialog").close();

// Click a print in the 3D world
let downAt = { x: 0, y: 0 };
const canvas = $("#scene");
canvas.addEventListener("pointerdown", (e) => (downAt = { x: e.clientX, y: e.clientY }));
canvas.addEventListener("pointerup", (e) => {
  if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return; // was a drag
  const id = world.pickAt(e.clientX, e.clientY);
  const item = id && state.items.find((i) => i.id === id);
  if (item) {
    world.focusOn(item.id);
    const entry = state.diary.find((d) => d.itemId === item.id);
    say(`${item.title}${entry ? ` — printed ${entry.date}` : ""}`, 4);
  }
});

// Tabs
document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll<HTMLElement>(".tab").forEach((t) => (t.hidden = t.id !== b.dataset.tab));
    if (b.dataset.tab === "journal") openBook();
    else journalOpen = false;
  };
});

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((b) => {
  b.onclick = () => {
    world.speed = Number(b.dataset.speed);
    document.querySelectorAll("[data-speed]").forEach((x) => x.classList.toggle("active", x === b));
  };
});
$("#make-now").onclick = () => wakeEarly?.();
$("#rest").oninput = (e) => {
  restSeconds = Number((e.target as HTMLInputElement).value);
  $("#rest-label").textContent = `${restSeconds}s`;
};
$("#sound").onclick = () => {
  soundOn = !soundOn;
  $("#sound").textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
  if (!soundOn) music.stop();
};
$("#reset").onclick = () => {
  if (!confirm("Start Pip's island over? This erases the diary and everything Pip made.")) return;
  generation++;
  restToken++;
  wakeEarly?.();
  music.stop();
  clearSave();
  state.items = [];
  state.diary = [];
  page = 0;
  world.removeAllPrints();
  world.drawScreen("Pip OS", "#2b2d42", "#8ecae6");
  world.bird.mode = "idle";
  world.bird.target = null;
  world.bird.onArrive = null;
  writeDiary("Started fresh on a brand new island. Everything feels possible!");
  void life();
};

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------
let last = performance.now();
let lastSky = 0;
function frame(now: number) {
  const dt = (now - last) / 1000;
  last = now;
  world.update(dt);
  if (now - lastSky > 30000) {
    world.setTimeOfDay(new Date());
    lastSky = now;
  }
  if (bubble.classList.contains("show")) {
    if (world.time > bubbleUntil) bubble.classList.remove("show");
    const p = world.birdHeadScreen();
    bubble.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
  }
  $("#clock").textContent = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  requestAnimationFrame(frame);
}

renderDiary();
renderJournal();
setStatus("Waking up…", "busy");
requestAnimationFrame(frame);
void life();
