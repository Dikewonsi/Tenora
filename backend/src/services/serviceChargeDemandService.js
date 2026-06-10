import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const demandColumns = `
    service_charge_demands.id,
    service_charge_demands.demand_reference,
    service_charge_demands.demand_title,
    service_charge_demands.property_id,
    service_charge_demands.lease_id,
    service_charge_demands.tenant_id,
    service_charge_demands.unit_id,
    service_charge_demands.budget_id,
    service_charge_demands.allocation_id,
    service_charge_demands.period_start,
    service_charge_demands.period_end,
    service_charge_demands.total_amount,
    service_charge_demands.amount_paid,
    service_charge_demands.balance,
    service_charge_demands.due_date,
    service_charge_demands.status,
    service_charge_demands.payment_instruction,
    service_charge_demands.demand_note,
    service_charge_demands.issued_at,
    service_charge_demands.issued_by,
    service_charge_demands.sent_at,
    service_charge_demands.sent_by,
    service_charge_demands.document_version,
    service_charge_demands.created_at AS "createdAt",
    service_charge_demands.updated_at AS "updatedAt"
`;

const demandReturningColumns = demandColumns
    .replaceAll('service_charge_demands.', '');

const selectDemandQuery = `
    SELECT
        ${demandColumns},
        properties.property_name,
        COALESCE(units.unit_name, leases.unit_number) AS unit_number,
        tenants.full_name AS tenant_name,
        issued_users.full_name AS issued_by_name
    FROM service_charge_demands
    INNER JOIN properties ON properties.id = service_charge_demands.property_id
    INNER JOIN leases ON leases.id = service_charge_demands.lease_id
    INNER JOIN tenants ON tenants.id = service_charge_demands.tenant_id
    LEFT JOIN units ON units.id = service_charge_demands.unit_id
    LEFT JOIN users issued_users ON issued_users.id = service_charge_demands.issued_by
`;

const calculateStatus = ({ currentStatus, totalAmount, amountPaid, balance, dueDate }) => {
    if(currentStatus === 'draft') {
        return 'draft';
    }

    if(balance <= 0 && totalAmount > 0) {
        return 'paid';
    }

    if(amountPaid > 0) {
        return 'part_paid';
    }

    if(dueDate && String(dueDate).slice(0, 10) < new Date().toISOString().slice(0, 10)) {
        return 'overdue';
    }

    return 'issued';
};

const generateDemandReference = async (client = pool, date = new Date()) => {
    const result = await client.query(`SELECT nextval('service_charge_demand_reference_seq') AS sequence_number`);
    return `SCD-${date.getFullYear()}-${String(result.rows[0].sequence_number).padStart(4, '0')}`;
};

const recalculateServiceChargeDemandFinancials = async (demandId, client = pool) => {
    const result = await client.query(
        `
            SELECT
                service_charge_demands.id,
                service_charge_demands.status,
                service_charge_demands.due_date,
                service_charge_demands.total_amount AS stored_total,
                service_charge_demands.amount_paid AS stored_paid,
                service_charge_demands.balance AS stored_balance,
                service_charge_demands.issued_at,
                COALESCE(service_charge_allocations.final_charge, service_charge_demands.total_amount, 0) AS total_amount,
                COALESCE((
                    SELECT SUM(payments.amount_paid)
                    FROM payments
                    WHERE payments.service_charge_demand_id = service_charge_demands.id
                      AND payments.payment_category = 'service_charge'
                      AND payments.status = 'paid'
                ), 0) AS amount_paid
            FROM service_charge_demands
            LEFT JOIN service_charge_allocations
                ON service_charge_allocations.id = service_charge_demands.allocation_id
            WHERE service_charge_demands.id = $1
        `,
        [demandId]
    );
    const financials = result.rows[0];

    if(!financials) {
        const error = new Error('Service charge demand not found');
        error.status = 404;
        throw error;
    }

    const totalAmount = Number(financials.total_amount || 0);
    const amountPaid = Number(financials.amount_paid || 0);
    const balance = Math.max(totalAmount - amountPaid, 0);
    const changed =
        Number(financials.stored_total || 0) !== totalAmount ||
        Number(financials.stored_paid || 0) !== amountPaid ||
        Number(financials.stored_balance || 0) !== balance;
    const status = calculateStatus({
        currentStatus: financials.status,
        totalAmount,
        amountPaid,
        balance,
        dueDate: financials.due_date
    });

    const updateResult = await client.query(
        `
            UPDATE service_charge_demands
            SET
                total_amount = $1,
                amount_paid = $2,
                balance = $3,
                status = $4,
                document_version = CASE
                    WHEN $6::boolean AND issued_at IS NOT NULL THEN document_version + 1
                    ELSE document_version
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING ${demandReturningColumns}
        `,
        [totalAmount, amountPaid, balance, status, demandId, changed]
    );

    return updateResult.rows[0];
};

