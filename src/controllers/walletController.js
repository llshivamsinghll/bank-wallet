import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errorHandler.js';

const prisma = new PrismaClient();

// Wallet limits
const WALLET_LIMITS = {
    MIN_TRANSACTION: 100,
    MAX_TRANSACTION: 50000,
    DAILY_LIMIT: 100000,
    MONTHLY_LIMIT: 1000000,
    MAX_BALANCE: 500000
};

const getWalletBalance = async (req, res, next) => {
    try {
        const wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id }
        });

        if (!wallet) {
            throw new AppError('Wallet not found', 404);
        }

        res.status(200).json({
            status: 'success',
            data: {
                balance: wallet.balance,
                currency: wallet.currency
            }
        });
    } catch (error) {
        next(error);
    }
};

const getTransactionHistory = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const where = {
            userId: req.user.id
        };

        if (req.query.type) {
            where.type = req.query.type.toUpperCase();
        }

        if (req.query.startDate && req.query.endDate) {
            where.createdAt = {
                gte: new Date(req.query.startDate),
                lte: new Date(req.query.endDate)
            };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                bank: true
            }
        });

        const total = await prisma.transaction.count({ where });

        res.status(200).json({
            status: 'success',
            data: {
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

const checkTransactionLimits = async (userId, amount, type) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Check minimum and maximum transaction amount
    if (amount < WALLET_LIMITS.MIN_TRANSACTION) {
        throw new AppError(`Minimum transaction amount is ${WALLET_LIMITS.MIN_TRANSACTION}`, 400);
    }
    if (amount > WALLET_LIMITS.MAX_TRANSACTION) {
        throw new AppError(`Maximum transaction amount is ${WALLET_LIMITS.MAX_TRANSACTION}`, 400);
    }

    // Check daily limit
    const dailyTransactions = await prisma.transaction.aggregate({
        where: {
            userId,
            createdAt: {
                gte: today
            },
            type: 'CREDIT'
        },
        _sum: {
            amount: true
        }
    });

    const dailyTotal = dailyTransactions._sum.amount || 0;
    if (dailyTotal + amount > WALLET_LIMITS.DAILY_LIMIT) {
        throw new AppError('Daily transaction limit exceeded', 400);
    }

    // Check monthly limit
    const monthlyTransactions = await prisma.transaction.aggregate({
        where: {
            userId,
            createdAt: {
                gte: monthStart
            },
            type: 'CREDIT'
        },
        _sum: {
            amount: true
        }
    });

    const monthlyTotal = monthlyTransactions._sum.amount || 0;
    if (monthlyTotal + amount > WALLET_LIMITS.MONTHLY_LIMIT) {
        throw new AppError('Monthly transaction limit exceeded', 400);
    }

    // Check maximum wallet balance
    if (type === 'CREDIT') {
        const wallet = await prisma.wallet.findUnique({
            where: { userId }
        });

        if (wallet.balance + amount > WALLET_LIMITS.MAX_BALANCE) {
            throw new AppError('Maximum wallet balance limit exceeded', 400);
        }
    }
};

const transactions = async (req, res, next) => {
    try {
        const { amount, type, description } = req.body;

        if (!amount || !type) {
            throw new AppError('Amount and type are required', 400);
        }

        await checkTransactionLimits(req.user.id, amount, type.toUpperCase());

        const transaction = await prisma.$transaction(async (prisma) => {
            const wallet = await prisma.wallet.findUnique({
                where: { userId: req.user.id }
            });

            if (!wallet) {
                throw new AppError('Wallet not found', 404);
            }

            if (type.toUpperCase() === 'DEBIT' && wallet.balance < amount) {
                throw new AppError('Insufficient balance', 400);
            }

            const newBalance = type.toUpperCase() === 'CREDIT' 
                ? wallet.balance + amount 
                : wallet.balance - amount;

            const updatedWallet = await prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: newBalance }
            });

            const newTransaction = await prisma.transaction.create({
                data: {
                    amount,
                    type: type.toUpperCase(),
                    description,
                    userId: req.user.id,
                    walletId: wallet.id,
                    status: 'SUCCESS'
                }
            });

            return { transaction: newTransaction, wallet: updatedWallet };
        });

        res.status(200).json({
            status: 'success',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
}; 

const transfer = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
        // Verify and decode the JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const { bank: bankCode } = req.params;
        const { amount } = req.body;
        
        if (!bankCode || !amount) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }
        
        // Validate amount is a positive number
        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }
        
        // Get the bank details
        const bank = await prisma.bank.findUnique({
            where: {
                code: bankCode,
            },
        });
        
        if (!bank) {
            return res.status(404).json({ message: 'Bank not found' });
        }
        
        // Check if transfer amount exceeds bank's limit
        if (transferAmount > bank.maxLimit) {
            return res.status(400).json({ message: 'Transfer limit exceeded' });
        }
        
        // Get user's wallet
        const wallet = await prisma.wallet.findUnique({
            where: {
                userId: userId,
            },
        });
        
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }
        
        // Check if user has sufficient balance
        if (wallet.balance < transferAmount) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }
        
        // Check if user has linked the bank account
        const userBankAccount = await prisma.userBankAccount.findFirst({
            where: {
                userId: userId,
                bankId: bank.id,
                isActive: true,
            },
        });
        
        if (!userBankAccount) {
            return res.status(400).json({ message: 'Bank account not linked' });
        }
        
        // Perform the transfer in a transaction to ensure data consistency
        const result = await prisma.$transaction(async (prisma) => {
            // Deduct amount from wallet
            const updatedWallet = await prisma.wallet.update({
                where: {
                    id: wallet.id,
                },
                data: {
                    balance: {
                        decrement: transferAmount,
                    },
                },
            });
            
            // Create transaction record
            const transaction = await prisma.transaction.create({
                data: {
                    walletId: wallet.id,
                    userId: userId,
                    amount: transferAmount,
                    type: 'DEBIT',
                    status: 'SUCCESS',
                    counterparty: bank.name,
                    bankId: bank.id,
                    description: `Transfer to ${bank.name} account ${userBankAccount.accountNo.slice(-4)}`
                }
            });
            
            return {
                wallet: updatedWallet,
                transaction: transaction
            };
        });
        
        // In a real application, you'd integrate with a payment gateway or banking API here
        // This is just a simulated delay to represent the external API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return res.status(200).json({ 
            message: 'Transfer successful', 
            transferResult: result.transaction,
            updatedBalance: result.wallet.balance
        });
        
    } catch (error) {
        console.error(error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}

const topUp =async(req,res) =>{
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        // Verify and decode the JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const { bank: bankCode } = req.params;
        const { amount } = req.body;
        
        if (!bankCode || !amount) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }
        
        // Validate amount is a positive number
        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }
        
        // Get the bank details
        const bank = await prisma.bank.findUnique({
            where: {
                code: bankCode,
            },
        });
        
        if (!bank) {
            return res.status(404).json({ message: 'Bank not found' });
        }
        
        // Check if transfer amount exceeds bank's limit
        if (transferAmount > bank.maxLimit) {
            return res.status(400).json({ message: 'Transfer limit exceeded' });
        }
        
        // Get user's wallet
        const wallet = await prisma.wallet.findUnique({
            where: {
                userId: userId,
            },
        });
        
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }
        
        // Check if user has sufficient balance
        if (wallet.balance < transferAmount) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }
        
        // Check if user has linked the bank account
        const userBankAccount = await prisma.userBankAccount.findFirst({
            where: {
                userId: userId,
                bankId: bank.id,
                isActive: true,
            },
        });
        
        if (!userBankAccount) {
            return res.status(400).json({ message: 'Bank account not linked' });
        }
        
        // Perform the transfer in a transaction to ensure data consistency
        const result = await prisma.$transaction(async (prisma) => {
            // Deduct amount from wallet
            const updatedWallet = await prisma.wallet.update({
                where: {
                    id: wallet.id,
                },
                data: {
                    balance: {
                        decrement: transferAmount,
                    },
                },
            });
            
            // Create transaction record
            const transaction = await prisma.transaction.create({
                data: {
                    walletId: wallet.id,
                    userId: userId,
                    amount: transferAmount,
                    type: 'DEBIT',
                    status: 'SUCCESS',
                    counterparty: bank.name,
                    bankId: bank.id,
                    description: `Transfer to ${bank.name} account ${userBankAccount.accountNo.slice(-4)}`
                }
            });
            
            return {
                wallet: updatedWallet,
                transaction: transaction
            };
        });
        
        // In a real application, you'd integrate with a payment gateway or banking API here
        // This is just a simulated delay to represent the external API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return res.status(200).json({ 
            message: 'Transfer successful', 
            transferResult: result.transaction,
            updatedBalance: result.wallet.balance
        });
        
    } catch (error) {
        console.error(error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}

export { getWalletBalance, getTransactionHistory, transactions, transfer };




