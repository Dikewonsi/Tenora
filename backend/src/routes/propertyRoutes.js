import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import propertyController from '../controllers/propertyController.js';

const propertyRoutes = express.Router();

propertyRoutes.use(authMiddleware);

propertyRoutes.get('/', propertyController.getProperties);
propertyRoutes.get('/:id', propertyController.getProperty);
propertyRoutes.post('/', propertyController.createProperty);
propertyRoutes.put('/:id', propertyController.updateProperty);
propertyRoutes.delete('/:id', propertyController.deleteProperty);

export default propertyRoutes;