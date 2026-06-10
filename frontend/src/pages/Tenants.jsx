import { useEffect, useMemo, useState } from 'react';
import {
  IconAddressBook,
  IconEdit,
  IconId,
  IconLayoutGrid,
  IconList,
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
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { EmptyState, PageHeader } from '../components/TenoraUI';

const emptyForm = {
  full_name: '',
  phone_number: '',
  email: '',
  alternative_contact: '',
  id_card_url: ''
};

const Tenants = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [view, setView] = useState('cards');
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

  const query = useMemo(() => ({ page, limit: 10, search }), [page, search]);
  const summary = useMemo(() => tenants.reduce((totals, tenant) => {
    if (tenant.phone_number) totals.phone += 1;
    if (tenant.email) totals.email += 1;
    if (tenant.id_card_url) totals.documents += 1;
    if (tenant.phone_number && tenant.email) totals.complete += 1;
    return totals;
  }, { phone: 0, email: 0, documents: 0, complete: 0 }), [tenants]);

  const fetchTenants = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/tenants', { params: query });
      setTenants(response.data.data.tenants || []);
      setPagination(response.data.data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
    } catch (tenantError) {
      setError(tenantError.response?.data?.message || tenantError.message || 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingTenant(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.openCreate === 'tenant') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateModal();
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

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
      } else {
        await apiClient.post('/tenants', form);
      }
      const message = editingTenant ? 'Tenant updated successfully' : 'Tenant created successfully';
      setSuccess(message);
      setFeedbackModal({ variant: 'success', title: editingTenant ? 'Tenant saved' : 'Tenant created', message });
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

  const confirmDelete = async () => {
    if (!deletingTenant) return;
    setIsDeleting(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/tenants/${deletingTenant.id}`);
      const message = 'Tenant deleted successfully';
      setSuccess(message);
      setFeedbackModal({ variant: 'success', title: 'Tenant deleted', message });
      setDeletingTenant(null);
      await fetchTenants();
    } catch (tenantError) {
      const message = tenantError.response?.data?.message || tenantError.message || 'Failed to delete tenant';
      setFeedbackModal({
        variant: 'danger',
        title: 'Tenant cannot be deleted',
        message,
        guidance: message.toLowerCase().includes('related') ? 'This protects existing tenancy and payment history from being removed accidentally.' : ''
      });
      setDeletingTenant(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetSearch = () => {
    setSearch('');
    setPage(1);
  };

  return (
    <div className="tenora-properties tenora-tenants">
      <PageHeader
        eyebrow="Occupancy / Tenants"
        title="Tenants"
        description="Manage occupant contact records before connecting them to units and tenancies."
        action={{ label: 'Add Tenant', onClick: openCreateModal, icon: <IconPlus size={18} /> }}
      />

      {error && <div className="alert alert-danger border-0 mb-0" role="alert">{error}</div>}
      {success && <div className="alert alert-success border-0 mb-0" role="alert">{success}</div>}

      <section className="tenora-tenant-summary" aria-label="Tenant directory summary">
        <article><span className="tenora-property-summary-icon"><IconUsers size={19} /></span><div><small>Total tenants</small><strong>{isLoading ? '...' : pagination.total || 0}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-blue"><IconPhone size={19} /></span><div><small>Phone recorded shown</small><strong>{isLoading ? '...' : summary.phone}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-slate"><IconMail size={19} /></span><div><small>Email recorded shown</small><strong>{isLoading ? '...' : summary.email}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-amber"><IconId size={19} /></span><div><small>ID documents shown</small><strong>{isLoading ? '...' : summary.documents}</strong></div></article>
        <article><span className="tenora-property-summary-icon"><IconAddressBook size={19} /></span><div><small>Complete contacts shown</small><strong>{isLoading ? '...' : summary.complete}</strong></div></article>
      </section>

      <section className="tenora-property-toolbar tenora-tenant-toolbar">
        <div className="tenora-tenant-filters">
          <div className="tenora-property-search">
            <IconSearch size={17} />
            <input
              aria-label="Search tenants"
              placeholder="Search name, email, or phone"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <button className="btn btn-light border d-inline-flex align-items-center justify-content-center gap-2" type="button" onClick={fetchTenants}><IconRefresh size={16} /> Refresh</button>
          <button className="btn btn-light border" type="button" onClick={resetSearch}>Reset</button>
        </div>
        <div className="tenora-view-toggle" role="group" aria-label="Tenant view">
          <button className={view === 'cards' ? 'is-active' : ''} type="button" onClick={() => setView('cards')} aria-label="Card view"><IconLayoutGrid size={17} /></button>
          <button className={view === 'table' ? 'is-active' : ''} type="button" onClick={() => setView('table')} aria-label="Table view"><IconList size={18} /></button>
        </div>
      </section>

      <section className="tenora-property-workspace">
        <header>
          <div><h2>Tenant directory</h2><p>{pagination.total || 0} contact record{pagination.total === 1 ? '' : 's'} found</p></div>
          <span className="tenora-inventory-context">{search ? 'Search active' : 'All tenants'}</span>
        </header>

        {isLoading && view === 'cards' && (
          <div className="tenora-property-grid tenora-tenant-grid">
            {Array.from({ length: 6 }, (_, index) => <div className="tenora-property-card tenora-tenant-card is-loading" key={index} />)}
          </div>
        )}

        {!isLoading && tenants.length === 0 && (
          <EmptyState
            title={search ? 'No tenants match this search' : 'No tenants added yet'}
            description={search ? 'Try another name, email, or phone number.' : 'Add a tenant before creating their tenancy and unit assignment.'}
            actionLabel={search ? 'Clear search' : 'Add Tenant'}
            onAction={search ? resetSearch : openCreateModal}
            icon={IconUsers}
          />
        )}

        {!isLoading && tenants.length > 0 && view === 'cards' && (
          <div className="tenora-property-grid tenora-tenant-grid">
            {tenants.map((tenant) => {
              const completeContact = Boolean(tenant.phone_number && tenant.email);
              return (
                <article className="tenora-property-card tenora-tenant-card" key={tenant.id}>
                  <div className="tenora-property-card-top">
                    <span className="tenora-tenant-avatar">{String(tenant.full_name || 'T').slice(0, 1).toUpperCase()}</span>
                    <div className="tenora-property-card-actions">
                      <button type="button" onClick={() => openEditModal(tenant)} aria-label={`Edit ${tenant.full_name}`}><IconEdit size={16} /></button>
                      <button className="is-danger" type="button" onClick={() => setDeletingTenant(tenant)} aria-label={`Delete ${tenant.full_name}`}><IconTrash size={16} /></button>
                    </div>
                  </div>
                  <div className="tenora-property-card-title">
                    <h3>{tenant.full_name || 'Unnamed tenant'}</h3>
                    <p><IconUser size={14} /> Tenant contact record</p>
                  </div>
                  <div className="tenora-tenant-contact-list">
                    <div><IconPhone size={15} /><span><small>Phone</small><strong>{tenant.phone_number || 'Not recorded'}</strong></span></div>
                    <div><IconMail size={15} /><span><small>Email</small><strong>{tenant.email || 'Not recorded'}</strong></span></div>
                    <div><IconAddressBook size={15} /><span><small>Alternative contact</small><strong>{tenant.alternative_contact || 'Not recorded'}</strong></span></div>
                  </div>
                  <div className="tenora-tenant-readiness">
                    <span className={completeContact ? 'is-ready' : 'is-warning'}>{completeContact ? 'Contact ready' : 'Contact incomplete'}</span>
                    <span className={tenant.id_card_url ? 'is-ready' : ''}>{tenant.id_card_url ? 'ID linked' : 'No ID document'}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {view === 'table' && (tenants.length > 0 || isLoading) && (
          <div className="table-responsive tenora-property-table">
            <table className="table table-vcenter mb-0">
              <thead><tr><th>Tenant</th><th>Phone</th><th>Email</th><th>Alternative contact</th><th>Document</th><th className="text-end">Actions</th></tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan="6" className="text-center py-5 text-secondary">Loading tenants...</td></tr> : tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td><div className="d-flex align-items-center gap-3"><span className="tenora-tenant-table-avatar">{String(tenant.full_name || 'T').slice(0, 1).toUpperCase()}</span><div><strong>{tenant.full_name}</strong><small>{tenant.createdAt ? `Added ${new Date(tenant.createdAt).toLocaleDateString('en-NG')}` : ''}</small></div></div></td>
                    <td>{tenant.phone_number || '-'}</td>
                    <td>{tenant.email || '-'}</td>
                    <td>{tenant.alternative_contact || '-'}</td>
                    <td><span className={`tenora-unit-readiness-pill ${tenant.id_card_url ? 'is-ready' : ''}`}>{tenant.id_card_url ? 'Linked' : 'Not linked'}</span></td>
                    <td className="text-end"><div className="d-inline-flex gap-2"><button className="btn btn-sm btn-light btn-icon" type="button" onClick={() => openEditModal(tenant)}><IconEdit size={16} /></button><button className="btn btn-sm btn-outline-danger btn-icon" type="button" onClick={() => setDeletingTenant(tenant)}><IconTrash size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(tenants.length > 0 || isLoading) && <PaginationControls currentPage={pagination.page || page} totalPages={pagination.totalPages || 1} total={pagination.total || 0} isLoading={isLoading} onPageChange={setPage} />}
      </section>

      {isModalOpen && (
        <div className="tenora-property-modal-backdrop">
          <form className="tenora-property-modal tenora-tenant-modal" onSubmit={handleSubmit}>
            <header>
              <div><span>{editingTenant ? 'Tenant details' : 'New occupant record'}</span><h3>{editingTenant ? 'Edit tenant' : 'Add tenant'}</h3><p>Capture reliable contact details for tenancies, payments, and notices.</p></div>
              <button className="btn btn-light btn-icon" type="button" onClick={closeModal} aria-label="Close tenant form"><IconX size={18} /></button>
            </header>
            <div className="tenora-property-modal-body">
              <div className="tenora-form-section">
                <div><strong>Identity</strong><span>The tenant name used throughout Tenora.</span></div>
                <div><label className="form-label" htmlFor="tenant-name">Full name</label><input id="tenant-name" className="form-control" name="full_name" value={form.full_name} onChange={handleFormChange} placeholder="Test Tenant" required /></div>
              </div>
              <div className="tenora-form-section">
                <div><strong>Contact details</strong><span>Used for rent notices, demands, and payment communication.</span></div>
                <div className="row g-3">
                  <div className="col-12 col-md-6"><label className="form-label" htmlFor="tenant-phone">Phone number</label><input id="tenant-phone" className="form-control" name="phone_number" value={form.phone_number} onChange={handleFormChange} placeholder="+234 800 000 0000" /></div>
                  <div className="col-12 col-md-6"><label className="form-label" htmlFor="tenant-email">Email</label><input id="tenant-email" className="form-control" name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="tenant@example.com" /></div>
                  <div className="col-12"><label className="form-label" htmlFor="tenant-alternative">Alternative contact</label><input id="tenant-alternative" className="form-control" name="alternative_contact" value={form.alternative_contact} onChange={handleFormChange} placeholder="Name and phone number" /></div>
                </div>
              </div>
              <div className="tenora-form-section">
                <div><strong>Documentation</strong><span>Optional link to a securely stored identity document.</span></div>
                <div><label className="form-label" htmlFor="tenant-document">Identity document link</label><input id="tenant-document" className="form-control" name="id_card_url" value={form.id_card_url} onChange={handleFormChange} placeholder="https://secure-document-link" /></div>
              </div>
            </div>
            <footer><button className="btn btn-light border" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary tenora-primary-btn" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingTenant ? 'Save changes' : 'Create tenant'}</button></footer>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingTenant)}
        title="Delete tenant?"
        message={`This will permanently remove ${deletingTenant?.full_name || 'this tenant'}. Linked tenancy records remain protected.`}
        details={<><div className="small text-secondary mb-1">Tenant details</div><div className="fw-semibold">{deletingTenant?.email || 'No email'} · {deletingTenant?.phone_number || 'No phone'}</div></>}
        confirmLabel="Delete tenant"
        isWorking={isDeleting}
        onCancel={() => setDeletingTenant(null)}
        onConfirm={confirmDelete}
      />
      <FeedbackModal isOpen={Boolean(feedbackModal)} {...(feedbackModal || {})} onClose={() => setFeedbackModal(null)} />
    </div>
  );
};

export default Tenants;
