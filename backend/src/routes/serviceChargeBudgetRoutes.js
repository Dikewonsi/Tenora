import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import serviceChargeBudgetController from '../controllers/serviceChargeBudgetController.js';

const serviceChargeBudgetRoutes = express.Router();

serviceChargeBudgetRoutes.use(authMiddleware);

serviceChargeBudgetRoutes.get('/', serviceChargeBudgetController.getBudgets);
serviceChargeBudgetRoutes.post('/', serviceChargeBudgetController.createBudget);
serviceChargeBudgetRoutes.post('/:id/calculate', serviceChargeBudgetController.calculateBudget);
serviceChargeBudgetRoutes.get('/:id/schedule', serviceChargeBudgetController.getSchedule);
serviceChargeBudgetRoutes.post('/:id/issue', serviceChargeBudgetController.issueBudget);
serviceChargeBudgetRoutes.get('/:id', serviceChargeBudgetController.getBudget);
serviceChargeBudgetRoutes.put('/:id', serviceChargeBudgetController.updateBudget);
serviceChargeBudgetRoutes.delete('/:id', serviceChargeBudgetController.deleteBudget);

export default serviceChargeBudgetRoutes;
