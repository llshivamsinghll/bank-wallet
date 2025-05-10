import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const verifyToken = (req, res, next) => {
    // Get authorization header
    const authHeader = req.headers['authorization'];
    
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized - No token provided or invalid format" });
    }
    
    // Extract the token without the 'Bearer ' prefix
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: "Unauthorized - Token is required" });
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Set the decoded user data on the request object
        req.user = decoded;
        
        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        // Handle different JWT errors specifically
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Unauthorized - Token expired" });
        }
        
        return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
};

export { verifyToken };