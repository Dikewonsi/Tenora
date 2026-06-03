import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import reminderController from '../controllers/reminderController.js';

const reminderRoutes = express.Router();

reminderRoutes.use(authMiddleware);

reminderRoutes.get('/', reminderController.getReminders);
reminderRoutes.get('/:id', reminderController.getReminder);
reminderRoutes.post('/', reminderController.createReminder);
reminderRoutes.put('/:id', reminderController.updateReminder);
reminderRoutes.put('/:id/mark-sent', reminderController.markSent);
reminderRoutes.put('/:id/acknowledge', reminderController.acknowledge);
reminderRoutes.delete('/:id', reminderController.deleteReminder);

export default reminderRoutes;
