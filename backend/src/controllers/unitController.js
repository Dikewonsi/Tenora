import unitService from '../services/unitService.js';
import { getPaginationMeta } from '../utils/pagination.js';

const getUnits = async (req, res, next) => {
    try {
        const result = await unitService.getAllUnits(req.query);

        res.status(200).json({
            success: true,
            message: 'Units retrieved successfully',
            data: {
                count: result.units.length,
                pagination: getPaginationMeta(result.total, result.pagination),
                units: result.units
            }
        });
    } catch (error) {
        next(error);
    }
};

const getUnit = async (req, res, next) => {
    try {
        const unit = await unitService.getUnitById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Unit retrieved successfully',
            data: { unit }
        });
    } catch (error) {
        next(error);
    }
};

const createUnit = async (req, res, next) => {
    try {
        const unit = await unitService.createUnit(req.body);

        res.status(201).json({
            success: true,
            message: 'Unit created successfully',
            data: { unit }
        });
    } catch (error) {
        next(error);
    }
};

const updateUnit = async (req, res, next) => {
    try {
        const unit = await unitService.updateUnit(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Unit updated successfully',
            data: { unit }
        });
    } catch (error) {
        next(error);
    }
};

const deleteUnit = async (req, res, next) => {
    try {
        const unit = await unitService.deleteUnit(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Unit deleted successfully',
            data: { unit }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getUnits,
    getUnit,
    createUnit,
    updateUnit,
    deleteUnit
};
