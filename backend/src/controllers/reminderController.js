import reminderService from '../services/reminderService.js';
import { getPaginationMeta } from '../utils/pagination.js';

const getReminders = async (req, res, next) => {
    try {
        const result = await reminderService.getAllReminders(req.query);

        res.status(200).json({
            success: true,
            message: 'Reminders retrieved successfully',
            data: {
                count: result.reminders.length,
                pagination: getPaginationMeta(result.total, result.pagination),
                reminders: result.reminders
            }
        });
    } catch (error) {
        next(error);
    }
}

const getReminder = async (req, res, next) => {
    try {
        const reminder = await reminderService.getReminderById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Reminder retrieved successfully',
            data: {
                reminder
            }
        });
    } catch (error) {
        next(error);
    }
}

const createReminder = async (req, res, next) => {
    try {
        const reminder = await reminderService.createReminder(req.body);

        res.status(201).json({
            success: true,
            message: 'Reminder created successfully',
            data: {
                reminder
            }
        });
    } catch (error) {
        next(error);
    }
}

const updateReminder = async (req, res, next) => {
    try {
        const reminder = await reminderService.updateReminder(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Reminder updated successfully',
            data: {
                reminder
            }
        });
    } catch (error) {
        next(error);
    }
}

const deleteReminder = async (req, res, next) => {
    try {
        const reminder = await reminderService.deleteReminder(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Reminder deleted successfully',
            data: {
                reminder
            }
        });
    } catch (error) {
        next(error);
    }
}

const markSent = async (req, res, next) => {
    try {
        const reminder = await reminderService.markReminderSent(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Reminder marked as sent successfully',
            data: {
                reminder
            }
        });
    } catch (error) {
        next(error);
    }
}

const acknowledge = async (req, res, next) => {
    try {
        const reminder = await reminderService.acknowledgeReminder(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Reminder acknowledged successfully',
            data: {
                reminder
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getReminders,
    getReminder,
    createReminder,
    updateReminder,
    deleteReminder,
    markSent,
    acknowledge
};
