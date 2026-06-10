import { useEffect, useMemo, useState } from 'react';
import {
  IconCalculator,
  IconEdit,
  IconFileInvoice,
  IconLayoutGrid,
  IconList,
  IconPlus,
  IconRefresh,
  IconScale,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { propertyLabel, sortByOptionLabel } from '../utils/sortOptions';
import { EmptyState, PageHeader, StatusBadge, WorkflowStepper } from '../components/TenoraUI';

const emptyForm = {
  property_id: '',
  budget_title: '',
  total_budget: '',
  period_start: '',
  period_end: '',
  calculation_method: 'flat_rate',
  due_date: '',
  payment_instruction: '',
  budget_note: ''
};

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 });
const dateOnly = (value) => (value ? String(value).slice(0, 10) : '');

const ServiceChargeBudgets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [budgets, setBudgets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [propertyId, setPropertyId] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState('cards');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deletingBudget, setDeletingBudget] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const query = useMemo(() => ({ page, limit: 10, property_id: propertyId, status }), [page, propertyId, status]);
  const summary = useMemo(() => budgets.reduce((totals, budget) => {
    totals.value += Number(budget.total_budget || 0);
    totals.units += Number(budget.total_units || budget.allocation_count || 0);
    totals[budget.status] = (totals[budget.status] || 0) + 1;
    return totals;
  }, { value: 0, units: 0, draft: 0, calculated: 0, issued: 0 }), [budgets]);

  const fetchBudgets = async () => {
    setIsLoading(true);

    try {
      const response = await apiClient.get('/service-charge-budgets', { params: query });
      setBudgets(response.data.data.budgets || []);
      setPagination(response.data.data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Budgets could not be loaded', message: error.response?.data?.message || error.message });
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
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const openCreate = () => {
    setEditingBudget(null);
    setForm({ ...emptyForm, property_id: propertyId });
    setModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.openCreate === 'budget') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreate();
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const openEdit = (budget) => {
    setEditingBudget(budget);
    setForm({
      property_id: budget.property_id || '',
      budget_title: budget.budget_title || '',
      total_budget: budget.total_budget || '',
      period_start: dateOnly(budget.period_start),
      period_end: dateOnly(budget.period_end),
      calculation_method: budget.calculation_method || 'flat_rate',
      due_date: dateOnly(budget.due_date),
      payment_instruction: budget.payment_instruction || '',
      budget_note: budget.budget_note || ''
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBudget(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const payload = {
      ...form,
      total_budget: Number(form.total_budget),
      basis: form.calculation_method === 'pro_rata' ? 'floor_area' : null,
      due_date: form.due_date || null
    };

    try {
      if (editingBudget) {
        await apiClient.put(`/service-charge-budgets/${editingBudget.id}`, payload);
      } else {
        await apiClient.post('/service-charge-budgets', payload);
      }

      closeModal();
      setFeedbackModal({ variant: 'success', title: editingBudget ? 'Budget updated' : 'Budget created', message: 'The service charge budget was saved.' });
      await fetchBudgets();
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Budget could not be saved', message: error.response?.data?.message || error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingBudget) return;
    setIsSaving(true);

    try {
      await apiClient.delete(`/service-charge-budgets/${deletingBudget.id}`);
      setDeletingBudget(null);
      setFeedbackModal({ variant: 'success', title: 'Budget deleted', message: 'The draft budget was removed.' });
      await fetchBudgets();
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Budget cannot be deleted', message: error.response?.data?.message || error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setPropertyId('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="tenora-properties tenora-service-budgets">
      <PageHeader eyebrow="Money / Service Charges" title="Service Charge Budgets" description="Create a property budget, calculate unit shares, review the schedule, and issue demands." action={{ label: 'Create Budget', onClick: openCreate, icon: <IconPlus size={18} /> }} />

      <section className="tenora-budget-summary">
        <article><span className="tenora-property-summary-icon"><IconFileInvoice size={19} /></span><div><small>Total budgets</small><strong>{isLoading ? '...' : pagination.total || 0}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-blue"><IconScale size={19} /></span><div><small>Budget value shown</small><strong>{isLoading ? '...' : money.format(summary.value)}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-amber"><IconCalculator size={19} /></span><div><small>Draft shown</small><strong>{isLoading ? '...' : summary.draft}</strong></div></article>
        <article><span className="tenora-property-summary-icon"><IconCalculator size={19} /></span><div><small>Calculated shown</small><strong>{isLoading ? '...' : summary.calculated}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-slate"><IconFileInvoice size={19} /></span><div><small>Issued shown</small><strong>{isLoading ? '...' : summary.issued}</strong></div></article>
      </section>

      <section className="tenora-property-toolbar tenora-budget-toolbar">
        <div className="tenora-budget-filters">
          <select className="form-select" value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setPage(1); }}><option value="">All properties</option>{properties.map((property) => <option key={property.id} value={property.id}>{propertyLabel(property)}</option>)}</select>
          <select className="form-select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="draft">Draft</option><option value="calculated">Calculated</option><option value="issued">Issued</option></select>
          <button className="btn btn-light border d-inline-flex align-items-center justify-content-center gap-2" type="button" onClick={fetchBudgets}><IconRefresh size={16} /> Refresh</button>
          <button className="btn btn-light border" type="button" onClick={resetFilters}>Reset</button>
        </div>
        <div className="tenora-view-toggle" role="group" aria-label="Budget view"><button className={view === 'cards' ? 'is-active' : ''} type="button" onClick={() => setView('cards')}><IconLayoutGrid size={17} /></button><button className={view === 'table' ? 'is-active' : ''} type="button" onClick={() => setView('table')}><IconList size={18} /></button></div>
      </section>

      <section className="tenora-property-workspace">
        <header><div><h2>Budget workspace</h2><p>{pagination.total || 0} budget{pagination.total === 1 ? '' : 's'} match the current filters</p></div><span className="tenora-inventory-context">{propertyId || status ? 'Filters active' : 'All budgets'}</span></header>

        {isLoading && view === 'cards' && <div className="tenora-property-grid tenora-budget-grid">{Array.from({ length: 6 }, (_, index) => <div className="tenora-property-card tenora-budget-card is-loading" key={index} />)}</div>}
        {!isLoading && budgets.length === 0 && <EmptyState title="No service charge budgets found" description="Create a budget after adding units to a property." actionLabel="Create Budget" onAction={openCreate} icon={IconFileInvoice} />}

        {!isLoading && budgets.length > 0 && view === 'cards' && (
          <div className="tenora-property-grid tenora-budget-grid">
            {budgets.map((budget) => (
              <article className="tenora-property-card tenora-budget-card" key={budget.id}>
                <div className="tenora-property-card-top"><span className="tenora-property-avatar"><IconFileInvoice size={22} /></span><div className="d-flex align-items-center gap-2"><StatusBadge status={budget.status} /><div className="tenora-property-card-actions"><button type="button" onClick={() => openEdit(budget)} disabled={budget.status === 'issued'}><IconEdit size={16} /></button><button className="is-danger" type="button" onClick={() => setDeletingBudget(budget)} disabled={budget.status === 'issued'}><IconTrash size={16} /></button></div></div></div>
                <div className="tenora-property-card-title"><h3>{budget.budget_title}</h3><p>{budget.property_name}</p></div>
                <div className="tenora-budget-value"><small>Total budget</small><strong>{money.format(Number(budget.total_budget || 0))}</strong></div>
                <div className="tenora-budget-details"><div><small>Method</small><strong>{budget.calculation_method === 'pro_rata' ? 'Pro rata by floor area' : 'Flat rate'}</strong></div><div><small>Units</small><strong>{budget.total_units || budget.allocation_count || 0}</strong></div><div><small>Period</small><strong>{dateOnly(budget.period_start)} to {dateOnly(budget.period_end)}</strong></div></div>
                <div className="tenora-budget-stepper"><WorkflowStepper status={budget.status} /></div>
                <button className="tenora-budget-schedule" type="button" onClick={() => navigate(`/service-charges/${budget.id}/schedule`)}><IconCalculator size={16} /> Open schedule</button>
              </article>
            ))}
          </div>
        )}

        {view === 'table' && (budgets.length > 0 || isLoading) && <div className="table-responsive tenora-property-table"><table className="table table-vcenter mb-0">
          <thead><tr><th>Budget</th><th>Method</th><th>Period</th><th>Total Budget</th><th>Units</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan="7" className="text-center py-5 text-secondary">Loading budgets...</td></tr>}
            {!isLoading && budgets.map((budget) => (
              <tr key={budget.id}>
                <td><div className="d-flex align-items-center gap-3"><span className="tenora-property-table-icon"><IconFileInvoice size={18} /></span><div><strong>{budget.budget_title}</strong><small>{budget.property_name}</small></div></div></td>
                <td className="text-capitalize">{budget.calculation_method?.replaceAll('_', ' ')}</td>
                <td>{dateOnly(budget.period_start)} to {dateOnly(budget.period_end)}</td>
                <td>{money.format(Number(budget.total_budget || 0))}</td>
                <td>{budget.total_units || budget.allocation_count || 0}</td>
                <td><StatusBadge status={budget.status} /></td>
                <td className="text-end"><div className="d-inline-flex gap-2">
                  <button className="btn btn-sm btn-primary tenora-primary-btn" type="button" onClick={() => navigate(`/service-charges/${budget.id}/schedule`)}><IconCalculator size={16} /> Schedule</button>
                  <button className="btn btn-sm btn-light" type="button" onClick={() => openEdit(budget)} disabled={budget.status === 'issued'} aria-label={`Edit ${budget.budget_title}`} title="Edit budget"><IconEdit size={16} /></button>
                  <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => setDeletingBudget(budget)} disabled={budget.status === 'issued'} aria-label={`Delete ${budget.budget_title}`} title="Delete budget"><IconTrash size={16} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>}
        {(budgets.length > 0 || isLoading) && <PaginationControls currentPage={pagination.page || page} totalPages={pagination.totalPages || 1} total={pagination.total || 0} isLoading={isLoading} onPageChange={setPage} />}
      </section>

      {modalOpen && <div className="tenora-property-modal-backdrop">
        <form className="tenora-property-modal tenora-budget-modal" onSubmit={handleSubmit}>
          <header><div><span>{editingBudget ? 'Budget details' : 'New service charge budget'}</span><h3>{editingBudget ? 'Edit budget' : 'Create service charge budget'}</h3><p>Choose one calculation method for all active units.</p></div><button className="btn btn-light btn-icon" type="button" onClick={closeModal}><IconX size={18} /></button></header>
          <div className="tenora-property-modal-body">
            <div className="tenora-form-section"><div><strong>Budget identity</strong><span>Select the property and name this charging period clearly.</span></div><div className="row g-3"><div className="col-12 col-md-6"><label className="form-label">Property</label><select className="form-select" value={form.property_id} onChange={(event) => setForm((current) => ({ ...current, property_id: event.target.value }))} required><option value="">Select property</option>{properties.map((property) => <option key={property.id} value={property.id}>{propertyLabel(property)}</option>)}</select></div><div className="col-12 col-md-6"><label className="form-label">Budget title</label><input className="form-control" value={form.budget_title} onChange={(event) => setForm((current) => ({ ...current, budget_title: event.target.value }))} placeholder="2026 Service Charge Budget" required /></div></div></div>
            <div className="tenora-form-section"><div><strong>Calculation</strong><span>Use flat rate or pro rata by unit floor area.</span></div><div className="row g-3"><div className="col-12 col-md-6"><label className="form-label">Total budget</label><input className="form-control" type="number" min="0.01" step="0.01" value={form.total_budget} onChange={(event) => setForm((current) => ({ ...current, total_budget: event.target.value }))} required /></div><div className="col-12 col-md-6"><label className="form-label">Calculation method</label><select className="form-select" value={form.calculation_method} onChange={(event) => setForm((current) => ({ ...current, calculation_method: event.target.value }))}><option value="flat_rate">Flat rate</option><option value="pro_rata">Pro rata by floor area</option></select></div></div></div>
            <div className="tenora-form-section"><div><strong>Period and notice</strong><span>Set the service period and optional demand due date.</span></div><div className="row g-3"><div className="col-12 col-md-4"><label className="form-label">Period start</label><input className="form-control" type="date" value={form.period_start} onChange={(event) => setForm((current) => ({ ...current, period_start: event.target.value }))} required /></div><div className="col-12 col-md-4"><label className="form-label">Period end</label><input className="form-control" type="date" value={form.period_end} onChange={(event) => setForm((current) => ({ ...current, period_end: event.target.value }))} required /></div><div className="col-12 col-md-4"><label className="form-label">Demand due date</label><input className="form-control" type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} /></div><div className="col-12"><label className="form-label">Payment instruction</label><textarea className="form-control" rows="2" value={form.payment_instruction} onChange={(event) => setForm((current) => ({ ...current, payment_instruction: event.target.value }))} /></div><div className="col-12"><label className="form-label">Budget note</label><textarea className="form-control" rows="2" value={form.budget_note} onChange={(event) => setForm((current) => ({ ...current, budget_note: event.target.value }))} /></div></div></div>
          </div>
          <footer><button className="btn btn-light border" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary tenora-primary-btn" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save budget'}</button></footer>
        </form>
      </div>}

      <ConfirmModal isOpen={Boolean(deletingBudget)} title="Delete budget?" message={`Delete ${deletingBudget?.budget_title || 'this budget'} and its draft allocations?`} confirmLabel="Delete budget" isWorking={isSaving} onCancel={() => setDeletingBudget(null)} onConfirm={confirmDelete} />
      <FeedbackModal isOpen={Boolean(feedbackModal)} {...(feedbackModal || {})} onClose={() => setFeedbackModal(null)} />
    </div>
  );
};

export default ServiceChargeBudgets;
