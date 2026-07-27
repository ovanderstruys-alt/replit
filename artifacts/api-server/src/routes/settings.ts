import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  if (settings) return settings;
  const [created] = await db.insert(settingsTable).values({ dailyPointGoal: 50 }).returning();
  return created;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await getOrCreateSettings();
  const [settings] = await db
    .update(settingsTable)
    .set(parsed.data)
    .where(eq(settingsTable.id, 1))
    .returning();
  res.json(UpdateSettingsResponse.parse(settings));
});

export default router;
