import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';
import {
    assertConfiguredAreaWithinTotal,
    getPropertyAreaState,
    normalizeUnitData
} from './propertyAreaService.js';

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
    const normalizedData = normalizeUnitData(unitData);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const areaState = await getPropertyAreaState(client, normalizedData.property_id, { lock: true });
        assertConfiguredAreaWithinTotal({
            configuredArea: areaState.configuredUnitArea + Number(normalizedData.floor_area_sqm || 0),
            totalLettableSpace: areaState.totalLettableSpace
        });
        const result = await client.query(
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
                normalizedData.property_id,
                normalizedData.unit_name,
                normalizedData.floor_area_sqm,
                normalizedData.bedrooms,
                normalizedData.status
            ]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');

        if(error.code === '23503') {
            error.message = 'Selected property does not exist';
            error.status = 400;
        }

        if(error.code === '23505') {
            error.message = 'A unit with this name/number already exists under the property';
            error.status = 400;
        }

        throw error;
    } finally {
        client.release();
    }
};

const updateUnit = async (id, unitData) => {
    const existingUnit = await getUnitById(id);
    const nextData = normalizeUnitData({
        property_id: unitData.property_id ?? existingUnit.property_id,
        unit_name: unitData.unit_name ?? existingUnit.unit_name,
        floor_area_sqm: Object.hasOwn(unitData, 'floor_area_sqm')
            ? unitData.floor_area_sqm
            : existingUnit.floor_area_sqm,
        bedrooms: Object.hasOwn(unitData, 'bedrooms')
            ? unitData.bedrooms
            : existingUnit.bedrooms,
        status: unitData.status ?? existingUnit.status
    });
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const propertyIds = [...new Set([existingUnit.property_id, nextData.property_id])].sort();
        await client.query(
            `
                SELECT id
                FROM properties
                WHERE id = ANY($1::uuid[])
                ORDER BY id
                FOR UPDATE
            `,
            [propertyIds]
        );
        const areaState = await getPropertyAreaState(client, nextData.property_id, {
            excludeUnitId: id
        });
        assertConfiguredAreaWithinTotal({
            configuredArea: areaState.configuredUnitArea + Number(nextData.floor_area_sqm || 0),
            totalLettableSpace: areaState.totalLettableSpace
        });
        const result = await client.query(
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
                nextData.unit_name,
                nextData.floor_area_sqm,
                nextData.bedrooms,
                nextData.status,
                id
            ]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');

        if(error.code === '23503') {
            error.message = 'Selected property does not exist';
            error.status = 400;
        }

        if(error.code === '23505') {
            error.message = 'A unit with this name/number already exists under the property';
            error.status = 400;
        }

        throw error;
    } finally {
        client.release();
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
