import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './utils/errorHandler.js';
import auth from './routes/auth.js';
import profile from './routes/profile.js';
import wallet from './routes/wallet.js';


dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', auth);
app.use('/profile',profile);
app.use('/wallet',wallet);


// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});