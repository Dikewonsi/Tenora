const isMissing = (value) => value === undefined || value === null || value === '';

const normalizeOptionalArea = (value, label) => {
    if(isMissing(value)) {
        return null;
    }

    const area = Number(value);

    if(!Number.isFinite(area) || area < 0) {
        const error = new Error(`${label} must be zero or greater`);
        error.status = 400;
        throw error;
    }

    return area;
};

const normalizeUnitData = (unitData = {}, { requireProperty = true } = {}) => {
    const propertyId = unitData.property_id;
    const unitName = String(unitData.unit_name || '').trim();
    const floorArea = normalizeOptionalArea(unitData.floor_area_sqm, 'Floor area');
    const bedrooms = isMissing(unitData.bedrooms) ? null : Number(unitData.bedrooms);
    const status = unitData.status || 'active';

    if((requireProperty && !propertyId) || !unitName) {
        const error = new Error(requireProperty
            ? 'Property and unit name/number are required'
            : 'Unit name/number is required');
        error.status = 400;
        throw error;
    }

    if(bedrooms !== null && (!Number.isInteger(bedrooms) || bedrooms < 0)) {
        const error = new Error('Bedrooms must be a whole number of zero or greater');
        error.status = 400;
        throw error;
    }

    if(!['active', 'inactive'].includes(status)) {
        const error = new Error('Unit status must be active or inactive');
        error.status = 400;
        throw error;
    }

    return {
        property_id: propertyId,
        unit_name: unitName,
        floor_area_sqm: floorArea,
        bedrooms,
        status
    };
};

const assertConfiguredAreaWithinTotal = ({ configuredArea, totalLettableSpace }) => {
    if(configuredArea <= 0) {
        return;
    }

    if(totalLettableSpace === null || totalLettableSpace <= 0) {
        const error = new Error('Enter a positive total lettable space before adding units with floor area');
        error.status = 400;
        throw error;
    }

    if(configuredArea - totalLettableSpace > 0.0001) {
        const error = new Error(
            `Configured unit area (${configuredArea.toFixed(2)} sqm) cannot exceed total lettable space (${totalLettableSpace.toFixed(2)} sqm)`
        );
        error.status = 400;
        throw error;
    }
};

const getPropertyAreaState = async (client, propertyId, { excludeUnitId = null, lock = false } = {}) => {
    const propertyResult = await client.query(
        `
            SELECT id, total_lettable_space
            FROM properties
            WHERE id = $1
            ${lock ? 'FOR UPDATE' : ''}
        `,
        [propertyId]
    );
    const property = propertyResult.rows[0];

    if(!property) {
        const error = new Error('Selected property does not exist');
        error.status = 400;
        throw error;
    }

    const areaResult = await client.query(
        `
            SELECT COALESCE(SUM(floor_area_sqm), 0) AS configured_unit_area_sqm
            FROM units
            WHERE property_id = $1
              AND ($2::uuid IS NULL OR id <> $2)
        `,
        [propertyId, excludeUnitId]
    );

    return {
        totalLettableSpace: property.total_lettable_space === null
            ? null
            : Number(property.total_lettable_space),
        configuredUnitArea: Number(areaResult.rows[0].configured_unit_area_sqm || 0)
    };
};

export {
    assertConfiguredAreaWithinTotal,
    getPropertyAreaState,
    isMissing,
    normalizeOptionalArea,
    normalizeUnitData
};
