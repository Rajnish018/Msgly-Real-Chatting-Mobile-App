import { Router } from "express";
import { clearChat, getSharedContent, getUserProfile } from "../controllers/conversation.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { checkBlockStatus } from "../middleware/checkBlockStatus.middleware.js";

const router = Router();

router.get("/users/:userId/profile", authMiddleware, checkBlockStatus, getUserProfile);
router.get("/:conversationId/shared-content", authMiddleware, getSharedContent);
router.post("/:conversationId/clear", authMiddleware, clearChat);

export default router;
