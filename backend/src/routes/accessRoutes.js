import express from 'express';
import accessController from '../controllers/accessController.js';

const accessRoutes = express.Router();

accessRoutes.get('/status', accessController.status);

export default accessRoutes;
