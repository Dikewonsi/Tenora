import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import reportController from '../controllers/reportController.js';

const reportRoutes = express.Router();

reportRoutes.use(authMiddleware);

reportRoutes.get('/rent-arrears', reportController.getRentArrears);
reportRoutes.get('/service-charge-balances', reportController.getServiceChargeBalances);
reportRoutes.get('/expiring-leases', reportController.getExpiringLeases);

export default reportRoutes;
