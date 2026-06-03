import pool from '../db/pool.js';

const getRentArrears = async () => {
    const result = await pool.query(
        `
            SELECT
                leases.id AS lease_id,
                leases.unit_number,
                leases.rent_amount,
                leases.next_rent_due_date,
                leases.status,
                properties.id AS property_id,
                properties.property_name,
                tenants.id AS tenant_id,
                tenants.full_name AS tenant_name,
                COALESCE(SUM(payments.amount_paid) FILTER (WHERE payments.payment_category = 'rent'), 0) AS rent_paid,
                GREATEST(
                    leases.rent_amount - COALESCE(SUM(payments.amount_paid) FILTER (WHERE payments.payment_category = 'rent'), 0),
                    0
                ) AS balance
            FROM leases
            INNER JOIN properties ON properties.id = leases.property_id
            INNER JOIN tenants ON tenants.id = leases.tenant_id
            LEFT JOIN payments ON payments.lease_id = leases.id
            WHERE leases.status = 'active'
            GROUP BY
                leases.id,
                properties.id,
                tenants.id
            HAVING GREATEST(
                leases.rent_amount - COALESCE(SUM(payments.amount_paid) FILTER (WHERE payments.payment_category = 'rent'), 0),
                0
            ) > 0
            ORDER BY balance DESC, leases.next_rent_due_date ASC
        `
    );

    return result.rows;
}

const getServiceChargeBalances = async () => {
    const result = await pool.query(
        `
            SELECT
                service_charge_demands.id AS demand_id,
                service_charge_demands.period_start,
                service_charge_demands.period_end,
                service_charge_demands.total_amount,
                service_charge_demands.amount_paid,
                service_charge_demands.balance,
                service_charge_demands.due_date,
                service_charge_demands.status,
                properties.id AS property_id,
                properties.property_name,
                leases.id AS lease_id,
                leases.unit_number,
                tenants.id AS tenant_id,
                tenants.full_name AS tenant_name
            FROM service_charge_demands
            INNER JOIN properties ON properties.id = service_charge_demands.property_id
            INNER JOIN leases ON leases.id = service_charge_demands.lease_id
            INNER JOIN tenants ON tenants.id = leases.tenant_id
            WHERE service_charge_demands.balance > 0
            ORDER BY service_charge_demands.balance DESC, service_charge_demands.due_date ASC
        `
    );

    return result.rows;
}

const getExpiringLeases = async (filters = {}) => {
    const days = Number.isInteger(Number(filters.days)) && Number(filters.days) > 0
        ? Number(filters.days)
        : 90;

    const result = await pool.query(
        `
            SELECT
                leases.id AS lease_id,
                leases.unit_number,
                leases.start_date,
                leases.end_date,
                leases.status,
                leases.rent_amount,
                properties.id AS property_id,
                properties.property_name,
                tenants.id AS tenant_id,
                tenants.full_name AS tenant_name
            FROM leases
            INNER JOIN properties ON properties.id = leases.property_id
            INNER JOIN tenants ON tenants.id = leases.tenant_id
            WHERE leases.status = 'active'
              AND leases.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int * INTERVAL '1 day')
            ORDER BY leases.end_date ASC
        `,
        [days]
    );

    return {
        days,
        leases: result.rows
    };
}

export default {
    getRentArrears,
    getServiceChargeBalances,
    getExpiringLeases
};
