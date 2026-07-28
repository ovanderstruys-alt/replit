import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, tasksTable, completionsTable, settingsTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import {
  GetDailySummaryQueryParams,
  GetDailySummaryResponse,
  GetHistoryQueryParams,
  GetHistoryResponse,
  GetStreakResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

async function getDailyPointGoal(): Promise<number> {
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  return settings?.dailyPointGoal ?? 50;
}

router.get("/daily-summary", async (req, res): Promise<void> => {
  const query = GetDailySummaryQueryParams.safeParse(req.query);
  const date = query.success && query.data.date ? query.data.date : todayString();
  const pointsGoal = await getDailyPointGoal();

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.isActive, true))
    .orderBy(tasksTable.createdAt);

  const completions = await db
    .select()
    .from(completionsTable)
    .where(eq(completionsTable.date, date));

  const completionMap = new Map(completions.map((c) => [c.taskId, c]));

  const tasksWithCompletion = tasks.map((task) => ({
    ...task,
    completion: completionMap.get(task.id) ?? null,
  }));

  const pointsEarned = completions
    .filter((c) => c.verified)
    .reduce((sum, c) => sum + c.pointsAwarded, 0);

  const summary = {
    date,
    pointsEarned,
    pointsGoal,
    goalReached: pointsEarned >= pointsGoal,
    completedTaskCount: completions.filter((c) => c.verified).length,
    totalTaskCount: tasks.length,
    tasks: tasksWithCompletion,
  };

  res.json(GetDailySummaryResponse.parse(serializeDates(summary)));
});

router.get("/history", async (req, res): Promise<void> => {
  const query = GetHistoryQueryParams.safeParse(req.query);
  const days = query.success && query.data.days ? query.data.days : 30;
  const pointsGoal = await getDailyPointGoal();

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);

  const startStr = startDate.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  // Get all completions in date range
  const completions = await db
    .select()
    .from(completionsTable)
    .where(and(gte(completionsTable.date, startStr), lte(completionsTable.date, todayStr)));

  // Get task count (active tasks)
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.isActive, true));
  const totalTaskCount = tasks.length;

  // Group completions by date
  const byDate = new Map<string, typeof completions>();
  for (const c of completions) {
    const list = byDate.get(c.date) ?? [];
    list.push(c);
    byDate.set(c.date, list);
  }

  // Build history array for the date range
  const history: Array<{
    date: string;
    pointsEarned: number;
    pointsGoal: number;
    goalReached: boolean;
    completedTaskCount: number;
    totalTaskCount: number;
  }> = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const dayCompletions = byDate.get(dateStr) ?? [];
    const verified = dayCompletions.filter((c) => c.verified);
    const pointsEarned = verified.reduce((sum, c) => sum + c.pointsAwarded, 0);
    history.push({
      date: dateStr,
      pointsEarned,
      pointsGoal,
      goalReached: pointsEarned >= pointsGoal,
      completedTaskCount: verified.length,
      totalTaskCount,
    });
  }

  res.json(GetHistoryResponse.parse(history.reverse()));
});

router.get("/streak", async (_req, res): Promise<void> => {
  const pointsGoal = await getDailyPointGoal();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Get all completions ever
  const completions = await db.select().from(completionsTable).where(eq(completionsTable.verified, true));

  // Group by date
  const pointsByDate = new Map<string, number>();
  for (const c of completions) {
    const current = pointsByDate.get(c.date) ?? 0;
    pointsByDate.set(c.date, current + c.pointsAwarded);
  }

  const totalPointsEarned = Array.from(pointsByDate.values()).reduce((a, b) => a + b, 0);
  const totalDaysCompleted = Array.from(pointsByDate.entries()).filter(
    ([, pts]) => pts >= pointsGoal
  ).length;

  // Calculate current streak (consecutive days ending today or yesterday where goal was met)
  let currentStreak = 0;
  const checkDate = new Date(today);
  // If today isn't done yet, start from yesterday for streak purposes
  const todayPoints = pointsByDate.get(todayStr) ?? 0;
  if (todayPoints < pointsGoal) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const pts = pointsByDate.get(dateStr) ?? 0;
    if (pts >= pointsGoal) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  const sortedDates = Array.from(pointsByDate.entries())
    .filter(([, pts]) => pts >= pointsGoal)
    .map(([d]) => d)
    .sort();

  let longestStreak = 0;
  let runStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const d = new Date(dateStr);
    if (prevDate) {
      const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        runStreak++;
      } else {
        runStreak = 1;
      }
    } else {
      runStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runStreak);
    prevDate = d;
  }

  res.json(
    GetStreakResponse.parse({
      currentStreak,
      longestStreak,
      totalDaysCompleted,
      totalPointsEarned,
    })
  );
});

export default router;
