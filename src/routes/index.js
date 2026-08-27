import { Router } from "express";
import authRouter from "./auth.js";
import postsRouter from "./posts.js";
import categoriesRouter from "./categories.js";
import groupsRouter from "./groups.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/posts", postsRouter);
router.use("/categories", categoriesRouter);
router.use("/groups", groupsRouter);

export default router;
