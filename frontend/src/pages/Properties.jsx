import { useEffect, useMemo, useState } from 'react';
import {
  IconBuildingEstate,
  IconEdit,
  IconMapPin,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconAlertCircle,
  IconX
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';
import PaginationControls from '../components/PaginationControls';

const emptyForm = {
  property_code: '',
  property_name: '',
  address: '',
  location: '',
  property_description: '',
  total_units: '',
  total_lettable_space: ''
};

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errorModal, setErrorModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const emerald = '#10b981';
  const emeraldDark = '#059669';
  const cardShadow = '0 16px 38px rgba(15, 23, 42, 0.06)';

  const query = useMemo(() => ({
    page,
    limit: 10,
    search,
    location
  }), [location, page, search]);

  const fetchProperties = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/properties', {
        params: query
      });

      setProperties(response.data.data.properties || []);
      setPagination(response.data.data.pagination || {
        page,
        limit: 10,
        total: 0,
        totalPages: 1
      });
    } catch (propertyError) {
      setError(propertyError.response?.data?.message || propertyError.message || 'Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [query]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const openCreateModal = () => {
    setEditingProperty(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (property) => {
    setEditingProperty(property);
    setForm({
      property_code: property.property_code || '',
      property_name: property.property_name || '',
      address: property.address || '',
      location: property.location || '',
      property_description: property.property_description || '',
      total_units: property.total_units || '',
      total_lettable_space: property.total_lettable_space || ''
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProperty(null);
    setForm(emptyForm);
  };

  const getPayload = () => ({
    ...form,
    total_units: form.total_units === '' ? null : Number(form.total_units),
    total_lettable_space: form.total_lettable_space === '' ? null : Number(form.total_lettable_space)
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingProperty) {
        await apiClient.put(`/properties/${editingProperty.id}`, getPayload());
        setSuccess('Property updated successfully');
      } else {
        await apiClient.post('/properties', getPayload());
        setSuccess('Property created successfully');
      }

      closeModal();
      await fetchProperties();
    } catch (propertyError) {
      setError(propertyError.response?.data?.message || propertyError.message || 'Failed to save property');
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (property) => {
    setDeletingProperty(property);
    setError('');
    setSuccess('');
  };

  const closeDeleteModal = () => {
    setDeletingProperty(null);
  };

  const confirmDelete = async () => {
    if (!deletingProperty) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.delete(`/properties/${deletingProperty.id}`);
      setSuccess('Property deleted successfully');
      closeDeleteModal();
      await fetchProperties();
    } catch (propertyError) {
      const message = propertyError.response?.data?.message || propertyError.message || 'Failed to delete property';

      setError('');
      setErrorModal({
        title: 'Property cannot be deleted',
        message
      });
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchProperties();
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
                Properties
              </span>
              <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
                Property Portfolio
              </h1>
              <p className="fs-3 text-secondary mb-0" style={{ maxWidth: 720 }}>
                Manage property records, locations, units, and lettable space before leases and service charges are created.
              </p>
            </div>

            <button
              className="btn btn-lg text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={openCreateModal}
              style={{ background: emerald, borderRadius: 16 }}
            >
              <IconPlus size={20} />
              Add Property
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
            <div className="col-12 col-lg-5">
              <label className="form-label">Search</label>
              <div className="input-icon">
                <span className="input-icon-addon">
                  <IconSearch size={18} />
                </span>
                <input
                  className="form-control"
                  placeholder="Name, code, address, or location"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <label className="form-label">Location</label>
              <div className="input-icon">
                <span className="input-icon-addon">
                  <IconMapPin size={18} />
                </span>
                <input
                  className="form-control"
                  placeholder="Filter by location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
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
                  setLocation('');
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
              <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Properties</h2>
              <p className="text-secondary mb-0">
                {pagination.total} record{pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
            <button className="btn btn-light d-inline-flex align-items-center gap-2" type="button" onClick={fetchProperties} style={{ borderRadius: 12 }}>
              <IconRefresh size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Property</th>
                <th>Location</th>
                <th>Units</th>
                <th>Lettable Space</th>
                <th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-secondary">
                    Loading properties...
                  </td>
                </tr>
              )}

              {!isLoading && properties.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-secondary">
                    No properties found.
                  </td>
                </tr>
              )}

              {!isLoading && properties.map((property) => (
                <tr key={property.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 44, height: 44, borderRadius: 14, background: '#d1fae5', color: emeraldDark }}
                      >
                        <IconBuildingEstate size={22} />
                      </div>
                      <div>
                        <div className="fw-semibold" style={{ color: '#101816' }}>
                          {property.property_name || 'Unnamed property'}
                        </div>
                        <div className="small text-secondary">
                          {property.property_code || 'No code'} · {property.address}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{property.location || '-'}</td>
                  <td>{property.total_units || 0}</td>
                  <td>{property.total_lettable_space ? `${property.total_lettable_space} sqm` : '-'}</td>
                  <td>{property.createdAt ? new Date(property.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-light" type="button" onClick={() => openEditModal(property)} style={{ borderRadius: 10 }}>
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => openDeleteModal(property)} style={{ borderRadius: 10 }}>
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
          <form className="card border-0 w-100" onSubmit={handleSubmit} style={{ maxWidth: 760, borderRadius: 26, boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)' }}>
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>
                    {editingProperty ? 'Edit property' : 'Add property'}
                  </h3>
                  <p className="text-secondary mb-0">Keep core property details accurate for leases and service charges.</p>
                </div>
                <button className="btn btn-light btn-icon" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>
                  <IconX size={18} />
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Property code</label>
                  <input className="form-control" name="property_code" value={form.property_code} onChange={handleFormChange} placeholder="PROP-001" />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Property name</label>
                  <input className="form-control" name="property_name" value={form.property_name} onChange={handleFormChange} placeholder="Marina Court" />
                </div>
                <div className="col-12">
                  <label className="form-label">Address</label>
                  <textarea className="form-control" name="address" value={form.address} onChange={handleFormChange} rows="2" required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Location</label>
                  <input className="form-control" name="location" value={form.location} onChange={handleFormChange} placeholder="Lagos Island" />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Total units</label>
                  <input className="form-control" name="total_units" type="number" min="0" value={form.total_units} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Lettable space <span>(sqm)</span></label>
                  <input className="form-control" name="total_lettable_space" type="number" min="0" step="0.01" value={form.total_lettable_space} onChange={handleFormChange} />
                </div>
                <div className="col-12">
                  <label className="form-label">Description</label>
                  <input className="form-control" name="property_description" value={form.property_description} onChange={handleFormChange} placeholder="Commercial property" />
                </div>
              </div>
            </div>

            <div className="card-footer bg-white border-0 p-4">
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-light" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>
                  Cancel
                </button>
                <button className="btn text-white border-0" type="submit" disabled={isSaving} style={{ background: emerald, borderRadius: 12 }}>
                  {isSaving ? 'Saving...' : editingProperty ? 'Save changes' : 'Create property'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {deletingProperty && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: 'rgba(15, 23, 42, 0.48)', zIndex: 1050 }}
        >
          <div className="card border-0 w-100" style={{ maxWidth: 520, borderRadius: 26, boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)' }}>
            <div className="card-body p-4 p-md-5">
              <div className="d-flex align-items-start gap-3 mb-4">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 52, height: 52, borderRadius: 18, background: '#fee2e2', color: '#dc2626' }}
                >
                  <IconTrash size={24} />
                </div>
                <div>
                  <h3 className="fw-bold mb-2" style={{ color: '#101816' }}>Delete property?</h3>
                  <p className="text-secondary mb-0">
                    This will permanently remove{' '}
                    <span className="fw-semibold" style={{ color: '#101816' }}>
                      {deletingProperty.property_name || deletingProperty.address}
                    </span>
                    . This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="rounded-4 p-3 mb-4" style={{ background: '#f8fafc' }}>
                <div className="small text-secondary mb-1">Property details</div>
                <div className="fw-semibold" style={{ color: '#101816' }}>
                  {deletingProperty.property_code || 'No code'} · {deletingProperty.location || 'No location'}
                </div>
              </div>

              <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
                <button className="btn btn-light" type="button" onClick={closeDeleteModal} disabled={isDeleting} style={{ borderRadius: 12 }}>
                  Cancel
                </button>
                <button className="btn btn-danger d-inline-flex align-items-center justify-content-center gap-2" type="button" onClick={confirmDelete} disabled={isDeleting} style={{ borderRadius: 12 }}>
                  <IconTrash size={18} />
                  {isDeleting ? 'Deleting...' : 'Delete property'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: 'rgba(15, 23, 42, 0.48)', zIndex: 1060 }}
        >
          <div className="card border-0 w-100 overflow-hidden" style={{ maxWidth: 560, borderRadius: 26, boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)' }}>
            <div style={{ height: 6, background: '#dc2626' }} />
            <div className="card-body p-4 p-md-5">
              <div className="d-flex align-items-start gap-3 mb-4">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 62, height: 62, borderRadius: 20, background: '#fee2e2', color: '#dc2626' }}
                >
                  <IconAlertCircle size={38} stroke={2.2} />
                </div>
                <div>
                  <h3 className="fw-bold mb-2" style={{ color: '#101816' }}>
                    {errorModal.title}
                  </h3>
                  <p className="fw-semibold mb-0" style={{ color: '#991b1b' }}>
                    {errorModal.message}
                  </p>
                </div>
              </div>

              {errorModal.message.toLowerCase().includes('related') && (
                <div className="rounded-4 p-3 mb-4" style={{ background: '#fef2f2', color: '#7f1d1d' }}>
                  This protects existing lease, payment, and service charge history from being removed accidentally. Keep this property for audit history, or remove its related records first.
                </div>
              )}

              <div className="d-flex justify-content-end">
                <button
                  className="btn rounded-4 fw-bold shadow-sm text-white px-4"
                  type="button"
                  onClick={() => setErrorModal(null)}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;
