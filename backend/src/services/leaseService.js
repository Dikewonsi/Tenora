import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const leaseColumns = `
    leases.id,
    leases.property_id,
    leases.tenant_id,
    leases.unit_id,
    leases.unit_number,
    leases.unit_description,
    leases.start_date,
    leases.end_date,
    leases.rent_amount,
    leases.service_charge_amount,
    leases.payment_frequency,
    leases.status,
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
        tenants.full_name AS tenant_name,
        units.unit_name,
        units.floor_area_sqm
    FROM leases
    INNER JOIN properties ON properties.id = leases.property_id
    INNER JOIN tenants ON tenants.id = leases.tenant_id
    LEFT JOIN units ON units.id = leases.unit_id
`;

const validateUnitAssignment = async ({
    unitId,
    propertyId,
    startDate,
    endDate,
    status,
    excludeLeaseId = null
}) => {
    if(!unitId) {
        return null;
    }

    const unitResult = await pool.query(
        `
            SELECT id, property_id, unit_name, floor_area_sqm, status
            FROM units
            WHERE id = $1
        `,
        [unitId]
    );
    const unit = unitResult.rows[0];

    if(!unit) {
        const error = new Error('Selected unit does not exist');
        error.status = 400;
        throw error;
    }

    if(unit.property_id !== propertyId) {
        const error = new Error('Selected unit does not belong to the selected property');
        error.status = 400;
        throw error;
    }

    if(unit.status !== 'active') {
        const error = new Error('Selected unit is inactive');
        error.status = 400;
        throw error;
    }

    if(status === 'active') {
        const overlapResult = await pool.query(
            `
                SELECT id
                FROM leases
                WHERE unit_id = $1
                  AND status = 'active'
                  AND ($4::uuid IS NULL OR id <> $4)
                  AND start_date <= $3
                  AND end_date >= $2
                LIMIT 1
            `,
            [unitId, startDate, endDate, excludeLeaseId]
        );

        if(overlapResult.rows[0]) {
            const error = new Error('Selected unit already has an overlapping active occupancy');
            error.status = 400;
            throw error;
        }
    }

    return unit;
};

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

