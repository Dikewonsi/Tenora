import pool from '../db/pool.js';

const args = new Set(process.argv.slice(2));
const shouldReset = args.has('--reset');
const now = new Date();
const runCode = now.toISOString().slice(0, 10).replaceAll('-', '');

const locations = [
    'Victoria Island', 'Lekki Phase 1', 'Ikoyi', 'Ikeja GRA', 'Yaba', 'Surulere',
    'Maryland', 'Ajah', 'Gbagada', 'Magodo', 'Oniru', 'Sangotedo'
];

const propertyTypes = [
    'Residential Block', 'Retail Plaza', 'Mixed-use Complex', 'Office Building',
    'Mini Estate', 'Serviced Apartments'
];

const firstNames = [
    'Amina', 'Tunde', 'Chika', 'Bola', 'Kemi', 'Ifeanyi', 'Ada', 'Segun', 'Maryam',
    'David', 'Zainab', 'Emeka', 'Tomi', 'Fatima', 'Seyi', 'Ngozi', 'Uche', 'Lola',
    'Kunle', 'Nneka', 'Hassan', 'Grace', 'Daniel', 'Amaka'
];

const lastNames = [
    'Adeyemi', 'Okafor', 'Balogun', 'Ibrahim', 'Eze', 'Afolayan', 'Nwosu', 'Usman',
    'Ojo', 'Lawal', 'Okonkwo', 'Bello', 'Onyeka', 'Adewale', 'Musa', 'Obi',
    'Ogunleye', 'Yakubu', 'Okoro', 'Adebayo'
];

const serviceCategories = [
    'Security', 'Cleaning', 'Waste disposal', 'Generator maintenance',
    'Water supply', 'Facility management', 'Lift maintenance', 'Common area lighting'
];

const paymentMethods = ['bank_transfer', 'card', 'cash', 'cheque'];
const channels = ['email', 'sms', 'phone', 'letter'];

const pick = (items, index) => items[index % items.length];
const pad = (number, length = 3) => String(number).padStart(length, '0');
const randomish = (seed, min, max) => min + ((seed * 9301 + 49297) % 233280) % (max - min + 1);
const dateOnly = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};
const addMonths = (date, months) => {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate;
};

const insertRow = async (client, sql, values) => {
    const result = await client.query(sql, values);
    return result.rows[0];
};

const resetSeededData = async (client) => {
    await client.query(`
        DELETE FROM reminders
        WHERE lease_id IN (
            SELECT id FROM leases WHERE property_id IN (
                SELECT id FROM properties WHERE property_code LIKE 'TNR-%'
            )
        )
        OR service_charge_demand_id IN (
            SELECT id FROM service_charge_demands WHERE property_id IN (
                SELECT id FROM properties WHERE property_code LIKE 'TNR-%'
            )
        )
    `);

    await client.query(`
        DELETE FROM payments
        WHERE lease_id IN (
            SELECT id FROM leases WHERE property_id IN (
                SELECT id FROM properties WHERE property_code LIKE 'TNR-%'
            )
        )
    `);

    await client.query(`
        DELETE FROM service_charge_demand_items
        WHERE demand_id IN (
            SELECT id FROM service_charge_demands WHERE property_id IN (
                SELECT id FROM properties WHERE property_code LIKE 'TNR-%'
            )
        )
    `);

    await client.query(`
        DELETE FROM service_charge_demands
        WHERE property_id IN (
            SELECT id FROM properties WHERE property_code LIKE 'TNR-%'
        )
    `);

    await client.query(`
        DELETE FROM leases
        WHERE property_id IN (
            SELECT id FROM properties WHERE property_code LIKE 'TNR-%'
        )
    `);

    await client.query(`
        DELETE FROM properties
        WHERE property_code LIKE 'TNR-%'
    `);

    await client.query(`
        DELETE FROM tenants
        WHERE email LIKE '%@tenora-demo.local'
    `);
};

