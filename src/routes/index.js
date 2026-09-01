import { Router } from "express";
import authRouter from "./auth.js";
import postsRouter from "./posts.js";
import categoriesRouter from "./categories.js";
import groupsRouter from "./groups.js";
import interactionsRouter from "./interactions.js";
import eventsRouter from "./events.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/posts", postsRouter);
router.use("/categories", categoriesRouter);
router.use("/groups", groupsRouter);
router.use("/interactions", interactionsRouter);
router.use("/events", eventsRouter);

export default router;