const getRentExpiryBuckets = async () => {
    const result = await pool.query(
        `
            SELECT
                leases.id,
                leases.end_date,
                leases.rent_amount,
                leases.status,
                properties.property_name,
                tenants.full_name AS tenant_name,
                COALESCE(units.unit_name, leases.unit_number) AS unit_name,
                (leases.end_date - CURRENT_DATE)::int AS days_remaining,
                CASE
                    WHEN leases.end_date - CURRENT_DATE < 30 THEN 'expiring_soon'
                    WHEN leases.end_date - CURRENT_DATE < 60 THEN '30_days'
                    WHEN leases.end_date - CURRENT_DATE < 90 THEN '60_days'
                    ELSE '90_days'
                END AS expiry_bucket
            FROM leases
            INNER JOIN properties ON properties.id = leases.property_id
            INNER JOIN tenants ON tenants.id = leases.tenant_id
            LEFT JOIN units ON units.id = leases.unit_id
            WHERE leases.status = 'active'
              AND leases.end_date >= CURRENT_DATE
              AND leases.end_date <= CURRENT_DATE + INTERVAL '90 days'
            ORDER BY leases.end_date ASC, tenants.full_name ASC
        `
    );

    const buckets = {
        expiring_soon: [],
        '30_days': [],
        '60_days': [],
        '90_days': []
    };

    result.rows.forEach((lease) => {
        buckets[lease.expiry_bucket].push(lease);
    });

    return {
        buckets,
        leases: result.rows
    };
};

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
        unit_id,
        unit_number,
        unit_description,
        start_date,
        end_date,
        rent_amount,
        service_charge_amount,
        payment_frequency,
        status,
        last_reviewed_date,
        rent_review_note,
        occupied_space
    } = leaseData;

    if(!property_id || !tenant_id || !start_date || !end_date) {
        const error = new Error('Property, tenant, start date, and end date are required');
        error.status = 400;
        throw error;
    }

    if(end_date < start_date) {
        const error = new Error('Lease end date cannot be before start date');
        error.status = 400;
        throw error;
    }

    const selectedUnit = await validateUnitAssignment({
        unitId: unit_id,
        propertyId: property_id,
        startDate: start_date,
        endDate: end_date,
        status: status || 'active'
    });

    try {
        const result = await pool.query(
            `
                INSERT INTO leases (
                    property_id,
                    tenant_id,
                    unit_id,
                    unit_number,
                    unit_description,
                    start_date,
                    end_date,
                    rent_amount,
                    service_charge_amount,
                    payment_frequency,
                    status,
                    last_reviewed_date,
                    rent_review_note,
                    occupied_space
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING
                    id,
                    property_id,
                    tenant_id,
                    unit_id,
                    unit_number,
                    unit_description,
                    start_date,
                    end_date,
                    rent_amount,
                    service_charge_amount,
                    payment_frequency,
                    status,
                    last_reviewed_date,
                    rent_review_note,
                    occupied_space,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
            `,
            [
                property_id,
                tenant_id,
                unit_id || null,
                selectedUnit?.unit_name || unit_number,
                unit_description,
                start_date,
                end_date,
                rent_amount,
                service_charge_amount,
                payment_frequency,
                status,
                last_reviewed_date,
                rent_review_note,
                occupied_space ?? selectedUnit?.floor_area_sqm
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
        unit_id = existingLease.unit_id,
        unit_number = existingLease.unit_number,
        unit_description = existingLease.unit_description,
        start_date = existingLease.start_date,
        end_date = existingLease.end_date,
        rent_amount = existingLease.rent_amount,
        service_charge_amount = existingLease.service_charge_amount,
        payment_frequency = existingLease.payment_frequency,
        status = existingLease.status,
        last_reviewed_date = existingLease.last_reviewed_date,
        rent_review_note = existingLease.rent_review_note,
        occupied_space = existingLease.occupied_space
    } = leaseData;

    if(end_date < start_date) {
        const error = new Error('Lease end date cannot be before start date');
        error.status = 400;
        throw error;
    }

    const selectedUnit = await validateUnitAssignment({
        unitId: unit_id,
        propertyId: property_id,
        startDate: start_date,
        endDate: end_date,
        status,
        excludeLeaseId: id
    });

    try {
        const result = await pool.query(
            `
                UPDATE leases
                SET
                    property_id = $1,
                    tenant_id = $2,
                    unit_id = $3,
                    unit_number = $4,
                    unit_description = $5,
                    start_date = $6,
                    end_date = $7,
                    rent_amount = $8,
                    service_charge_amount = $9,
                    payment_frequency = $10,
                    status = $11,
                    last_reviewed_date = $12,
                    rent_review_note = $13,
                    occupied_space = $14,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $15
                RETURNING
                    id,
                    property_id,
                    tenant_id,
                    unit_id,
                    unit_number,
                    unit_description,
                    start_date,
                    end_date,
                    rent_amount,
                    service_charge_amount,
                    payment_frequency,
                    status,
                    last_reviewed_date,
                    rent_review_note,
                    occupied_space,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
            `,
            [
                property_id,
                tenant_id,
                unit_id || null,
                selectedUnit?.unit_name || unit_number,
                unit_description,
                start_date,
                end_date,
                rent_amount,
                service_charge_amount,
                payment_frequency,
                status,
                last_reviewed_date,
                rent_review_note,
                occupied_space ?? selectedUnit?.floor_area_sqm,
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
                    unit_id,
                    unit_number,
                    unit_description,
                    start_date,
                    end_date,
                    rent_amount,
                    service_charge_amount,
                    payment_frequency,
                    status,
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
    getRentExpiryBuckets,
    getLeaseById,
    createLease,
    updateLease,
    deleteLease
};
