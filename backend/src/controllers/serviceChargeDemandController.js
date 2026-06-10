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
};

const getServiceChargeDemand = async (req, res, next) => {
    try {
        const demand = await serviceChargeDemandService.getServiceChargeDemandById(req.params.id);
        res.status(200).json({ success: true, data: { demand } });
    } catch (error) {
        next(error);
    }
};

const getServiceChargeDemandDocument = async (req, res, next) => {
    try {
        const document = await serviceChargeDemandService.getServiceChargeDemandDocument(req.params.id);
        res.status(200).json({ success: true, data: { document } });
    } catch (error) {
        next(error);
    }
};

export default {
    getServiceChargeDemands,
    getServiceChargeDemand,
    getServiceChargeDemandDocument
};
