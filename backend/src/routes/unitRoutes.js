import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import unitController from '../controllers/unitController.js';

const unitRoutes = express.Router();

unitRoutes.use(authMiddleware);

unitRoutes.get('/', unitController.getUnits);
unitRoutes.get('/:id', unitController.getUnit);
unitRoutes.post('/', unitController.createUnit);
unitRoutes.put('/:id', unitController.updateUnit);
unitRoutes.delete('/:id', unitController.deleteUnit);

export default unitRoutes;
