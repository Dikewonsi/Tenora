import {
    getAllProperties as getAllPropertiesService,
    createProperty as createPropertyService,
} from '../services/propertyService.js';

async function getAllProperties(req, res) {
    try {
        const properties = await getAllPropertiesService();
        res.json(properties);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Failed to fetch properties',
            error: error.message
        });    
    }
}

async function createProperty(req, res) {
    try {
        const property = await createPropertyService(req.body);
        res.status(201).json(property);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Failed to create property',
            error: error.message
        });    
    }
}

export {
    getAllProperties,
    createProperty,
};