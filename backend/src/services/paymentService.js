import pool from '../db/pool.js';

const selectPaymentQuery = `
    SELECT
        payments.*,
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

const getAllPayments = async () => {
    const result = await pool.query(`
        ${selectPaymentQuery}
        ORDER BY payments.payment_date DESC, payments.created_at DESC
    `);

    return result.rows;
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

    await ensureDemandBelongsToLease(service_charge_demand_id, lease_id);

    try {
        const result = await pool.query(
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
                RETURNING *
            `,
            [
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

    await ensureDemandBelongsToLease(service_charge_demand_id, lease_id);

    try {
        const result = await pool.query(
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
                RETURNING *
            `,
            [
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

const deletePayment = async (id) => {
    const result = await pool.query(
        `
            DELETE FROM payments
            WHERE id = $1
            RETURNING *
        `,
        [id]
    );

    const deletedPayment = result.rows[0];

    if(!deletedPayment) {
        const error = new Error('Payment not found');
        error.status = 404;
        throw error;
    }

    return deletedPayment;
}

export default {
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment
};
