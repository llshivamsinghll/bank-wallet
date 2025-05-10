import express from 'express';
const router = express.Router();
import { getWalletBalance, getTransactionHistory, transactions, transfer } from '../controllers/walletController.js';
import { verifyToken } from '../../middleware/authMiddleware.js';
// Middleware to verify token

// Wallet routes
router.get('/balance', getWalletBalance);
router.get('/transactions', getTransactionHistory);
router.post('/transaction', transactions);
router.post('/transfer', transfer);

export default router;