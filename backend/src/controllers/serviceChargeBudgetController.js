import serviceChargeBudgetService from '../services/serviceChargeBudgetService.js';
import { getPaginationMeta } from '../utils/pagination.js';

const getBudgets = async (req, res, next) => {
    try {
        const result = await serviceChargeBudgetService.getAllBudgets(req.query);

        res.status(200).json({
            success: true,
            message: 'Service charge budgets retrieved successfully',
            data: {
                count: result.budgets.length,
                pagination: getPaginationMeta(result.total, result.pagination),
                budgets: result.budgets
            }
        });
    } catch (error) {
        next(error);
    }
};

const getBudget = async (req, res, next) => {
    try {
        const budget = await serviceChargeBudgetService.getBudgetById(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Service charge budget retrieved successfully',
            data: { budget }
        });
    } catch (error) {
        next(error);
    }
};

const createBudget = async (req, res, next) => {
    try {
        const budget = await serviceChargeBudgetService.createBudget(req.body);
        res.status(201).json({
            success: true,
            message: 'Service charge budget created successfully',
            data: { budget }
        });
    } catch (error) {
        next(error);
    }
};

const updateBudget = async (req, res, next) => {
    try {
        const budget = await serviceChargeBudgetService.updateBudget(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: 'Service charge budget updated successfully',
            data: { budget }
        });
    } catch (error) {
        next(error);
    }
};

const deleteBudget = async (req, res, next) => {
    try {
        const budget = await serviceChargeBudgetService.deleteBudget(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Service charge budget deleted successfully',
            data: { budget }
        });
    } catch (error) {
        next(error);
    }
};

const calculateBudget = async (req, res, next) => {
    try {
        const schedule = await serviceChargeBudgetService.calculateBudget(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Service charge schedule calculated successfully',
            data: { schedule }
        });
    } catch (error) {
        next(error);
    }
};

const getSchedule = async (req, res, next) => {
    try {
        const schedule = await serviceChargeBudgetService.getBudgetSchedule(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Service charge schedule retrieved successfully',
            data: { schedule }
        });
    } catch (error) {
        next(error);
    }
};

const issueBudget = async (req, res, next) => {
    try {
        const schedule = await serviceChargeBudgetService.issueBudget(req.params.id, req.user.id);
        res.status(200).json({
            success: true,
            message: 'Service charge demands issued successfully',
            data: { schedule }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getBudgets,
    getBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    calculateBudget,
    getSchedule,
    issueBudget
};
