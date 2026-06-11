import pool from '../db/pool.js';

const shouldReset = process.argv.includes('--reset');
const shouldSeedEmpty = process.argv.includes('--empty-only');
const expiryOffsets = [7, 14, 21, 29, 30, 38, 45, 59, 60, 72, 84, 90];
const activeStartDates = [
    '2025-01-01',
    '2025-04-01',
    '2025-07-01',
    '2025-10-01',
    '2026-01-01',
    '2026-03-01'
];
const longTermEndDates = [
    '2027-03-31',
    '2027-06-30',
    '2027-09-30',
    '2027-12-31'
];

const propertyFixtures = [
    {
        name: 'Ancestors Court',
        address: '14 Bourdillon Road, Ikoyi, Lagos',
        location: 'Ikoyi, Lagos',
        description: 'Premium residential apartments with shared security, water, and power services.',
        method: 'pro_rata',
        totalBudget: 7500000,
        paymentRatios: [0.4, 1, 0, 0.7],
        units: [
            { name: 'A1', area: 120, bedrooms: 2, tenant: 'Test Tenant' },
            { name: 'A2', area: 180, bedrooms: 3, tenant: 'Adaeze Okafor' },
            { name: 'B1', area: 140, bedrooms: 2, tenant: 'Tunde Adeyemi' },
            { name: 'B2', area: 160, bedrooms: 3, tenant: 'Maryam Ibrahim' }
        ]
    },
    {
        name: 'Palm Grove Residences',
        address: '8 Fola Osibo Street, Lekki Phase 1, Lagos',
        location: 'Lekki Phase 1, Lagos',
        description: 'Small residential block using an equal service charge per apartment.',
        method: 'flat_rate',
        totalBudget: 3600000,
        paymentRatios: [1, 1, 1, 1],
        units: [
            { name: 'Flat 1', area: 95, bedrooms: 2, tenant: 'Kemi Balogun' },
            { name: 'Flat 2', area: 105, bedrooms: 2, tenant: 'Chinedu Eze' },
            { name: 'Flat 3', area: 125, bedrooms: 3, tenant: 'Bola Lawal' },
            { name: 'Flat 4', area: 130, bedrooms: 3, tenant: 'Zainab Bello' }
        ]
    },
    {
        name: 'Unity Heights',
        address: '21 Herbert Macaulay Way, Yaba, Lagos',
        location: 'Yaba, Lagos',
        description: 'Mixed apartment sizes allocated by measured floor area.',
        method: 'pro_rata',
        totalBudget: 5400000,
        paymentRatios: [0.5, 0.5, 0.25, 0.75, 0.5],
        units: [
            { name: '1A', area: 70, bedrooms: 1, tenant: 'Seyi Adebayo' },
            { name: '1B', area: 85, bedrooms: 2, tenant: 'Ngozi Nwosu' },
            { name: '2A', area: 100, bedrooms: 2, tenant: 'David Ojo' },
            { name: '2B', area: 115, bedrooms: 3, tenant: 'Fatima Musa' },
            { name: 'Penthouse', area: 180, bedrooms: 4, tenant: 'Ifeanyi Obi' }
        ]
    },
    {
        name: 'Maitama Business Suites',
        address: '32 Aguiyi Ironsi Street, Maitama, Abuja',
        location: 'Maitama, Abuja',
        description: 'Professional office suites with area-based facilities charges.',
        method: 'pro_rata',
        totalBudget: 12000000,
        paymentRatios: [0.75, 0.5, 1, 0.25],
        units: [
            { name: 'Suite 101', area: 150, bedrooms: null, tenant: 'Northstar Legal Partners' },
            { name: 'Suite 102', area: 210, bedrooms: null, tenant: 'Savannah Advisory Ltd' },
            { name: 'Suite 201', area: 280, bedrooms: null, tenant: 'Apex Energy Services' },
            { name: 'Suite 202', area: 360, bedrooms: null, tenant: 'Capital Health Group' }
        ]
    },
    {
        name: 'Cedar Court',
        address: '11 Isaac John Street, Ikeja GRA, Lagos',
        location: 'Ikeja GRA, Lagos',
        description: 'Three-family property using a simple flat service charge.',
        method: 'flat_rate',
        totalBudget: 2400000,
        paymentRatios: [1, 1, 1],
        units: [
            { name: 'Ground Floor', area: 145, bedrooms: 3, tenant: 'Lola Ogunleye' },
            { name: 'First Floor', area: 145, bedrooms: 3, tenant: 'Kunle Afolayan' },
            { name: 'Second Floor', area: 145, bedrooms: 3, tenant: 'Nneka Okonkwo' }
        ]
    },
    {
        name: 'Oceanview Apartments',
        address: '5 Adeola Odeku Street, Victoria Island, Lagos',
        location: 'Victoria Island, Lagos',
        description: 'Serviced apartments with varied unit sizes and partial service charge payments.',
        method: 'pro_rata',
        totalBudget: 9800000,
        paymentRatios: [0.3, 0.6, 0.4, 0.8, 0.5],
        units: [
            { name: 'Apartment 1', area: 110, bedrooms: 2, tenant: 'Amaka Onyeka' },
            { name: 'Apartment 2', area: 135, bedrooms: 2, tenant: 'Hassan Usman' },
            { name: 'Apartment 3', area: 155, bedrooms: 3, tenant: 'Grace Adewale' },
            { name: 'Apartment 4', area: 190, bedrooms: 3, tenant: 'Emeka Okoro' },
            { name: 'Penthouse', area: 260, bedrooms: 4, tenant: 'Daniel Yakubu' }
        ]
    },
    {
        name: 'Arewa Plaza',
        address: '18 Aminu Kano Crescent, Wuse 2, Abuja',
        location: 'Wuse 2, Abuja',
        description: 'Neighbourhood retail plaza sharing common services equally.',
        method: 'flat_rate',
        totalBudget: 4500000,
        paymentRatios: [0.6, 0.6, 0.6, 0.6, 0.6],
        units: [
            { name: 'Shop 01', area: 60, bedrooms: null, tenant: 'Kubwa Foods Ltd' },
            { name: 'Shop 02', area: 75, bedrooms: null, tenant: 'Amina Textiles' },
            { name: 'Shop 03', area: 80, bedrooms: null, tenant: 'Jabi Pharmacy Ltd' },
            { name: 'Shop 04', area: 90, bedrooms: null, tenant: 'Bello Electronics' },
            { name: 'Shop 05', area: 100, bedrooms: null, tenant: 'Sahel Home Stores' }
        ]
    },
    {
        name: 'Maple Terraces',
        address: '27 Diya Street, Gbagada Phase 2, Lagos',
        location: 'Gbagada, Lagos',
        description: 'Terraced homes including one unit that is currently vacant.',
        method: 'pro_rata',
        totalBudget: 6200000,
        periodStart: '2025-01-01',
        periodEnd: '2025-12-31',
        dueDate: '2025-02-15',
        paymentRatios: [0.8, 0.8, 0.8, 0.5],
        units: [
            { name: 'Terrace 1', area: 165, bedrooms: 3, tenant: 'Uche Nwosu' },
            { name: 'Terrace 2', area: 165, bedrooms: 3, tenant: 'Tomi Adeyemi' },
            { name: 'Terrace 3', area: 180, bedrooms: 4, tenant: 'Segun Balogun' },
            { name: 'Terrace 4', area: 180, bedrooms: 4, tenant: 'Former Occupant', expired: true }
        ]
    },
    {
        name: 'Heritage Gardens',
        address: '6 Jericho Road, Ibadan, Oyo State',
        location: 'Jericho, Ibadan',
        description: 'Residential estate demonstrating mostly unpaid demands and follow-up reminders.',
        method: 'flat_rate',
        totalBudget: 3000000,
        paymentRatios: [0.1, 0, 0, 0],
        units: [
            { name: 'House 1', area: 130, bedrooms: 3, tenant: 'Wale Ajayi' },
            { name: 'House 2', area: 130, bedrooms: 3, tenant: 'Bisola Adeniran' },
            { name: 'House 3', area: 150, bedrooms: 4, tenant: 'Chiamaka Eze' },
            { name: 'House 4', area: 150, bedrooms: 4, tenant: 'Musa Abdullahi' }
        ]
    },
    {
        name: 'Coal City Court',
        address: '16 Independence Layout, Enugu, Enugu State',
        location: 'Independence Layout, Enugu',
        description: 'Family apartments with service charges allocated by floor area.',
        method: 'pro_rata',
        totalBudget: 4800000,
        paymentRatios: [1, 1, 1, 1],
        units: [
            { name: 'Block A Flat 1', area: 100, bedrooms: 2, tenant: 'Obinna Okafor' },
            { name: 'Block A Flat 2', area: 120, bedrooms: 3, tenant: 'Nkiru Eze' },
            { name: 'Block B Flat 1', area: 100, bedrooms: 2, tenant: 'Ijeoma Nwankwo' },
            { name: 'Block B Flat 2', area: 140, bedrooms: 3, tenant: 'Chukwudi Obi' }
        ]
    }
];

