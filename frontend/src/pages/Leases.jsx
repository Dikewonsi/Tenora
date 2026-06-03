import { useEffect, useMemo, useState } from 'react';
import {
  IconBuildingEstate,
  IconCalendarEvent,
  IconEdit,
  IconFileInvoice,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUser,
  IconX
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { getStatusStyle } from '../utils/statusStyles';

const emptyForm = {
  property_id: '',
  tenant_id: '',
  unit_number: '',
  unit_description: '',
  start_date: '',
  end_date: '',
  rent_amount: '',
  service_charge_amount: '',
  payment_frequency: 'yearly',
  status: 'active',
  next_rent_due_date: '',
  reminder_6_month_date: '',
  reminder_3_month_date: '',
  last_reviewed_date: '',
  rent_review_note: '',
  occupied_space: ''
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

const Leases = () => {
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [propertyId, setPropertyId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [status, setStatus] = useState('');
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

  const emerald = '#10b981';
  const emeraldDark = '#059669';
  const cardShadow = '0 16px 38px rgba(15, 23, 42, 0.06)';

  const query = useMemo(() => ({
    page,
    limit: 10,
    property_id: propertyId,
    tenant_id: tenantId,
    status
  }), [page, propertyId, status, tenantId]);

  const fetchLookups = async () => {
    const [propertiesResponse, tenantsResponse] = await Promise.all([
      apiClient.get('/properties', { params: { limit: 100 } }),
      apiClient.get('/tenants', { params: { limit: 100 } })
    ]);

    setProperties(propertiesResponse.data.data.properties || []);
    setTenants(tenantsResponse.data.data.tenants || []);
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
      setError(leaseError.response?.data?.message || leaseError.message || 'Failed to load leases');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups().catch((lookupError) => {
      setError(lookupError.response?.data?.message || lookupError.message || 'Failed to load properties and tenants');
    });
  }, []);

  useEffect(() => {
    fetchLeases();
  }, [query]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const openCreateModal = () => {
    setEditingLease(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (lease) => {
    setEditingLease(lease);
    setForm({
      property_id: lease.property_id || '',
      tenant_id: lease.tenant_id || '',
      unit_number: lease.unit_number || '',
      unit_description: lease.unit_description || '',
      start_date: toDateInput(lease.start_date),
      end_date: toDateInput(lease.end_date),
      rent_amount: lease.rent_amount || '',
      service_charge_amount: lease.service_charge_amount || '',
      payment_frequency: lease.payment_frequency || 'yearly',
      status: lease.status || 'active',
      next_rent_due_date: toDateInput(lease.next_rent_due_date),
      reminder_6_month_date: toDateInput(lease.reminder_6_month_date),
      reminder_3_month_date: toDateInput(lease.reminder_3_month_date),
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
    occupied_space: nullableNumber(form.occupied_space),
    next_rent_due_date: nullableDate(form.next_rent_due_date),
    reminder_6_month_date: nullableDate(form.reminder_6_month_date),
    reminder_3_month_date: nullableDate(form.reminder_3_month_date),
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
        const message = 'Lease updated successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Lease saved', message });
      } else {
        await apiClient.post('/leases', getPayload());
        const message = 'Lease created successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Lease created', message });
      }

      closeModal();
      await fetchLeases();
    } catch (leaseError) {
      const message = leaseError.response?.data?.message || leaseError.message || 'Failed to save lease';
      setError(message);
      setFeedbackModal({ variant: 'danger', title: 'Lease could not be saved', message });
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
      const message = 'Lease deleted successfully';
      setSuccess(message);
      setFeedbackModal({ variant: 'success', title: 'Lease deleted', message });
      closeDeleteModal();
      await fetchLeases();
    } catch (leaseError) {
      const message = leaseError.response?.data?.message || leaseError.message || 'Failed to delete lease';
      setError('');
      setFeedbackModal({
        variant: 'danger',
        title: 'Lease cannot be deleted',
        message,
        guidance: message.toLowerCase().includes('related') ? 'This protects related payments, service charge demands, and reminders from losing their lease history.' : ''
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

  return (
    <div className="d-grid gap-4">
      <section
        className="card border-0 overflow-hidden"
        style={{
          borderRadius: 30,
          background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 54%, #d1fae5 100%)',
          boxShadow: cardShadow
        }}
      >
        <div className="card-body p-4 p-xl-5">
          <div className="d-flex flex-column flex-xl-row align-items-start align-items-xl-center justify-content-between gap-4">
            <div>
              <span className="badge border-0 mb-3 px-3 py-2" style={{ background: '#d1fae5', color: emeraldDark }}>
                Leases
              </span>
              <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
                Lease Register
              </h1>
              <p className="fs-3 text-secondary mb-0" style={{ maxWidth: 760 }}>
                Connect tenants to properties, track unit details, rent values, service charges, and renewal dates.
              </p>
            </div>

            <button
              className="btn btn-lg text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={openCreateModal}
              style={{ background: emerald, borderRadius: 16 }}
            >
              <IconPlus size={20} />
              Add Lease
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="alert alert-danger rounded-4 border-0 mb-0" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success rounded-4 border-0 mb-0" role="alert">
          {success}
        </div>
      )}

      <section className="card border-0" style={{ borderRadius: 26, boxShadow: cardShadow }}>
        <div className="card-body p-4">
          <form className="row g-3 align-items-end" onSubmit={handleFilterSubmit}>
            <div className="col-12 col-lg-4">
              <label className="form-label">Property</label>
              <select className="form-select" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
                <option value="">All properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.property_name || property.address}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-4">
              <label className="form-label">Tenant</label>
              <select className="form-select" value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
                <option value="">All tenants</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-2">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div className="col-12 col-lg-2 d-flex gap-2">
              <button className="btn text-white border-0 flex-fill" type="submit" style={{ background: emerald, borderRadius: 12 }}>
                Apply
              </button>
              <button
                className="btn btn-light border flex-fill"
                type="button"
                onClick={() => {
                  setPropertyId('');
                  setTenantId('');
                  setStatus('');
                  setPage(1);
                }}
                style={{ borderRadius: 12 }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card border-0 overflow-hidden" style={{ borderRadius: 26, boxShadow: cardShadow }}>
        <div className="card-header bg-white border-0 p-4">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Leases</h2>
              <p className="text-secondary mb-0">
                {pagination.total} record{pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
            <button className="btn btn-light d-inline-flex align-items-center gap-2" type="button" onClick={fetchLeases} style={{ borderRadius: 12 }}>
              <IconRefresh size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Lease</th>
                <th>Property</th>
                <th>Period</th>
                <th>Rent</th>
                <th>Service Charge</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    Loading leases...
                  </td>
                </tr>
              )}

              {!isLoading && leases.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    No leases found.
                  </td>
                </tr>
              )}

              {!isLoading && leases.map((lease) => (
                <tr key={lease.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 44, height: 44, borderRadius: 14, background: '#d1fae5', color: emeraldDark }}
                      >
                        <IconFileInvoice size={22} />
                      </div>
                      <div>
                        <div className="fw-semibold" style={{ color: '#101816' }}>
                          {lease.tenant_name || 'Tenant'}
                        </div>
                        <div className="small text-secondary">
                          {lease.unit_number || 'No unit'} · {lease.unit_description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{lease.property_name || '-'}</td>
                  <td>
                    {toDateInput(lease.start_date) || '-'} to {toDateInput(lease.end_date) || '-'}
                  </td>
                  <td>{lease.rent_amount ? Number(lease.rent_amount).toLocaleString() : '0'}</td>
                  <td>{lease.service_charge_amount ? Number(lease.service_charge_amount).toLocaleString() : '0'}</td>
                  <td>
                    <span className="badge text-capitalize" style={getStatusStyle(lease.status || 'active')}>
                      {lease.status || 'active'}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-light" type="button" onClick={() => openEditModal(lease)} style={{ borderRadius: 10 }}>
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => openDeleteModal(lease)} style={{ borderRadius: 10 }}>
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationControls
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages || 1}
          total={pagination.total || 0}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </section>

      {isModalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start align-items-lg-center justify-content-center p-2 p-sm-3"
          style={{ background: 'rgba(15, 23, 42, 0.48)', zIndex: 1050, overflowY: 'auto' }}
        >
          <form
            className="card border-0 w-100 my-2 my-lg-0"
            onSubmit={handleSubmit}
            style={{
              maxWidth: 980,
              maxHeight: 'calc(100vh - 24px)',
              overflow: 'hidden',
              borderRadius: 26,
              boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)'
            }}
          >
            <div className="card-header bg-white border-0 p-3 p-sm-4">
              <div className="d-flex align-items-start justify-content-between gap-3">
                <div style={{ minWidth: 0 }}>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>
                    {editingLease ? 'Edit lease' : 'Add lease'}
                  </h3>
                  <p className="text-secondary mb-0">Connect a tenant to a property and define lease terms.</p>
                </div>
                <button className="btn btn-light btn-icon flex-shrink-0" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>
                  <IconX size={18} />
                </button>
              </div>
            </div>

            <div className="card-body p-3 p-sm-4" style={{ overflowY: 'auto' }}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Property</label>
                  <div className="d-flex align-items-center gap-2 mb-2 text-secondary small">
                    <span className="d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, borderRadius: 10, background: '#ecfdf5', color: emeraldDark }}>
                      <IconBuildingEstate size={18} />
                    </span>
                    <span>Choose the property this lease belongs to</span>
                  </div>
                  <select className="form-select" name="property_id" value={form.property_id} onChange={handleFormChange} required>
                    <option value="">Select property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.property_name || property.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Tenant</label>
                  <div className="d-flex align-items-center gap-2 mb-2 text-secondary small">
                    <span className="d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, borderRadius: 10, background: '#ecfdf5', color: emeraldDark }}>
                      <IconUser size={18} />
                    </span>
                    <span>Choose the tenant occupying the unit</span>
                  </div>
                  <select className="form-select" name="tenant_id" value={form.tenant_id} onChange={handleFormChange} required>
                    <option value="">Select tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Unit number</label>
                  <input className="form-control" name="unit_number" value={form.unit_number} onChange={handleFormChange} placeholder="Suite 1A" />
                </div>
                <div className="col-12 col-lg-8">
                  <label className="form-label">Unit description</label>
                  <input className="form-control" name="unit_description" value={form.unit_description} onChange={handleFormChange} placeholder="Second floor office space" />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Start date</label>
                  <input className="form-control" name="start_date" type="date" value={form.start_date} onChange={handleFormChange} required />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">End date</label>
                  <input className="form-control" name="end_date" type="date" value={form.end_date} onChange={handleFormChange} required />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Frequency</label>
                  <select className="form-select" name="payment_frequency" value={form.payment_frequency} onChange={handleFormChange}>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Rent amount</label>
                  <input className="form-control" name="rent_amount" type="number" min="0" step="0.01" value={form.rent_amount} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Service charge</label>
                  <input className="form-control" name="service_charge_amount" type="number" min="0" step="0.01" value={form.service_charge_amount} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Occupied space</label>
                  <input className="form-control" name="occupied_space" type="number" min="0" step="0.01" value={form.occupied_space} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" name="status" value={form.status} onChange={handleFormChange}>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Next rent due</label>
                  <input className="form-control" name="next_rent_due_date" type="date" value={form.next_rent_due_date} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Last reviewed</label>
                  <input className="form-control" name="last_reviewed_date" type="date" value={form.last_reviewed_date} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">6 month reminder</label>
                  <input className="form-control" name="reminder_6_month_date" type="date" value={form.reminder_6_month_date} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">3 month reminder</label>
                  <input className="form-control" name="reminder_3_month_date" type="date" value={form.reminder_3_month_date} onChange={handleFormChange} />
                </div>
                <div className="col-12">
                  <label className="form-label">Rent review note</label>
                  <textarea className="form-control" name="rent_review_note" rows="3" value={form.rent_review_note} onChange={handleFormChange} />
                </div>
              </div>
            </div>

            <div className="card-footer bg-white border-0 p-3 p-sm-4">
              <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
                <button className="btn btn-light" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>
                  Cancel
                </button>
                <button className="btn text-white border-0" type="submit" disabled={isSaving} style={{ background: emerald, borderRadius: 12 }}>
                  {isSaving ? 'Saving...' : editingLease ? 'Save changes' : 'Create lease'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingLease)}
        title="Delete lease?"
        message={`This will permanently remove the lease for ${deletingLease?.tenant_name || deletingLease?.unit_number || 'this tenant'}. This action cannot be undone.`}
        details={(
          <>
            <div className="small text-secondary mb-1">Lease details</div>
            <div className="fw-semibold" style={{ color: '#101816' }}>
              {deletingLease?.property_name || 'Property'} · {deletingLease?.unit_number || 'No unit'}
            </div>
          </>
        )}
        confirmLabel="Delete lease"
        isWorking={isDeleting}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />

      <FeedbackModal
        isOpen={Boolean(feedbackModal)}
        {...(feedbackModal || {})}
        onClose={() => setFeedbackModal(null)}
      />
    </div>
  );
};

export default Leases;
