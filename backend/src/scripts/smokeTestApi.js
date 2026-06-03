const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8000/api';

let token;

const request = async (method, path, body) => {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if(!response.ok || data.success === false) {
        throw new Error(`${method} ${path} failed: ${data.message || response.statusText}`);
    }

    console.log(`PASS ${method} ${path}`);

    return data;
};

const run = async () => {
    const stamp = Date.now();

    await request('GET', '/health');

    const login = await request('POST', '/auth/login', {
        email: 'admin@tenora.com',
        password: 'password123'
    });

    token = login.data.token;
    await request('GET', '/auth/me');

    const propertyResponse = await request('POST', '/properties', {
        property_code: `SMOKE-${stamp}`,
        property_name: `Smoke Test Property ${stamp}`,
        address: '123 Smoke Test Street',
        location: 'Lagos',
        property_description: 'Automated test property',
        total_units: 3,
        total_lettable_space: 500
    });

    const property = propertyResponse.data.property;

    await request('GET', '/properties?page=1&limit=5');
    await request('GET', `/properties?search=${encodeURIComponent('Smoke Test Property')}`);
    await request('GET', `/properties/${property.id}`);

    const tenantResponse = await request('POST', '/tenants', {
        full_name: `Smoke Test Tenant ${stamp}`,
        phone_number: '08012345678',
        email: `smoke-${stamp}@example.com`,
        alternative_contact: 'Emergency Contact - 08087654321',
        id_card_url: 'https://example.com/id-card.jpg'
    });

    const tenant = tenantResponse.data.tenant;

    await request('GET', '/tenants');
    await request('GET', `/tenants/${tenant.id}`);
    await request('GET', `/tenants?search=${encodeURIComponent('Smoke Test Tenant')}`);

    const leaseResponse = await request('POST', '/leases', {
        property_id: property.id,
        tenant_id: tenant.id,
        unit_number: 'Suite 1A',
        unit_description: 'Smoke test unit',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        rent_amount: 2500000,
        service_charge_amount: 300000,
        payment_frequency: 'yearly',
        status: 'active',
        next_rent_due_date: '2027-01-01',
        reminder_6_month_date: '2026-07-01',
        reminder_3_month_date: '2026-10-01',
        last_reviewed_date: '2026-01-01',
        rent_review_note: 'Smoke test lease',
        occupied_space: 120
    });

    const lease = leaseResponse.data.lease;

    await request('GET', `/leases?property_id=${property.id}&status=active&page=1&limit=5`);
    await request('GET', `/leases/${lease.id}`);

    const demandResponse = await request('POST', '/service-charge-demands', {
        property_id: property.id,
        lease_id: lease.id,
        period_start: '2026-01-01',
        period_end: '2026-12-31',
        total_amount: 300000,
        amount_paid: 50000,
        due_date: '2026-03-01',
        status: 'issued'
    });

    const demand = demandResponse.data.demand;

    await request('GET', `/service-charge-demands?property_id=${property.id}&status=issued`);
    await request('GET', `/service-charge-demands/${demand.id}`);

    const itemResponse = await request('POST', '/service-charge-demand-items', {
        demand_id: demand.id,
        category: 'Security',
        total_property_cost: 1000000,
        total_lettable_space: 500,
        occupied_space: 120,
        tenant_amount: 240000,
        notes: 'Smoke test demand item'
    });

    const item = itemResponse.data.item;

    await request('GET', `/service-charge-demand-items?demand_id=${demand.id}`);
    await request('GET', `/service-charge-demand-items/${item.id}`);

    const paymentResponse = await request('POST', '/payments', {
        lease_id: lease.id,
        service_charge_demand_id: demand.id,
        payment_category: 'service_charge',
        amount_paid: 50000,
        payment_date: '2026-02-01',
        payment_for_period_start: '2026-01-01',
        payment_for_period_end: '2026-12-31',
        payment_method: 'bank_transfer',
        receipt_number: `RCT-${stamp}`,
        status: 'paid',
        notes: 'Smoke test payment'
    });

    const payment = paymentResponse.data.payment;

    await request('GET', `/payments?lease_id=${lease.id}&payment_category=service_charge`);
    await request('GET', `/payments/${payment.id}`);

    const reminderResponse = await request('POST', '/reminders', {
        lease_id: lease.id,
        service_charge_demand_id: demand.id,
        reminder_type: 'service_charge_due',
        due_date: '2026-03-01',
        scheduled_send_date: '2026-02-15',
        channel: 'email',
        status: 'pending',
        acknowledged: false,
        message_content: 'Smoke test reminder message'
    });

    const reminder = reminderResponse.data.reminder;

    await request('GET', `/reminders?lease_id=${lease.id}&status=pending`);
    await request('GET', `/reminders/${reminder.id}`);
    await request('PUT', `/reminders/${reminder.id}/mark-sent`);
    await request('PUT', `/reminders/${reminder.id}/acknowledge`);

    await request('GET', '/dashboard/summary');
    await request('GET', '/reports/rent-arrears');
    await request('GET', '/reports/service-charge-balances');
    await request('GET', '/reports/expiring-leases?days=365');

    await request('PUT', `/tenants/${tenant.id}`, {
        phone_number: '08099999999'
    });

    await request('PUT', `/properties/${property.id}`, {
        location: 'Lagos Island'
    });

    console.log('');
    console.log('All smoke tests passed.');
    console.log('');
    console.log('Created test records:');
    console.log({
        property_id: property.id,
        tenant_id: tenant.id,
        lease_id: lease.id,
        demand_id: demand.id,
        item_id: item.id,
        payment_id: payment.id,
        reminder_id: reminder.id
    });
};

run().catch((error) => {
    console.error('');
    console.error('Smoke test failed.');
    console.error(error.message);
    process.exit(1);
});
