import serviceChargeDemandService from '../services/serviceChargeDemandService.js';
import { getPaginationMeta } from '../utils/pagination.js';

const getServiceChargeDemands = async (req, res, next) => {
    try {
        const result = await serviceChargeDemandService.getAllServiceChargeDemands(req.query);

        res.status(200).json({
            success: true,
            message: 'Service charge demands retrieved successfully',
            data: {
                count: result.demands.length,
                pagination: getPaginationMeta(result.total, result.pagination),
                demands: result.demands
            }
        });
    } catch (error) {
        next(error);
    }
}

const getServiceChargeDemand = async (req, res, next) => {
    try {
        const demand = await serviceChargeDemandService.getServiceChargeDemandById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Service charge demand retrieved successfully',
            data: {
                demand
            }
        });
    } catch (error) {
        next(error);
    }
}

const createServiceChargeDemand = async (req, res, next) => {
    try {
        const demand = await serviceChargeDemandService.createServiceChargeDemand(req.body);

        res.status(201).json({
            success: true,
            message: 'Service charge demand created successfully',
            data: {
                demand
            }
        });
    } catch (error) {
        next(error);
    }
}

const updateServiceChargeDemand = async (req, res, next) => {
    try {
        const demand = await serviceChargeDemandService.updateServiceChargeDemand(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Service charge demand updated successfully',
            data: {
                demand
            }
        });
    } catch (error) {
        next(error);
    }
}

const deleteServiceChargeDemand = async (req, res, next) => {
    try {
        const demand = await serviceChargeDemandService.deleteServiceChargeDemand(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Service charge demand deleted successfully',
            data: {
                demand
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getServiceChargeDemands,
    getServiceChargeDemand,
    createServiceChargeDemand,
    updateServiceChargeDemand,
    deleteServiceChargeDemand
};
