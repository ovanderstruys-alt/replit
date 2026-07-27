import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const completionsTable = pgTable("completions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  taskName: text("task_name").notNull(),
  taskPoints: integer("task_points").notNull(),
  proofType: text("proof_type").notNull(), // "photo" | "video"
  proofData: text("proof_data").notNull(), // base64 encoded image
  verified: boolean("verified").notNull().default(false),
  verificationMessage: text("verification_message"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  date: date("date", { mode: "string" }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCompletionSchema = createInsertSchema(completionsTable).omit({ id: true, completedAt: true });
export type InsertCompletion = z.infer<typeof insertCompletionSchema>;
export type Completion = typeof completionsTable.$inferSelect;
