import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';
import {
    assertConfiguredAreaWithinTotal,
    isMissing,
    normalizeOptionalArea,
    normalizeUnitData
} from './propertyAreaService.js';

const propertyColumns = `
    properties.id,
    properties.property_name,
    properties.address,
    properties.location,
    properties.property_description,
    COALESCE((
        SELECT COUNT(*)
        FROM units
        WHERE units.property_id = properties.id
          AND units.status = 'active'
    ), 0)::int AS total_units,
    COALESCE((
        SELECT COUNT(*)
        FROM units
        WHERE units.property_id = properties.id
    ), 0)::int AS configured_unit_count,
    properties.total_lettable_space,
    COALESCE((
        SELECT SUM(units.floor_area_sqm)
        FROM units
        WHERE units.property_id = properties.id
    ), 0) AS configured_unit_area_sqm,
    GREATEST(
        COALESCE(properties.total_lettable_space, 0) - COALESCE((
            SELECT SUM(units.floor_area_sqm)
            FROM units
            WHERE units.property_id = properties.id
        ), 0),
        0
    ) AS unconfigured_area_sqm,
    properties.created_at AS "createdAt",
    properties.updated_at AS "updatedAt"
`;

const getAllProperties = async (filters = {}) => {
    const { search, location } = filters;
    const pagination = getPagination(filters);

    const result = await pool.query(
        `
            SELECT ${propertyColumns}
            FROM properties
            WHERE (
                $1::text IS NULL
                OR property_name ILIKE '%' || $1 || '%'
                OR location ILIKE '%' || $1 || '%'
                OR address ILIKE '%' || $1 || '%'
            )
            AND (
                $2::text IS NULL
                OR location ILIKE '%' || $2 || '%'
            )
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `,
        [search || null, location || null, pagination.limit, pagination.offset]
    );

    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM properties
            WHERE (
                $1::text IS NULL
                OR property_name ILIKE '%' || $1 || '%'
                OR location ILIKE '%' || $1 || '%'
                OR address ILIKE '%' || $1 || '%'
            )
            AND (
                $2::text IS NULL
                OR location ILIKE '%' || $2 || '%'
            )
        `,
        [search || null, location || null]
    );

    return {
        properties: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
}

const getPropertyById = async (id) => {
    const result = await pool.query(
        `
            SELECT ${propertyColumns}
            FROM properties
            WHERE id = $1
        `, [id]
    );

    const property = result.rows[0];

    if(!property) {
        const error = new Error('Property not found');
        error.status = 400;
        throw error;
    }

    return property;
}

const createProperty = async (propertyData) => {
    const {
        property_name,
        name,
        address,
        location,
        property_description,
        total_lettable_space,
        units = []
    } = propertyData;

    if(!address) {
        const error = new Error('Property address is required');
        error.status = 400;
        throw error;
    }

    if(!Array.isArray(units)) {
        const error = new Error('Units must be provided as an array');
        error.status = 400;
        throw error;
    }

    const normalizedTotal = normalizeOptionalArea(total_lettable_space, 'Total lettable space');
    const normalizedUnits = units.map((unit) => normalizeUnitData(unit, { requireProperty: false }));
    const configuredArea = normalizedUnits.reduce(
        (total, unit) => total + Number(unit.floor_area_sqm || 0),
        0
    );
    assertConfiguredAreaWithinTotal({
        configuredArea,
        totalLettableSpace: normalizedTotal
    });
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await client.query(
            `
                INSERT INTO properties (
                    property_name,
                    address,
                    location,
                    property_description,
                    total_lettable_space
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `,
            [
                property_name || name,
                address,
                location,
                property_description,
                normalizedTotal
            ]
        );
        const propertyId = result.rows[0].id;

        for(const unit of normalizedUnits) {
            await client.query(
                `
                    INSERT INTO units (
                        property_id,
                        unit_name,
                        floor_area_sqm,
                        bedrooms,
                        status
                    )
                    VALUES ($1, $2, $3, $4, $5)
                `,
                [
                    propertyId,
                    unit.unit_name,
                    unit.floor_area_sqm,
                    unit.bedrooms,
                    unit.status
                ]
            );
        }

        await client.query('COMMIT');
        return getPropertyById(propertyId);
    } catch (error) {
        await client.query('ROLLBACK');

        if(error.code === '23505') {
            error.message = 'Unit names must be unique within the property';
            error.status = 400;
        }

        throw error;
    } finally {
        client.release();
    }
}

const updateProperty = async (id, propertyData) => {
    const existingProperty = await getPropertyById(id);

    const {
        property_name = existingProperty.property_name,
        name,
        address = existingProperty.address,
        location = existingProperty.location,
        property_description = existingProperty.property_description
    } = propertyData;
    const nextTotal = Object.hasOwn(propertyData, 'total_lettable_space')
        ? normalizeOptionalArea(propertyData.total_lettable_space, 'Total lettable space')
        : (isMissing(existingProperty.total_lettable_space)
            ? null
            : Number(existingProperty.total_lettable_space));
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const lockResult = await client.query(
            'SELECT id FROM properties WHERE id = $1 FOR UPDATE',
            [id]
        );

        if(!lockResult.rows[0]) {
            const error = new Error('Property not found');
            error.status = 404;
            throw error;
        }

        const areaResult = await client.query(
            `
                SELECT COALESCE(SUM(floor_area_sqm), 0) AS configured_unit_area_sqm
                FROM units
                WHERE property_id = $1
            `,
            [id]
        );
        assertConfiguredAreaWithinTotal({
            configuredArea: Number(areaResult.rows[0].configured_unit_area_sqm || 0),
            totalLettableSpace: nextTotal
        });
        const result = await client.query(
            `
                UPDATE properties
                SET
                    property_name = $1,
                    address = $2,
                    location = $3,
                    property_description = $4,
                    total_lettable_space = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING id
            `,
            [
                property_name || name,
                address,
                location,
                property_description,
                nextTotal,
                id
            ]
        );

        if(!result.rows[0]) {
            const error = new Error('Property not found');
            error.status = 404;
            throw error;
        }

        await client.query('COMMIT');
        return getPropertyById(result.rows[0].id);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteProperty = async (id) => {
    let result;

    try {
        result = await pool.query(
            `
                DELETE FROM properties
                WHERE id = $1
                RETURNING
                    id,
                    property_name,
                    address,
                    location,
                    property_description,
                    total_units,
                    total_lettable_space,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
            `,
            [id]
        );
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Property cannot be deleted because it has related lease or service charge records';
            error.status = 400;
        }

        throw error;
    }

    const deletedProperty = result.rows[0];

    if(!deletedProperty) {
        const error = new Error('Property not found');
        error.status = 404;
        throw error;
    }

    return deletedProperty;
};


export default {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty
}
