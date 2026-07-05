import {Router} from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { reportUser } from "../controllers/report.controller.js";


const router = Router();


router.post("/:targetUserId",authMiddleware,reportUser);

export default router;