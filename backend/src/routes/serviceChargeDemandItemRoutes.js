import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import serviceChargeDemandItemController from '../controllers/serviceChargeDemandItemController.js';

const serviceChargeDemandItemRoutes = express.Router();

serviceChargeDemandItemRoutes.use(authMiddleware);

serviceChargeDemandItemRoutes.get('/', serviceChargeDemandItemController.getServiceChargeDemandItems);
serviceChargeDemandItemRoutes.get('/:id', serviceChargeDemandItemController.getServiceChargeDemandItem);
serviceChargeDemandItemRoutes.post('/', serviceChargeDemandItemController.createServiceChargeDemandItem);
serviceChargeDemandItemRoutes.put('/:id', serviceChargeDemandItemController.updateServiceChargeDemandItem);
serviceChargeDemandItemRoutes.delete('/:id', serviceChargeDemandItemController.deleteServiceChargeDemandItem);

export default serviceChargeDemandItemRoutes;
