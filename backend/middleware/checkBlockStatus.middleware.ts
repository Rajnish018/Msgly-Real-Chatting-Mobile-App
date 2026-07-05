import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { hasBlockedMe } from "../Utils/blockCache.js";

/**
 * Express Middleware protecting messaging or profile routing from blocked actors.
 */
export const checkBlockStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = req.userId;
    // Extract target ID from params, body, or query dynamically
    const targetUserId = req.params.userId || req.body.targetUserId || req.query.targetUserId;

    if (!currentUserId || !targetUserId) {
      return next();
    }

    const blockedMe = await hasBlockedMe(String(currentUserId), String(targetUserId));

    if (blockedMe) {
      res.status(403).json({
        success: false,
        msg: "Action Forbidden: This user has blocked you.",
        code: "USER_BLOCKED",
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error("checkBlockStatus middleware error:", error.message);
    res.status(500).json({ success: false, msg: "Error validating block integrity." });
  }
};
