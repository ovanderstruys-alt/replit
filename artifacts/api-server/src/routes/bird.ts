import { Router, type IRouter } from "express";
import { think, type BirdMemory } from "../lib/birdBrain";

const router: IRouter = Router();

router.post("/bird/think", async (req, res) => {
  const body = req.body ?? {};
  const memory: BirdMemory = {
    day: String(body.day ?? new Date().toDateString()),
    timeOfDay: String(body.timeOfDay ?? "daytime"),
    recentDiary: Array.isArray(body.recentDiary) ? body.recentDiary.map(String).slice(-10) : [],
    inventory: Array.isArray(body.inventory) ? body.inventory.slice(-30) : [],
  };
  try {
    res.json(await think(memory));
  } catch (err) {
    req.log.error({ err }, "bird brain failed");
    res.status(502).json({ error: "Pip's brain is foggy right now." });
  }
});

export default router;
