import tenantService from '../services/tenantService.js';
import { getPaginationMeta } from '../utils/pagination.js';

const getTenants = async (req, res, next) => {
    try {
        const result = await tenantService.getAllTenants(req.query);

        res.status(200).json({
            success: true,
            message: 'Tenants retrieved successfully',
            data: {
                count: result.tenants.length,
                pagination: getPaginationMeta(result.total, result.pagination),
                tenants: result.tenants
            }
        });
    } catch (error) {
        next(error);
    }
}

const getTenant = async (req, res, next) => {
    try {
        const tenant = await tenantService.getTenantById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Tenant retrieved successfully',
            data: {
                tenant
            }
        });
    } catch (error) {
        next(error);
    }
}

const createTenant = async (req, res, next) => {
    try {
        const tenant = await tenantService.createTenant(req.body);

        res.status(201).json({
            success: true,
            message: 'Tenant created successfully',
            data: {
                tenant
            }
        });
    } catch (error) {
        next(error);
    }
}

const updateTenant = async (req, res, next) => {
    try {
        const tenant = await tenantService.updateTenant(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Tenant updated successfully',
            data: {
                tenant
            }
        });
    } catch (error) {
        next(error);
    }
}

const deleteTenant = async (req, res, next) => {
    try {
        const tenant = await tenantService.deleteTenant(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Tenant deleted successfully',
            data: {
                tenant
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getTenants,
    getTenant,
    createTenant,
    updateTenant,
    deleteTenant
};
