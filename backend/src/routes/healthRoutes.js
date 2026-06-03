import express from 'express';
import healthController from '../controllers/healthController.js';

const healthRoutes = express.Router();

healthRoutes.get('/', healthController.getHealth);

export default healthRoutes;
