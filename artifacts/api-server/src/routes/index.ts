import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import completionsRouter from "./completions";
import settingsRouter from "./settings";
import summaryRouter from "./summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(completionsRouter);
router.use(settingsRouter);
router.use(summaryRouter);

export default router;
