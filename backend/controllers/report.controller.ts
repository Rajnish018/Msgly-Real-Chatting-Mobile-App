import type { Response } from "express";
import { Types } from "mongoose"; // Import Types to convert raw inputs to ObjectIds
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";
import Report from "../models/report.model.js";

export const reportUser = async (
  req: AuthenticatedRequest, 
  res: Response
): Promise<void> => {
  try {
    const { targetUserId } = req.params;
    const { reason, additionalDetails } = req.body;

    // 1. FAST STRUCTURAL PARAMETER VALIDATION
    // If the parameter is completely missing or structurally malformed for an ObjectId, drop it instantly
    if (!targetUserId || !Types.ObjectId.isValid(targetUserId as string)) {
      res.status(400).json({ success: false, msg: "Invalid or missing target user identification reference." });
      return;
    }

    if (!req.userId || !Types.ObjectId.isValid(req.userId)) {
      res.status(401).json({ success: false, msg: "Unauthorized user identity context." });
      return;
    }

    // 2. CAST STRINGS DIRECTLY TO MONGOOSE OBJECTIDS
    // This strips out any 'undefined' or array probabilities, keeping TS happy
    const reporterObjectId = new Types.ObjectId(req.userId);
    const targetObjectId = new Types.ObjectId(targetUserId as string);

    // 3. Edge Case Validation
    if (reporterObjectId.equals(targetObjectId)) {
      res.status(400).json({ success: false, msg: "You cannot report yourself." });
      return;
    }

    if (!reason) {
      res.status(400).json({ success: false, msg: "A reason parameter is required to log a user report." });
      return;
    }

    // 4. Validate Target User Presence via lean index check
    const targetExists = await User.exists({ _id: targetObjectId });
    if (!targetExists) {
      res.status(404).json({ success: false, msg: "The user you are trying to report no longer exists." });
      return;
    }

    // 5. Check for duplicate open reports using clean types
    const alreadyReported = await Report.exists({ 
      reporterId: reporterObjectId, 
      targetUserId: targetObjectId 
    });
    
    if (alreadyReported) {
      res.status(409).json({ success: false, msg: "You have already filed a report against this user." });
      return;
    }

    // 6. Create the collection log entry
    await Report.create({
      reporterId: reporterObjectId,
      targetUserId: targetObjectId,
      reason,
      additionalDetails: additionalDetails?.trim() || ""
    });

    res.status(201).json({ 
      success: true, 
      msg: "Thank you. Your report has been submitted successfully and is under review." 
    });
    return;

  } catch (error: any) {
    console.error("CRITICAL: Error inside reportUser controller:", error);
    res.status(500).json({ success: false, msg: "Server error logging user report transaction." });
    return;
  }
};