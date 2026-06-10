import { useEffect, useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconBuildingEstate,
  IconCalendarEvent,
  IconCash,
  IconClock,
  IconEdit,
  IconFileInvoice,
  IconHome,
  IconLayoutGrid,
  IconList,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { EmptyState, PageHeader, StatusBadge } from '../components/TenoraUI';
import { propertyLabel, sortByOptionLabel, tenantLabel } from '../utils/sortOptions';
import { useLocation, useNavigate } from 'react-router-dom';

const emptyForm = {
  property_id: '',
  tenant_id: '',
  unit_id: '',
  unit_number: '',
  unit_description: '',
  start_date: '',
  end_date: '',
  rent_amount: '',
  service_charge_amount: '',
  payment_frequency: 'yearly',
  status: 'active',
  last_reviewed_date: '',
  rent_review_note: '',
  occupied_space: ''
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

const Leases = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [rentExpiry, setRentExpiry] = useState({ buckets: {}, leases: [] });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [propertyId, setPropertyId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [status, setStatus] = useState('');
  const [expiryFilter, setExpiryFilter] = useState(() => location.state?.expiryBucket || '');
  const [view, setView] = useState('cards');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [deletingLease, setDeletingLease] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLease, setEditingLease] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const money = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  });

  const query = useMemo(() => ({
    page,
    limit: 10,
    property_id: propertyId,
    tenant_id: tenantId,
    status
  }), [page, propertyId, status, tenantId]);

  const selectedProperty = useMemo(() => (
    properties.find((property) => property.id === form.property_id)
  ), [form.property_id, properties]);

  const selectedTenant = useMemo(() => (
    tenants.find((tenant) => tenant.id === form.tenant_id)
  ), [form.tenant_id, tenants]);

  const selectedUnit = useMemo(() => (
    units.find((unit) => unit.id === form.unit_id)
  ), [form.unit_id, units]);

  const leaseStats = useMemo(() => {
    const active = leases.filter((lease) => lease.status === 'active').length;
    const expiringSoon = leases.filter((lease) => {
      if (!lease.end_date || lease.status !== 'active') {
        return false;
      }

      const today = new Date();
      const endDate = new Date(lease.end_date);
      const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      return daysRemaining >= 0 && daysRemaining <= 90;
    }).length;
    const annualRent = leases.reduce((total, lease) => total + Number(lease.rent_amount || 0), 0);
    const occupiedSpace = leases.reduce((total, lease) => total + Number(lease.occupied_space || 0), 0);

    return {
      active,
      expiringSoon,
      annualRent,
      occupiedSpace
    };
  }, [leases]);

  const getDaysRemaining = (endDateValue) => {
    if (!endDateValue) {
      return null;
    }

    const today = new Date();
    const endDate = new Date(endDateValue);

    return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  };

  const filteredExpiryLeases = useMemo(() => {
    if (!expiryFilter) return rentExpiry.leases || [];

    return (rentExpiry.leases || []).filter((lease) => {
      const days = Number(lease.days_remaining);
      if (!Number.isFinite(days)) return false;
      if (['under30', 'expiring_soon'].includes(expiryFilter)) return days < 30;
      if (['30', '30_days'].includes(expiryFilter)) return days >= 30 && days < 60;
      if (['60', '60_days'].includes(expiryFilter)) return days >= 60 && days < 90;
      if (['90', '90_days'].includes(expiryFilter)) return days >= 90 && days <= 90;
      return true;
    });
  }, [expiryFilter, rentExpiry.leases]);

  const fetchLookups = async () => {
    const [propertiesResponse, tenantsResponse, expiryResponse] = await Promise.all([
      apiClient.get('/properties', { params: { limit: 100 } }),
      apiClient.get('/tenants', { params: { limit: 100 } }),
      apiClient.get('/leases/rent-expiry')
    ]);

    setProperties(sortByOptionLabel(propertiesResponse.data.data.properties || [], propertyLabel));
    setTenants(sortByOptionLabel(tenantsResponse.data.data.tenants || [], tenantLabel));
    setRentExpiry(expiryResponse.data.data || { buckets: {}, leases: [] });
  };

  const fetchLeases = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/leases', {
        params: query
      });

      setLeases(response.data.data.leases || []);
      setPagination(response.data.data.pagination || {
        page,
        limit: 10,
        total: 0,
        totalPages: 1
      });
    } catch (leaseError) {
      setError(leaseError.response?.data?.message || leaseError.message || 'Failed to load tenancies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLookups().catch((lookupError) => {
      setError(lookupError.response?.data?.message || lookupError.message || 'Failed to load properties and tenants');
    });
  }, []);

  useEffect(() => {
    if (!form.property_id) {
      return;
    }

    apiClient.get('/units', { params: { property_id: form.property_id, status: 'active', limit: 100 } })
      .then((response) => setUnits(response.data.data.units || []))
      .catch((lookupError) => {
        setError(lookupError.response?.data?.message || lookupError.message || 'Failed to load property units');
      });
  }, [form.property_id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    const nextUnit = name === 'unit_id' ? units.find((unit) => unit.id === value) : null;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === 'property_id' ? { unit_id: '', unit_number: '', occupied_space: '' } : {}),
      ...(name === 'unit_id' ? {
        unit_number: nextUnit?.unit_name || '',
        occupied_space: nextUnit?.floor_area_sqm ?? ''
      } : {})
    }));
  };

  const openCreateModal = () => {
    setEditingLease(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.openCreate === 'tenancy') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateModal();
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    if (location.state?.expiryBucket) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpiryFilter(location.state.expiryBucket);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
  }, [location.key, location.pathname, location.search, location.state, navigate]);

  const openEditModal = (lease) => {
    setEditingLease(lease);
    setForm({
      property_id: lease.property_id || '',
      tenant_id: lease.tenant_id || '',
      unit_id: lease.unit_id || '',
      unit_number: lease.unit_number || '',
      unit_description: lease.unit_description || '',
      start_date: toDateInput(lease.start_date),
      end_date: toDateInput(lease.end_date),
      rent_amount: lease.rent_amount || '',
      service_charge_amount: lease.service_charge_amount || '',
      payment_frequency: lease.payment_frequency || 'yearly',
      status: lease.status || 'active',
      last_reviewed_date: toDateInput(lease.last_reviewed_date),
      rent_review_note: lease.rent_review_note || '',
      occupied_space: lease.occupied_space || ''
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLease(null);
    setForm(emptyForm);
  };

  const nullableNumber = (value) => (value === '' ? null : Number(value));
  const nullableDate = (value) => (value === '' ? null : value);

  const getPayload = () => ({
    ...form,
    rent_amount: nullableNumber(form.rent_amount),
    service_charge_amount: nullableNumber(form.service_charge_amount),
    occupied_space: selectedUnit?.floor_area_sqm ?? nullableNumber(form.occupied_space),
    last_reviewed_date: nullableDate(form.last_reviewed_date)
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingLease) {
        await apiClient.put(`/leases/${editingLease.id}`, getPayload());
        const message = 'Tenancy updated successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Tenancy saved', message });
      } else {
        await apiClient.post('/leases', getPayload());
        const message = 'Tenancy created successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Tenancy created', message });
      }

      closeModal();
      await Promise.all([fetchLeases(), fetchLookups()]);
    } catch (leaseError) {
      const message = leaseError.response?.data?.message || leaseError.message || 'Failed to save tenancy';
      setError(message);
      setFeedbackModal({ variant: 'danger', title: 'Tenancy could not be saved', message });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (lease) => {
    setDeletingLease(lease);
    setError('');
    setSuccess('');
  };

  const closeDeleteModal = () => {
    setDeletingLease(null);
  };

  const confirmDelete = async () => {
    if (!deletingLease) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.delete(`/leases/${deletingLease.id}`);
      const message = 'Tenancy deleted successfully';
      setSuccess(message);
      setFeedbackModal({ variant: 'success', title: 'Tenancy deleted', message });
      closeDeleteModal();
      await fetchLeases();
    } catch (leaseError) {
      const message = leaseError.response?.data?.message || leaseError.message || 'Failed to delete tenancy';
      setError('');
      setFeedbackModal({
        variant: 'danger',
        title: 'Tenancy cannot be deleted',
        message,
        guidance: message.toLowerCase().includes('related') ? 'This protects related payments and service charge demands from losing their tenancy history.' : ''
      });
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchLeases();
  };

  const resetFilters = () => {
    setPropertyId('');
    setTenantId('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="tenora-properties tenora-leases">
      <PageHeader
        eyebrow="Occupancy / Tenancies"
        title="Tenancies"
        description="Manage unit assignments, rent terms, expiry dates, and occupancy status."
        action={{ label: 'Add Tenancy', onClick: openCreateModal, icon: <IconPlus size={18} /> }}
      />

      {error && <div className="alert alert-danger border-0 mb-0" role="alert">{error}</div>}
      {success && <div className="alert alert-success border-0 mb-0" role="alert">{success}</div>}

      <section className="tenora-lease-summary" aria-label="Tenancy summary">
        <article><span className="tenora-property-summary-icon"><IconFileInvoice size={19} /></span><div><small>Active shown</small><strong>{isLoading ? '...' : leaseStats.active}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-amber"><IconClock size={19} /></span><div><small>Expiring within 90 days</small><strong>{isLoading ? '...' : (rentExpiry.leases || []).length}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-blue"><IconCash size={19} /></span><div><small>Rent value shown</small><strong>{isLoading ? '...' : money.format(leaseStats.annualRent)}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-slate"><IconHome size={19} /></span><div><small>Occupied space shown</small><strong>{isLoading ? '...' : `${leaseStats.occupiedSpace.toLocaleString()} sqm`}</strong></div></article>
        <article><span className="tenora-property-summary-icon"><IconFileInvoice size={19} /></span><div><small>Total tenancies</small><strong>{isLoading ? '...' : pagination.total || 0}</strong></div></article>
      </section>

      <section className="tenora-expiry-workspace">
        <header>
          <div><h2>Rent expiry</h2><p>End date is the next rent due date.</p></div>
          {expiryFilter && <button className="btn btn-sm btn-light border" type="button" onClick={() => setExpiryFilter('')}>Clear expiry filter</button>}
        </header>
        <div className="tenora-expiry-layout">
          <div className="tenora-expiry-buckets">
            {[
              ['Expiring Soon', 'expiring_soon', 'under30', 'is-red'],
              ['30 Days', '30_days', '30', 'is-orange'],
              ['60 Days', '60_days', '60', 'is-amber'],
              ['90 Days', '90_days', '90', 'is-blue']
            ].map(([label, key, filter, tone]) => (
              <button className={`${tone} ${expiryFilter === filter ? 'is-selected' : ''}`} type="button" key={key} onClick={() => setExpiryFilter((current) => current === filter ? '' : filter)}>
                <span>{label}</span><strong>{rentExpiry.buckets?.[key]?.length || 0}</strong>
              </button>
            ))}
          </div>
          <div className="tenora-expiry-list">
            {filteredExpiryLeases.slice(0, 5).map((lease) => (
              <div key={lease.id}>
                <span className="tenora-expiry-avatar"><IconCalendarEvent size={16} /></span>
                <span><strong>{lease.tenant_name}</strong><small>{lease.property_name} · {lease.unit_name || 'No unit'}</small></span>
                <span><strong>{lease.days_remaining} days</strong><small>{toDateInput(lease.end_date)}</small></span>
              </div>
            ))}
            {filteredExpiryLeases.length === 0 && <EmptyState compact title="No matching rent expiries" description="Active tenancies ending in this period will appear here." icon={IconCalendarEvent} />}
          </div>
        </div>
      </section>

      <section className="tenora-property-toolbar tenora-lease-toolbar">
        <form className="tenora-lease-filters" onSubmit={handleFilterSubmit}>
          <select className="form-select" value={propertyId} onChange={(event) => setPropertyId(event.target.value)} aria-label="Filter by property">
            <option value="">All properties</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.property_name || property.address}</option>)}
          </select>
          <select className="form-select" value={tenantId} onChange={(event) => setTenantId(event.target.value)} aria-label="Filter by tenant">
            <option value="">All tenants</option>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>)}
          </select>
          <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option>
          </select>
          <button className="btn btn-primary tenora-primary-btn" type="submit">Apply</button>
          <button className="btn btn-light border" type="button" onClick={resetFilters}>Reset</button>
          <button className="btn btn-light border d-inline-flex align-items-center justify-content-center gap-2" type="button" onClick={fetchLeases}><IconRefresh size={16} /> Refresh</button>
        </form>
        <div className="tenora-view-toggle" role="group" aria-label="Tenancy view">
          <button className={view === 'cards' ? 'is-active' : ''} type="button" onClick={() => setView('cards')} aria-label="Card view"><IconLayoutGrid size={17} /></button>
          <button className={view === 'table' ? 'is-active' : ''} type="button" onClick={() => setView('table')} aria-label="Table view"><IconList size={18} /></button>
        </div>
      </section>

      <section className="tenora-property-workspace">
        <header><div><h2>Tenancy inventory</h2><p>{pagination.total || 0} record{pagination.total === 1 ? '' : 's'} match the current filters</p></div><span className="tenora-inventory-context">{propertyId || tenantId || status ? 'Filters active' : 'All tenancies'}</span></header>

        {isLoading && view === 'cards' && <div className="tenora-property-grid tenora-lease-grid">{Array.from({ length: 6 }, (_, index) => <div className="tenora-property-card tenora-lease-card is-loading" key={index} />)}</div>}

        {!isLoading && leases.length === 0 && (
          <EmptyState title="No tenancies found" description="Create a tenancy after adding a property, unit, and tenant." actionLabel="Add Tenancy" onAction={openCreateModal} icon={IconFileInvoice} />
        )}

        {!isLoading && leases.length > 0 && view === 'cards' && (
          <div className="tenora-property-grid tenora-lease-grid">
            {leases.map((lease) => {
              const daysRemaining = getDaysRemaining(lease.end_date);
              const expiring = lease.status === 'active' && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 90;
              return (
                <article className="tenora-property-card tenora-lease-card" key={lease.id}>
                  <div className="tenora-property-card-top">
                    <span className="tenora-property-avatar"><IconFileInvoice size={22} /></span>
                    <div className="d-flex align-items-center gap-2"><StatusBadge status={lease.status || 'active'} /><div className="tenora-property-card-actions"><button type="button" onClick={() => openEditModal(lease)} aria-label={`Edit tenancy for ${lease.tenant_name}`}><IconEdit size={16} /></button><button className="is-danger" type="button" onClick={() => openDeleteModal(lease)} aria-label={`Delete tenancy for ${lease.tenant_name}`}><IconTrash size={16} /></button></div></div>
                  </div>
                  <div className="tenora-property-card-title"><h3>{lease.tenant_name || 'Tenant'}</h3><p><IconBuildingEstate size={14} /> {lease.property_name || 'Property'} · {lease.unit_name || lease.unit_number || 'No unit'}</p></div>
                  {expiring && <div className="tenora-lease-alert"><IconAlertTriangle size={15} /> Rent due in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}</div>}
                  <div className="tenora-lease-term">
                    <div><small>Start date</small><strong>{toDateInput(lease.start_date) || '-'}</strong></div>
                    <IconCalendarEvent size={16} />
                    <div><small>End date / next rent due</small><strong>{toDateInput(lease.end_date) || '-'}</strong></div>
                  </div>
                  <div className="tenora-lease-finance">
                    <div><small>Rent</small><strong>{money.format(Number(lease.rent_amount || 0))}</strong><span className="text-capitalize">{lease.payment_frequency || 'yearly'}</span></div>
                    <div><small>Floor area</small><strong>{Number(lease.occupied_space || lease.floor_area_sqm || 0).toLocaleString()} sqm</strong><span>{lease.unit_description || 'No description'}</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {view === 'table' && (leases.length > 0 || isLoading) && (
          <div className="table-responsive tenora-property-table tenora-lease-table">
            <table className="table table-vcenter mb-0">
              <thead><tr><th>Tenant / Unit</th><th>Property</th><th>Term</th><th>Rent</th><th>Space</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
              <tbody>{isLoading ? <tr><td colSpan="7" className="text-center py-5 text-secondary">Loading tenancies...</td></tr> : leases.map((lease) => (
                <tr key={lease.id}>
                  <td><div className="d-flex align-items-center gap-3"><span className="tenora-property-table-icon"><IconFileInvoice size={18} /></span><div><strong>{lease.tenant_name || 'Tenant'}</strong><small>{lease.unit_name || lease.unit_number || 'No unit'}</small></div></div></td>
                  <td>{lease.property_name || '-'}</td>
                  <td><strong>{toDateInput(lease.start_date)} to {toDateInput(lease.end_date)}</strong><small className="text-capitalize">{lease.payment_frequency || 'yearly'} billing</small></td>
                  <td>{money.format(Number(lease.rent_amount || 0))}</td>
                  <td>{Number(lease.occupied_space || lease.floor_area_sqm || 0).toLocaleString()} sqm</td>
                  <td><StatusBadge status={lease.status || 'active'} /></td>
                  <td className="text-end"><div className="d-inline-flex gap-2"><button className="btn btn-sm btn-light btn-icon" type="button" onClick={() => openEditModal(lease)}><IconEdit size={16} /></button><button className="btn btn-sm btn-outline-danger btn-icon" type="button" onClick={() => openDeleteModal(lease)}><IconTrash size={16} /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {(leases.length > 0 || isLoading) && <PaginationControls currentPage={pagination.page || page} totalPages={pagination.totalPages || 1} total={pagination.total || 0} isLoading={isLoading} onPageChange={setPage} />}
      </section>

      {isModalOpen && (
        <div className="tenora-property-modal-backdrop">
          <form className="tenora-property-modal tenora-lease-modal" onSubmit={handleSubmit}>
            <header><div><span>{editingLease ? 'Tenancy details' : 'New occupancy assignment'}</span><h3>{editingLease ? 'Edit tenancy' : 'Add tenancy'}</h3><p>Connect a tenant to a property and unit, then set rent and expiry terms.</p></div><button className="btn btn-light btn-icon" type="button" onClick={closeModal} aria-label="Close tenancy form"><IconX size={18} /></button></header>
            <div className="tenora-property-modal-body">
              {(selectedProperty || selectedTenant) && <div className="tenora-lease-selection"><div><small>Property</small><strong>{selectedProperty?.property_name || selectedProperty?.address || 'Select property'}</strong><span>{selectedProperty?.total_lettable_space ? `${Number(selectedProperty.total_lettable_space).toLocaleString()} sqm lettable space` : 'No lettable space recorded'}</span></div><div><small>Tenant</small><strong>{selectedTenant?.full_name || 'Select tenant'}</strong><span>{selectedTenant?.email || selectedTenant?.phone_number || 'No contact recorded'}</span></div></div>}
              <div className="tenora-form-section">
                <div><strong>Assignment</strong><span>Connect the tenant to an active unit under the selected property.</span></div>
                <div className="row g-3">
                  <div className="col-12 col-md-6"><label className="form-label">Property</label><select className="form-select" name="property_id" value={form.property_id} onChange={handleFormChange} required><option value="">Select property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.property_name || property.address}</option>)}</select></div>
                  <div className="col-12 col-md-6"><label className="form-label">Tenant</label><select className="form-select" name="tenant_id" value={form.tenant_id} onChange={handleFormChange} required><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>)}</select></div>
                  <div className="col-12 col-md-5"><label className="form-label">Unit</label><select className="form-select" name="unit_id" value={form.unit_id} onChange={handleFormChange} required><option value="">{form.property_id ? 'Select unit' : 'Select property first'}</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_name}{unit.tenant_name ? ` · occupied by ${unit.tenant_name}` : ''}</option>)}</select>{form.property_id && units.length === 0 && <div className="form-text text-warning">No active units found under this property.</div>}</div>
                  <div className="col-12 col-md-7"><label className="form-label">Unit description</label><input className="form-control" name="unit_description" value={form.unit_description} onChange={handleFormChange} placeholder="Second floor office space" /></div>
                </div>
              </div>
              <div className="tenora-form-section">
                <div><strong>Term and rent</strong><span>End date is also the next rent due date for this MVP.</span></div>
                <div className="row g-3">
                  <div className="col-12 col-md-6"><label className="form-label">Start date</label><input className="form-control" name="start_date" type="date" value={form.start_date} onChange={handleFormChange} required /></div>
                  <div className="col-12 col-md-6"><label className="form-label">End Date / Next Rent Due Date</label><input className="form-control" name="end_date" type="date" value={form.end_date} onChange={handleFormChange} required /></div>
                  <div className="col-12 col-md-4"><label className="form-label">Rent amount</label><input className="form-control" name="rent_amount" type="number" min="0" step="0.01" value={form.rent_amount} onChange={handleFormChange} /></div>
                  <div className="col-12 col-md-4"><label className="form-label">Frequency</label><select className="form-select" name="payment_frequency" value={form.payment_frequency} onChange={handleFormChange}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
                  <div className="col-12 col-md-4"><label className="form-label">Unit floor area</label><input className="form-control" type="text" value={selectedUnit?.floor_area_sqm === null || selectedUnit?.floor_area_sqm === undefined ? 'Not entered' : `${Number(selectedUnit.floor_area_sqm).toLocaleString()} sqm`} readOnly /></div>
                </div>
              </div>
              <div className="tenora-form-section">
                <div><strong>Status and review</strong><span>Keep tenancy status and rent-review notes current.</span></div>
                <div className="row g-3">
                  <div className="col-12 col-md-4"><label className="form-label">Status</label><select className="form-select" name="status" value={form.status} onChange={handleFormChange}><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option></select></div>
                  <div className="col-12 col-md-4"><label className="form-label">Last reviewed</label><input className="form-control" name="last_reviewed_date" type="date" value={form.last_reviewed_date} onChange={handleFormChange} /></div>
                  <div className="col-12 col-md-4"><label className="form-label">Service charge</label><input className="form-control" type="text" value="Calculated from property budget" readOnly /></div>
                  <div className="col-12"><label className="form-label">Rent review note</label><textarea className="form-control" name="rent_review_note" rows="3" value={form.rent_review_note} onChange={handleFormChange} /></div>
                </div>
              </div>
            </div>
            <footer><button className="btn btn-light border" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary tenora-primary-btn" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingLease ? 'Save tenancy' : 'Create tenancy'}</button></footer>
          </form>
        </div>
      )}

      <ConfirmModal isOpen={Boolean(deletingLease)} title="Delete tenancy?" message={`This will permanently remove the tenancy for ${deletingLease?.tenant_name || deletingLease?.unit_number || 'this tenant'}.`} details={<><div className="small text-secondary mb-1">Tenancy details</div><div className="fw-semibold">{deletingLease?.property_name || 'Property'} · {deletingLease?.unit_number || 'No unit'}</div></>} confirmLabel="Delete tenancy" isWorking={isDeleting} onCancel={closeDeleteModal} onConfirm={confirmDelete} />
      <FeedbackModal isOpen={Boolean(feedbackModal)} {...(feedbackModal || {})} onClose={() => setFeedbackModal(null)} />
    </div>
  );
};

export default Leases;
