import { useEffect, useMemo, useState } from 'react';
import {
  IconBuildingEstate,
  IconClipboardList,
  IconEdit,
  IconFileInvoice,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { getStatusStyle } from '../utils/statusStyles';

const emptyDemandForm = {
  property_id: '',
  lease_id: '',
  period_start: '',
  period_end: '',
  total_amount: '',
  amount_paid: '',
  due_date: '',
  status: 'draft'
};

const emptyItemForm = {
  demand_id: '',
  category: '',
  total_property_cost: '',
  total_lettable_space: '',
  occupied_space: '',
  cost_per_sqm: '',
  tenant_amount: '',
  notes: ''
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

const ServiceCharges = () => {
  const [demands, setDemands] = useState([]);
  const [items, setItems] = useState([]);
  const [properties, setProperties] = useState([]);
  const [leases, setLeases] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [propertyId, setPropertyId] = useState('');
  const [leaseId, setLeaseId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [demandForm, setDemandForm] = useState(emptyDemandForm);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const emerald = '#10b981';
  const emeraldDark = '#059669';
  const cardShadow = '0 16px 38px rgba(15, 23, 42, 0.06)';
  const money = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  });

  const query = useMemo(() => ({
    page,
    limit: 10,
    property_id: propertyId,
    lease_id: leaseId,
    status
  }), [leaseId, page, propertyId, status]);

  const filteredLeasesForDemandForm = useMemo(() => {
    if (!demandForm.property_id) {
      return leases;
    }

    return leases.filter((lease) => lease.property_id === demandForm.property_id);
  }, [demandForm.property_id, leases]);

  const fetchLookups = async () => {
    const [propertiesResponse, leasesResponse] = await Promise.all([
      apiClient.get('/properties', { params: { limit: 100 } }),
      apiClient.get('/leases', { params: { limit: 100 } })
    ]);

    setProperties(propertiesResponse.data.data.properties || []);
    setLeases(leasesResponse.data.data.leases || []);
  };

  const fetchDemands = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/service-charge-demands', {
        params: query
      });

      setDemands(response.data.data.demands || []);
      setPagination(response.data.data.pagination || {
        page,
        limit: 10,
        total: 0,
        totalPages: 1
      });
    } catch (demandError) {
      setError(demandError.response?.data?.message || demandError.message || 'Failed to load service charge demands');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async (demandId) => {
    if (!demandId) {
      setItems([]);
      return;
    }

    setIsItemsLoading(true);

    try {
      const response = await apiClient.get('/service-charge-demand-items', {
        params: {
          demand_id: demandId,
          limit: 100
        }
      });

      setItems(response.data.data.items || []);
    } catch (itemError) {
      setError(itemError.response?.data?.message || itemError.message || 'Failed to load service charge demand items');
    } finally {
      setIsItemsLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups().catch((lookupError) => {
      setError(lookupError.response?.data?.message || lookupError.message || 'Failed to load properties and leases');
    });
  }, []);

  useEffect(() => {
    fetchDemands();
  }, [query]);

  const handleDemandFormChange = (event) => {
    const { name, value } = event.target;

    setDemandForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === 'property_id' ? { lease_id: '' } : {})
    }));
  };

  const handleItemFormChange = (event) => {
    const { name, value } = event.target;

    setItemForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const openCreateDemandModal = () => {
    setEditingDemand(null);
    setDemandForm(emptyDemandForm);
    setError('');
    setSuccess('');
    setIsDemandModalOpen(true);
  };

  const openEditDemandModal = (demand) => {
    setEditingDemand(demand);
    setDemandForm({
      property_id: demand.property_id || '',
      lease_id: demand.lease_id || '',
      period_start: toDateInput(demand.period_start),
      period_end: toDateInput(demand.period_end),
      total_amount: demand.total_amount || '',
      amount_paid: demand.amount_paid || '',
      due_date: toDateInput(demand.due_date),
      status: demand.status || 'draft'
    });
    setError('');
    setSuccess('');
    setIsDemandModalOpen(true);
  };

  const closeDemandModal = () => {
    setIsDemandModalOpen(false);
    setEditingDemand(null);
    setDemandForm(emptyDemandForm);
  };

  const openCreateItemModal = () => {
    if (!selectedDemand) {
      setError('Select a service charge demand before adding an item');
      return;
    }

    setEditingItem(null);
    setItemForm({
      ...emptyItemForm,
      demand_id: selectedDemand.id
    });
    setError('');
    setSuccess('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item) => {
    setEditingItem(item);
    setItemForm({
      demand_id: item.demand_id || selectedDemand?.id || '',
      category: item.category || '',
      total_property_cost: item.total_property_cost || '',
      total_lettable_space: item.total_lettable_space || '',
      occupied_space: item.occupied_space || '',
      cost_per_sqm: item.cost_per_sqm || '',
      tenant_amount: item.tenant_amount || '',
      notes: item.notes || ''
    });
    setError('');
    setSuccess('');
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
    setItemForm(emptyItemForm);
  };

  const nullableNumber = (value) => (value === '' ? null : Number(value));
  const nullableDate = (value) => (value === '' ? null : value);

  const getDemandPayload = () => ({
    ...demandForm,
    total_amount: nullableNumber(demandForm.total_amount),
    amount_paid: nullableNumber(demandForm.amount_paid),
    due_date: nullableDate(demandForm.due_date)
  });

  const getItemPayload = () => ({
    ...itemForm,
    cost_per_sqm: itemForm.cost_per_sqm === '' ? null : Number(itemForm.cost_per_sqm),
    total_property_cost: Number(itemForm.total_property_cost),
    total_lettable_space: Number(itemForm.total_lettable_space),
    occupied_space: Number(itemForm.occupied_space),
    tenant_amount: Number(itemForm.tenant_amount)
  });

  const handleDemandSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingDemand) {
        await apiClient.put(`/service-charge-demands/${editingDemand.id}`, getDemandPayload());
        setSuccess('Service charge demand updated successfully');
      } else {
        await apiClient.post('/service-charge-demands', getDemandPayload());
        setSuccess('Service charge demand created successfully');
      }

      closeDemandModal();
      await fetchDemands();
    } catch (demandError) {
      setError(demandError.response?.data?.message || demandError.message || 'Failed to save service charge demand');
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingItem) {
        await apiClient.put(`/service-charge-demand-items/${editingItem.id}`, getItemPayload());
        setSuccess('Demand item updated successfully');
      } else {
        await apiClient.post('/service-charge-demand-items', getItemPayload());
        setSuccess('Demand item created successfully');
      }

      closeItemModal();
      await fetchItems(selectedDemand?.id);
    } catch (itemError) {
      setError(itemError.response?.data?.message || itemError.message || 'Failed to save demand item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDemand = async (demand) => {
    setDeleteTarget({ type: 'demand', record: demand });
    setError('');
    setSuccess('');
  };

  const handleDeleteItem = async (item) => {
    setDeleteTarget({ type: 'item', record: item });
    setError('');
    setSuccess('');
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      if (deleteTarget.type === 'demand') {
        await apiClient.delete(`/service-charge-demands/${deleteTarget.record.id}`);
        const message = 'Service charge demand deleted successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Demand deleted', message });
        if (selectedDemand?.id === deleteTarget.record.id) {
          setSelectedDemand(null);
          setItems([]);
        }
        await fetchDemands();
      } else {
        await apiClient.delete(`/service-charge-demand-items/${deleteTarget.record.id}`);
        const message = 'Demand item deleted successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Demand item deleted', message });
        await fetchItems(selectedDemand?.id);
      }
      closeDeleteModal();
    } catch (deleteError) {
      const fallback = deleteTarget.type === 'demand' ? 'Failed to delete service charge demand' : 'Failed to delete demand item';
      const message = deleteError.response?.data?.message || deleteError.message || fallback;
      setError('');
      setFeedbackModal({
        variant: 'danger',
        title: deleteTarget.type === 'demand' ? 'Demand cannot be deleted' : 'Demand item cannot be deleted',
        message,
        guidance: message.toLowerCase().includes('related') ? 'This protects related payments, reminders, or service charge history from being removed accidentally.' : ''
      });
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectDemand = async (demand) => {
    setSelectedDemand(demand);
    await fetchItems(demand.id);
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchDemands();
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
                Service Charges
              </span>
              <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
                Service Charge Demands
              </h1>
              <p className="fs-3 text-secondary mb-0" style={{ maxWidth: 760 }}>
                Create demand periods, track balances, and break down tenant service charge items.
              </p>
            </div>

            <button
              className="btn btn-lg text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={openCreateDemandModal}
              style={{ background: emerald, borderRadius: 16 }}
            >
              <IconPlus size={20} />
              Add Demand
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
              <label className="form-label">Lease</label>
              <select className="form-select" value={leaseId} onChange={(event) => setLeaseId(event.target.value)}>
                <option value="">All leases</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenant_name} · {lease.unit_number || lease.property_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-2">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
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
                  setLeaseId('');
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
              <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Demands</h2>
              <p className="text-secondary mb-0">
                {pagination.total} record{pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
            <button className="btn btn-light d-inline-flex align-items-center gap-2" type="button" onClick={fetchDemands} style={{ borderRadius: 12 }}>
              <IconRefresh size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Demand</th>
                <th>Period</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    Loading service charge demands...
                  </td>
                </tr>
              )}

              {!isLoading && demands.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    No service charge demands found.
                  </td>
                </tr>
              )}

              {!isLoading && demands.map((demand) => (
                <tr key={demand.id} className={selectedDemand?.id === demand.id ? 'table-success' : ''}>
                  <td>
                    <button className="btn btn-link p-0 text-start text-decoration-none" type="button" onClick={() => handleSelectDemand(demand)}>
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 44, height: 44, borderRadius: 14, background: '#d1fae5', color: emeraldDark }}
                        >
                          <IconFileInvoice size={22} />
                        </div>
                        <div>
                          <div className="fw-semibold" style={{ color: '#101816' }}>{demand.tenant_name || 'Tenant'}</div>
                          <div className="small text-secondary">{demand.property_name || 'Property'} · {demand.unit_number || 'No unit'}</div>
                        </div>
                      </div>
                    </button>
                  </td>
                  <td>{toDateInput(demand.period_start)} to {toDateInput(demand.period_end)}</td>
                  <td>{money.format(Number(demand.total_amount || 0))}</td>
                  <td>{money.format(Number(demand.amount_paid || 0))}</td>
                  <td>{money.format(Number(demand.balance || 0))}</td>
                  <td>
                    <span className="badge text-capitalize" style={getStatusStyle(demand.status || 'draft')}>
                      {demand.status || 'draft'}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-light" type="button" onClick={() => openEditDemandModal(demand)} style={{ borderRadius: 10 }}>
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => handleDeleteDemand(demand)} style={{ borderRadius: 10 }}>
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

      <section className="card border-0 overflow-hidden" style={{ borderRadius: 26, boxShadow: cardShadow }}>
        <div className="card-header bg-white border-0 p-4">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Demand Items</h2>
              <p className="text-secondary mb-0">
                {selectedDemand ? `Items for ${selectedDemand.tenant_name || selectedDemand.property_name}` : 'Select a demand to view line items'}
              </p>
            </div>
            <button
              className="btn text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={openCreateItemModal}
              disabled={!selectedDemand}
              style={{ background: emerald, borderRadius: 12 }}
            >
              <IconPlus size={18} />
              Add Item
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Category</th>
                <th>Property Cost</th>
                <th>Lettable Space</th>
                <th>Occupied Space</th>
                <th>Cost / sqm</th>
                <th>Tenant Amount</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isItemsLoading && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">Loading demand items...</td>
                </tr>
              )}
              {!isItemsLoading && !selectedDemand && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">Select a demand above.</td>
                </tr>
              )}
              {!isItemsLoading && selectedDemand && items.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">No demand items found.</td>
                </tr>
              )}
              {!isItemsLoading && items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <IconClipboardList size={18} style={{ color: emeraldDark }} />
                      <span className="fw-semibold">{item.category}</span>
                    </div>
                  </td>
                  <td>{money.format(Number(item.total_property_cost || 0))}</td>
                  <td>{item.total_lettable_space || 0} sqm</td>
                  <td>{item.occupied_space || 0} sqm</td>
                  <td>{item.cost_per_sqm ? money.format(Number(item.cost_per_sqm)) : '-'}</td>
                  <td>{money.format(Number(item.tenant_amount || 0))}</td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-light" type="button" onClick={() => openEditItemModal(item)} style={{ borderRadius: 10 }}>
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => handleDeleteItem(item)} style={{ borderRadius: 10 }}>
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isDemandModalOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'rgba(15, 23, 42, 0.48)', zIndex: 1050 }}>
          <form className="card border-0 w-100" onSubmit={handleDemandSubmit} style={{ maxWidth: 860, borderRadius: 26, boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)' }}>
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>{editingDemand ? 'Edit demand' : 'Add demand'}</h3>
                  <p className="text-secondary mb-0">Define the demand period, amount, balance, and due date.</p>
                </div>
                <button className="btn btn-light btn-icon" type="button" onClick={closeDemandModal} style={{ borderRadius: 12 }}>
                  <IconX size={18} />
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Property</label>
                  <select className="form-select" name="property_id" value={demandForm.property_id} onChange={handleDemandFormChange} required>
                    <option value="">Select property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>{property.property_name || property.address}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Lease</label>
                  <select className="form-select" name="lease_id" value={demandForm.lease_id} onChange={handleDemandFormChange} required>
                    <option value="">Select lease</option>
                    {filteredLeasesForDemandForm.map((lease) => (
                      <option key={lease.id} value={lease.id}>{lease.tenant_name} · {lease.unit_number || lease.property_name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Period start</label>
                  <input className="form-control" name="period_start" type="date" value={demandForm.period_start} onChange={handleDemandFormChange} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Period end</label>
                  <input className="form-control" name="period_end" type="date" value={demandForm.period_end} onChange={handleDemandFormChange} required />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Total amount</label>
                  <input className="form-control" name="total_amount" type="number" min="0" step="0.01" value={demandForm.total_amount} onChange={handleDemandFormChange} />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Amount paid</label>
                  <input className="form-control" name="amount_paid" type="number" min="0" step="0.01" value={demandForm.amount_paid} onChange={handleDemandFormChange} />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Due date</label>
                  <input className="form-control" name="due_date" type="date" value={demandForm.due_date} onChange={handleDemandFormChange} />
                </div>
                <div className="col-12">
                  <label className="form-label">Status</label>
                  <select className="form-select" name="status" value={demandForm.status} onChange={handleDemandFormChange}>
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card-footer bg-white border-0 p-4">
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-light" type="button" onClick={closeDemandModal} style={{ borderRadius: 12 }}>Cancel</button>
                <button className="btn text-white border-0" type="submit" disabled={isSaving} style={{ background: emerald, borderRadius: 12 }}>
                  {isSaving ? 'Saving...' : editingDemand ? 'Save changes' : 'Create demand'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isItemModalOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'rgba(15, 23, 42, 0.48)', zIndex: 1050 }}>
          <form className="card border-0 w-100" onSubmit={handleItemSubmit} style={{ maxWidth: 820, borderRadius: 26, boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)' }}>
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>{editingItem ? 'Edit demand item' : 'Add demand item'}</h3>
                  <p className="text-secondary mb-0">Break down the tenant share for this service charge demand.</p>
                </div>
                <button className="btn btn-light btn-icon" type="button" onClick={closeItemModal} style={{ borderRadius: 12 }}>
                  <IconX size={18} />
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Category</label>
                  <input className="form-control" name="category" value={itemForm.category} onChange={handleItemFormChange} placeholder="Security" required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Total property cost</label>
                  <input className="form-control" name="total_property_cost" type="number" min="0" step="0.01" value={itemForm.total_property_cost} onChange={handleItemFormChange} required />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Total lettable space</label>
                  <input className="form-control" name="total_lettable_space" type="number" min="0" step="0.01" value={itemForm.total_lettable_space} onChange={handleItemFormChange} required />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Occupied space</label>
                  <input className="form-control" name="occupied_space" type="number" min="0" step="0.01" value={itemForm.occupied_space} onChange={handleItemFormChange} required />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Cost per sqm</label>
                  <input className="form-control" name="cost_per_sqm" type="number" min="0" step="0.01" value={itemForm.cost_per_sqm} onChange={handleItemFormChange} placeholder="Auto if blank" />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Tenant amount</label>
                  <input className="form-control" name="tenant_amount" type="number" min="0" step="0.01" value={itemForm.tenant_amount} onChange={handleItemFormChange} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Notes</label>
                  <input className="form-control" name="notes" value={itemForm.notes} onChange={handleItemFormChange} />
                </div>
              </div>
            </div>

            <div className="card-footer bg-white border-0 p-4">
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-light" type="button" onClick={closeItemModal} style={{ borderRadius: 12 }}>Cancel</button>
                <button className="btn text-white border-0" type="submit" disabled={isSaving} style={{ background: emerald, borderRadius: 12 }}>
                  {isSaving ? 'Saving...' : editingItem ? 'Save changes' : 'Create item'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'demand' ? 'Delete service charge demand?' : 'Delete demand item?'}
        message={
          deleteTarget?.type === 'demand'
            ? `This will permanently remove the demand for ${deleteTarget?.record?.tenant_name || deleteTarget?.record?.property_name || 'this tenant'}.`
            : `This will permanently remove the ${deleteTarget?.record?.category || 'selected'} demand item.`
        }
        details={(
          <>
            <div className="small text-secondary mb-1">Record details</div>
            <div className="fw-semibold" style={{ color: '#101816' }}>
              {deleteTarget?.type === 'demand'
                ? `${deleteTarget?.record?.property_name || 'Property'} · ${toDateInput(deleteTarget?.record?.period_start)} to ${toDateInput(deleteTarget?.record?.period_end)}`
                : `${money.format(Number(deleteTarget?.record?.tenant_amount || 0))} · ${deleteTarget?.record?.notes || 'No notes'}`}
            </div>
          </>
        )}
        confirmLabel={deleteTarget?.type === 'demand' ? 'Delete demand' : 'Delete item'}
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

export default ServiceCharges;