const insertRow = async (client, sql, values) => {
    const result = await client.query(sql, values);
    return result.rows[0];
};

const slugify = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

const dateAfterDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
};

const allocateBudget = (totalBudget, units, method) => {
    const totalCents = Math.round(totalBudget * 100);
    const totalArea = units.reduce((sum, unit) => sum + unit.area, 0);
    const rawWeights = method === 'flat_rate'
        ? units.map(() => 1 / units.length)
        : units.map((unit) => unit.area / totalArea);
    const allocations = rawWeights.map((weight) => Math.floor(totalCents * weight));
    let remainder = totalCents - allocations.reduce((sum, value) => sum + value, 0);

    for(let index = 0; remainder > 0; index = (index + 1) % allocations.length) {
        allocations[index] += 1;
        remainder -= 1;
    }

    return allocations.map((cents, index) => ({
        percentageShare: rawWeights[index],
        charge: cents / 100
    }));
};

const getApplicationRecordCount = async (client) => {
    const result = await client.query(`
        SELECT (
            (SELECT COUNT(*) FROM properties)
            + (SELECT COUNT(*) FROM units)
            + (SELECT COUNT(*) FROM tenants)
            + (SELECT COUNT(*) FROM leases)
            + (SELECT COUNT(*) FROM service_charge_budgets)
            + (SELECT COUNT(*) FROM service_charge_allocations)
            + (SELECT COUNT(*) FROM service_charge_demands)
            + (SELECT COUNT(*) FROM payments)
            + (SELECT COUNT(*) FROM reminders)
        )::int AS count
    `);

    return result.rows[0].count;
};

