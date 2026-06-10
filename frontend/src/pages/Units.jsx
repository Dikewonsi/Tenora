import { useEffect, useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconBed,
  IconBuilding,
  IconCircleCheck,
  IconEdit,
  IconHome,
  IconLayoutGrid,
  IconList,
  IconPlus,
  IconRefresh,
  IconRulerMeasure,
  IconSearch,
  IconTrash,
  IconUser,
  IconX
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { EmptyState, PageHeader, StatusBadge } from '../components/TenoraUI';
import { propertyLabel, sortByOptionLabel } from '../utils/sortOptions';

const emptyForm = {
  property_id: '',
  unit_name: '',
  floor_area_sqm: '',
  bedrooms: '',
  status: 'active'
};

const number = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2 });
const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const hasFloorArea = (unit) => unit.floor_area_sqm !== null
  && unit.floor_area_sqm !== undefined
  && unit.floor_area_sqm !== '';

const getReadiness = (unit) => {
  if (unit.status === 'inactive') {
    return { label: 'Inactive', className: 'is-inactive', detail: 'Not currently available for active workflows' };
  }
  if (!hasFloorArea(unit)) {
    return { label: 'Needs floor area', className: 'is-warning', detail: 'Add floor area before pro rata allocation' };
  }
  return { label: 'Ready', className: 'is-ready', detail: 'Ready for tenancy and service-charge setup' };
};

