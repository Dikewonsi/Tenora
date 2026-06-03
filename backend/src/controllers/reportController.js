import reportService from '../services/reportService.js';

const getRentArrears = async (req, res, next) => {
    try {
        const arrears = await reportService.getRentArrears();

        res.status(200).json({
            success: true,
            message: 'Rent arrears report retrieved successfully',
            data: {
                count: arrears.length,
                arrears
            }
        });
    } catch (error) {
        next(error);
    }
}

const getServiceChargeBalances = async (req, res, next) => {
    try {
        const balances = await reportService.getServiceChargeBalances();

        res.status(200).json({
            success: true,
            message: 'Service charge balances report retrieved successfully',
            data: {
                count: balances.length,
                balances
            }
        });
    } catch (error) {
        next(error);
    }
}

const getExpiringLeases = async (req, res, next) => {
    try {
        const result = await reportService.getExpiringLeases(req.query);

        res.status(200).json({
            success: true,
            message: 'Expiring leases report retrieved successfully',
            data: {
                days: result.days,
                count: result.leases.length,
                leases: result.leases
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getRentArrears,
    getServiceChargeBalances,
    getExpiringLeases
};
