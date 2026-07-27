import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, completionsTable, tasksTable } from "@workspace/db";
import {
  SubmitCompletionBody,
  SubmitCompletionResponse,
  GetCompletionParams,
  GetCompletionResponse,
  DeleteCompletionParams,
  ListCompletionsQueryParams,
  ListCompletionsResponse,
} from "@workspace/api-zod";
import { verifyProof } from "../lib/openai";

const router: IRouter = Router();

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/completions", async (req, res): Promise<void> => {
  const query = ListCompletionsQueryParams.safeParse(req.query);
  const date = query.success && query.data.date ? query.data.date : todayString();
  const completions = await db
    .select()
    .from(completionsTable)
    .where(eq(completionsTable.date, date))
    .orderBy(completionsTable.completedAt);
  res.json(ListCompletionsResponse.parse(completions));
});

router.post("/completions", async (req, res): Promise<void> => {
  const parsed = SubmitCompletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { taskId, proofType, proofData, date } = parsed.data;
  const completionDate = date ?? todayString();

  // Look up the task
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  // Check if already completed today
  const existing = await db
    .select()
    .from(completionsTable)
    .where(and(eq(completionsTable.taskId, taskId), eq(completionsTable.date, completionDate)));
  if (existing.length > 0) {
    res.status(400).json({ error: "Task already completed for this date" });
    return;
  }

  // AI verification
  const { verified, message } = await verifyProof(
    task.name,
    task.description,
    proofType as "photo" | "video",
    proofData
  );

  const [completion] = await db
    .insert(completionsTable)
    .values({
      taskId: task.id,
      taskName: task.name,
      taskPoints: task.points,
      proofType,
      proofData,
      verified,
      verificationMessage: message,
      pointsAwarded: verified ? task.points : 0,
      date: completionDate,
    })
    .returning();

  res.status(201).json(SubmitCompletionResponse.parse(completion));
});

router.get("/completions/:id", async (req, res): Promise<void> => {
  const params = GetCompletionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [completion] = await db
    .select()
    .from(completionsTable)
    .where(eq(completionsTable.id, params.data.id));
  if (!completion) {
    res.status(404).json({ error: "Completion not found" });
    return;
  }
  res.json(GetCompletionResponse.parse(completion));
});

router.delete("/completions/:id", async (req, res): Promise<void> => {
  const params = DeleteCompletionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [completion] = await db
    .delete(completionsTable)
    .where(eq(completionsTable.id, params.data.id))
    .returning();
  if (!completion) {
    res.status(404).json({ error: "Completion not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
