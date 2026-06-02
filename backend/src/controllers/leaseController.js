import leaseService from '../services/leaseService.js';

const getLeases = async (req, res, next) => {
    try {
        const leases = await leaseService.getAllLeases();

        res.status(200).json({
            success: true,
            message: 'Leases retrieved successfully',
            data: {
                count: leases.length,
                leases
            }
        });
    } catch (error) {
        next(error);
    }
}

const getLease = async (req, res, next) => {
    try {
        const lease = await leaseService.getLeaseById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Lease retrieved successfully',
            data: {
                lease
            }
        });
    } catch (error) {
        next(error);
    }
}

const createLease = async (req, res, next) => {
    try {
        const lease = await leaseService.createLease(req.body);

        res.status(201).json({
            success: true,
            message: 'Lease created successfully',
            data: {
                lease
            }
        });
    } catch (error) {
        next(error);
    }
}

const updateLease = async (req, res, next) => {
    try {
        const lease = await leaseService.updateLease(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Lease updated successfully',
            data: {
                lease
            }
        });
    } catch (error) {
        next(error);
    }
}

const deleteLease = async (req, res, next) => {
    try {
        const lease = await leaseService.deleteLease(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Lease deleted successfully',
            data: {
                lease
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getLeases,
    getLease,
    createLease,
    updateLease,
    deleteLease
};
