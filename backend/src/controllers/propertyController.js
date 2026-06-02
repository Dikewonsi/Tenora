import propertyService from '../services/propertyService.js';

const getProperties = async (req, res, next) => {
    try {
        const properties = await propertyService.getAllProperties();

        res.status(200).json({
            success: true,
            message: 'Properties retrieved successfully',
            data: {
                count: properties.length,
                properties
            }
        });
    } catch (error) {
        next(error);  
    }
}

const getProperty = async (req, res, next) => {
    try {
        const property = await propertyService.getPropertyById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Property retrieved successfully',
            data: {
                property
            }
        });
    } catch (error) {
        next(error)
    }
}

const createProperty = async (req, res, next) => {
    try {
        const property = await propertyService.createProperty(req.body);
        res.status(201).json({
            success: true,
            message: 'Property created successfully',
            data: {
                property
            }
        });
    } catch (error) {
        next(error);
    }
}

const updateProperty = async (req, res, next) => {
    try {
        const property = await propertyService.updateProperty(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Property updated successfully',
            data: {
                property
            }
        });
    } catch (error) {
        next(error);
    }
}

const deleteProperty = async (req, res, next) => {
    try {
        const property = await propertyService.deleteProperty(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Property deleted successfully',
            data: {
                property
            }
        })
    } catch (error) {
        next(error)
    }
}

export default {
    getProperties,
    getProperty,
    createProperty,
    updateProperty,
    deleteProperty
};
