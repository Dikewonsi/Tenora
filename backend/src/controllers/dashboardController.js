import dashboardService from '../services/dashboardService.js';

const getSummary = async (req, res, next) => {
    try {
        const summary = await dashboardService.getSummary();

        res.status(200).json({
            success: true,
            message: 'Dashboard summary retrieved successfully',
            data: {
                summary
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getSummary
};
