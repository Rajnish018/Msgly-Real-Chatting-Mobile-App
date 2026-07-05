import { Router } from "express";
import {
  changeEmail,
  changePassword,
  deleteMyAccount,
  exportMyData,
  getPrivacySettings,
  getUserSettings,
  loginUser,
  registerUser,
  upsertEncryptionKey,
  updateTwoStepVerification,
  updatePrivacySettings,
  updateUserSettings,
  toggleBlockUser,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";


const router=Router();

router.post('/register',registerUser)
router.post('/login',loginUser)
router.get('/settings', authMiddleware, getUserSettings)
router.put('/settings', authMiddleware, updateUserSettings)
router.get('/privacy', authMiddleware, getPrivacySettings)
router.put('/privacy', authMiddleware, updatePrivacySettings)
router.post('/encryption-key', authMiddleware, upsertEncryptionKey)
router.put('/change-email', authMiddleware, changeEmail)
router.put('/two-step-verification', authMiddleware, updateTwoStepVerification)
router.post('/change-password', authMiddleware, changePassword)
router.get('/export-data', authMiddleware, exportMyData)
router.post('/block/:targetUserId', authMiddleware, toggleBlockUser)
router.delete('/delete-account', authMiddleware, deleteMyAccount)


export default router;
