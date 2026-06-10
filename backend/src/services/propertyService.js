import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

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
        SELECT SUM(units.floor_area_sqm)
        FROM units
        WHERE units.property_id = properties.id
          AND units.status = 'active'
    ), 0) AS total_lettable_space,
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
        property_description
    } = propertyData;

    if(!address) {
        const error = new Error('Property address is required');
        error.status = 400;
        throw error;
    }

    const result = await pool.query(`
        INSERT INTO properties (
            property_name,
            address,
            location,
            property_description
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [
            property_name || name,
            address,
            location,
            property_description
        ]
    );

    return getPropertyById(result.rows[0].id);
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

    const result = await pool.query(
        `
            UPDATE properties
            SET
                property_name = $1,
                address = $2,
                location = $3,
                property_description = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING id
        `,
        [
            property_name || name,
            address,
            location,
            property_description,
            id
        ]
    );

    return getPropertyById(result.rows[0].id);
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
