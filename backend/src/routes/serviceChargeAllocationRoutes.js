import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import serviceChargeAllocationController from '../controllers/serviceChargeAllocationController.js';

const serviceChargeAllocationRoutes = express.Router();

serviceChargeAllocationRoutes.use(authMiddleware);

serviceChargeAllocationRoutes.put('/:id', serviceChargeAllocationController.updateAllocation);
serviceChargeAllocationRoutes.patch('/:id', serviceChargeAllocationController.updateAllocation);

export default serviceChargeAllocationRoutes;
