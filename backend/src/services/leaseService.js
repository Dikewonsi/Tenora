import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const leaseColumns = `
    leases.id,
    leases.property_id,
    leases.tenant_id,
    leases.unit_number,
    leases.unit_description,
    leases.start_date,
    leases.end_date,
    leases.rent_amount,
    leases.service_charge_amount,
    leases.payment_frequency,
    leases.status,
    leases.next_rent_due_date,
    leases.reminder_6_month_date,
    leases.reminder_3_month_date,
    leases.last_reviewed_date,
    leases.rent_review_note,
    leases.occupied_space,
    leases.created_at AS "createdAt",
    leases.updated_at AS "updatedAt"
`;

const selectLeaseQuery = `
    SELECT
        ${leaseColumns},
        properties.property_name,
        properties.property_code,
        tenants.full_name AS tenant_name
    FROM leases
    INNER JOIN properties ON properties.id = leases.property_id
    INNER JOIN tenants ON tenants.id = leases.tenant_id
`;

const getAllLeases = async (filters = {}) => {
    const { property_id, tenant_id, status } = filters;
    const pagination = getPagination(filters);

    const whereClause = `
        WHERE ($1::uuid IS NULL OR leases.property_id = $1)
          AND ($2::uuid IS NULL OR leases.tenant_id = $2)
          AND ($3::text IS NULL OR leases.status = $3)
    `;

    const params = [property_id || null, tenant_id || null, status || null];

    const result = await pool.query(
        `
            ${selectLeaseQuery}
            ${whereClause}
            ORDER BY leases.created_at DESC
            LIMIT $4 OFFSET $5
        `,
        [...params, pagination.limit, pagination.offset]
    );

    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM leases
            ${whereClause}
        `,
        params
    );

    return {
        leases: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
}

const getLeaseById = async (id) => {
    const result = await pool.query(
        `
            ${selectLeaseQuery}
            WHERE leases.id = $1
        `,
        [id]
    );

    const lease = result.rows[0];

    if(!lease) {
        const error = new Error('Lease not found');
        error.status = 404;
        throw error;
    }

    return lease;
}

const createLease = async (leaseData) => {
    const {
        property_id,
        tenant_id,
        unit_number,
        unit_description,
        start_date,
        end_date,
        rent_amount,
        service_charge_amount,
        payment_frequency,
        status,
        next_rent_due_date,
        reminder_6_month_date,
        reminder_3_month_date,
        last_reviewed_date,
        rent_review_note,
        occupied_space
    } = leaseData;

    if(!property_id || !tenant_id || !start_date || !end_date) {
        const error = new Error('Property, tenant, start date, and end date are required');
        error.status = 400;
        throw error;
    }

    try {
        const result = await pool.query(
            `
                INSERT INTO leases (
                    property_id,
                    tenant_id,
                    unit_number,
                    unit_description,
                    start_date,
                    end_date,
                    rent_amount,
                    service_charge_amount,
                    payment_frequency,
                    status,
                    next_rent_due_date,
                    reminder_6_month_date,
                    reminder_3_month_date,
                    last_reviewed_date,
                    rent_review_note,
                    occupied_space
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING
                    id,
                    property_id,
                    tenant_id,
                    unit_number,
                    unit_description,
                    start_date,
                    end_date,
                    rent_amount,
                    service_charge_amount,
                    payment_frequency,
                    status,
                    next_rent_due_date,
                    reminder_6_month_date,
                    reminder_3_month_date,
                    last_reviewed_date,
                    rent_review_note,
                    occupied_space,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
            `,
            [
                property_id,
                tenant_id,
                unit_number,
                unit_description,
                start_date,
                end_date,
                rent_amount,
                service_charge_amount,
                payment_frequency,
                status,
                next_rent_due_date,
                reminder_6_month_date,
                reminder_3_month_date,
                last_reviewed_date,
                rent_review_note,
                occupied_space
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Property or tenant does not exist';
            error.status = 400;
        }

        throw error;
    }
}

const updateLease = async (id, leaseData) => {
    const existingLease = await getLeaseById(id);

    const {
        property_id = existingLease.property_id,
        tenant_id = existingLease.tenant_id,
        unit_number = existingLease.unit_number,
        unit_description = existingLease.unit_description,
        start_date = existingLease.start_date,
        end_date = existingLease.end_date,
        rent_amount = existingLease.rent_amount,
        service_charge_amount = existingLease.service_charge_amount,
        payment_frequency = existingLease.payment_frequency,
        status = existingLease.status,
        next_rent_due_date = existingLease.next_rent_due_date,
        reminder_6_month_date = existingLease.reminder_6_month_date,
        reminder_3_month_date = existingLease.reminder_3_month_date,
        last_reviewed_date = existingLease.last_reviewed_date,
        rent_review_note = existingLease.rent_review_note,
        occupied_space = existingLease.occupied_space
    } = leaseData;

    try {
        const result = await pool.query(
            `
                UPDATE leases
                SET
                    property_id = $1,
                    tenant_id = $2,
                    unit_number = $3,
                    unit_description = $4,
                    start_date = $5,
                    end_date = $6,
                    rent_amount = $7,
                    service_charge_amount = $8,
                    payment_frequency = $9,
                    status = $10,
                    next_rent_due_date = $11,
                    reminder_6_month_date = $12,
                    reminder_3_month_date = $13,
                    last_reviewed_date = $14,
                    rent_review_note = $15,
                    occupied_space = $16,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $17
                RETURNING
                    id,
                    property_id,
                    tenant_id,
                    unit_number,
                    unit_description,
                    start_date,
                    end_date,
                    rent_amount,
                    service_charge_amount,
                    payment_frequency,
                    status,
                    next_rent_due_date,
                    reminder_6_month_date,
                    reminder_3_month_date,
                    last_reviewed_date,
                    rent_review_note,
                    occupied_space,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
            `,
            [
                property_id,
                tenant_id,
                unit_number,
                unit_description,
                start_date,
                end_date,
                rent_amount,
                service_charge_amount,
                payment_frequency,
                status,
                next_rent_due_date,
                reminder_6_month_date,
                reminder_3_month_date,
                last_reviewed_date,
                rent_review_note,
                occupied_space,
                id
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Property or tenant does not exist';
            error.status = 400;
        }

        throw error;
    }
}

const deleteLease = async (id) => {
    let result;

    try {
        result = await pool.query(
            `
                DELETE FROM leases
                WHERE id = $1
                RETURNING
                    id,
                    property_id,
                    tenant_id,
                    unit_number,
                    unit_description,
                    start_date,
                    end_date,
                    rent_amount,
                    service_charge_amount,
                    payment_frequency,
                    status,
                    next_rent_due_date,
                    reminder_6_month_date,
                    reminder_3_month_date,
                    last_reviewed_date,
                    rent_review_note,
                    occupied_space,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
            `,
            [id]
        );
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Lease cannot be deleted because it has related payments, service charge demands, or reminders';
            error.status = 400;
        }

        throw error;
    }

    const deletedLease = result.rows[0];

    if(!deletedLease) {
        const error = new Error('Lease not found');
        error.status = 404;
        throw error;
    }

    return deletedLease;
}

export default {
    getAllLeases,
    getLeaseById,
    createLease,
    updateLease,
    deleteLease
};