const getAllServiceChargeDemands = async (filters = {}) => {
    const { property_id, lease_id, status } = filters;
    const pagination = getPagination(filters);
    const params = [property_id || null, lease_id || null, status || null];
    const whereClause = `
        WHERE ($1::uuid IS NULL OR service_charge_demands.property_id = $1)
          AND ($2::uuid IS NULL OR service_charge_demands.lease_id = $2)
          AND ($3::text IS NULL OR service_charge_demands.status = $3)
    `;

    const [result, countResult] = await Promise.all([
        pool.query(
            `
                ${selectDemandQuery}
                ${whereClause}
                ORDER BY service_charge_demands.created_at DESC
                LIMIT $4 OFFSET $5
            `,
            [...params, pagination.limit, pagination.offset]
        ),
        pool.query(
            `SELECT COUNT(*) AS total FROM service_charge_demands ${whereClause}`,
            params
        )
    ]);

    return {
        demands: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
};

const getServiceChargeDemandById = async (id) => {
    const result = await pool.query(
        `${selectDemandQuery} WHERE service_charge_demands.id = $1`,
        [id]
    );

    if(!result.rows[0]) {
        const error = new Error('Service charge demand not found');
        error.status = 404;
        throw error;
    }

    return result.rows[0];
};

const getServiceChargeDemandDocument = async (id) => {
    const demand = await getServiceChargeDemandById(id);
    const detailResult = await pool.query(
        `
            SELECT
                properties.id AS property_id,
                properties.property_name,
                properties.address,
                properties.location,
                leases.id AS lease_id,
                leases.start_date,
                leases.end_date,
                leases.rent_amount,
                leases.status AS lease_status,
                COALESCE(units.unit_name, leases.unit_number) AS unit_name,
                units.floor_area_sqm,
                tenants.id AS tenant_id,
                tenants.full_name,
                tenants.phone_number,
                tenants.email,
                tenants.alternative_contact
            FROM service_charge_demands
            INNER JOIN properties ON properties.id = service_charge_demands.property_id
            INNER JOIN leases ON leases.id = service_charge_demands.lease_id
            INNER JOIN tenants ON tenants.id = service_charge_demands.tenant_id
            LEFT JOIN units ON units.id = service_charge_demands.unit_id
            WHERE service_charge_demands.id = $1
        `,
        [id]
    );
    const detail = detailResult.rows[0];

    return {
        demand,
        property: {
            id: detail.property_id,
            property_name: detail.property_name,
            address: detail.address,
            location: detail.location
        },
        lease: {
            id: detail.lease_id,
            start_date: detail.start_date,
            end_date: detail.end_date,
            rent_amount: detail.rent_amount,
            status: detail.lease_status,
            unit_number: detail.unit_name,
            occupied_space: detail.floor_area_sqm
        },
        tenant: {
            id: detail.tenant_id,
            full_name: detail.full_name,
            phone_number: detail.phone_number,
            email: detail.email,
            alternative_contact: detail.alternative_contact
        },
        totals: {
            total_amount: demand.total_amount,
            amount_paid: demand.amount_paid,
            balance: demand.balance
        },
        metadata: {
            demand_reference: demand.demand_reference,
            demand_title: demand.demand_title,
            payment_instruction: demand.payment_instruction,
            demand_note: demand.demand_note,
            issued_at: demand.issued_at,
            issued_by_name: demand.issued_by_name,
            document_version: demand.document_version
        }
    };
};

export default {
    getAllServiceChargeDemands,
    getServiceChargeDemandById,
    getServiceChargeDemandDocument,
    recalculateServiceChargeDemandFinancials
};

export {
    generateDemandReference,
    recalculateServiceChargeDemandFinancials
};
