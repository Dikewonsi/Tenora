import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import dashboardController from '../controllers/dashboardController.js';

const dashboardRoutes = express.Router();

dashboardRoutes.use(authMiddleware);

dashboardRoutes.get('/summary', dashboardController.getSummary);

export default dashboardRoutes;
