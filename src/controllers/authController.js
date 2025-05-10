import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const signUp = async (req, res) => {
    const {phone, email, password } = req.body;
    
    if (!phone || !email || !password) {
        return res.status(400).json({ message: "Please provide all fields" });
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    const isValidEmail = (email) => {
        return emailRegex.test(email);
    };
    
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email" });
    }
    
    try {
        // Need to await here
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email,
            }
        });
        
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: {
                
                phone,
                email,
                password: hashedPassword,
                profile: {
                    create: {
                        firstName: "",
                        lastName: "",
                        address: "",
                        dateOfBirth: new Date(),
                    }
                },
                wallet: {
                    create: {
                        balance: 0,
                    }
                },
                transactions: {
                    create: {
                        amount: 0,
                        type: "initial",
                        description: "Initial deposit",
                    },
                bankAccount: {
                    create:{
                         
                         bankId,
                         accountNo,
                         
                    }

                }
            }
        }});
        
        // Don't return password in response
        const { password: _, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: "Please provide all fields" });
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    const isValidEmail = (email) => {
        return emailRegex.test(email);
    };
    
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email" });
    }
    
    try {
        // Need to await here
        const user = await prisma.user.findUnique({
            where: {
                email: email,
            }
        });
        
        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        // Logic was inverted - should return error if password is NOT valid
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Don't return password in response
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

export { login, signUp };