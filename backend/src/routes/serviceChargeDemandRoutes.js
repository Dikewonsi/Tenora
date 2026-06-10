import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import serviceChargeDemandController from '../controllers/serviceChargeDemandController.js';

const serviceChargeDemandRoutes = express.Router();

serviceChargeDemandRoutes.use(authMiddleware);

serviceChargeDemandRoutes.get('/', serviceChargeDemandController.getServiceChargeDemands);
serviceChargeDemandRoutes.get('/:id/document', serviceChargeDemandController.getServiceChargeDemandDocument);
serviceChargeDemandRoutes.get('/:id', serviceChargeDemandController.getServiceChargeDemand);

export default serviceChargeDemandRoutes;
