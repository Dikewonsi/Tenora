import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import tenantController from '../controllers/tenantController.js';

const tenantRoutes = express.Router();

tenantRoutes.use(authMiddleware);

tenantRoutes.get('/', tenantController.getTenants);
tenantRoutes.get('/:id', tenantController.getTenant);
tenantRoutes.post('/', tenantController.createTenant);
tenantRoutes.put('/:id', tenantController.updateTenant);
tenantRoutes.delete('/:id', tenantController.deleteTenant);

export default tenantRoutes;