const Units = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [propertyId, setPropertyId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('cards');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const query = useMemo(() => ({
    page,
    limit: 10,
    property_id: propertyId,
    status,
    search
  }), [page, propertyId, search, status]);

  const summary = useMemo(() => units.reduce((totals, unit) => {
    totals.total += 1;
    totals.floorArea += safeNumber(unit.floor_area_sqm);
    if (unit.tenant_name) totals.occupied += 1;
    else totals.vacant += 1;
    if (unit.status === 'active') totals.active += 1;
    if (!hasFloorArea(unit)) totals.missingFloorArea += 1;
    return totals;
  }, {
    total: 0,
    occupied: 0,
    vacant: 0,
    active: 0,
    floorArea: 0,
    missingFloorArea: 0
  }), [units]);

  const fetchUnits = async () => {
    setIsLoading(true);

    try {
      const response = await apiClient.get('/units', { params: query });
      setUnits(response.data.data.units || []);
      setPagination(response.data.data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Units could not be loaded', message: error.response?.data?.message || error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get('/properties', { params: { limit: 100 } })
      .then((response) => setProperties(sortByOptionLabel(response.data.data.properties || [], propertyLabel)))
      .catch((error) => setFeedbackModal({ variant: 'danger', title: 'Properties could not be loaded', message: error.response?.data?.message || error.message }));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const openCreate = () => {
    setEditingUnit(null);
    setForm({ ...emptyForm, property_id: propertyId });
    setModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.openCreate === 'unit') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreate();
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const openEdit = (unit) => {
    setEditingUnit(unit);
    setForm({
      property_id: unit.property_id || '',
      unit_name: unit.unit_name || '',
      floor_area_sqm: unit.floor_area_sqm ?? '',
      bedrooms: unit.bedrooms ?? '',
      status: unit.status || 'active'
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUnit(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const payload = {
      ...form,
      floor_area_sqm: form.floor_area_sqm === '' ? null : Number(form.floor_area_sqm),
      bedrooms: form.bedrooms === '' ? null : Number(form.bedrooms)
    };

    try {
      if (editingUnit) {
        await apiClient.put(`/units/${editingUnit.id}`, payload);
      } else {
        await apiClient.post('/units', payload);
      }

      closeModal();
      setFeedbackModal({
        variant: 'success',
        title: editingUnit ? 'Unit updated' : 'Unit created',
        message: 'The property unit record was saved successfully.'
      });
      await fetchUnits();
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Unit could not be saved', message: error.response?.data?.message || error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUnit) return;
    setIsSaving(true);

    try {
      await apiClient.delete(`/units/${deletingUnit.id}`);
      setDeletingUnit(null);
      setFeedbackModal({ variant: 'success', title: 'Unit deleted', message: 'The unit record was removed.' });
      await fetchUnits();
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Unit cannot be deleted', message: error.response?.data?.message || error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setPropertyId('');
    setStatus('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="tenora-properties tenora-units">
      <PageHeader
        eyebrow="Portfolio / Units"
        title="Units"
        description="Track lettable spaces, floor area, occupancy, and unit readiness."
        action={{ label: 'Add Unit', onClick: openCreate, icon: <IconPlus size={18} /> }}
      />

      <section className="tenora-unit-summary" aria-label="Unit inventory summary">
        <article>
          <span className="tenora-property-summary-icon"><IconBuilding size={19} /></span>
          <div><small>Units shown</small><strong>{isLoading ? '...' : summary.total}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon is-blue"><IconUser size={19} /></span>
          <div><small>Occupied shown</small><strong>{isLoading ? '...' : summary.occupied}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon is-amber"><IconHome size={19} /></span>
          <div><small>Vacant shown</small><strong>{isLoading ? '...' : summary.vacant}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon"><IconCircleCheck size={19} /></span>
          <div><small>Active shown</small><strong>{isLoading ? '...' : summary.active}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon is-slate"><IconRulerMeasure size={19} /></span>
          <div><small>Floor area shown</small><strong>{isLoading ? '...' : `${number.format(summary.floorArea)} sqm`}</strong></div>
        </article>
        <article>
          <span className="tenora-property-summary-icon is-amber"><IconAlertTriangle size={19} /></span>
          <div><small>Missing floor area</small><strong>{isLoading ? '...' : summary.missingFloorArea}</strong></div>
        </article>
      </section>

      <section className="tenora-property-toolbar tenora-unit-toolbar">
        <div className="tenora-unit-filters">
          <select
            className="form-select"
            value={propertyId}
            onChange={(event) => { setPropertyId(event.target.value); setPage(1); }}
            aria-label="Filter units by property"
          >
            <option value="">All properties</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{propertyLabel(property)}</option>)}
          </select>

          <div className="tenora-property-search">
            <IconSearch size={17} />
            <input
              aria-label="Search units"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search unit or property"
            />
          </div>

          <select
            className="form-select"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
            aria-label="Filter units by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button className="btn btn-light border d-inline-flex align-items-center justify-content-center gap-2" type="button" onClick={fetchUnits}>
            <IconRefresh size={16} /> Refresh
          </button>
          <button className="btn btn-light border" type="button" onClick={resetFilters}>Reset</button>
        </div>

        <div className="tenora-view-toggle" role="group" aria-label="Unit view">
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
            <h2>Unit inventory</h2>
            <p>{pagination.total || 0} unit{pagination.total === 1 ? '' : 's'} match the current filters</p>
          </div>
          <span className="tenora-inventory-context">{propertyId ? 'Property filtered' : 'All properties'}</span>
        </header>

        {isLoading && view === 'cards' && (
          <div className="tenora-property-grid tenora-unit-grid" aria-label="Loading units">
            {Array.from({ length: 6 }, (_, index) => <div className="tenora-property-card tenora-unit-card is-loading" key={index} />)}
          </div>
        )}

        {!isLoading && units.length === 0 && (
          <EmptyState
            title={propertyId || status || search ? 'No units match these filters' : 'No units added yet'}
            description={propertyId || status || search
              ? 'Clear or adjust the filters to find another unit.'
              : 'Units are required before tenancies and service-charge allocations can be created.'}
            actionLabel={propertyId || status || search ? 'Clear filters' : 'Add Unit'}
            onAction={propertyId || status || search ? resetFilters : openCreate}
            icon={IconBuilding}
          />
        )}

        {!isLoading && units.length > 0 && view === 'cards' && (
          <div className="tenora-property-grid tenora-unit-grid">
            {units.map((unit) => {
              const readiness = getReadiness(unit);
              const occupied = Boolean(unit.tenant_name);

              return (
                <article className="tenora-property-card tenora-unit-card" key={unit.id}>
                  <div className="tenora-property-card-top">
                    <span className="tenora-property-avatar"><IconBuilding size={22} /></span>
                    <div className="d-flex align-items-center gap-2">
                      <StatusBadge status={unit.status} />
                      <div className="tenora-property-card-actions">
                        <button type="button" onClick={() => openEdit(unit)} aria-label={`Edit ${unit.unit_name}`} title="Edit unit"><IconEdit size={16} /></button>
                        <button className="is-danger" type="button" onClick={() => setDeletingUnit(unit)} aria-label={`Delete ${unit.unit_name}`} title="Delete unit"><IconTrash size={16} /></button>
                      </div>
                    </div>
                  </div>

                  <div className="tenora-property-card-title">
                    <h3>{unit.unit_name || 'Unnamed unit'}</h3>
                    <p><IconHome size={14} /> {unit.property_name || 'Property not available'}</p>
                  </div>

                  <div className={`tenora-unit-occupancy ${occupied ? 'is-occupied' : 'is-vacant'}`}>
                    <span><IconUser size={16} /></span>
                    <div>
                      <small>{occupied ? 'Current occupant' : 'Occupancy'}</small>
                      <strong>{unit.tenant_name || 'Vacant'}</strong>
                    </div>
                  </div>

                  <div className="tenora-unit-metrics">
                    <div>
                      <IconRulerMeasure size={16} />
                      <span><small>Floor area</small><strong>{hasFloorArea(unit) ? `${number.format(safeNumber(unit.floor_area_sqm))} sqm` : 'Not entered'}</strong></span>
                    </div>
                    <div>
                      <IconBed size={16} />
                      <span><small>Bedrooms</small><strong>{unit.bedrooms ?? 'Not set'}</strong></span>
                    </div>
                  </div>

                  <div className={`tenora-unit-readiness ${readiness.className}`}>
                    <span />
                    <div><strong>{readiness.label}</strong><small>{readiness.detail}</small></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {view === 'table' && (units.length > 0 || isLoading) && (
          <div className="table-responsive tenora-property-table tenora-unit-table">
            <table className="table table-vcenter mb-0">
              <thead><tr><th>Unit</th><th>Property</th><th>Occupant</th><th>Area</th><th>Bedrooms</th><th>Readiness</th><th className="text-end">Actions</th></tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="7" className="text-center py-5 text-secondary">Loading units...</td></tr>
                ) : units.map((unit) => {
                  const readiness = getReadiness(unit);
                  return (
                    <tr key={unit.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <span className="tenora-property-table-icon"><IconBuilding size={18} /></span>
                          <div><strong>{unit.unit_name || 'Unnamed unit'}</strong><small><StatusBadge status={unit.status} /></small></div>
                        </div>
                      </td>
                      <td>{unit.property_name || '-'}</td>
                      <td>{unit.tenant_name || <span className="text-secondary">Vacant</span>}</td>
                      <td>{hasFloorArea(unit) ? `${number.format(safeNumber(unit.floor_area_sqm))} sqm` : <span className="text-warning">Not entered</span>}</td>
                      <td>{unit.bedrooms ?? '-'}</td>
                      <td><span className={`tenora-unit-readiness-pill ${readiness.className}`}>{readiness.label}</span></td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button className="btn btn-sm btn-light btn-icon" type="button" onClick={() => openEdit(unit)} aria-label={`Edit ${unit.unit_name}`}><IconEdit size={16} /></button>
                          <button className="btn btn-sm btn-outline-danger btn-icon" type="button" onClick={() => setDeletingUnit(unit)} aria-label={`Delete ${unit.unit_name}`}><IconTrash size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(units.length > 0 || isLoading) && (
          <PaginationControls
            currentPage={pagination.page || page}
            totalPages={pagination.totalPages || 1}
            total={pagination.total || 0}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        )}
      </section>

      {modalOpen && (
        <div className="tenora-property-modal-backdrop">
          <form className="tenora-property-modal tenora-unit-modal" onSubmit={handleSubmit}>
            <header>
              <div>
                <span>{editingUnit ? 'Unit details' : 'New lettable space'}</span>
                <h3>{editingUnit ? 'Edit unit' : 'Add unit'}</h3>
                <p>Set up the unit for tenancy and service-charge allocation.</p>
              </div>
              <button className="btn btn-light btn-icon" type="button" onClick={closeModal} aria-label="Close unit form"><IconX size={18} /></button>
            </header>

            <div className="tenora-property-modal-body">
              <div className="tenora-form-section">
                <div><strong>Unit identity</strong><span>Choose the property and a clear unit name or number.</span></div>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="unit-property">Property</label>
                    <select id="unit-property" className="form-select" value={form.property_id} onChange={(event) => setForm((current) => ({ ...current, property_id: event.target.value }))} required>
                      <option value="">Select property</option>
                      {properties.map((property) => <option key={property.id} value={property.id}>{propertyLabel(property)}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="unit-name">Unit name / number</label>
                    <input id="unit-name" className="form-control" value={form.unit_name} onChange={(event) => setForm((current) => ({ ...current, unit_name: event.target.value }))} placeholder="Flat 1A" required />
                  </div>
                </div>
              </div>

              <div className="tenora-form-section">
                <div><strong>Space details</strong><span>Floor area powers pro rata service-charge calculations.</span></div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="unit-area">Floor area (sqm)</label>
                    <input id="unit-area" className="form-control" type="number" min="0" step="0.01" value={form.floor_area_sqm} onChange={(event) => setForm((current) => ({ ...current, floor_area_sqm: event.target.value }))} placeholder="120" />
                    <div className="form-text">Required before this unit can receive a pro rata allocation.</div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="unit-bedrooms">Bedrooms <span className="text-secondary fw-normal">(optional)</span></label>
                    <input id="unit-bedrooms" className="form-control" type="number" min="0" step="1" value={form.bedrooms} onChange={(event) => setForm((current) => ({ ...current, bedrooms: event.target.value }))} placeholder="3" />
                  </div>
                </div>
              </div>

              <div className="tenora-form-section">
                <div><strong>Availability</strong><span>Inactive units stay on record but are excluded from active setup.</span></div>
                <div>
                  <label className="form-label" htmlFor="unit-status">Status</label>
                  <select id="unit-status" className="form-select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="tenora-property-form-note">
                <IconRulerMeasure size={18} />
                <span>Floor area should use square metres consistently across every unit in the property.</span>
              </div>
            </div>

            <footer>
              <button className="btn btn-light border" type="button" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary tenora-primary-btn" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingUnit ? 'Save changes' : 'Create unit'}
              </button>
            </footer>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingUnit)}
        title="Delete unit?"
        message={`Delete ${deletingUnit?.unit_name || 'this unit'}? Units linked to tenancy or service-charge records remain protected.`}
        details={deletingUnit && (
          <>
            <div className="small text-secondary mb-1">Unit details</div>
            <div className="fw-semibold">{deletingUnit.property_name || 'Property unavailable'} · {deletingUnit.tenant_name || 'Vacant'}</div>
          </>
        )}
        confirmLabel="Delete unit"
        isWorking={isSaving}
        onCancel={() => setDeletingUnit(null)}
        onConfirm={confirmDelete}
      />
      <FeedbackModal isOpen={Boolean(feedbackModal)} {...(feedbackModal || {})} onClose={() => setFeedbackModal(null)} />
    </div>
  );
};

export default Units;
