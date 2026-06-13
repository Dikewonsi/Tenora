import { useEffect, useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconBuildingEstate,
  IconEdit,
  IconLayoutGrid,
  IconList,
  IconMapPin,
  IconPlus,
  IconRefresh,
  IconRulerMeasure,
  IconSearch,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconX
} from '@tabler/icons-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { EmptyState, PageHeader } from '../components/TenoraUI';

const emptyForm = {
  property_name: '',
  address: '',
  location: '',
  property_description: '',
  total_lettable_space: ''
};

const emptyUnit = () => ({
  unit_name: '',
  floor_area_sqm: '',
  bedrooms: '',
  status: 'active'
});

const number = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 1 });
const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const Properties = () => {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [search, setSearch] = useState(() => urlSearch);
  const [location, setLocation] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
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
  const [wizardStep, setWizardStep] = useState(1);
  const [setupUnits, setSetupUnits] = useState([]);

  const configuredArea = setupUnits.reduce(
    (total, unit) => total + safeNumber(unit.floor_area_sqm),
    0
  );
  const totalLettableSpace = safeNumber(form.total_lettable_space);
  const unconfiguredArea = Math.max(totalLettableSpace - configuredArea, 0);
  const configuredAreaExceedsTotal = configuredArea - totalLettableSpace > 0.0001;

  const query = useMemo(() => ({
    page,
    limit: 10,
    search,
    location
  }), [location, page, search]);

  const displayedProperties = useMemo(() => {
    const sorted = [...properties];

    sorted.sort((first, second) => {
      if (sortBy === 'name') {
        return String(first.property_name || '').localeCompare(String(second.property_name || ''));
      }
      if (sortBy === 'units') {
        return safeNumber(second.total_units) - safeNumber(first.total_units);
      }
      if (sortBy === 'space') {
        return safeNumber(second.total_lettable_space) - safeNumber(first.total_lettable_space);
      }

      return new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
    });

    return sorted;
  }, [properties, sortBy]);

  const pageSummary = useMemo(() => {
    const units = properties.reduce((total, property) => total + safeNumber(property.total_units), 0);
    const lettableSpace = properties.reduce(
      (total, property) => total + safeNumber(property.total_lettable_space),
      0
    );
    const locations = new Set(
      properties
        .map((property) => String(property.location || '').trim().toLowerCase())
        .filter(Boolean)
    ).size;

    return {
      units,
      lettableSpace,
      locations,
      averageUnits: properties.length ? units / properties.length : 0
    };
  }, [properties]);

  const fetchProperties = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/properties', { params: query });
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingProperty(null);
    setForm(emptyForm);
    setWizardStep(1);
    setSetupUnits([]);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (routerLocation.state?.openCreate === 'property') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateModal();
      navigate(`${routerLocation.pathname}${routerLocation.search}`, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(urlSearch);
    setPage(1);
  }, [urlSearch]);

  const openEditModal = (property) => {
    setEditingProperty(property);
    setForm({
      property_name: property.property_name || '',
      address: property.address || '',
      location: property.location || '',
      property_description: property.property_description || '',
      total_lettable_space: property.total_lettable_space ?? ''
    });
    setWizardStep(1);
    setSetupUnits([]);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProperty(null);
    setForm(emptyForm);
    setWizardStep(1);
    setSetupUnits([]);
  };

  const updateSetupUnit = (index, field, value) => {
    setSetupUnits((current) => current.map((unit, unitIndex) => (
      unitIndex === index ? { ...unit, [field]: value } : unit
    )));
  };

  const validatePropertyStep = () => {
    if (!form.property_name.trim() || !form.address.trim()) {
      setError('Property name and address are required');
      return false;
    }

    if (form.total_lettable_space !== '' && totalLettableSpace < 0) {
      setError('Total lettable space must be zero or greater');
      return false;
    }

    setError('');
    return true;
  };

  const validateUnitsStep = () => {
    const invalidUnit = setupUnits.find((unit) => (
      !unit.unit_name.trim()
      || (unit.floor_area_sqm !== '' && safeNumber(unit.floor_area_sqm) < 0)
      || (unit.bedrooms !== '' && (!Number.isInteger(Number(unit.bedrooms)) || Number(unit.bedrooms) < 0))
    ));

    if (invalidUnit) {
      setError('Every added unit needs a name, a valid non-negative floor area, and a valid bedroom count');
      return false;
    }

    if (configuredArea > 0 && totalLettableSpace <= 0) {
      setError('Enter a positive total lettable space before saving units with floor area');
      return false;
    }

    if (configuredAreaExceedsTotal) {
      setError('Configured unit area cannot exceed total lettable space');
      return false;
    }

    setError('');
    return true;
  };

  const goToNextStep = () => {
    if (wizardStep === 1 && !validatePropertyStep()) return;
    if (wizardStep === 2 && !validateUnitsStep()) return;
    setWizardStep((current) => Math.min(3, current + 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingProperty) {
        await apiClient.put(`/properties/${editingProperty.id}`, {
          ...form,
          total_lettable_space: form.total_lettable_space === '' ? null : Number(form.total_lettable_space)
        });
        setSuccess('Property updated successfully');
      } else {
        if (!validatePropertyStep() || !validateUnitsStep()) {
          setIsSaving(false);
          return;
        }
        await apiClient.post('/properties', {
          ...form,
          total_lettable_space: form.total_lettable_space === '' ? null : Number(form.total_lettable_space),
          units: setupUnits.map((unit) => ({
            ...unit,
            floor_area_sqm: unit.floor_area_sqm === '' ? null : Number(unit.floor_area_sqm),
            bedrooms: unit.bedrooms === '' ? null : Number(unit.bedrooms)
          }))
        });
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

  const confirmDelete = async () => {
    if (!deletingProperty) return;

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.delete(`/properties/${deletingProperty.id}`);
      setSuccess('Property deleted successfully');
      setDeletingProperty(null);
      await fetchProperties();
    } catch (propertyError) {
      const message = propertyError.response?.data?.message || propertyError.message || 'Failed to delete property';
      setErrorModal({
        title: 'Property cannot be deleted',
        message,
        guidance: message.toLowerCase().includes('related')
          ? 'This protects existing tenancy, payment, and service charge history. Keep the property for audit history, or remove its related records first.'
          : undefined
      });
      setDeletingProperty(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const nextParams = new URLSearchParams(searchParams);

    if (search.trim()) nextParams.set('search', search.trim());
    else nextParams.delete('search');

    setSearchParams(nextParams, { replace: true });
    setPage(1);
  };

  const resetFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('search');
    setSearchParams(nextParams, { replace: true });
    setSearch('');
    setLocation('');
    setPage(1);
  };

  const manageUnits = () => navigate('/units');

  return (
    <div className="tenora-properties">
      <PageHeader
        eyebrow="Portfolio / Properties"
        title="Properties"
        description="Manage your property portfolio, units, occupancy, and service-charge setup."
        action={{ label: 'Add Property', onClick: openCreateModal, icon: <IconPlus size={18} /> }}
      />

      {error && <div className="alert alert-danger border-0 mb-0" role="alert">{error}</div>}
      {success && <div className="alert alert-success border-0 mb-0" role="alert">{success}</div>}

      <section className="tenora-property-summary" aria-label="Property portfolio summary">
        <article>
          <span className="tenora-property-summary-icon is-emerald"><IconBuildingEstate size={19} /></span>
          <div><small>Total properties</small><strong>{isLoading ? '...' : pagination.total || 0}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon is-blue"><IconBuildingEstate size={19} /></span>
          <div><small>Units on this page</small><strong>{isLoading ? '...' : number.format(pageSummary.units)}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon is-amber"><IconRulerMeasure size={19} /></span>
          <div><small>Lettable space shown</small><strong>{isLoading ? '...' : `${number.format(pageSummary.lettableSpace)} sqm`}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon is-slate"><IconMapPin size={19} /></span>
          <div><small>Locations shown</small><strong>{isLoading ? '...' : pageSummary.locations}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon is-emerald"><IconLayoutGrid size={19} /></span>
          <div><small>Average units shown</small><strong>{isLoading ? '...' : number.format(pageSummary.averageUnits)}</strong></div>
        </article>
      </section>

      <section className="tenora-property-toolbar">
        <form onSubmit={handleSearchSubmit}>
          <div className="tenora-property-search">
            <IconSearch size={17} />
            <input
              aria-label="Search properties"
              placeholder="Search name, address, or location"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="tenora-property-search">
            <IconMapPin size={17} />
            <input
              aria-label="Filter properties by location"
              placeholder="Filter by location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          <select className="form-select tenora-property-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort properties">
            <option value="newest">Newest first</option>
            <option value="name">Name A-Z</option>
            <option value="units">Most units</option>
            <option value="space">Largest space</option>
          </select>
          <button className="btn btn-primary tenora-primary-btn" type="submit">Apply</button>
          <button className="btn btn-light border" type="button" onClick={resetFilters}>Reset</button>
        </form>

        <div className="tenora-view-toggle" role="group" aria-label="Property view">
          <button className={view === 'cards' ? 'is-active' : ''} type="button" onClick={() => setView('cards')} aria-label="Card view" title="Card view">
            <IconLayoutGrid size={17} />
          </button>
          <button className={view === 'table' ? 'is-active' : ''} type="button" onClick={() => setView('table')} aria-label="Table view" title="Table view">
            <IconList size={18} />
          </button>
        </div>
      </section>

      <section className="tenora-property-workspace">
        <header>
          <div>
            <h2>Property portfolio</h2>
            <p>{pagination.total || 0} record{pagination.total === 1 ? '' : 's'} found</p>
          </div>
          <button className="btn btn-sm btn-light border d-inline-flex align-items-center gap-2" type="button" onClick={fetchProperties}>
            <IconRefresh size={16} /> Refresh
          </button>
        </header>

        {isLoading && view === 'cards' && (
          <div className="tenora-property-grid" aria-label="Loading properties">
            {Array.from({ length: 6 }, (_, index) => <div className="tenora-property-card is-loading" key={index} />)}
          </div>
        )}

        {!isLoading && displayedProperties.length === 0 && (
          <EmptyState
            title="No properties found"
            description={search || location
              ? 'Try a different search or clear the filters to see your portfolio.'
              : 'Add your first property, then create its units and tenancy assignments.'}
            actionLabel={search || location ? 'Clear filters' : 'Add Property'}
            onAction={search || location ? resetFilters : openCreateModal}
            icon={IconBuildingEstate}
          />
        )}

        {!isLoading && displayedProperties.length > 0 && view === 'cards' && (
          <div className="tenora-property-grid">
            {displayedProperties.map((property) => {
              const units = safeNumber(property.total_units);
              const space = safeNumber(property.total_lettable_space);

              return (
                <article className="tenora-property-card" key={property.id}>
                  <div className="tenora-property-card-top">
                    <span className="tenora-property-avatar"><IconBuildingEstate size={23} /></span>
                    <div className="tenora-property-card-actions">
                      <button type="button" onClick={() => openEditModal(property)} aria-label={`Edit ${property.property_name}`} title="Edit property"><IconEdit size={16} /></button>
                      <button className="is-danger" type="button" onClick={() => setDeletingProperty(property)} aria-label={`Delete ${property.property_name}`} title="Delete property"><IconTrash size={16} /></button>
                    </div>
                  </div>

                  <div className="tenora-property-card-title">
                    <h3>{property.property_name || 'Unnamed property'}</h3>
                    <p><IconMapPin size={14} /> {property.location || property.address || 'Location not added'}</p>
                  </div>

                  <p className="tenora-property-description">
                    {property.property_description || 'No description has been added for this property.'}
                  </p>

                  <div className="tenora-property-metrics">
                    <div><small>Units</small><strong>{number.format(property.configured_unit_count ?? units)}</strong></div>
                    <div><small>Lettable space</small><strong>{space ? `${number.format(space)} sqm` : 'Not set'}</strong></div>
                  </div>

                  <div className="tenora-property-setup">
                    <div>
                      <span>Portfolio setup</span>
                      <strong>{units > 0 ? 'Units configured' : 'Add units next'}</strong>
                    </div>
                    <span className={units > 0 ? 'is-ready' : ''}>{units > 0 ? 'Ready' : 'Setup'}</span>
                  </div>

                  <div className="tenora-property-card-footer">
                    <button className="tenora-property-manage" type="button" onClick={manageUnits}>
                      Manage units <IconArrowRight size={16} />
                    </button>
                    <span>{property.createdAt ? `Added ${new Date(property.createdAt).toLocaleDateString('en-NG')}` : ''}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {view === 'table' && displayedProperties.length > 0 && (
          <div className="table-responsive tenora-property-table">
            <table className="table table-vcenter mb-0">
              <thead><tr><th>Property</th><th>Location</th><th>Units</th><th>Lettable space</th><th>Created</th><th className="text-end">Actions</th></tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="6" className="text-center py-5 text-secondary">Loading properties...</td></tr>
                ) : displayedProperties.map((property) => (
                  <tr key={property.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <span className="tenora-property-table-icon"><IconBuildingEstate size={18} /></span>
                        <div><strong>{property.property_name || 'Unnamed property'}</strong><small>{property.address || 'No address'}</small></div>
                      </div>
                    </td>
                    <td>{property.location || '-'}</td>
                    <td>{number.format(safeNumber(property.total_units))}</td>
                    <td>{safeNumber(property.total_lettable_space) ? `${number.format(safeNumber(property.total_lettable_space))} sqm` : '-'}</td>
                    <td>{property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-NG') : '-'}</td>
                    <td className="text-end">
                      <div className="d-inline-flex align-items-center gap-2">
                        <button className="btn btn-sm btn-light border" type="button" onClick={manageUnits}>Manage</button>
                        <button className="btn btn-sm btn-light btn-icon" type="button" onClick={() => openEditModal(property)} aria-label={`Edit ${property.property_name}`}><IconEdit size={16} /></button>
                        <button className="btn btn-sm btn-outline-danger btn-icon" type="button" onClick={() => setDeletingProperty(property)} aria-label={`Delete ${property.property_name}`}><IconTrash size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(displayedProperties.length > 0 || isLoading) && (
          <PaginationControls
            currentPage={pagination.page || page}
            totalPages={pagination.totalPages || 1}
            total={pagination.total || 0}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        )}
      </section>

      {isModalOpen && (
        <div className="tenora-property-modal-backdrop">
          <form className={`tenora-property-modal ${editingProperty ? '' : 'tenora-property-wizard'}`} onSubmit={handleSubmit}>
            <header>
              <div>
                <span>{editingProperty ? 'Property details' : `Property onboarding · Step ${wizardStep} of 3`}</span>
                <h3>{editingProperty ? 'Edit property' : ['Property details', 'Units setup', 'Review & save'][wizardStep - 1]}</h3>
                <p>{editingProperty ? 'Update the management-entered property details.' : 'Set up the property and its physical lettable-space register.'}</p>
              </div>
              <button className="btn btn-light btn-icon" type="button" onClick={closeModal} aria-label="Close property form"><IconX size={18} /></button>
            </header>

            {!editingProperty && (
              <div className="tenora-wizard-steps" aria-label="Property setup progress">
                {['Property Details', 'Units Setup', 'Review & Save'].map((label, index) => (
                  <span className={wizardStep >= index + 1 ? 'is-active' : ''} key={label}>
                    <i>{index + 1}</i>{label}
                  </span>
                ))}
              </div>
            )}

            <div className="tenora-property-modal-body">
              {(editingProperty || wizardStep === 1) && <><div className="tenora-form-section">
                <div><strong>Identity</strong><span>How this property appears across Tenora.</span></div>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="property-name">Property name</label>
                    <input id="property-name" className="form-control" name="property_name" value={form.property_name} onChange={handleFormChange} placeholder="Marina Court" required />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="property-description">Description <span className="text-secondary fw-normal">(optional)</span></label>
                    <textarea id="property-description" className="form-control" name="property_description" value={form.property_description} onChange={handleFormChange} rows="2" placeholder="Residential apartments with shared facilities" />
                  </div>
                </div>
              </div>

              <div className="tenora-form-section">
                <div><strong>Location</strong><span>Use a clear address your team will recognise.</span></div>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="property-address">Address</label>
                    <textarea id="property-address" className="form-control" name="address" value={form.address} onChange={handleFormChange} rows="2" placeholder="12 Admiralty Way, Lekki Phase 1" required />
                  </div>
                  <div className="col-12 col-md-7">
                    <label className="form-label" htmlFor="property-location">Area / city</label>
                    <input id="property-location" className="form-control" name="location" value={form.location} onChange={handleFormChange} placeholder="Lekki, Lagos" />
                    <div className="form-text">Useful for portfolio search and filtering.</div>
                  </div>
                </div>
              </div>

              <div className="tenora-property-form-note">
                <IconRulerMeasure size={18} />
                <span>Total lettable space is the management-approved denominator for service-charge accounting.</span>
              </div>
              <div className="tenora-form-section">
                <div><strong>Area control</strong><span>This can exceed the units configured today, but configured units may never exceed it.</span></div>
                <div>
                  <label className="form-label" htmlFor="property-total-space">Total lettable space (sqm)</label>
                  <input id="property-total-space" className="form-control" name="total_lettable_space" type="number" min="0" step="0.01" value={form.total_lettable_space} onChange={handleFormChange} placeholder="1000" />
                  <div className="form-text">A positive value is required before service charges can be calculated.</div>
                </div>
              </div></>}

              {!editingProperty && wizardStep === 2 && (
                <>
                  <div className="tenora-wizard-area-summary">
                    <div><small>Total lettable</small><strong>{number.format(totalLettableSpace)} sqm</strong></div>
                    <div><small>Configured units</small><strong>{number.format(configuredArea)} sqm</strong></div>
                    <div className={configuredAreaExceedsTotal ? 'is-error' : ''}><small>Remaining</small><strong>{number.format(totalLettableSpace - configuredArea)} sqm</strong></div>
                  </div>
                  <div className="tenora-wizard-unit-list">
                    {setupUnits.map((unit, index) => (
                      <article key={`setup-unit-${index}`}>
                        <header><strong>Unit {index + 1}</strong><button type="button" onClick={() => setSetupUnits((current) => current.filter((_, unitIndex) => unitIndex !== index))}>Remove</button></header>
                        <div className="row g-3">
                          <div className="col-12 col-md-4"><label className="form-label">Unit name</label><input className="form-control" value={unit.unit_name} onChange={(event) => updateSetupUnit(index, 'unit_name', event.target.value)} placeholder="A1" /></div>
                          <div className="col-12 col-md-3"><label className="form-label">Floor area (sqm)</label><input className="form-control" type="number" min="0" step="0.01" value={unit.floor_area_sqm} onChange={(event) => updateSetupUnit(index, 'floor_area_sqm', event.target.value)} placeholder="200" /></div>
                          <div className="col-6 col-md-2"><label className="form-label">Bedrooms</label><input className="form-control" type="number" min="0" step="1" value={unit.bedrooms} onChange={(event) => updateSetupUnit(index, 'bedrooms', event.target.value)} /></div>
                          <div className="col-6 col-md-3"><label className="form-label">Status</label><select className="form-select" value={unit.status} onChange={(event) => updateSetupUnit(index, 'status', event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                        </div>
                      </article>
                    ))}
                    {setupUnits.length === 0 && <div className="tenora-wizard-empty">Units are optional during onboarding. They can also be added later from the Units page.</div>}
                    <button className="btn btn-light border" type="button" onClick={() => setSetupUnits((current) => [...current, emptyUnit()])}><IconPlus size={16} /> Add unit</button>
                  </div>
                  {configuredAreaExceedsTotal && <div className="alert alert-danger mb-0">Configured unit area exceeds total lettable space by {number.format(configuredArea - totalLettableSpace)} sqm.</div>}
                  {!configuredAreaExceedsTotal && configuredArea < totalLettableSpace && <div className="alert alert-warning mb-0">{number.format(unconfiguredArea)} sqm will remain owner/unallocated until more physical units are configured.</div>}
                </>
              )}

              {!editingProperty && wizardStep === 3 && (
                <div className="tenora-wizard-review">
                  <section><small>Property</small><h4>{form.property_name}</h4><p>{form.address}{form.location ? ` · ${form.location}` : ''}</p><span>{form.property_description || 'No description provided'}</span></section>
                  <div className="tenora-wizard-area-summary">
                    <div><small>Total lettable</small><strong>{number.format(totalLettableSpace)} sqm</strong></div>
                    <div><small>Physical units</small><strong>{setupUnits.length}</strong></div>
                    <div><small>Configured area</small><strong>{number.format(configuredArea)} sqm</strong></div>
                    <div><small>Unconfigured area</small><strong>{number.format(unconfiguredArea)} sqm</strong></div>
                  </div>
                  {setupUnits.length > 0 && <div className="tenora-wizard-review-units">{setupUnits.map((unit) => <div key={unit.unit_name}><strong>{unit.unit_name}</strong><span>{number.format(safeNumber(unit.floor_area_sqm))} sqm · {unit.status}</span></div>)}</div>}
                  {totalLettableSpace <= 0 && <div className="alert alert-warning mb-0">This property can be saved, but service-charge calculation will remain blocked until a positive total lettable space is entered.</div>}
                  {unconfiguredArea > 0 && <div className="alert alert-warning mb-0">Unconfigured space remains an owner/unallocated service-charge share.</div>}
                </div>
              )}
            </div>

            <footer>
              <button className="btn btn-light border" type="button" onClick={wizardStep > 1 && !editingProperty ? () => setWizardStep((current) => current - 1) : closeModal}>{wizardStep > 1 && !editingProperty ? <><IconChevronLeft size={16} /> Back</> : 'Cancel'}</button>
              {(editingProperty || wizardStep === 3) && <button className="btn btn-primary tenora-primary-btn" type="submit" disabled={isSaving || configuredAreaExceedsTotal}>{isSaving ? 'Saving...' : editingProperty ? 'Save changes' : 'Create property & units'}</button>}
              {!editingProperty && wizardStep < 3 && <button className="btn btn-primary tenora-primary-btn" type="button" onClick={goToNextStep}>Continue <IconChevronRight size={16} /></button>}
            </footer>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingProperty)}
        title="Delete property?"
        message={`This will permanently remove ${deletingProperty?.property_name || 'this property'}. Linked records will remain protected.`}
        details={(
          <>
            <div className="small text-secondary mb-1">Property details</div>
            <div className="fw-semibold">{deletingProperty?.location || deletingProperty?.address || 'No location'}</div>
          </>
        )}
        confirmLabel="Delete property"
        isWorking={isDeleting}
        onCancel={() => setDeletingProperty(null)}
        onConfirm={confirmDelete}
      />

      <FeedbackModal
        isOpen={Boolean(errorModal)}
        {...(errorModal || {})}
        onClose={() => setErrorModal(null)}
      />
    </div>
  );
};

export default Properties;