const resetApplicationData = async (client) => {
    await client.query(`
        TRUNCATE TABLE
            payments,
            reminders,
            service_charge_demands,
            service_charge_allocations,
            service_charge_budgets,
            leases,
            units,
            tenants,
            properties
        RESTART IDENTITY
    `);
    await client.query('ALTER SEQUENCE IF EXISTS service_charge_demand_reference_seq RESTART WITH 1');
};

const seedProperty = async (client, fixture, propertyIndex, adminId, created) => {
    const periodStart = fixture.periodStart || '2026-01-01';
    const periodEnd = fixture.periodEnd || '2026-12-31';
    const dueDate = fixture.dueDate || '2026-02-15';
    const property = await insertRow(
        client,
        `
            INSERT INTO properties (property_name, address, location, property_description)
            VALUES ($1, $2, $3, $4)
            RETURNING id, property_name
        `,
        [fixture.name, fixture.address, fixture.location, fixture.description]
    );
    created.properties += 1;

    const unitRecords = [];

    for(let unitIndex = 0; unitIndex < fixture.units.length; unitIndex += 1) {
        const unitFixture = fixture.units[unitIndex];
        const globalLeaseIndex = created.leases;
        const expiryOffset = expiryOffsets[globalLeaseIndex];
        const activeStartDate = activeStartDates[globalLeaseIndex % activeStartDates.length];
        const activeEndDate = expiryOffset
            ? dateAfterDays(expiryOffset)
            : longTermEndDates[globalLeaseIndex % longTermEndDates.length];
        const unit = await insertRow(
            client,
            `
                INSERT INTO units (property_id, unit_name, floor_area_sqm, bedrooms, status)
                VALUES ($1, $2, $3, $4, 'active')
                RETURNING id, unit_name, floor_area_sqm
            `,
            [property.id, unitFixture.name, unitFixture.area, unitFixture.bedrooms]
        );
        created.units += 1;

        const tenant = await insertRow(
            client,
            `
                INSERT INTO tenants (full_name, phone_number, email, alternative_contact)
                VALUES ($1, $2, $3, $4)
                RETURNING id, full_name, phone_number, email
            `,
            [
                unitFixture.tenant,
                `+23480${String(propertyIndex + 1).padStart(2, '0')}${String(unitIndex + 1).padStart(6, '0')}`,
                `${slugify(unitFixture.tenant)}.${propertyIndex + 1}@tenora-demo.local`,
                `Property manager: +234 809 000 ${String(propertyIndex + 1).padStart(2, '0')}${String(unitIndex + 1).padStart(2, '0')}`
            ]
        );
        created.tenants += 1;

        const lease = await insertRow(
            client,
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
                    occupied_space
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 'yearly', $9, $10)
                RETURNING id, status
            `,
            [
                property.id,
                tenant.id,
                unit.id,
                unit.unit_name,
                unitFixture.bedrooms ? `${unitFixture.bedrooms}-bedroom unit` : 'Commercial unit',
                unitFixture.expired ? '2025-01-01' : activeStartDate,
                unitFixture.expired ? '2025-12-31' : activeEndDate,
                Math.round(unitFixture.area * (unitFixture.bedrooms ? 18000 : 30000)),
                unitFixture.expired ? 'expired' : 'active',
                unitFixture.area
            ]
        );
        created.leases += 1;
        if(expiryOffset && !unitFixture.expired) {
            created.expiringLeases += 1;
        }
        unitRecords.push({ unit, tenant, lease, fixture: unitFixture });
    }

    const allocationAmounts = allocateBudget(fixture.totalBudget, fixture.units, fixture.method);
    const totalArea = fixture.units.reduce((sum, unit) => sum + unit.area, 0);
    const budget = await insertRow(
        client,
        `
            INSERT INTO service_charge_budgets (
                property_id,
                budget_title,
                total_budget,
                period_start,
                period_end,
                calculation_method,
                basis,
                status,
                total_units,
                total_area_sqm,
                calculated_total,
                final_total,
                due_date,
                payment_instruction,
                budget_note,
                calculated_at,
                approved_at,
                approved_by,
                issued_at,
                issued_by
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, 'issued', $8, $9, $3, $3, $10,
                $11, $12, '2026-01-05 09:00:00', '2026-01-06 10:00:00', $13,
                '2026-01-07 11:00:00', $13
            )
            RETURNING id
        `,
        [
            property.id,
            fixture.name === 'Ancestors Court' ? '2026 Service Charge Budget' : `${periodStart.slice(0, 4)} Service Charge Budget`,
            fixture.totalBudget,
            periodStart,
            periodEnd,
            fixture.method,
            fixture.method === 'pro_rata' ? 'floor_area' : null,
            fixture.units.length,
            totalArea,
            dueDate,
            'Pay by bank transfer and quote the demand reference.',
            fixture.method === 'flat_rate'
                ? 'Equal charge per unit.'
                : 'Allocated according to each unit floor area.',
            adminId
        ]
    );
    created.budgets += 1;

    for(let unitIndex = 0; unitIndex < unitRecords.length; unitIndex += 1) {
        const record = unitRecords[unitIndex];
        const allocationAmount = allocationAmounts[unitIndex];
        const allocation = await insertRow(
            client,
            `
                INSERT INTO service_charge_allocations (
                    budget_id,
                    unit_id,
                    lease_id,
                    tenant_id,
                    unit_name_snapshot,
                    tenant_name_snapshot,
                    tenant_email_snapshot,
                    tenant_phone_snapshot,
                    floor_area_sqm_snapshot,
                    percentage_share,
                    calculated_charge,
                    final_charge,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, 'issued')
                RETURNING id
            `,
            [
                budget.id,
                record.unit.id,
                record.lease.id,
                record.tenant.id,
                record.unit.unit_name,
                record.tenant.full_name,
                record.tenant.email,
                record.tenant.phone_number,
                record.fixture.area,
                allocationAmount.percentageShare,
                allocationAmount.charge
            ]
        );
        created.allocations += 1;

        const paymentRatio = fixture.paymentRatios[unitIndex] ?? fixture.paymentRatios[0] ?? 0;
        const amountPaid = Math.round(allocationAmount.charge * paymentRatio * 100) / 100;
        const balance = Math.round((allocationAmount.charge - amountPaid) * 100) / 100;
        const demandStatus = balance === 0 ? 'paid' : amountPaid > 0 ? 'part_paid' : 'overdue';
        const demand = await insertRow(
            client,
            `
                INSERT INTO service_charge_demands (
                    demand_reference,
                    demand_title,
                    property_id,
                    lease_id,
                    tenant_id,
                    unit_id,
                    budget_id,
                    allocation_id,
                    period_start,
                    period_end,
                    total_amount,
                    amount_paid,
                    balance,
                    due_date,
                    status,
                    payment_instruction,
                    demand_note,
                    issued_at,
                    issued_by
                )
                VALUES (
                    'SCD-' || EXTRACT(YEAR FROM $9::date)::INT || '-' || LPAD(nextval('service_charge_demand_reference_seq')::TEXT, 4, '0'),
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    'Pay by bank transfer and quote the demand reference.',
                    'Generated from the approved service charge budget.',
                    '2026-01-07 11:00:00',
                    $15
                )
                RETURNING id, demand_reference
            `,
            [
                `${periodStart.slice(0, 4)} Service Charge Demand`,
                property.id,
                record.lease.id,
                record.tenant.id,
                record.unit.id,
                budget.id,
                allocation.id,
                periodStart,
                periodEnd,
                allocationAmount.charge,
                amountPaid,
                balance,
                dueDate,
                demandStatus,
                adminId
            ]
        );
        created.demands += 1;

        if(amountPaid > 0) {
            await client.query(
                `
                    INSERT INTO payments (
                        lease_id,
                        service_charge_demand_id,
                        payment_category,
                        amount_paid,
                        payment_date,
                        payment_for_period_start,
                        payment_for_period_end,
                        payment_method,
                        receipt_number,
                        status,
                        notes
                    )
                    VALUES ($1, $2, 'service_charge', $3, $4, $5, $6, 'bank_transfer', $7, 'paid', $8)
                `,
                [
                    record.lease.id,
                    demand.id,
                    amountPaid,
                    periodStart.startsWith('2025')
                        ? '2025-02-10'
                        : (propertyIndex + unitIndex) % 3 === 0
                            ? dateAfterDays(-((propertyIndex + unitIndex) % 10))
                            : '2026-02-10',
                    periodStart,
                    periodEnd,
                    `TNR-DEMO-${String(propertyIndex + 1).padStart(2, '0')}-${String(unitIndex + 1).padStart(2, '0')}`,
                    paymentRatio === 1 ? 'Service charge paid in full.' : 'Part payment against service charge demand.'
                ]
            );
            created.payments += 1;
        }

        if(balance > 0) {
            await client.query(
                `
                    INSERT INTO reminders (
                        lease_id,
                        service_charge_demand_id,
                        reminder_type,
                        due_date,
                        scheduled_send_date,
                        channel,
                        status,
                        acknowledged,
                        message_content
                    )
                    VALUES ($1, $2, 'service_charge_due', $3, $4, $5, 'pending', FALSE, $6)
                `,
                [
                    record.lease.id,
                    demand.id,
                    dueDate,
                    dueDate,
                    unitIndex % 2 === 0 ? 'email' : 'sms',
                    `Reminder: ${record.tenant.full_name} has an outstanding service charge balance for ${record.unit.unit_name}.`
                ]
            );
            created.reminders += 1;
        }
    }

    const firstRecord = unitRecords[0];
    const firstRecordRent = Math.round(
        firstRecord.fixture.area * (firstRecord.fixture.bedrooms ? 18000 : 30000)
    );

    await client.query(
        `
            INSERT INTO payments (
                lease_id,
                payment_category,
                amount_paid,
                payment_date,
                payment_for_period_start,
                payment_for_period_end,
                payment_method,
                receipt_number,
                status,
                notes
            )
            VALUES ($1, 'rent', $2, $3, $4, $5, $6, $7, 'paid', $8)
        `,
        [
            firstRecord.lease.id,
            firstRecordRent,
            propertyIndex < 3 ? `2025-${String(propertyIndex + 3).padStart(2, '0')}-15` : dateAfterDays(-(propertyIndex + 2)),
            propertyIndex < 3 ? '2025-01-01' : '2026-01-01',
            propertyIndex < 3 ? '2025-12-31' : '2026-12-31',
            propertyIndex % 2 === 0 ? 'bank_transfer' : 'card',
            `TNR-RENT-${String(propertyIndex + 1).padStart(2, '0')}`,
            `Annual rent recorded for ${fixture.name}, ${firstRecord.unit.unit_name}.`
        ]
    );
    created.payments += 1;

    if(!fixture.paymentRatios.some((ratio) => ratio < 1)) {
        await client.query(
            `
                INSERT INTO reminders (
                    lease_id,
                    reminder_type,
                    due_date,
                    scheduled_send_date,
                    channel,
                    status,
                    acknowledged,
                    message_content
                )
                VALUES ($1, 'inspection', '2026-09-15', '2026-09-08', 'email', 'pending', FALSE, $2)
            `,
            [
                firstRecord.lease.id,
                `Routine property inspection reminder for ${fixture.name}, ${firstRecord.unit.unit_name}.`
            ]
        );
        created.reminders += 1;
    }
};

const run = async () => {
    if(!shouldReset && !shouldSeedEmpty) {
        console.error('Choose a safe mode: npm run seed:demo:empty or npm run seed:demo:reset');
        process.exitCode = 1;
        await pool.end();
        return;
    }

    const client = await pool.connect();
    const created = {
        properties: 0,
        units: 0,
        tenants: 0,
        leases: 0,
        budgets: 0,
        allocations: 0,
        demands: 0,
        payments: 0,
        reminders: 0,
        expiringLeases: 0
    };

    try {
        await client.query('BEGIN');

        const usersBeforeResult = await client.query('SELECT COUNT(*)::int AS count FROM users');
        const usersBefore = usersBeforeResult.rows[0].count;
        const adminResult = await client.query(
            `SELECT id FROM users WHERE is_active = TRUE ORDER BY (role = 'admin') DESC, created_at LIMIT 1`
        );
        const adminId = adminResult.rows[0]?.id || null;

        if(shouldSeedEmpty) {
            const existingApplicationRecords = await getApplicationRecordCount(client);

            if(existingApplicationRecords > 0) {
                throw new Error(
                    `Empty-only seed refused: found ${existingApplicationRecords} existing application records.`
                );
            }
        } else {
            await resetApplicationData(client);
        }

        for(let index = 0; index < propertyFixtures.length; index += 1) {
            await seedProperty(client, propertyFixtures[index], index, adminId, created);
        }

        const usersAfterResult = await client.query('SELECT COUNT(*)::int AS count FROM users');
        const usersAfter = usersAfterResult.rows[0].count;

        if(usersBefore !== usersAfter) {
            throw new Error(`User preservation check failed: before=${usersBefore}, after=${usersAfter}`);
        }

        if(created.properties !== 10) {
            throw new Error(`Expected 10 properties, created ${created.properties}`);
        }

        const expiryResult = await client.query(`
            SELECT COUNT(*)::int AS count
            FROM leases
            WHERE status = 'active'
              AND end_date >= CURRENT_DATE
              AND end_date <= CURRENT_DATE + INTERVAL '90 days'
        `);
        const visibleExpiringLeases = expiryResult.rows[0].count;

        if(visibleExpiringLeases < 10) {
            throw new Error(`Expected at least 10 visible expiring leases, created ${visibleExpiringLeases}`);
        }

        await client.query('COMMIT');

        console.log(
            shouldSeedEmpty
                ? 'Tenora empty database seeded successfully.'
                : 'Tenora application data reset and demo data seeded successfully.'
        );
        console.log(`Users preserved: ${usersAfter}`);
        console.log(`Leases expiring within 90 days: ${visibleExpiringLeases}`);
        console.table(created);
        console.log('Full-flow example: Ancestors Court / A1 / Test Tenant / 2026 Service Charge Budget');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Reset/seed failed. All changes were rolled back.');
        console.error(error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
};

run();
