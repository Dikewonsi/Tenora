import pool from '../db/pool.js';

const selectDemandQuery = `
    SELECT
        service_charge_demands.*,
        properties.property_name,
        properties.property_code,
        leases.unit_number,
        tenants.full_name AS tenant_name
    FROM service_charge_demands
    INNER JOIN properties ON properties.id = service_charge_demands.property_id
    INNER JOIN leases ON leases.id = service_charge_demands.lease_id
    INNER JOIN tenants ON tenants.id = leases.tenant_id
`;

const ensureLeaseBelongsToProperty = async (leaseId, propertyId) => {
    const result = await pool.query(
        `
            SELECT id
            FROM leases
            WHERE id = $1
              AND property_id = $2
        `,
        [leaseId, propertyId]
    );

    if(!result.rows[0]) {
        const error = new Error('Lease does not belong to the selected property');
        error.status = 400;
        throw error;
    }
}

const getAllServiceChargeDemands = async () => {
    const result = await pool.query(`
        ${selectDemandQuery}
        ORDER BY service_charge_demands.created_at DESC
    `);

    return result.rows;
}

const getServiceChargeDemandById = async (id) => {
    const result = await pool.query(
        `
            ${selectDemandQuery}
            WHERE service_charge_demands.id = $1
        `,
        [id]
    );

    const demand = result.rows[0];

    if(!demand) {
        const error = new Error('Service charge demand not found');
        error.status = 404;
        throw error;
    }

    return demand;
}

const createServiceChargeDemand = async (demandData) => {
    const {
        property_id,
        lease_id,
        period_start,
        period_end,
        total_amount,
        amount_paid,
        due_date,
        status
    } = demandData;

    if(!property_id || !lease_id || !period_start || !period_end) {
        const error = new Error('Property, lease, period start, and period end are required');
        error.status = 400;
        throw error;
    }

    await ensureLeaseBelongsToProperty(lease_id, property_id);

    const demandTotal = Number(total_amount || 0);
    const paidAmount = Number(amount_paid || 0);
    const balance = demandTotal - paidAmount;

    try {
        const result = await pool.query(
            `
                INSERT INTO service_charge_demands (
                    property_id,
                    lease_id,
                    period_start,
                    period_end,
                    total_amount,
                    amount_paid,
                    balance,
                    due_date,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `,
            [
                property_id,
                lease_id,
                period_start,
                period_end,
                demandTotal,
                paidAmount,
                balance,
                due_date,
                status
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Property or lease does not exist';
            error.status = 400;
        }

        throw error;
    }
}

const updateServiceChargeDemand = async (id, demandData) => {
    const existingDemand = await getServiceChargeDemandById(id);

    const {
        property_id = existingDemand.property_id,
        lease_id = existingDemand.lease_id,
        period_start = existingDemand.period_start,
        period_end = existingDemand.period_end,
        total_amount = existingDemand.total_amount,
        amount_paid = existingDemand.amount_paid,
        due_date = existingDemand.due_date,
        status = existingDemand.status
    } = demandData;

    await ensureLeaseBelongsToProperty(lease_id, property_id);

    const demandTotal = Number(total_amount || 0);
    const paidAmount = Number(amount_paid || 0);
    const balance = demandTotal - paidAmount;

    try {
        const result = await pool.query(
            `
                UPDATE service_charge_demands
                SET
                    property_id = $1,
                    lease_id = $2,
                    period_start = $3,
                    period_end = $4,
                    total_amount = $5,
                    amount_paid = $6,
                    balance = $7,
                    due_date = $8,
                    status = $9,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $10
                RETURNING *
            `,
            [
                property_id,
                lease_id,
                period_start,
                period_end,
                demandTotal,
                paidAmount,
                balance,
                due_date,
                status,
                id
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Property or lease does not exist';
            error.status = 400;
        }

        throw error;
    }
}

const deleteServiceChargeDemand = async (id) => {
    let result;

    try {
        result = await pool.query(
            `
                DELETE FROM service_charge_demands
                WHERE id = $1
                RETURNING *
            `,
            [id]
        );
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Service charge demand cannot be deleted because it has related items, payments, or reminders';
            error.status = 400;
        }

        throw error;
    }

    const deletedDemand = result.rows[0];

    if(!deletedDemand) {
        const error = new Error('Service charge demand not found');
        error.status = 404;
        throw error;
    }

    return deletedDemand;
}

export default {
    getAllServiceChargeDemands,
    getServiceChargeDemandById,
    createServiceChargeDemand,
    updateServiceChargeDemand,
    deleteServiceChargeDemand
};
