const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8000/api';

let token;

const request = async (method, path, body, expectedStatus = null) => {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();

    if(expectedStatus !== null) {
        if(response.status !== expectedStatus) {
            throw new Error(`${method} ${path} expected ${expectedStatus}, got ${response.status}`);
        }
        console.log(`PASS ${method} ${path} returned ${expectedStatus}`);
        return data;
    }

    if(!response.ok || data.success === false) {
        throw new Error(`${method} ${path} failed: ${data.message || response.statusText}`);
    }

    console.log(`PASS ${method} ${path}`);
    return data;
};

const assert = (condition, message) => {
    if(!condition) throw new Error(message);
};

const dateAfterDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
};

const run = async () => {
    const stamp = Date.now();

    await request('GET', '/health');
    const login = await request('POST', '/auth/login', {
        email: 'admin@tenora.com',
        password: 'password123'
    });
    token = login.data.token;

    const propertyResponse = await request('POST', '/properties', {
        property_name: `Smoke Property ${stamp}`,
        address: '1 Verification Close, Lagos',
        location: 'Lagos',
        property_description: 'Current product smoke test'
    });
    const property = propertyResponse.data.property;

    const firstUnitResponse = await request('POST', '/units', {
        property_id: property.id,
        unit_name: 'A1',
        floor_area_sqm: 120,
        bedrooms: 2,
        status: 'active'
    });
    const secondUnitResponse = await request('POST', '/units', {
        property_id: property.id,
        unit_name: 'A2',
        floor_area_sqm: 180,
        bedrooms: 3,
        status: 'active'
    });

    const firstTenantResponse = await request('POST', '/tenants', {
        full_name: `Smoke Tenant One ${stamp}`,
        phone_number: '08010000001',
        email: `smoke-one-${stamp}@example.com`
    });
    const secondTenantResponse = await request('POST', '/tenants', {
        full_name: `Smoke Tenant Two ${stamp}`,
        phone_number: '08010000002',
        email: `smoke-two-${stamp}@example.com`
    });

    const leaseEndDate = dateAfterDays(20);
    const firstLeaseResponse = await request('POST', '/leases', {
        property_id: property.id,
        tenant_id: firstTenantResponse.data.tenant.id,
        unit_id: firstUnitResponse.data.unit.id,
        start_date: '2026-01-01',
        end_date: leaseEndDate,
        rent_amount: 2400000,
        payment_frequency: 'yearly',
        status: 'active'
    });
    const secondLeaseResponse = await request('POST', '/leases', {
        property_id: property.id,
        tenant_id: secondTenantResponse.data.tenant.id,
        unit_id: secondUnitResponse.data.unit.id,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        rent_amount: 3600000,
        payment_frequency: 'yearly',
        status: 'active'
    });
    const firstLease = firstLeaseResponse.data.lease;

    assert(firstLease.end_date, 'Lease must return end_date');
    assert(!Object.hasOwn(firstLease, 'next_rent_due_date'), 'Lease must not return next_rent_due_date');

    const expiryResponse = await request('GET', '/leases/rent-expiry');
    const expiryLease = expiryResponse.data.leases.find((lease) => lease.id === firstLease.id);
    assert(expiryLease, '20-day lease must appear in rent expiry view');
    assert(Number(expiryLease.days_remaining) >= 19 && Number(expiryLease.days_remaining) <= 20, 'Expiry must return exact days remaining');
    assert(expiryLease.expiry_bucket === 'expiring_soon', '20-day lease must be Expiring Soon');

    const budgetResponse = await request('POST', '/service-charge-budgets', {
        property_id: property.id,
        budget_title: '2026 Smoke Service Charge',
        total_budget: 7500000,
        period_start: '2026-01-01',
        period_end: '2026-12-31',
        calculation_method: 'pro_rata',
        basis: 'floor_area',
        due_date: '2026-07-31'
    });
    const budget = budgetResponse.data.budget;
    const calculatedResponse = await request('POST', `/service-charge-budgets/${budget.id}/calculate`);
    assert(calculatedResponse.data.schedule.allocations.length === 2, 'Budget must allocate to both units');

    const issuedResponse = await request('POST', `/service-charge-budgets/${budget.id}/issue`);
    const allocations = issuedResponse.data.schedule.allocations;
    assert(allocations.every((allocation) => allocation.demand_id), 'Issuance must create a demand per allocation');

    const demandId = allocations[0].demand_id;
    const documentResponse = await request('GET', `/service-charge-demands/${demandId}/document`);
    assert(documentResponse.data.document.tenant.full_name, 'Demand preview must include tenant');
    assert(Number(documentResponse.data.document.totals.total_amount) > 0, 'Demand preview must include total');

    const paymentAmount = 500000;
    const paymentResponse = await request('POST', '/payments', {
        lease_id: firstLease.id,
        service_charge_demand_id: demandId,
        payment_category: 'service_charge',
        amount_paid: paymentAmount,
        payment_date: '2026-06-08',
        payment_method: 'bank_transfer',
        receipt_number: `SMOKE-${stamp}`,
        status: 'paid'
    });
    const demandAfterPayment = await request('GET', `/service-charge-demands/${demandId}`);
    assert(Number(demandAfterPayment.data.demand.amount_paid) === paymentAmount, 'Demand must reflect payment');

    await request('GET', '/dashboard/summary');
    await request('GET', '/reports/rent-arrears', undefined, 404);
    await request('GET', '/reminders', undefined, 404);
    await request('GET', '/service-charge-demand-items', undefined, 404);

    await request('DELETE', `/payments/${paymentResponse.data.payment.id}`);

    console.log('\nAll current-flow smoke tests passed.');
    console.log({
        property_id: property.id,
        lease_ids: [firstLease.id, secondLeaseResponse.data.lease.id],
        budget_id: budget.id,
        demand_id: demandId
    });
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