const seed = async () => {
    const client = await pool.connect();
    const created = {
        properties: 0,
        tenants: 0,
        leases: 0,
        payments: 0,
        demands: 0,
        demandItems: 0,
        reminders: 0
    };

    try {
        await client.query('BEGIN');

        if (shouldReset) {
            await resetSeededData(client);
        }

        const tenants = [];
        for (let index = 1; index <= 320; index += 1) {
            const fullName = `${pick(firstNames, index)} ${pick(lastNames, index * 3)}`;
            const tenant = await insertRow(
                client,
                `
                    INSERT INTO tenants (
                        full_name,
                        phone_number,
                        email,
                        alternative_contact,
                        id_card_url,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id, full_name
                `,
                [
                    fullName,
                    `+23480${randomish(index, 10000000, 99999999)}`,
                    `tenant-${runCode}-${pad(index)}@tenora-demo.local`,
                    `+23470${randomish(index + 11, 10000000, 99999999)}`,
                    `https://demo.tenora.local/id-cards/${runCode}-${pad(index)}.pdf`,
                    addDays(now, -randomish(index, 120, 720)),
                    addDays(now, -randomish(index, 1, 60))
                ]
            );

            tenants.push(tenant);
            created.tenants += 1;
        }

        const properties = [];
        for (let index = 1; index <= 72; index += 1) {
            const location = pick(locations, index);
            const type = pick(propertyTypes, index * 2);
            const totalUnits = randomish(index, 2, 12);
            const lettableSpace = totalUnits * randomish(index + 8, 55, 240);
            const property = await insertRow(
                client,
                `
                    INSERT INTO properties (
                        property_code,
                        property_name,
                        address,
                        location,
                        property_description,
                        total_units,
                        total_lettable_space,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id, property_code, property_name, location, total_units, total_lettable_space
                `,
                [
                    `TNR-${runCode}-${pad(index)}`,
                    `${location} ${type} ${pad(index, 2)}`,
                    `${randomish(index, 2, 240)} ${pick(['Akin Adesola', 'Admiralty', 'Allen Avenue', 'Bourdillon', 'Awolowo', 'Freedom Way'], index)} Street, ${location}, Lagos`,
                    location,
                    `${type} managed by Tenora demo operations`,
                    totalUnits,
                    lettableSpace,
                    addDays(now, -randomish(index, 450, 820)),
                    addDays(now, -randomish(index, 1, 40))
                ]
            );

            properties.push(property);
            created.properties += 1;
        }

        const leases = [];
        let tenantCursor = 0;
        for (let propertyIndex = 0; propertyIndex < properties.length; propertyIndex += 1) {
            const property = properties[propertyIndex];
            const leaseCount = Math.max(1, Number(property.total_units) - randomish(propertyIndex, 0, 2));

            for (let unitIndex = 1; unitIndex <= leaseCount; unitIndex += 1) {
                const tenant = tenants[tenantCursor % tenants.length];
                tenantCursor += 1;

                const seedValue = propertyIndex * 17 + unitIndex;
                const startDate = addMonths(now, -randomish(seedValue, 2, 26));
                const leaseLengthMonths = randomish(seedValue, 12, 36);
                let endDate = addMonths(startDate, leaseLengthMonths);
                let status = endDate < now
                    ? 'expired'
                    : randomish(seedValue, 1, 100) <= 7
                        ? 'terminated'
                        : 'active';
                if (status === 'active' && seedValue % 19 === 0) {
                    endDate = addDays(now, randomish(seedValue, 21, 88));
                    status = 'active';
                }
                const rentAmount = randomish(seedValue, 900000, 8500000);
                const serviceChargeAmount = randomish(seedValue + 14, 120000, 1650000);
                const occupiedSpace = randomish(seedValue, 45, 260);
                const nextRentDueDate = status === 'active'
                    ? addMonths(startDate, Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24 * 30))))
                    : null;

                const lease = await insertRow(
                    client,
                    `
                        INSERT INTO leases (
                            property_id,
                            tenant_id,
                            unit_number,
                            unit_description,
                            start_date,
                            end_date,
                            rent_amount,
                            service_charge_amount,
                            payment_frequency,
                            status,
                            next_rent_due_date,
                            reminder_6_month_date,
                            reminder_3_month_date,
                            last_reviewed_date,
                            rent_review_note,
                            occupied_space,
                            created_at,
                            updated_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                        RETURNING id, property_id, tenant_id, unit_number, start_date, end_date, rent_amount, service_charge_amount, status, next_rent_due_date, occupied_space
                    `,
                    [
                        property.id,
                        tenant.id,
                        `Unit ${pad(unitIndex, 2)}`,
                        pick(['Retail shell', 'Office suite', 'Two-bedroom flat', 'Three-bedroom flat', 'Studio apartment'], seedValue),
                        dateOnly(startDate),
                        dateOnly(endDate),
                        rentAmount,
                        serviceChargeAmount,
                        pick(['monthly', 'quarterly', 'yearly'], seedValue),
                        status,
                        nextRentDueDate ? dateOnly(nextRentDueDate) : null,
                        dateOnly(addMonths(endDate, -6)),
                        dateOnly(addMonths(endDate, -3)),
                        dateOnly(addDays(now, -randomish(seedValue, 20, 180))),
                        pick(['Reviewed for annual uplift', 'Tenant requested renewal option', 'Awaiting facilities review', 'Standard rent review completed'], seedValue),
                        occupiedSpace,
                        dateOnly(addDays(startDate, -randomish(seedValue, 2, 25))),
                        dateOnly(addDays(now, -randomish(seedValue, 1, 45)))
                    ]
                );

                leases.push(lease);
                created.leases += 1;
            }
        }

        for (let index = 0; index < leases.length; index += 1) {
            const lease = leases[index];
            const start = new Date(lease.start_date);
            const end = new Date(lease.end_date);
            const latestPaymentDate = end < now ? end : now;
            const monthCount = Math.min(24, Math.max(1, Math.floor((latestPaymentDate - start) / (1000 * 60 * 60 * 24 * 30))));

            for (let month = 0; month < monthCount; month += 1) {
                const periodStart = addMonths(latestPaymentDate, -month - 1);
                const periodEnd = addMonths(periodStart, 1);
                const paymentDate = addDays(periodStart, randomish(index + month, 1, 18));
                const isLateOrMissing = randomish(index + month, 1, 100) <= 12;

                if (isLateOrMissing && month < 3) {
                    continue;
                }

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
                            notes,
                            created_at,
                            updated_at
                        )
                        VALUES ($1, 'rent', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `,
                    [
                        lease.id,
                        Number(lease.rent_amount) / 12,
                        dateOnly(paymentDate),
                        dateOnly(periodStart),
                        dateOnly(periodEnd),
                        pick(paymentMethods, index + month),
                        `TNR-RCPT-${runCode}-${pad(index + 1, 4)}-${pad(month + 1, 2)}`,
                        randomish(index + month, 1, 100) <= 4 ? 'pending' : 'paid',
                        'Seeded rent payment for production-style demo data',
                        dateOnly(paymentDate),
                        dateOnly(addDays(paymentDate, randomish(index + month, 0, 8)))
                    ]
                );
                created.payments += 1;
            }

            for (let yearOffset = 0; yearOffset < 2; yearOffset += 1) {
                const periodStart = addMonths(now, -24 + yearOffset * 12);
                const periodEnd = addMonths(periodStart, 12);
                const totalAmount = Number(lease.service_charge_amount);
                const amountPaid = randomish(index + yearOffset, 1, 100) <= 18
                    ? totalAmount * randomish(index, 35, 82) / 100
                    : totalAmount;
                const balance = Math.max(totalAmount - amountPaid, 0);
                const status = balance === 0 ? 'paid' : pick(['issued', 'pending'], index + yearOffset);

                const demand = await insertRow(
                    client,
                    `
                        INSERT INTO service_charge_demands (
                            property_id,
                            lease_id,
                            period_start,
                            period_end,
                            total_amount,
                            amount_paid,
                            balance,
                            due_date,
                            status,
                            created_at,
                            updated_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        RETURNING id, total_amount, amount_paid, balance, period_start, period_end, due_date
                    `,
                    [
                        lease.property_id,
                        lease.id,
                        dateOnly(periodStart),
                        dateOnly(periodEnd),
                        totalAmount,
                        amountPaid,
                        balance,
                        dateOnly(addDays(periodStart, 30)),
                        status,
                        dateOnly(addDays(periodStart, -7)),
                        dateOnly(addDays(now, -randomish(index + yearOffset, 1, 70)))
                    ]
                );
                created.demands += 1;

                const itemCount = randomish(index + yearOffset, 3, 5);
                for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
                    const category = pick(serviceCategories, index + itemIndex);
                    const tenantAmount = totalAmount / itemCount;
                    const totalPropertyCost = tenantAmount * randomish(itemIndex + index, 6, 18);
                    const totalLettableSpace = randomish(index + itemIndex, 600, 5000);
                    const occupiedSpace = Number(lease.occupied_space || randomish(index, 40, 260));
                    const costPerSqm = totalPropertyCost / totalLettableSpace;

                    await client.query(
                        `
                            INSERT INTO service_charge_demand_items (
                                demand_id,
                                category,
                                total_property_cost,
                                total_lettable_space,
                                occupied_space,
                                cost_per_sqm,
                                tenant_amount,
                                notes,
                                created_at,
                                updated_at
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        `,
                        [
                            demand.id,
                            category,
                            totalPropertyCost,
                            totalLettableSpace,
                            occupiedSpace,
                            costPerSqm,
                            tenantAmount,
                            `${category} allocation for seeded production-style service charge demand`,
                            dateOnly(addDays(new Date(demand.period_start), 1)),
                            dateOnly(addDays(now, -randomish(index + itemIndex, 1, 60)))
                        ]
                    );
                    created.demandItems += 1;
                }

                if (amountPaid > 0) {
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
                                notes,
                                created_at,
                                updated_at
                            )
                            VALUES ($1, $2, 'service_charge', $3, $4, $5, $6, $7, $8, 'paid', $9, $10, $11)
                        `,
                        [
                            lease.id,
                            demand.id,
                            amountPaid,
                            dateOnly(addDays(new Date(demand.due_date), randomish(index + yearOffset, 1, 45))),
                            dateOnly(periodStart),
                            dateOnly(periodEnd),
                            pick(paymentMethods, index + yearOffset),
                            `TNR-SC-${runCode}-${pad(index + 1, 4)}-${yearOffset + 1}`,
                            'Seeded service charge payment',
                            dateOnly(addDays(new Date(demand.due_date), 1)),
                            dateOnly(addDays(now, -randomish(index + yearOffset, 1, 50)))
                        ]
                    );
                    created.payments += 1;
                }

                if (balance > 0) {
                    await client.query(
                        `
                            INSERT INTO reminders (
                                lease_id,
                                service_charge_demand_id,
                                reminder_type,
                                due_date,
                                scheduled_send_date,
                                sent_date,
                                channel,
                                status,
                                acknowledged,
                                acknowledged_at,
                                message_content,
                                created_at,
                                updated_at
                            )
                            VALUES ($1, $2, 'service_charge_due', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        `,
                        [
                            lease.id,
                            demand.id,
                            demand.due_date,
                            dateOnly(addDays(new Date(demand.due_date), -7)),
                            randomish(index + yearOffset, 1, 100) <= 65 ? addDays(new Date(demand.due_date), -6) : null,
                            pick(channels, index + yearOffset),
                            randomish(index + yearOffset, 1, 100) <= 65 ? 'sent' : 'pending',
                            randomish(index + yearOffset, 1, 100) <= 38,
                            randomish(index + yearOffset, 1, 100) <= 38 ? addDays(new Date(demand.due_date), -2) : null,
                            'Service charge balance reminder generated from seeded demo data.',
                            dateOnly(addDays(new Date(demand.due_date), -14)),
                            dateOnly(addDays(now, -randomish(index + yearOffset, 1, 25)))
                        ]
                    );
                    created.reminders += 1;
                }
            }

            if (lease.status === 'active') {
                const reminderTypes = [
                    ['rent_due', lease.next_rent_due_date || addDays(now, 30), -10],
                    ['lease_expiry', lease.end_date, -90],
                    ['inspection', addDays(now, randomish(index, 15, 120)), -14]
                ];

                for (let reminderIndex = 0; reminderIndex < reminderTypes.length; reminderIndex += 1) {
                    const [reminderType, dueDateValue, offsetDays] = reminderTypes[reminderIndex];
                    const dueDate = new Date(dueDateValue);
                    const scheduledDate = addDays(dueDate, offsetDays);
                    const isSent = scheduledDate <= now && randomish(index + reminderIndex, 1, 100) <= 72;
                    const acknowledged = isSent && randomish(index + reminderIndex, 1, 100) <= 45;

                    await client.query(
                        `
                            INSERT INTO reminders (
                                lease_id,
                                reminder_type,
                                due_date,
                                scheduled_send_date,
                                sent_date,
                                channel,
                                status,
                                acknowledged,
                                acknowledged_at,
                                message_content,
                                created_at,
                                updated_at
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        `,
                        [
                            lease.id,
                            reminderType,
                            dateOnly(dueDate),
                            dateOnly(scheduledDate),
                            isSent ? addDays(scheduledDate, 1) : null,
                            pick(channels, index + reminderIndex),
                            isSent ? 'sent' : 'pending',
                            acknowledged,
                            acknowledged ? addDays(scheduledDate, 3) : null,
                            `${reminderType.replaceAll('_', ' ')} reminder generated from seeded demo data.`,
                            dateOnly(addDays(scheduledDate, -5)),
                            dateOnly(addDays(now, -randomish(index + reminderIndex, 1, 30)))
                        ]
                    );
                    created.reminders += 1;
                }
            }
        }

        await client.query('COMMIT');

        console.log('Tenora demo data seeded successfully');
        console.table(created);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to seed Tenora demo data');
        console.error(error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
};

seed();
