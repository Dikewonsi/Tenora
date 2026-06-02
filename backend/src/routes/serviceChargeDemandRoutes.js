import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import serviceChargeDemandController from '../controllers/serviceChargeDemandController.js';

const serviceChargeDemandRoutes = express.Router();

serviceChargeDemandRoutes.use(authMiddleware);

serviceChargeDemandRoutes.get('/', serviceChargeDemandController.getServiceChargeDemands);
serviceChargeDemandRoutes.get('/:id', serviceChargeDemandController.getServiceChargeDemand);
serviceChargeDemandRoutes.post('/', serviceChargeDemandController.createServiceChargeDemand);
serviceChargeDemandRoutes.put('/:id', serviceChargeDemandController.updateServiceChargeDemand);
serviceChargeDemandRoutes.delete('/:id', serviceChargeDemandController.deleteServiceChargeDemand);

export default serviceChargeDemandRoutes;
