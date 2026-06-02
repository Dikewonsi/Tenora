import reminderService from '../services/reminderService.js';

const getReminders = async (req, res, next) => {
    try {
        const reminders = await reminderService.getAllReminders();

        res.status(200).json({
            success: true,
            message: 'Reminders retrieved successfully',
            data: {
                count: reminders.length,
                reminders
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

export default {
    getReminders,
    getReminder,
    createReminder,
    updateReminder,
    deleteReminder
};
