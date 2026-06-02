import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import paymentController from '../controllers/paymentController.js';

const paymentRoutes = express.Router();

paymentRoutes.use(authMiddleware);

paymentRoutes.get('/', paymentController.getPayments);
paymentRoutes.get('/:id', paymentController.getPayment);
paymentRoutes.post('/', paymentController.createPayment);
paymentRoutes.put('/:id', paymentController.updatePayment);
paymentRoutes.delete('/:id', paymentController.deletePayment);

export default paymentRoutes;
