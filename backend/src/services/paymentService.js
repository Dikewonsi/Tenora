import pool from '../db/pool.js';
import { recalculateServiceChargeDemandFinancials } from './serviceChargeDemandService.js';
import { getPagination } from '../utils/pagination.js';

const paymentColumns = `
    payments.id,
    payments.lease_id,
    payments.service_charge_demand_id,
    payments.payment_category,
    payments.amount_paid,
    payments.payment_date,
    payments.payment_for_period_start,
    payments.payment_for_period_end,
    payments.payment_method,
    payments.receipt_number,
    payments.status,
    payments.notes,
    payments.created_at AS "createdAt",
    payments.updated_at AS "updatedAt"
`;

const paymentReturningColumns = `
    id,
    lease_id,
    service_charge_demand_id,
    payment_category,
    amount_paid,
    payment_date,
    payment_for_period_start,
    payment_for_period_end,
    payment_method,
    receipt_number,
    status,
    notes,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;

const selectPaymentQuery = `
    SELECT
        ${paymentColumns},
        leases.unit_number,
        properties.property_name,
        tenants.full_name AS tenant_name
    FROM payments
    INNER JOIN leases ON leases.id = payments.lease_id
    INNER JOIN properties ON properties.id = leases.property_id
    INNER JOIN tenants ON tenants.id = leases.tenant_id
`;

const ensureDemandBelongsToLease = async (demandId, leaseId) => {
    if(!demandId) {
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

const validatePaymentData = ({ service_charge_demand_id, payment_category, amount_paid }) => {
    const amountPaid = Number(amount_paid);

    if(Number.isNaN(amountPaid) || amountPaid <= 0) {
        const error = new Error('Payment amount must be greater than zero');
        error.status = 400;
        throw error;
    }

    if(service_charge_demand_id && payment_category !== 'service_charge') {
        const error = new Error('Payments linked to a service charge demand must use the service_charge category');
        error.status = 400;
        throw error;
    }
}

const validateServiceChargePaymentLimit = async ({
    demandId,
    amountPaid,
    status,
    excludePaymentId = null,
    client = pool
}) => {
    if(!demandId || status !== 'paid') {
        return;
    }

    const demandResult = await client.query(
        `
            SELECT total_amount
            FROM service_charge_demands
            WHERE id = $1
            FOR UPDATE
        `,
        [demandId]
    );
    const demand = demandResult.rows[0];

    if(!demand) {
        const error = new Error('Service charge demand does not exist');
        error.status = 400;
        throw error;
    }

    const paidResult = await client.query(
        `
            SELECT COALESCE(SUM(amount_paid), 0) AS already_paid
            FROM payments
            WHERE service_charge_demand_id = $1
              AND payment_category = 'service_charge'
              AND status = 'paid'
              AND ($2::uuid IS NULL OR id <> $2)
        `,
        [demandId, excludePaymentId]
    );
    const alreadyPaid = Number(paidResult.rows[0].already_paid || 0);
    const nextPaidTotal = alreadyPaid + Number(amountPaid);

    if(nextPaidTotal > Number(demand.total_amount || 0) + 0.001) {
        const remainingBalance = Math.max(Number(demand.total_amount || 0) - alreadyPaid, 0);
        const error = new Error(`Payment exceeds the outstanding service charge balance of ${remainingBalance.toFixed(2)}`);
        error.status = 400;
        throw error;
    }
};

const getAllPayments = async (filters = {}) => {
    const { lease_id, payment_category, status, date_from, date_to } = filters;
    const pagination = getPagination(filters);
    const whereClause = `
        WHERE ($1::uuid IS NULL OR payments.lease_id = $1)
          AND ($2::text IS NULL OR payments.payment_category = $2)
          AND ($3::text IS NULL OR payments.status = $3)
          AND ($4::date IS NULL OR payments.payment_date >= $4)
          AND ($5::date IS NULL OR payments.payment_date <= $5)
    `;
    const params = [
        lease_id || null,
        payment_category || null,
        status || null,
        date_from || null,
        date_to || null
    ];

    const result = await pool.query(
        `
            ${selectPaymentQuery}
            ${whereClause}
            ORDER BY payments.payment_date DESC, payments.created_at DESC
            LIMIT $6 OFFSET $7
        `,
        [...params, pagination.limit, pagination.offset]
    );

    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM payments
            ${whereClause}
        `,
        params
    );

    return {
        payments: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
}

const getPaymentById = async (id) => {
    const result = await pool.query(
        `
            ${selectPaymentQuery}
            WHERE payments.id = $1
        `,
        [id]
    );

    const payment = result.rows[0];

    if(!payment) {
        const error = new Error('Payment not found');
        error.status = 404;
        throw error;
    }

    return payment;
}

