import pool from '../db/pool.js';

const getAllProperties = async () => {
    const result = await pool.query(`
        SELECT *
        FROM properties
        ORDER BY created_at DESC
    `);

    return result.rows;
}

const getPropertyById = async (id) => {
    const result = await pool.query(
        `
            SELECT * FROM properties WHERE id = $1
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
        property_code,
        property_name,
        name,
        address,
        location,
        property_description,
        total_units,
        total_lettable_space
    } = propertyData;

    if(!address) {
        const error = new Error('Property address is required');
        error.status = 400;
        throw error;
    }

    const result = await pool.query(`
        INSERT INTO properties (
            property_code,
            property_name,
            address,
            location,
            property_description,
            total_units,
            total_lettable_space
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
            property_code,
            property_name || name,
            address,
            location,
            property_description,
            total_units,
            total_lettable_space
        ]
    );

    return result.rows[0];
}

const updateProperty = async (id, propertyData) => {
    const existingProperty = await getPropertyById(id);

    const {
        property_code = existingProperty.property_code,
        property_name = existingProperty.property_name,
        name,
        address = existingProperty.address,
        location = existingProperty.location,
        property_description = existingProperty.property_description,
        total_units = existingProperty.total_units,
        total_lettable_space = existingProperty.total_lettable_space
    } = propertyData;

    const result = await pool.query(
        `
            UPDATE properties
            SET
                property_code = $1,
                property_name = $2,
                address = $3,
                location = $4,
                property_description = $5,
                total_units = $6,
                total_lettable_space = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `,
        [
            property_code,
            property_name || name,
            address,
            location,
            property_description,
            total_units,
            total_lettable_space,
            id
        ]
    );

    return result.rows[0];
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
                    property_code,
                    property_name,
                    address,
                    location,
                    property_description,
                    total_units,
                    total_lettable_space,
                    created_at,
                    updated_at
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
