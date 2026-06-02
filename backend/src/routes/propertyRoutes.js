import express from 'express';

import {
    getAllProperties,
    createProperty,
} from '../controllers/propertyController.js';

const router = express.Router();

router.get('/', getAllProperties);
router.post('/', createProperty);

export default router;