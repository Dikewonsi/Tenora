import pool from '../db/pool.js';

const selectReminderQuery = `
    SELECT
        reminders.*,
        leases.unit_number,
        properties.property_name,
        tenants.full_name AS tenant_name,
        service_charge_demands.period_start AS demand_period_start,
        service_charge_demands.period_end AS demand_period_end
    FROM reminders
    LEFT JOIN leases ON leases.id = reminders.lease_id
    LEFT JOIN properties ON properties.id = leases.property_id
    LEFT JOIN tenants ON tenants.id = leases.tenant_id
    LEFT JOIN service_charge_demands
        ON service_charge_demands.id = reminders.service_charge_demand_id
`;

const ensureReminderLinksAreValid = async (leaseId, demandId) => {
    if(!leaseId && !demandId) {
        const error = new Error('Reminder must be linked to a lease or service charge demand');
        error.status = 400;
        throw error;
    }

    if(!leaseId || !demandId) {
        return;
    }

    const result = await pool.query(
        `
            SELECT id
            FROM service_charge_demands
            WHERE id = $1
              AND lease_id = $2
        `,
        [demandId, leaseId]
    );

    if(!result.rows[0]) {
        const error = new Error('Service charge demand does not belong to the selected lease');
        error.status = 400;
        throw error;
    }
}

const getAllReminders = async () => {
    const result = await pool.query(`
        ${selectReminderQuery}
        ORDER BY reminders.scheduled_send_date ASC, reminders.created_at DESC
    `);

    return result.rows;
}

const getReminderById = async (id) => {
    const result = await pool.query(
        `
            ${selectReminderQuery}
            WHERE reminders.id = $1
        `,
        [id]
    );

    const reminder = result.rows[0];

    if(!reminder) {
        const error = new Error('Reminder not found');
        error.status = 404;
        throw error;
    }

    return reminder;
}

const createReminder = async (reminderData) => {
    const {
        lease_id,
        service_charge_demand_id,
        reminder_type,
        due_date,
        scheduled_send_date,
        sent_date,
        channel,
        status,
        acknowledged,
        acknowledged_at,
        message_content
    } = reminderData;

    if(!reminder_type) {
        const error = new Error('Reminder type is required');
        error.status = 400;
        throw error;
    }

    await ensureReminderLinksAreValid(lease_id, service_charge_demand_id);

    try {
        const result = await pool.query(
            `
                INSERT INTO reminders (
                    lease_id,
                    service_charge_demand_id,
                    reminder_type,
                    due_date,
                    scheduled_send_date,
                    sent_date,
                    channel,
                    status,
                    acknowledged,
                    acknowledged_at,
                    message_content
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, FALSE), $10, $11)
                RETURNING *
            `,
            [
                lease_id,
                service_charge_demand_id,
                reminder_type,
                due_date,
                scheduled_send_date,
                sent_date,
                channel,
                status,
                acknowledged,
                acknowledged_at,
                message_content
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Lease or service charge demand does not exist';
            error.status = 400;
        }

        throw error;
    }
}

const updateReminder = async (id, reminderData) => {
    const existingReminder = await getReminderById(id);

    const {
        lease_id = existingReminder.lease_id,
        service_charge_demand_id = existingReminder.service_charge_demand_id,
        reminder_type = existingReminder.reminder_type,
        due_date = existingReminder.due_date,
        scheduled_send_date = existingReminder.scheduled_send_date,
        sent_date = existingReminder.sent_date,
        channel = existingReminder.channel,
        status = existingReminder.status,
        acknowledged = existingReminder.acknowledged,
        acknowledged_at = existingReminder.acknowledged_at,
        message_content = existingReminder.message_content
    } = reminderData;

    await ensureReminderLinksAreValid(lease_id, service_charge_demand_id);

    try {
        const result = await pool.query(
            `
                UPDATE reminders
                SET
                    lease_id = $1,
                    service_charge_demand_id = $2,
                    reminder_type = $3,
                    due_date = $4,
                    scheduled_send_date = $5,
                    sent_date = $6,
                    channel = $7,
                    status = $8,
                    acknowledged = $9,
                    acknowledged_at = $10,
                    message_content = $11,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $12
                RETURNING *
            `,
            [
                lease_id,
                service_charge_demand_id,
                reminder_type,
                due_date,
                scheduled_send_date,
                sent_date,
                channel,
                status,
                acknowledged,
                acknowledged_at,
                message_content,
                id
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Lease or service charge demand does not exist';
            error.status = 400;
        }

        throw error;
    }
}

const deleteReminder = async (id) => {
    const result = await pool.query(
        `
            DELETE FROM reminders
            WHERE id = $1
            RETURNING *
        `,
        [id]
    );

    const deletedReminder = result.rows[0];

    if(!deletedReminder) {
        const error = new Error('Reminder not found');
        error.status = 404;
        throw error;
    }

    return deletedReminder;
}

export default {
    getAllReminders,
    getReminderById,
    createReminder,
    updateReminder,
    deleteReminder
};
