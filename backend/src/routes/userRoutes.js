import express from 'express';

import userController from '../controllers/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const userRoutes = express.Router();

userRoutes.use(authMiddleware);
userRoutes.use(requireRole('super_admin'));

userRoutes.get('/', userController.getUsers);
userRoutes.get('/:id', userController.getUser);
userRoutes.post('/', userController.createUser);
userRoutes.put('/:id', userController.updateUser);
userRoutes.patch('/:id/status', userController.updateStatus);
userRoutes.patch('/:id/password', userController.resetPassword);

export default userRoutes;
