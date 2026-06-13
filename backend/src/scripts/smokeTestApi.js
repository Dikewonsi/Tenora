const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8000/api';

let token;

const request = async (method, path, body, expectedStatus = null, requestToken = token) => {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {})
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

const requestAs = (requestToken, method, path, body, expectedStatus = null) => (
    request(method, path, body, expectedStatus, requestToken)
);

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
    const primaryUser = login.data.user;
    assert(primaryUser.role === 'super_admin', 'Existing administrator must be migrated to super_admin');

    const meResponse = await request('GET', '/auth/me');
    assert(meResponse.data.user.id === primaryUser.id, '/auth/me must return the current database user');
    assert(meResponse.data.user.role === 'super_admin', '/auth/me must return the current database role');
    assert(!Object.hasOwn(meResponse.data.user, 'password_hash'), '/auth/me must never return password_hash');
    assert(!Object.hasOwn(meResponse.data.user, 'passwordHash'), '/auth/me must never return passwordHash');

    const initialUsers = await request('GET', '/users');
    assert(Array.isArray(initialUsers.data.users), 'Super admin must be able to list users');

    if(Number(initialUsers.data.summary.super_admins) === 1) {
        const disableLastAdmin = await request('PATCH', `/users/${primaryUser.id}/status`, {
            is_active: false
        }, 400);
        assert(disableLastAdmin.code === 'LAST_SUPER_ADMIN', 'Last active super admin cannot be disabled');
        const demoteLastAdmin = await request('PUT', `/users/${primaryUser.id}`, {
            role: 'admin'
        }, 400);
        assert(demoteLastAdmin.code === 'LAST_SUPER_ADMIN', 'Last active super admin cannot be demoted');
    }

    const managedEmail = `managed-${stamp}@example.com`;
    const managedPassword = 'SecurePass123';
    const managedResponse = await request('POST', '/users', {
        full_name: `Managed Admin ${stamp}`,
        email: managedEmail.toUpperCase(),
        role: 'admin',
        password: managedPassword
    });
    const managedUser = managedResponse.data.user;
    assert(managedUser.email === managedEmail, 'User email must be normalized to lowercase');
    assert(!Object.hasOwn(managedUser, 'password_hash'), 'User API must never return password_hash');
    assert(!Object.hasOwn(managedUser, 'passwordHash'), 'User API must never return passwordHash');

    await request('POST', '/users', {
        full_name: 'Duplicate Email',
        email: managedEmail.toUpperCase(),
        role: 'user',
        password: managedPassword
    }, 400);
    await request('POST', '/users', {
        full_name: 'Weak Password',
        email: `weak-${stamp}@example.com`,
        role: 'user',
        password: 'short'
    }, 400);
    await request('POST', '/users', {
        full_name: 'Invalid Role',
        email: `invalid-role-${stamp}@example.com`,
        role: 'owner',
        password: managedPassword
    }, 400);

    const managedLogin = await request('POST', '/auth/login', {
        email: managedEmail,
        password: managedPassword
    });
    const managedToken = managedLogin.data.token;
    await requestAs(managedToken, 'GET', '/users', undefined, 403);

    await request('PUT', `/users/${managedUser.id}`, { role: 'super_admin' });
    await requestAs(managedToken, 'GET', '/users');
    await request('PUT', `/users/${managedUser.id}`, { role: 'admin' });
    await requestAs(managedToken, 'GET', '/users', undefined, 403);

    await request('PATCH', `/users/${managedUser.id}/status`, { is_active: false });
    const disabledRequest = await requestAs(managedToken, 'GET', '/dashboard/summary', undefined, 403);
    assert(disabledRequest.code === 'ACCOUNT_DISABLED', 'Disabled user token must fail every protected request');
    await request('POST', '/auth/login', {
        email: managedEmail,
        password: managedPassword
    }, 403);

    await request('PATCH', `/users/${managedUser.id}/status`, { is_active: true });
    const reactivatedLogin = await request('POST', '/auth/login', {
        email: managedEmail,
        password: managedPassword
    });
    const reactivatedToken = reactivatedLogin.data.token;
    await requestAs(reactivatedToken, 'GET', '/dashboard/summary');

    const replacementPassword = 'Replacement456';
    await request('PATCH', `/users/${managedUser.id}/password`, {
        password: replacementPassword
    });
    const revokedRequest = await requestAs(reactivatedToken, 'GET', '/dashboard/summary', undefined, 401);
    assert(revokedRequest.code === 'TOKEN_REVOKED', 'Password reset must invalidate existing tokens');
    await request('POST', '/auth/login', {
        email: managedEmail,
        password: managedPassword
    }, 401);
    const replacementLogin = await request('POST', '/auth/login', {
        email: managedEmail,
        password: replacementPassword
    });
    await requestAs(replacementLogin.data.token, 'GET', '/dashboard/summary');

    const basicUserResponse = await request('POST', '/users', {
        full_name: `Basic User ${stamp}`,
        email: `basic-${stamp}@example.com`,
        role: 'user',
        password: managedPassword
    });
    const basicLogin = await request('POST', '/auth/login', {
        email: basicUserResponse.data.user.email,
        password: managedPassword
    });
    await requestAs(basicLogin.data.token, 'GET', '/users', undefined, 403);

    const rollbackName = `Rollback Property ${stamp}`;
    await request('POST', '/properties', {
        property_name: rollbackName,
        address: '2 Rollback Close, Lagos',
        total_lettable_space: 100,
        units: [
            { unit_name: 'DUP', floor_area_sqm: 40, status: 'active' },
            { unit_name: 'DUP', floor_area_sqm: 40, status: 'inactive' }
        ]
    }, 400);
    const rollbackSearch = await request('GET', `/properties?search=${encodeURIComponent(rollbackName)}`);
    assert(rollbackSearch.data.properties.length === 0, 'Failed onboarding must roll back the property and all units');

    const propertyResponse = await request('POST', '/properties', {
        property_name: `Smoke Property ${stamp}`,
        address: '1 Verification Close, Lagos',
        location: 'Lagos',
        property_description: 'Current product smoke test',
        total_lettable_space: 500,
        units: [
            { unit_name: 'A1', floor_area_sqm: 120, bedrooms: 2, status: 'active' },
            { unit_name: 'A2', floor_area_sqm: 180, bedrooms: 3, status: 'active' }
        ]
    });
    const property = propertyResponse.data.property;
    assert(Number(property.total_lettable_space) === 500, 'Property must preserve management-entered total lettable space');
    assert(Number(property.configured_unit_area_sqm) === 300, 'Property response must derive configured area from all units');

    const unitsResponse = await request('GET', `/units?property_id=${property.id}`);
    const firstUnit = unitsResponse.data.units.find((unit) => unit.unit_name === 'A1');
    const secondUnit = unitsResponse.data.units.find((unit) => unit.unit_name === 'A2');
    assert(firstUnit && secondUnit, 'Transactional onboarding must create both units');

    await request('POST', '/units', {
        property_id: property.id,
        unit_name: 'V1',
        floor_area_sqm: 50,
        status: 'active'
    });
    await request('POST', '/units', {
        property_id: property.id,
        unit_name: 'I1',
        floor_area_sqm: 50,
        status: 'inactive'
    });
    await request('POST', '/units', {
        property_id: property.id,
        unit_name: 'OVER',
        floor_area_sqm: 101,
        status: 'active'
    }, 400);
    const reconciledPropertyResponse = await request('GET', `/properties/${property.id}`);
    assert(
        Number(reconciledPropertyResponse.data.property.configured_unit_area_sqm) === 400,
        'Configured area must include inactive physical units'
    );
    await request('PUT', `/properties/${property.id}`, {
        total_lettable_space: 399
    }, 400);

    const emptyPropertyResponse = await request('POST', '/properties', {
        property_name: `Empty Property ${stamp}`,
        address: '3 Empty Close, Lagos',
        total_lettable_space: 250,
        units: []
    });
    assert(
        Number(emptyPropertyResponse.data.property.configured_unit_area_sqm) === 0,
        'Property creation with no units must preserve zero configured area'
    );
    const equalAreaPropertyResponse = await request('POST', '/properties', {
        property_name: `Equal Area Property ${stamp}`,
        address: '4 Equal Close, Lagos',
        total_lettable_space: 250,
        units: [
            { unit_name: 'E1', floor_area_sqm: 100, status: 'active' },
            { unit_name: 'E2', floor_area_sqm: 150, status: 'inactive' }
        ]
    });
    assert(
        Number(equalAreaPropertyResponse.data.property.configured_unit_area_sqm) === 250
        && Number(equalAreaPropertyResponse.data.property.unconfigured_area_sqm) === 0,
        'Configured unit area may equal total lettable space'
    );

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
        unit_id: firstUnit.id,
        start_date: '2026-01-01',
        end_date: leaseEndDate,
        rent_amount: 2400000,
        payment_frequency: 'yearly',
        status: 'active'
    });
    const secondLeaseResponse = await request('POST', '/leases', {
        property_id: property.id,
        tenant_id: secondTenantResponse.data.tenant.id,
        unit_id: secondUnit.id,
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
    const calculatedSchedule = calculatedResponse.data.schedule;
    assert(calculatedSchedule.allocations.length === 4, 'Budget must reconcile every physical unit');
    assert(Number(calculatedSchedule.budget.denominator_area_sqm) === 500, 'Budget must snapshot the property denominator');
    assert(Number(calculatedSchedule.budget.configured_area_sqm) === 400, 'Budget must snapshot all configured physical area');
    assert(Number(calculatedSchedule.budget.occupied_billed_area_sqm) === 300, 'Only occupied active area is tenant billed');
    assert(Number(calculatedSchedule.budget.vacant_area_sqm) === 50, 'Vacant active area must remain owner liability');
    assert(Number(calculatedSchedule.budget.inactive_area_sqm) === 50, 'Inactive area must remain owner liability');
    assert(Number(calculatedSchedule.budget.unconfigured_area_sqm) === 100, 'Unconfigured area must remain owner liability');
    assert(Number(calculatedSchedule.validation.tenant_demand_total) === 4500000, 'Tenant demands must use total lettable space as denominator');
    assert(Number(calculatedSchedule.validation.owner_liability_total) === 3000000, 'Vacant, inactive, and unconfigured shares must not be redistributed');

    const issuedResponse = await request('POST', `/service-charge-budgets/${budget.id}/issue`);
    const allocations = issuedResponse.data.schedule.allocations;
    const demandedAllocations = allocations.filter((allocation) => allocation.demand_id);
    assert(demandedAllocations.length === 2, 'Issuance must create demands only for occupied active units');
    assert(
        allocations.filter((allocation) => !allocation.billing_eligible).every((allocation) => !allocation.demand_id),
        'Vacant and inactive units must not receive tenant demands'
    );
    await request('POST', `/service-charge-budgets/${budget.id}/calculate`, undefined, 400);
    await request('PUT', `/service-charge-budgets/${budget.id}`, {
        total_budget: 8000000
    }, 400);

    const demandId = demandedAllocations[0].demand_id;
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
