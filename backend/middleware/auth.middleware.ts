import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { permanentlyDeleteAccountByUserId, purgeExpiredDeactivatedAccounts } from "../Utils/accountLifecycle.js";
import User from "../models/user.model.js";

export type AuthenticatedRequest = Request & {
  userId?: string;
};

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ success: false, msg: "Unauthorized" });
    return;
  }

  try {
    await purgeExpiredDeactivatedAccounts();

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const userId = decoded?.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, msg: "Invalid token" });
      return;
    }

    const user = await User.findById(userId)
      .select("_id tokenVersion accountStatus scheduledDeletionAt")
      .lean();

    if (!user) {
      res.status(401).json({ success: false, msg: "Invalid token" });
      return;
    }

    if ((decoded?.user?.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      res.status(401).json({ success: false, msg: "Session expired" });
      return;
    }

    if (user.accountStatus === "deactivated") {
      const scheduledDeletionAt = user.scheduledDeletionAt
        ? new Date(user.scheduledDeletionAt)
        : null;

      if (scheduledDeletionAt && scheduledDeletionAt <= new Date()) {
        await permanentlyDeleteAccountByUserId(userId);
      }

      res.status(403).json({ success: false, msg: "Account is deactivated" });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, msg: "Invalid token" });
  }
};
