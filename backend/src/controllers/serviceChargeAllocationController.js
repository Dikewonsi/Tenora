import serviceChargeBudgetService from '../services/serviceChargeBudgetService.js';

const updateAllocation = async (req, res, next) => {
    try {
        const result = await serviceChargeBudgetService.updateAllocation(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: 'Service charge allocation updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export default {
    updateAllocation
};
