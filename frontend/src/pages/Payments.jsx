import { useEffect, useMemo, useState } from 'react';
import {
  IconCashBanknote,
  IconCalendarEvent,
  IconEdit,
  IconFileInvoice,
  IconLayoutGrid,
  IconList,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { EmptyState, PageHeader, StatusBadge } from '../components/TenoraUI';
import { demandLabel, leaseLabel, sortByOptionLabel } from '../utils/sortOptions';
import { useLocation, useNavigate } from 'react-router-dom';

const emptyForm = {
  lease_id: '',
  service_charge_demand_id: '',
  payment_category: 'rent',
  amount_paid: '',
  payment_date: '',
  payment_for_period_start: '',
  payment_for_period_end: '',
  payment_method: '',
  receipt_number: '',
  status: 'paid',
  notes: ''
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');
const paymentMethods = ['bank_transfer', 'cash', 'pos_card', 'cheque'];
const formatPaymentMethod = (value) => value
  ? String(value).replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  : 'No method';

const Payments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [leases, setLeases] = useState([]);
  const [demands, setDemands] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [leaseId, setLeaseId] = useState('');
  const [paymentCategory, setPaymentCategory] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState('cards');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [deletingPayment, setDeletingPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const money = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  });

  const query = useMemo(() => ({
    page,
    limit: 10,
    lease_id: leaseId,
    payment_category: paymentCategory,
    status,
    date_from: dateFrom,
    date_to: dateTo
  }), [dateFrom, dateTo, leaseId, page, paymentCategory, status]);

  const filteredDemands = useMemo(() => {
    if (!form.lease_id) {
      return demands;
    }

    return sortByOptionLabel(demands.filter((demand) => demand.lease_id === form.lease_id), demandLabel);
  }, [demands, form.lease_id]);

  const selectedLease = useMemo(() => (
    leases.find((lease) => lease.id === form.lease_id)
  ), [form.lease_id, leases]);

  const selectedDemand = useMemo(() => (
    demands.find((demand) => demand.id === form.service_charge_demand_id)
  ), [demands, form.service_charge_demand_id]);

  const paymentStats = useMemo(() => {
    const paidPayments = payments.filter((payment) => payment.status === 'paid');
    const totalReceived = paidPayments.reduce((total, payment) => total + Number(payment.amount_paid || 0), 0);
    const serviceChargeReceived = paidPayments
      .filter((payment) => payment.payment_category === 'service_charge')
      .reduce((total, payment) => total + Number(payment.amount_paid || 0), 0);
    const rentReceived = paidPayments
      .filter((payment) => payment.payment_category === 'rent')
      .reduce((total, payment) => total + Number(payment.amount_paid || 0), 0);
    const pendingPayments = payments.filter((payment) => payment.status === 'pending').length;

    return {
      totalReceived,
      serviceChargeReceived,
      rentReceived,
      pendingPayments
    };
  }, [payments]);

  const fetchLookups = async () => {
    const [leasesResponse, demandsResponse] = await Promise.all([
      apiClient.get('/leases', { params: { limit: 100 } }),
      apiClient.get('/service-charge-demands', { params: { limit: 100 } })
    ]);

    setLeases(sortByOptionLabel(leasesResponse.data.data.leases || [], leaseLabel));
    setDemands(sortByOptionLabel(demandsResponse.data.data.demands || [], demandLabel));
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/payments', {
        params: query
      });

      setPayments(response.data.data.payments || []);
      setPagination(response.data.data.pagination || {
        page,
        limit: 10,
        total: 0,
        totalPages: 1
      });
    } catch (paymentError) {
      setError(paymentError.response?.data?.message || paymentError.message || 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLookups().catch((lookupError) => {
      setError(lookupError.response?.data?.message || lookupError.message || 'Failed to load tenancies and demands');
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === 'lease_id' || (name === 'payment_category' && value !== 'service_charge') ? { service_charge_demand_id: '' } : {})
    }));
  };

  const fillOutstandingBalance = () => {
    if (!selectedDemand) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      amount_paid: Number(selectedDemand.balance || 0) > 0 ? Number(selectedDemand.balance || 0) : ''
    }));
  };

  const openCreateModal = () => {
    setEditingPayment(null);
    setForm({
      ...emptyForm,
      payment_date: new Date().toISOString().slice(0, 10)
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
    setShowMoreOptions(false);
  };

  useEffect(() => {
    if (location.state?.openCreate === 'payment') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateModal();
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const openEditModal = (payment) => {
    setEditingPayment(payment);
    setForm({
      lease_id: payment.lease_id || '',
      service_charge_demand_id: payment.service_charge_demand_id || '',
      payment_category: payment.payment_category || 'rent',
      amount_paid: payment.amount_paid || '',
      payment_date: toDateInput(payment.payment_date),
      payment_for_period_start: toDateInput(payment.payment_for_period_start),
      payment_for_period_end: toDateInput(payment.payment_for_period_end),
      payment_method: payment.payment_method || '',
      receipt_number: payment.receipt_number || '',
      status: payment.status || 'paid',
      notes: payment.notes || ''
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
    setShowMoreOptions(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setForm(emptyForm);
  };

  const nullableDate = (value) => (value === '' ? null : value);

  const getPayload = () => ({
    ...form,
    service_charge_demand_id: form.payment_category === 'service_charge' ? form.service_charge_demand_id || null : null,
    amount_paid: form.amount_paid === '' ? null : Number(form.amount_paid),
    payment_for_period_start: nullableDate(form.payment_for_period_start),
    payment_for_period_end: nullableDate(form.payment_for_period_end)
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    if (form.payment_category === 'service_charge' && !form.service_charge_demand_id) {
      const message = 'Select a service charge demand for service charge payments';
      setError(message);
      setFeedbackModal({ variant: 'danger', title: 'Payment could not be saved', message });
      setIsSaving(false);
      return;
    }

    try {
      if (editingPayment) {
        await apiClient.put(`/payments/${editingPayment.id}`, getPayload());
        const message = 'Payment updated successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Payment saved', message });
      } else {
        await apiClient.post('/payments', getPayload());
        const message = 'Payment created successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Payment created', message });
      }

      closeModal();
      await Promise.all([
        fetchPayments(),
        fetchLookups()
      ]);
    } catch (paymentError) {
      const message = paymentError.response?.data?.message || paymentError.message || 'Failed to save payment';
      setError(message);
      setFeedbackModal({ variant: 'danger', title: 'Payment could not be saved', message });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (payment) => {
    setDeletingPayment(payment);
    setError('');
    setSuccess('');
  };

  const closeDeleteModal = () => {
    setDeletingPayment(null);
  };

  const confirmDelete = async () => {
    if (!deletingPayment) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.delete(`/payments/${deletingPayment.id}`);
      const message = 'Payment deleted successfully';
      setSuccess(message);
      setFeedbackModal({ variant: 'success', title: 'Payment deleted', message });
      closeDeleteModal();
      await Promise.all([
        fetchPayments(),
        fetchLookups()
      ]);
    } catch (paymentError) {
      const message = paymentError.response?.data?.message || paymentError.message || 'Failed to delete payment';
      setError('');
      setFeedbackModal({ variant: 'danger', title: 'Payment cannot be deleted', message });
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const resetFilters = () => {
    setLeaseId('');
    setPaymentCategory('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="tenora-properties tenora-payments">
      <PageHeader eyebrow="Money / Payments" title="Payments" description="Record tenant receipts, link service-charge payments to demands, and track collection history." action={{ label: 'Record Payment', onClick: openCreateModal, icon: <IconPlus size={18} /> }} />

      {error && <div className="alert alert-danger border-0 mb-0" role="alert">{error}</div>}
      {success && <div className="alert alert-success border-0 mb-0" role="alert">{success}</div>}

      <section className="tenora-payment-summary">
        <article><span className="tenora-property-summary-icon"><IconCashBanknote size={19} /></span><div><small>Total received shown</small><strong>{isLoading ? '...' : money.format(paymentStats.totalReceived)}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-blue"><IconReceipt size={19} /></span><div><small>Rent received shown</small><strong>{isLoading ? '...' : money.format(paymentStats.rentReceived)}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-amber"><IconFileInvoice size={19} /></span><div><small>Service charges shown</small><strong>{isLoading ? '...' : money.format(paymentStats.serviceChargeReceived)}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-slate"><IconCalendarEvent size={19} /></span><div><small>Pending shown</small><strong>{isLoading ? '...' : paymentStats.pendingPayments}</strong></div></article>
        <article><span className="tenora-property-summary-icon"><IconReceipt size={19} /></span><div><small>Total receipts</small><strong>{isLoading ? '...' : pagination.total || 0}</strong></div></article>
      </section>

      <section className="tenora-property-toolbar tenora-payment-toolbar">
        <form className="tenora-payment-filters" onSubmit={handleFilterSubmit}>
          <select className="form-select" value={leaseId} onChange={(event) => setLeaseId(event.target.value)}><option value="">All tenancies</option>{leases.map((lease) => <option key={lease.id} value={lease.id}>{lease.tenant_name} · {lease.unit_number || lease.property_name}</option>)}</select>
          <select className="form-select" value={paymentCategory} onChange={(event) => setPaymentCategory(event.target.value)}><option value="">All categories</option><option value="deposit">Deposit</option><option value="other">Other</option><option value="rent">Rent</option><option value="service_charge">Service charge</option></select>
          <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="failed">Failed</option><option value="paid">Paid</option><option value="pending">Pending</option></select>
          <input className="form-control" aria-label="Payment date from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input className="form-control" aria-label="Payment date to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <button className="btn btn-primary tenora-primary-btn" type="submit">Apply</button>
          <button className="btn btn-light border" type="button" onClick={resetFilters}>Reset</button>
          <button className="btn btn-light border btn-icon" type="button" onClick={fetchPayments} aria-label="Refresh payments"><IconRefresh size={16} /></button>
        </form>
        <div className="tenora-view-toggle" role="group" aria-label="Payment view"><button className={view === 'cards' ? 'is-active' : ''} type="button" onClick={() => setView('cards')}><IconLayoutGrid size={17} /></button><button className={view === 'table' ? 'is-active' : ''} type="button" onClick={() => setView('table')}><IconList size={18} /></button></div>
      </section>

      <section className="tenora-property-workspace">
        <header><div><h2>Receipt history</h2><p>{pagination.total || 0} payment record{pagination.total === 1 ? '' : 's'} found</p></div><span className="tenora-inventory-context">{leaseId || paymentCategory || status || dateFrom || dateTo ? 'Filters active' : 'All payments'}</span></header>

        {isLoading && view === 'cards' && <div className="tenora-property-grid tenora-payment-grid">{Array.from({ length: 6 }, (_, index) => <div className="tenora-property-card tenora-payment-card is-loading" key={index} />)}</div>}
        {!isLoading && payments.length === 0 && <EmptyState title="No payments found" description="Record a rent or service-charge receipt when a tenant pays." actionLabel="Record Payment" onAction={openCreateModal} icon={IconReceipt} />}

        {!isLoading && payments.length > 0 && view === 'cards' && (
          <div className="tenora-property-grid tenora-payment-grid">
            {payments.map((payment) => (
              <article className="tenora-property-card tenora-payment-card" key={payment.id}>
                <div className="tenora-property-card-top"><span className="tenora-property-avatar"><IconReceipt size={22} /></span><div className="d-flex align-items-center gap-2"><StatusBadge status={payment.status || 'paid'} /><div className="tenora-property-card-actions"><button type="button" onClick={() => openEditModal(payment)}><IconEdit size={16} /></button><button className="is-danger" type="button" onClick={() => openDeleteModal(payment)}><IconTrash size={16} /></button></div></div></div>
                <div className="tenora-payment-amount"><small>{String(payment.payment_category || 'payment').replaceAll('_', ' ')}</small><strong>{money.format(Number(payment.amount_paid || 0))}</strong></div>
                <div className="tenora-property-card-title"><h3>{payment.tenant_name || 'Tenant'}</h3><p>{payment.property_name || 'Property'} · {payment.unit_number || 'No unit'}</p></div>
                <div className="tenora-payment-details"><div><small>Payment date</small><strong>{toDateInput(payment.payment_date) || '-'}</strong></div><div><small>Method</small><strong>{formatPaymentMethod(payment.payment_method)}</strong></div><div><small>Receipt</small><strong>{payment.receipt_number || 'Not assigned'}</strong></div></div>
                <div className="tenora-payment-link">{payment.service_charge_demand_id ? <><IconFileInvoice size={15} /><span>Linked to service-charge demand</span></> : <><IconCashBanknote size={15} /><span>Tenancy payment record</span></>}</div>
              </article>
            ))}
          </div>
        )}

        {view === 'table' && (payments.length > 0 || isLoading) && <div className="table-responsive tenora-property-table"><table className="table table-vcenter mb-0">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Tenant</th>
                <th>Property</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    Loading payments...
                  </td>
                </tr>
              )}

              {!isLoading && payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <span className="tenora-property-table-icon"><IconReceipt size={18} /></span>
                      <div>
                        <div className="fw-semibold text-capitalize">
                          {payment.payment_category?.replace('_', ' ') || 'Payment'}
                        </div>
                        <div className="small text-secondary">
                          {payment.receipt_number || 'No receipt'} · {formatPaymentMethod(payment.payment_method)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{payment.tenant_name || '-'}</td>
                  <td>{payment.property_name || '-'}</td>
                  <td>{money.format(Number(payment.amount_paid || 0))}</td>
                  <td>{toDateInput(payment.payment_date) || '-'}</td>
                  <td><StatusBadge status={payment.status || 'paid'} /></td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-light" type="button" onClick={() => openEditModal(payment)} style={{ borderRadius: 10 }} aria-label={`Edit payment ${payment.receipt_number || payment.id}`} title="Edit payment">
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => openDeleteModal(payment)} style={{ borderRadius: 10 }} aria-label={`Delete payment ${payment.receipt_number || payment.id}`} title="Delete payment">
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
        {(payments.length > 0 || isLoading) && <PaginationControls
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages || 1}
          total={pagination.total || 0}
          isLoading={isLoading}
          onPageChange={setPage}
        />}
      </section>

      {isModalOpen && (
        <div className="tenora-property-modal-backdrop">
          <form className="tenora-property-modal tenora-payment-modal" onSubmit={handleSubmit}>
            <header>
              <div><span>{editingPayment ? 'Receipt details' : 'New receipt'}</span><h3>{editingPayment ? 'Edit receipt' : 'Record payment'}</h3><p>Choose the tenancy and link service-charge receipts to a demand.</p></div>
              <button className="btn btn-light btn-icon" type="button" onClick={closeModal}><IconX size={18} /></button>
            </header>

            <div className="tenora-property-modal-body">
              <div className="row g-3">
                {(selectedLease || selectedDemand) && (
                  <div className="col-12">
                    <div className="tenora-payment-selection">
                      <div className="row g-3 align-items-center">
                        <div className="col-12 col-lg-5">
                          <div className="small">Tenant / tenancy</div>
                          <div className="fw-bold">
                            {selectedLease?.tenant_name || 'Select tenancy'} · {selectedLease?.unit_number || selectedLease?.property_name || 'No unit'}
                          </div>
                        </div>
                        <div className="col-6 col-lg-2">
                          <div className="small">Demand total</div>
                          <div className="fw-bold">{money.format(Number(selectedDemand?.total_amount || 0))}</div>
                        </div>
                        <div className="col-6 col-lg-2">
                          <div className="small">Paid</div>
                          <div className="fw-bold">{money.format(Number(selectedDemand?.amount_paid || 0))}</div>
                        </div>
                        <div className="col-12 col-lg-3">
                          <div className="small">Outstanding balance</div>
                          <div className="d-flex align-items-center justify-content-between gap-2">
                            <div className="fw-bold">{money.format(Number(selectedDemand?.balance || 0))}</div>
                            {selectedDemand && Number(selectedDemand.balance || 0) > 0 && (
                              <button className="btn btn-sm btn-light" type="button" onClick={fillOutstandingBalance}>
                                Use balance
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-12">
                  <label className="form-label">Tenancy</label>
                  <div className="form-text mb-2">Select the tenancy this payment belongs to.</div>
                  <select className="form-select" name="lease_id" value={form.lease_id} onChange={handleFormChange} required>
                    <option value="">Select tenancy</option>
                    {leases.map((lease) => (
                      <option key={lease.id} value={lease.id}>
                        {lease.tenant_name} · {lease.property_name} · {lease.unit_number || 'No unit'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Service charge demand</label>
                  <select
                    className="form-select"
                    name="service_charge_demand_id"
                    value={form.service_charge_demand_id}
                    onChange={handleFormChange}
                    disabled={form.payment_category !== 'service_charge'}
                    required={form.payment_category === 'service_charge'}
                  >
                    <option value="">None</option>
                    {filteredDemands.map((demand) => (
                      <option key={demand.id} value={demand.id}>
                        {demand.demand_reference || 'Demand'} · {demand.tenant_name || demand.property_name} · Balance {money.format(Number(demand.balance || 0))}
                      </option>
                    ))}
                  </select>
                  <div className="form-hint">
                    {form.payment_category === 'service_charge'
                      ? 'Required for service charge payments.'
                      : 'Available when category is Service charge.'}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Category</label>
                  <select className="form-select" name="payment_category" value={form.payment_category} onChange={handleFormChange} required>
                    <option value="deposit">Deposit</option>
                    <option value="other">Other</option>
                    <option value="rent">Rent</option>
                    <option value="service_charge">Service charge</option>
                  </select>
                </div>

                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Amount paid</label>
                  <input className="form-control" name="amount_paid" type="number" min="0" step="0.01" value={form.amount_paid} onChange={handleFormChange} required />
                  {selectedDemand && (
                    <div className="form-hint">
                      Outstanding balance: {money.format(Number(selectedDemand.balance || 0))}
                    </div>
                  )}
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label">Payment date</label>
                  <input className="form-control" name="payment_date" type="date" value={form.payment_date} onChange={handleFormChange} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Payment method</label>
                  <select className="form-select" name="payment_method" value={form.payment_method} onChange={handleFormChange}>
                    <option value="">Select payment method</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="pos_card">POS / Card</option>
                    <option value="cheque">Cheque</option>
                    {form.payment_method && !paymentMethods.includes(form.payment_method) && (
                      <option value={form.payment_method}>Other / Existing: {formatPaymentMethod(form.payment_method)}</option>
                    )}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Receipt number <span className="text-secondary fw-normal">(optional)</span></label>
                  <input className="form-control" name="receipt_number" value={form.receipt_number} onChange={handleFormChange} placeholder="Leave blank if not assigned" />
                </div>
                <div className="col-12">
                  <button className="btn btn-light btn-sm" type="button" onClick={() => setShowMoreOptions((value) => !value)}>
                    {showMoreOptions ? 'Hide more options' : 'More options'}
                  </button>
                </div>
                {showMoreOptions && (
                  <>
                    <div className="col-12"><div className="tenora-section-label">Additional receipt details</div></div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <label className="form-label">Status</label>
                      <select className="form-select" name="status" value={form.status} onChange={handleFormChange}>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-4"><label className="form-label">Period start</label><input className="form-control" name="payment_for_period_start" type="date" value={form.payment_for_period_start} onChange={handleFormChange} /></div>
                    <div className="col-12 col-md-4"><label className="form-label">Period end</label><input className="form-control" name="payment_for_period_end" type="date" value={form.payment_for_period_end} onChange={handleFormChange} /></div>
                    <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" name="notes" rows="3" value={form.notes} onChange={handleFormChange} /></div>
                  </>
                )}
              </div>
            </div>

            <footer><button className="btn btn-light border" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary tenora-primary-btn" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingPayment ? 'Save receipt' : 'Record payment'}</button></footer>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingPayment)}
        title="Delete payment?"
        message={`This will permanently remove payment ${deletingPayment?.receipt_number || deletingPayment?.id || ''}. This action cannot be undone.`}
        details={(
          <>
            <div className="small text-secondary mb-1">Payment details</div>
            <div className="fw-semibold" style={{ color: '#101816' }}>
              {deletingPayment ? money.format(Number(deletingPayment.amount_paid || 0)) : money.format(0)} · {deletingPayment?.tenant_name || 'Tenant'}
            </div>
          </>
        )}
        confirmLabel="Delete payment"
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

export default Payments;
