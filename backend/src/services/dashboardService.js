import pool from '../db/pool.js';

const getSummary = async () => {
    const [
        countsResult,
        leaseStatusResult,
        paymentSummaryResult,
        demandSummaryResult,
        reminderSummaryResult,
        expiringLeasesResult,
        recentPaymentsResult
    ] = await Promise.all([
        pool.query(`
            SELECT
                (SELECT COUNT(*) FROM properties) AS properties,
                (SELECT COUNT(*) FROM tenants) AS tenants,
                (SELECT COUNT(*) FROM leases) AS leases,
                (SELECT COUNT(*) FROM payments) AS payments,
                (SELECT COUNT(*) FROM service_charge_demands) AS service_charge_demands,
                (SELECT COUNT(*) FROM reminders) AS reminders
        `),
        pool.query(`
            SELECT status, COUNT(*) AS count
            FROM leases
            GROUP BY status
            ORDER BY status
        `),
        pool.query(`
            SELECT
                COALESCE(SUM(amount_paid), 0) AS total_paid,
                COALESCE(SUM(amount_paid) FILTER (WHERE payment_category = 'rent'), 0) AS rent_paid,
                COALESCE(SUM(amount_paid) FILTER (WHERE payment_category = 'service_charge'), 0) AS service_charge_paid
            FROM payments
            WHERE status = 'paid'
        `),
        pool.query(`
            SELECT
                COALESCE(SUM(total_amount), 0) AS total_demanded,
                COALESCE(SUM(amount_paid), 0) AS total_demand_paid,
                COALESCE(SUM(balance), 0) AS total_demand_balance,
                COUNT(*) FILTER (WHERE status IN ('draft', 'issued', 'pending')) AS open_demands
            FROM service_charge_demands
        `),
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (
                    WHERE status = 'pending'
                      AND scheduled_send_date <= CURRENT_DATE
                ) AS due_today_or_overdue,
                COUNT(*) FILTER (WHERE acknowledged = TRUE) AS acknowledged
            FROM reminders
        `),
        pool.query(`
            SELECT
                leases.id,
                leases.end_date,
                leases.unit_number,
                properties.property_name,
                tenants.full_name AS tenant_name
            FROM leases
            INNER JOIN properties ON properties.id = leases.property_id
            INNER JOIN tenants ON tenants.id = leases.tenant_id
            WHERE leases.status = 'active'
              AND leases.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
            ORDER BY leases.end_date ASC
            LIMIT 10
        `),
        pool.query(`
            SELECT
                payments.id,
                payments.payment_category,
                payments.amount_paid,
                payments.payment_date,
                properties.property_name,
                tenants.full_name AS tenant_name
            FROM payments
            INNER JOIN leases ON leases.id = payments.lease_id
            INNER JOIN properties ON properties.id = leases.property_id
            INNER JOIN tenants ON tenants.id = leases.tenant_id
            ORDER BY payments.payment_date DESC, payments.created_at DESC
            LIMIT 10
        `)
    ]);

    return {
        counts: countsResult.rows[0],
        leasesByStatus: leaseStatusResult.rows,
        payments: paymentSummaryResult.rows[0],
        serviceChargeDemands: demandSummaryResult.rows[0],
        reminders: reminderSummaryResult.rows[0],
        expiringLeases: expiringLeasesResult.rows,
        recentPayments: recentPaymentsResult.rows
    };
}

export default {
    getSummary
};
