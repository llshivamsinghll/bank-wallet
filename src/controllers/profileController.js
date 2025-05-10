import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const getProfile = async (req, res) => {
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
        
        // Fetch user profile from the database
        // Note: According to schema, we need to look up profile by userId, not id
        const profileData = await prisma.profile.findUnique({
            where: { userId: userId },
            include: {
                user: {
                    select: {
                        email: true,
                        phone: true,
                        createdAt: true,
                        updatedAt: true,
                    }
                }
            }
        });
        
        if (!profileData) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        
        // Return the profile data
        return res.status(200).json(profileData);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const updateProfile = async (req, res) => {
    const userId = req.user.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { firstName, lastName, address, dateOfBirth } = req.body;
    if (!firstName || !lastName || !address || !dateOfBirth) {
        return res.status(400).json({ message: 'Please provide all fields' });
    }
    
    try {
        // Parse dateOfBirth as a proper Date object
        const parsedDateOfBirth = new Date(dateOfBirth);
        
        // Update profile, not user
        const updatedProfile = await prisma.profile.upsert({
            where: { 
                userId: userId 
            },
            update: {
                firstName,
                lastName,
                address,
                dateOfBirth: parsedDateOfBirth,
            },
            create: {
                userId: userId,
                firstName,
                lastName,
                address,
                dateOfBirth: parsedDateOfBirth,
            }
        });
        
        return res.status(200).json(updatedProfile);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export { getProfile, updateProfile };