const createPayment = async (paymentData) => {
    const {
        lease_id,
        service_charge_demand_id,
        payment_category,
        amount_paid,
        payment_date,
        payment_for_period_start,
        payment_for_period_end,
        payment_method,
        receipt_number,
        status,
        notes
    } = paymentData;

    if(!lease_id || !payment_category || !amount_paid || !payment_date) {
        const error = new Error('Lease, payment category, amount paid, and payment date are required');
        error.status = 400;
        throw error;
    }

    const normalizedDemandId = service_charge_demand_id || null;

    validatePaymentData({
        service_charge_demand_id: normalizedDemandId,
        payment_category,
        amount_paid
    });

    await ensureDemandBelongsToLease(normalizedDemandId, lease_id);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await validateServiceChargePaymentLimit({
            demandId: normalizedDemandId,
            amountPaid: amount_paid,
            status: status || 'paid',
            client
        });

        const result = await client.query(
            `
                INSERT INTO payments (
                    lease_id,
                    service_charge_demand_id,
                    payment_category,
                    amount_paid,
                    payment_date,
                    payment_for_period_start,
                    payment_for_period_end,
                    payment_method,
                    receipt_number,
                    status,
                    notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING ${paymentReturningColumns}
            `,
            [
                lease_id,
                normalizedDemandId,
                payment_category,
                amount_paid,
                payment_date,
                payment_for_period_start,
                payment_for_period_end,
                payment_method,
                receipt_number,
                status || 'paid',
                notes
            ]
        );

        if(normalizedDemandId) {
            await recalculateServiceChargeDemandFinancials(normalizedDemandId, client);
        }

        await client.query('COMMIT');

        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');

        if(error.code === '23503') {
            error.message = 'Lease or service charge demand does not exist';
            error.status = 400;
        }

        throw error;
    } finally {
        client.release();
    }
}

const updatePayment = async (id, paymentData) => {
    const existingPayment = await getPaymentById(id);

    const {
        lease_id = existingPayment.lease_id,
        service_charge_demand_id = existingPayment.service_charge_demand_id,
        payment_category = existingPayment.payment_category,
        amount_paid = existingPayment.amount_paid,
        payment_date = existingPayment.payment_date,
        payment_for_period_start = existingPayment.payment_for_period_start,
        payment_for_period_end = existingPayment.payment_for_period_end,
        payment_method = existingPayment.payment_method,
        receipt_number = existingPayment.receipt_number,
        status = existingPayment.status,
        notes = existingPayment.notes
    } = paymentData;

    const normalizedDemandId = service_charge_demand_id || null;

    validatePaymentData({
        service_charge_demand_id: normalizedDemandId,
        payment_category,
        amount_paid
    });

    await ensureDemandBelongsToLease(normalizedDemandId, lease_id);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await validateServiceChargePaymentLimit({
            demandId: normalizedDemandId,
            amountPaid: amount_paid,
            status,
            excludePaymentId: id,
            client
        });

        const result = await client.query(
            `
                UPDATE payments
                SET
                    lease_id = $1,
                    service_charge_demand_id = $2,
                    payment_category = $3,
                    amount_paid = $4,
                    payment_date = $5,
                    payment_for_period_start = $6,
                    payment_for_period_end = $7,
                    payment_method = $8,
                    receipt_number = $9,
                    status = $10,
                    notes = $11,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $12
                RETURNING ${paymentReturningColumns}
            `,
            [
                lease_id,
                normalizedDemandId,
                payment_category,
                amount_paid,
                payment_date,
                payment_for_period_start,
                payment_for_period_end,
                payment_method,
                receipt_number,
                status,
                notes,
                id
            ]
        );

        if(existingPayment.service_charge_demand_id) {
            await recalculateServiceChargeDemandFinancials(existingPayment.service_charge_demand_id, client);
        }

        if(normalizedDemandId && normalizedDemandId !== existingPayment.service_charge_demand_id) {
            await recalculateServiceChargeDemandFinancials(normalizedDemandId, client);
        }

        await client.query('COMMIT');

        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');

        if(error.code === '23503') {
            error.message = 'Lease or service charge demand does not exist';
            error.status = 400;
        }

        throw error;
    } finally {
        client.release();
    }
}

const deletePayment = async (id) => {
    const client = await pool.connect();
    let result;

    try {
        await client.query('BEGIN');

        result = await client.query(
            `
                DELETE FROM payments
                WHERE id = $1
                RETURNING ${paymentReturningColumns}
            `,
            [id]
        );

        const deletedPayment = result.rows[0];

        if(!deletedPayment) {
            const error = new Error('Payment not found');
            error.status = 404;
            throw error;
        }

        if(deletedPayment.service_charge_demand_id) {
            await recalculateServiceChargeDemandFinancials(deletedPayment.service_charge_demand_id, client);
        }

        await client.query('COMMIT');

        return deletedPayment;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export default {
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment
};
