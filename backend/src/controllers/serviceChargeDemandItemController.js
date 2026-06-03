import serviceChargeDemandItemService from '../services/serviceChargeDemandItemService.js';
import { getPaginationMeta } from '../utils/pagination.js';

const getServiceChargeDemandItems = async (req, res, next) => {
    try {
        const result = await serviceChargeDemandItemService.getAllServiceChargeDemandItems(req.query);

        res.status(200).json({
            success: true,
            message: 'Service charge demand items retrieved successfully',
            data: {
                count: result.items.length,
                pagination: getPaginationMeta(result.total, result.pagination),
                items: result.items
            }
        });
    } catch (error) {
        next(error);
    }
}

const getServiceChargeDemandItem = async (req, res, next) => {
    try {
        const item = await serviceChargeDemandItemService.getServiceChargeDemandItemById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Service charge demand item retrieved successfully',
            data: {
                item
            }
        });
    } catch (error) {
        next(error);
    }
}

const createServiceChargeDemandItem = async (req, res, next) => {
    try {
        const item = await serviceChargeDemandItemService.createServiceChargeDemandItem(req.body);

        res.status(201).json({
            success: true,
            message: 'Service charge demand item created successfully',
            data: {
                item
            }
        });
    } catch (error) {
        next(error);
    }
}

const updateServiceChargeDemandItem = async (req, res, next) => {
    try {
        const item = await serviceChargeDemandItemService.updateServiceChargeDemandItem(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Service charge demand item updated successfully',
            data: {
                item
            }
        });
    } catch (error) {
        next(error);
    }
}

const deleteServiceChargeDemandItem = async (req, res, next) => {
    try {
        const item = await serviceChargeDemandItemService.deleteServiceChargeDemandItem(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Service charge demand item deleted successfully',
            data: {
                item
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getServiceChargeDemandItems,
    getServiceChargeDemandItem,
    createServiceChargeDemandItem,
    updateServiceChargeDemandItem,
    deleteServiceChargeDemandItem
};
