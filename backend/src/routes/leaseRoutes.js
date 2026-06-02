import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import leaseController from '../controllers/leaseController.js';

const leaseRoutes = express.Router();

leaseRoutes.use(authMiddleware);

leaseRoutes.get('/', leaseController.getLeases);
leaseRoutes.get('/:id', leaseController.getLease);
leaseRoutes.post('/', leaseController.createLease);
leaseRoutes.put('/:id', leaseController.updateLease);
leaseRoutes.delete('/:id', leaseController.deleteLease);

export default leaseRoutes;
