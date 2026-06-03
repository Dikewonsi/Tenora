import { useEffect, useMemo, useState } from 'react';
import {
  IconEdit,
  IconId,
  IconMail,
  IconPhone,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUser,
  IconUsers,
  IconX
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';

const emptyForm = {
  full_name: '',
  phone_number: '',
  email: '',
  alternative_contact: '',
  id_card_url: ''
};

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const emerald = '#10b981';
  const emeraldDark = '#059669';
  const cardShadow = '0 16px 38px rgba(15, 23, 42, 0.06)';

  const query = useMemo(() => ({
    page,
    limit: 10,
    search
  }), [page, search]);

  const fetchTenants = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/tenants', {
        params: query
      });

      setTenants(response.data.data.tenants || []);
      setPagination(response.data.data.pagination || {
        page,
        limit: 10,
        total: 0,
        totalPages: 1
      });
    } catch (tenantError) {
      setError(tenantError.response?.data?.message || tenantError.message || 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [query]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const openCreateModal = () => {
    setEditingTenant(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setForm({
      full_name: tenant.full_name || '',
      phone_number: tenant.phone_number || '',
      email: tenant.email || '',
      alternative_contact: tenant.alternative_contact || '',
      id_card_url: tenant.id_card_url || ''
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingTenant) {
        await apiClient.put(`/tenants/${editingTenant.id}`, form);
        const message = 'Tenant updated successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Tenant saved', message });
      } else {
        await apiClient.post('/tenants', form);
        const message = 'Tenant created successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Tenant created', message });
      }

      closeModal();
      await fetchTenants();
    } catch (tenantError) {
      const message = tenantError.response?.data?.message || tenantError.message || 'Failed to save tenant';
      setError(message);
      setFeedbackModal({ variant: 'danger', title: 'Tenant could not be saved', message });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (tenant) => {
    setDeletingTenant(tenant);
    setError('');
    setSuccess('');
  };

  const closeDeleteModal = () => {
    setDeletingTenant(null);
  };

  const confirmDelete = async () => {
    if (!deletingTenant) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.delete(`/tenants/${deletingTenant.id}`);
      const message = 'Tenant deleted successfully';
      setSuccess(message);
      setFeedbackModal({ variant: 'success', title: 'Tenant deleted', message });
      closeDeleteModal();
      await fetchTenants();
    } catch (tenantError) {
      const message = tenantError.response?.data?.message || tenantError.message || 'Failed to delete tenant';
      setError('');
      setFeedbackModal({
        variant: 'danger',
        title: 'Tenant cannot be deleted',
        message,
        guidance: message.toLowerCase().includes('related') ? 'This protects existing lease, payment, and reminder history from being removed accidentally.' : ''
      });
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchTenants();
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
                Tenants
              </span>
              <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
                Tenant Directory
              </h1>
              <p className="fs-3 text-secondary mb-0" style={{ maxWidth: 720 }}>
                Manage tenant contact records before linking them to leases, payments, reminders, and service charge demands.
              </p>
            </div>

            <button
              className="btn btn-lg text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={openCreateModal}
              style={{ background: emerald, borderRadius: 16 }}
            >
              <IconPlus size={20} />
              Add Tenant
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
          <form className="row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-lg-9">
              <label className="form-label">Search</label>
              <div className="input-icon">
                <span className="input-icon-addon">
                  <IconSearch size={18} />
                </span>
                <input
                  className="form-control"
                  placeholder="Name, email, or phone number"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-lg-3 d-flex gap-2">
              <button className="btn text-white border-0 flex-fill" type="submit" style={{ background: emerald, borderRadius: 12 }}>
                Apply
              </button>
              <button
                className="btn btn-light border flex-fill"
                type="button"
                onClick={() => {
                  setSearch('');
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
              <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Tenants</h2>
              <p className="text-secondary mb-0">
                {pagination.total} record{pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
            <button className="btn btn-light d-inline-flex align-items-center gap-2" type="button" onClick={fetchTenants} style={{ borderRadius: 12 }}>
              <IconRefresh size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Alternative Contact</th>
                <th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-secondary">
                    Loading tenants...
                  </td>
                </tr>
              )}

              {!isLoading && tenants.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-secondary">
                    No tenants found.
                  </td>
                </tr>
              )}

              {!isLoading && tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 44, height: 44, borderRadius: 14, background: '#d1fae5', color: emeraldDark }}
                      >
                        <IconUser size={22} />
                      </div>
                      <div>
                        <div className="fw-semibold" style={{ color: '#101816' }}>
                          {tenant.full_name}
                        </div>
                        <div className="small text-secondary">
                          {tenant.id_card_url ? 'ID card linked' : 'No ID card linked'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{tenant.phone_number || '-'}</td>
                  <td>{tenant.email || '-'}</td>
                  <td>{tenant.alternative_contact || '-'}</td>
                  <td>{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-light" type="button" onClick={() => openEditModal(tenant)} style={{ borderRadius: 10 }}>
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => openDeleteModal(tenant)} style={{ borderRadius: 10 }}>
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
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: 'rgba(15, 23, 42, 0.48)', zIndex: 1050 }}
        >
          <form className="card border-0 w-100" onSubmit={handleSubmit} style={{ maxWidth: 720, borderRadius: 26, boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)' }}>
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>
                    {editingTenant ? 'Edit tenant' : 'Add tenant'}
                  </h3>
                  <p className="text-secondary mb-0">Capture tenant contact details for leases and payment tracking.</p>
                </div>
                <button className="btn btn-light btn-icon" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>
                  <IconX size={18} />
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Full name</label>
                  <div className="input-icon">
                    <span className="input-icon-addon">
                      <IconUser size={18} />
                    </span>
                    <input className="form-control" name="full_name" value={form.full_name} onChange={handleFormChange} required />
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Phone number</label>
                  <div className="input-icon">
                    <span className="input-icon-addon">
                      <IconPhone size={18} />
                    </span>
                    <input className="form-control" name="phone_number" value={form.phone_number} onChange={handleFormChange} />
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Email</label>
                  <div className="input-icon">
                    <span className="input-icon-addon">
                      <IconMail size={18} />
                    </span>
                    <input className="form-control" name="email" type="email" value={form.email} onChange={handleFormChange} />
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label">Alternative contact</label>
                  <input className="form-control" name="alternative_contact" value={form.alternative_contact} onChange={handleFormChange} placeholder="Name and phone number" />
                </div>
                <div className="col-12">
                  <label className="form-label">ID card URL</label>
                  <div className="input-icon">
                    <span className="input-icon-addon">
                      <IconId size={18} />
                    </span>
                    <input className="form-control" name="id_card_url" value={form.id_card_url} onChange={handleFormChange} placeholder="https://example.com/id-card.jpg" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer bg-white border-0 p-4">
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-light" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>
                  Cancel
                </button>
                <button className="btn text-white border-0" type="submit" disabled={isSaving} style={{ background: emerald, borderRadius: 12 }}>
                  {isSaving ? 'Saving...' : editingTenant ? 'Save changes' : 'Create tenant'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingTenant)}
        title="Delete tenant?"
        message={`This will permanently remove ${deletingTenant?.full_name || 'this tenant'}. This action cannot be undone.`}
        details={(
          <>
            <div className="small text-secondary mb-1">Tenant details</div>
            <div className="fw-semibold" style={{ color: '#101816' }}>
              {deletingTenant?.email || 'No email'} · {deletingTenant?.phone_number || 'No phone'}
            </div>
          </>
        )}
        confirmLabel="Delete tenant"
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

export default Tenants;
