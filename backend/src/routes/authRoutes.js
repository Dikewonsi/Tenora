import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';

import authController from '../controllers/authController.js';

const authRoutes = express.Router();

authRoutes.post('/login', authController.login);
authRoutes.get('/me', authMiddleware, authController.me);

export default authRoutes;
