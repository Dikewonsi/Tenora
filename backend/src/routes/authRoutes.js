import express from 'express';

import authController from '../controllers/authController.js';

const authRoutes = express.Router();

authRoutes.post('/login', authController.login);

export default authRoutes;