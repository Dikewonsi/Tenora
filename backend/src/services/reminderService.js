import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const reminderColumns = `
    reminders.id,
    reminders.lease_id,
    reminders.service_charge_demand_id,
    reminders.reminder_type,
    reminders.due_date,
    reminders.scheduled_send_date,
    reminders.sent_date,
    reminders.channel,
    reminders.status,
    reminders.acknowledged,
    reminders.acknowledged_at,
    reminders.message_content,
    reminders.created_at AS "createdAt",
    reminders.updated_at AS "updatedAt"
`;

const reminderReturningColumns = `
    id,
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
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;

const selectReminderQuery = `
    SELECT
        ${reminderColumns},
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

const getAllReminders = async (filters = {}) => {
    const {
        lease_id,
        service_charge_demand_id,
        reminder_type,
        status,
        due_before,
        due_after
    } = filters;
    const pagination = getPagination(filters);
    const whereClause = `
        WHERE ($1::uuid IS NULL OR reminders.lease_id = $1)
          AND ($2::uuid IS NULL OR reminders.service_charge_demand_id = $2)
          AND ($3::text IS NULL OR reminders.reminder_type = $3)
          AND ($4::text IS NULL OR reminders.status = $4)
          AND ($5::date IS NULL OR reminders.due_date <= $5)
          AND ($6::date IS NULL OR reminders.due_date >= $6)
    `;
    const params = [
        lease_id || null,
        service_charge_demand_id || null,
        reminder_type || null,
        status || null,
        due_before || null,
        due_after || null
    ];

    const result = await pool.query(
        `
            ${selectReminderQuery}
            ${whereClause}
            ORDER BY reminders.scheduled_send_date ASC, reminders.created_at DESC
            LIMIT $7 OFFSET $8
        `,
        [...params, pagination.limit, pagination.offset]
    );

    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM reminders
            ${whereClause}
        `,
        params
    );

    return {
        reminders: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
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
                RETURNING ${reminderReturningColumns}
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
                RETURNING ${reminderReturningColumns}
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
            RETURNING ${reminderReturningColumns}
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

const markReminderSent = async (id) => {
    const result = await pool.query(
        `
            UPDATE reminders
            SET
                status = 'sent',
                sent_date = COALESCE(sent_date, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING ${reminderReturningColumns}
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

const acknowledgeReminder = async (id) => {
    const result = await pool.query(
        `
            UPDATE reminders
            SET
                acknowledged = TRUE,
                acknowledged_at = COALESCE(acknowledged_at, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING ${reminderReturningColumns}
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

export default {
    getAllReminders,
    getReminderById,
    createReminder,
    updateReminder,
    deleteReminder,
    markReminderSent,
    acknowledgeReminder
};
