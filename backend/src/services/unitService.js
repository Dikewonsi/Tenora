import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const unitColumns = `
    units.id,
    units.property_id,
    units.unit_name,
    units.floor_area_sqm,
    units.bedrooms,
    units.status,
    units.created_at AS "createdAt",
    units.updated_at AS "updatedAt"
`;

const unitReturningColumns = `
    id,
    property_id,
    unit_name,
    floor_area_sqm,
    bedrooms,
    status,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;

const selectUnitQuery = `
    SELECT
        ${unitColumns},
        properties.property_name,
        occupancy.lease_id,
        occupancy.tenant_id,
        occupancy.tenant_name,
        occupancy.tenant_email,
        occupancy.tenant_phone
    FROM units
    INNER JOIN properties ON properties.id = units.property_id
    LEFT JOIN LATERAL (
        SELECT
            leases.id AS lease_id,
            tenants.id AS tenant_id,
            tenants.full_name AS tenant_name,
            tenants.email AS tenant_email,
            tenants.phone_number AS tenant_phone
        FROM leases
        INNER JOIN tenants ON tenants.id = leases.tenant_id
        WHERE leases.unit_id = units.id
          AND leases.status = 'active'
          AND leases.start_date <= CURRENT_DATE
          AND leases.end_date >= CURRENT_DATE
        ORDER BY leases.start_date DESC, leases.created_at DESC
        LIMIT 1
    ) occupancy ON TRUE
`;

const isMissing = (value) => value === undefined || value === null || value === '';

const validateUnitData = ({ property_id, unit_name, floor_area_sqm, bedrooms, status }) => {
    if(isMissing(property_id) || !String(unit_name || '').trim()) {
        const error = new Error('Property and unit name/number are required');
        error.status = 400;
        throw error;
    }

    if(!isMissing(floor_area_sqm)) {
        const floorArea = Number(floor_area_sqm);

        if(Number.isNaN(floorArea) || floorArea < 0) {
            const error = new Error('Floor area must be zero or greater');
            error.status = 400;
            throw error;
        }
    }

    if(!isMissing(bedrooms)) {
        const bedroomCount = Number(bedrooms);

        if(!Number.isInteger(bedroomCount) || bedroomCount < 0) {
            const error = new Error('Bedrooms must be a whole number of zero or greater');
            error.status = 400;
            throw error;
        }
    }

    if(status && !['active', 'inactive'].includes(status)) {
        const error = new Error('Unit status must be active or inactive');
        error.status = 400;
        throw error;
    }
};

const getAllUnits = async (filters = {}) => {
    const { property_id, status, search } = filters;
    const pagination = getPagination(filters);
    const params = [property_id || null, status || null, search || null];
    const whereClause = `
        WHERE ($1::uuid IS NULL OR units.property_id = $1)
          AND ($2::text IS NULL OR units.status = $2)
          AND (
              $3::text IS NULL
              OR units.unit_name ILIKE '%' || $3 || '%'
              OR properties.property_name ILIKE '%' || $3 || '%'
          )
    `;

    const result = await pool.query(
        `
            ${selectUnitQuery}
            ${whereClause}
            ORDER BY properties.property_name ASC, units.unit_name ASC
            LIMIT $4 OFFSET $5
        `,
        [...params, pagination.limit, pagination.offset]
    );
    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM units
            INNER JOIN properties ON properties.id = units.property_id
            ${whereClause}
        `,
        params
    );

    return {
        units: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
};

const getUnitById = async (id) => {
    const result = await pool.query(
        `
            ${selectUnitQuery}
            WHERE units.id = $1
        `,
        [id]
    );
    const unit = result.rows[0];

    if(!unit) {
        const error = new Error('Unit not found');
        error.status = 404;
        throw error;
    }

    return unit;
};

const createUnit = async (unitData) => {
    const {
        property_id,
        unit_name,
        floor_area_sqm,
        bedrooms,
        status
    } = unitData;

    validateUnitData(unitData);

    try {
        const result = await pool.query(
            `
                INSERT INTO units (
                    property_id,
                    unit_name,
                    floor_area_sqm,
                    bedrooms,
                    status
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING ${unitReturningColumns}
            `,
            [
                property_id,
                String(unit_name).trim(),
                isMissing(floor_area_sqm) ? null : Number(floor_area_sqm),
                isMissing(bedrooms) ? null : Number(bedrooms),
                status || 'active'
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Selected property does not exist';
            error.status = 400;
        }

        if(error.code === '23505') {
            error.message = 'A unit with this name/number already exists under the property';
            error.status = 400;
        }

        throw error;
    }
};

const updateUnit = async (id, unitData) => {
    const existingUnit = await getUnitById(id);
    const nextData = {
        property_id: unitData.property_id ?? existingUnit.property_id,
        unit_name: unitData.unit_name ?? existingUnit.unit_name,
        floor_area_sqm: unitData.floor_area_sqm ?? existingUnit.floor_area_sqm,
        bedrooms: unitData.bedrooms ?? existingUnit.bedrooms,
        status: unitData.status ?? existingUnit.status
    };

    validateUnitData(nextData);

    try {
        const result = await pool.query(
            `
                UPDATE units
                SET
                    property_id = $1,
                    unit_name = $2,
                    floor_area_sqm = $3,
                    bedrooms = $4,
                    status = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING ${unitReturningColumns}
            `,
            [
                nextData.property_id,
                String(nextData.unit_name).trim(),
                isMissing(nextData.floor_area_sqm) ? null : Number(nextData.floor_area_sqm),
                isMissing(nextData.bedrooms) ? null : Number(nextData.bedrooms),
                nextData.status,
                id
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Selected property does not exist';
            error.status = 400;
        }

        if(error.code === '23505') {
            error.message = 'A unit with this name/number already exists under the property';
            error.status = 400;
        }

        throw error;
    }
};

const deleteUnit = async (id) => {
    try {
        const result = await pool.query(
            `
                DELETE FROM units
                WHERE id = $1
                RETURNING ${unitReturningColumns}
            `,
            [id]
        );
        const unit = result.rows[0];

        if(!unit) {
            const error = new Error('Unit not found');
            error.status = 404;
            throw error;
        }

        return unit;
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Unit cannot be deleted because it is linked to an occupancy, allocation, or demand';
            error.status = 400;
        }

        throw error;
    }
};

export default {
    getAllUnits,
    getUnitById,
    createUnit,
    updateUnit,
    deleteUnit
};
