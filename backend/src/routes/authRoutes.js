import express from 'express';
import accessExpiryMiddleware from '../middleware/accessExpiryMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

import authController from '../controllers/authController.js';

const authRoutes = express.Router();

authRoutes.post('/login', accessExpiryMiddleware, authController.login);
authRoutes.get('/me', authMiddleware, authController.me);

export default authRoutes;
