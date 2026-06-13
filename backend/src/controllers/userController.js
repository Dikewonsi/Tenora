import userService from '../services/userService.js';
import { getPaginationMeta } from '../utils/pagination.js';

const getUsers = async (req, res, next) => {
    try {
        const result = await userService.getAllUsers(req.query);

        res.status(200).json({
            success: true,
            message: 'Users retrieved successfully',
            data: {
                count: result.users.length,
                pagination: getPaginationMeta(result.total, result.pagination),
                summary: result.summary,
                users: result.users
            }
        });
    } catch (error) {
        next(error);
    }
};

const getUser = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'User retrieved successfully',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

const createUser = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const user = await userService.updateUser(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const isActive = req.body.is_active ?? req.body.isActive;
        const user = await userService.setUserStatus(req.params.id, isActive);

        res.status(200).json({
            success: true,
            message: isActive ? 'User enabled successfully' : 'User disabled successfully',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const user = await userService.resetUserPassword(req.params.id, req.body.password);

        res.status(200).json({
            success: true,
            message: 'User password reset successfully',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getUsers,
    getUser,
    createUser,
    updateUser,
    updateStatus,
    resetPassword
};
