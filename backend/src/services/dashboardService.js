import pool from '../db/pool.js';
import leaseService from './leaseService.js';

const getSummary = async () => {
    const [
        countsResult,
        paymentSummaryResult,
        demandSummaryResult,
        recentPaymentsResult,
        expiry
    ] = await Promise.all([
        pool.query(`
            SELECT
                (SELECT COUNT(*) FROM properties)::int AS properties,
                (SELECT COUNT(*) FROM tenants)::int AS tenants,
                (SELECT COUNT(*) FROM leases)::int AS leases,
                (SELECT COUNT(*) FROM leases WHERE status = 'active')::int AS active_leases,
                (SELECT COUNT(*) FROM units WHERE status = 'active')::int AS total_units,
                (
                    SELECT COUNT(DISTINCT unit_id)
                    FROM leases
                    WHERE status = 'active'
                      AND start_date <= CURRENT_DATE
                      AND end_date >= CURRENT_DATE
                )::int AS occupied_units,
                (
                    SELECT COUNT(*)
                    FROM units
                    WHERE status = 'active'
                )::int - (
                    SELECT COUNT(DISTINCT unit_id)
                    FROM leases
                    WHERE status = 'active'
                      AND start_date <= CURRENT_DATE
                      AND end_date >= CURRENT_DATE
                )::int AS vacant_units,
                (SELECT COUNT(*) FROM payments)::int AS payments,
                (SELECT COUNT(*) FROM service_charge_demands)::int AS service_charge_demands,
                (
                    SELECT COALESCE(SUM(total_lettable_space), 0)
                    FROM properties
                ) AS total_lettable_space
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
                COUNT(*) FILTER (WHERE status IN ('draft', 'issued', 'pending', 'part_paid', 'overdue'))::int AS open_demands
            FROM service_charge_demands
        `),
        pool.query(`
            SELECT
                payments.id,
                payments.payment_category,
                payments.amount_paid,
                payments.payment_date,
                properties.property_name,
                tenants.full_name AS tenant_name,
                COALESCE(units.unit_name, leases.unit_number) AS unit_name
            FROM payments
            INNER JOIN leases ON leases.id = payments.lease_id
            INNER JOIN properties ON properties.id = leases.property_id
            INNER JOIN tenants ON tenants.id = leases.tenant_id
            LEFT JOIN units ON units.id = leases.unit_id
            ORDER BY payments.payment_date DESC, payments.created_at DESC
            LIMIT 8
        `),
        leaseService.getRentExpiryBuckets()
    ]);

    return {
        counts: countsResult.rows[0],
        payments: paymentSummaryResult.rows[0],
        serviceChargeDemands: demandSummaryResult.rows[0],
        rentExpiry: expiry,
        recentPayments: recentPaymentsResult.rows
    };
};

export default {
    getSummary
};
