import express from 'express';
const router = express.Router();
import { getProfile, updateProfile } from '../controllers/profileController.js';
import { verifyToken } from '../../middleware/authMiddleware.js';
router.use(express.json());
router.get('/me',verifyToken, getProfile);
router.put('/updateMe',verifyToken, updateProfile);

export default router;

