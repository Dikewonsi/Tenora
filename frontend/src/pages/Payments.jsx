import { useEffect, useMemo, useState } from 'react';
import {
  IconCalendarEvent,
  IconCashBanknote,
  IconEdit,
  IconFileInvoice,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';

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

const Payments = () => {
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
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [form, setForm] = useState(emptyForm);

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

    return demands.filter((demand) => demand.lease_id === form.lease_id);
  }, [demands, form.lease_id]);

  const fetchLookups = async () => {
    const [leasesResponse, demandsResponse] = await Promise.all([
      apiClient.get('/leases', { params: { limit: 100 } }),
      apiClient.get('/service-charge-demands', { params: { limit: 100 } })
    ]);

    setLeases(leasesResponse.data.data.leases || []);
    setDemands(demandsResponse.data.data.demands || []);
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
    fetchLookups().catch((lookupError) => {
      setError(lookupError.response?.data?.message || lookupError.message || 'Failed to load leases and demands');
    });
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [query]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === 'lease_id' ? { service_charge_demand_id: '' } : {})
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
  };

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
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setForm(emptyForm);
  };

  const nullableDate = (value) => (value === '' ? null : value);

  const getPayload = () => ({
    ...form,
    service_charge_demand_id: form.service_charge_demand_id || null,
    amount_paid: form.amount_paid === '' ? null : Number(form.amount_paid),
    payment_for_period_start: nullableDate(form.payment_for_period_start),
    payment_for_period_end: nullableDate(form.payment_for_period_end)
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingPayment) {
        await apiClient.put(`/payments/${editingPayment.id}`, getPayload());
        setSuccess('Payment updated successfully');
      } else {
        await apiClient.post('/payments', getPayload());
        setSuccess('Payment created successfully');
      }

      closeModal();
      await fetchPayments();
    } catch (paymentError) {
      setError(paymentError.response?.data?.message || paymentError.message || 'Failed to save payment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (payment) => {
    const shouldDelete = window.confirm(`Delete payment ${payment.receipt_number || payment.id}?`);

    if (!shouldDelete) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await apiClient.delete(`/payments/${payment.id}`);
      setSuccess('Payment deleted successfully');
      await fetchPayments();
    } catch (paymentError) {
      setError(paymentError.response?.data?.message || paymentError.message || 'Failed to delete payment');
    }
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchPayments();
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
                Payments
              </span>
              <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
                Payment Register
              </h1>
              <p className="fs-3 text-secondary mb-0" style={{ maxWidth: 760 }}>
                Record rent and service charge payments against leases, periods, methods, and receipts.
              </p>
            </div>

            <button
              className="btn btn-lg text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={openCreateModal}
              style={{ background: emerald, borderRadius: 16 }}
            >
              <IconPlus size={20} />
              Add Payment
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
            <div className="col-12 col-lg-3">
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
              <label className="form-label">Category</label>
              <select className="form-select" value={paymentCategory} onChange={(event) => setPaymentCategory(event.target.value)}>
                <option value="">All</option>
                <option value="rent">Rent</option>
                <option value="service_charge">Service charge</option>
                <option value="deposit">Deposit</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="col-12 col-lg-2">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="col-6 col-lg-2">
              <label className="form-label">From</label>
              <input className="form-control" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>

            <div className="col-6 col-lg-2">
              <label className="form-label">To</label>
              <input className="form-control" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>

            <div className="col-12 col-lg-1 d-flex gap-2">
              <button className="btn text-white border-0 flex-fill" type="submit" style={{ background: emerald, borderRadius: 12 }}>
                Apply
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card border-0 overflow-hidden" style={{ borderRadius: 26, boxShadow: cardShadow }}>
        <div className="card-header bg-white border-0 p-4">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Payments</h2>
              <p className="text-secondary mb-0">
                {pagination.total} record{pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
            <button className="btn btn-light d-inline-flex align-items-center gap-2" type="button" onClick={fetchPayments} style={{ borderRadius: 12 }}>
              <IconRefresh size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Payment</th>
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

              {!isLoading && payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    No payments found.
                  </td>
                </tr>
              )}

              {!isLoading && payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 44, height: 44, borderRadius: 14, background: '#d1fae5', color: emeraldDark }}
                      >
                        <IconReceipt size={22} />
                      </div>
                      <div>
                        <div className="fw-semibold text-capitalize" style={{ color: '#101816' }}>
                          {payment.payment_category?.replace('_', ' ') || 'Payment'}
                        </div>
                        <div className="small text-secondary">
                          {payment.receipt_number || 'No receipt'} · {payment.payment_method || 'No method'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{payment.tenant_name || '-'}</td>
                  <td>{payment.property_name || '-'}</td>
                  <td>{money.format(Number(payment.amount_paid || 0))}</td>
                  <td>{toDateInput(payment.payment_date) || '-'}</td>
                  <td>
                    <span className="badge text-capitalize" style={{ background: '#d1fae5', color: emeraldDark }}>
                      {payment.status || 'paid'}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-light" type="button" onClick={() => openEditModal(payment)} style={{ borderRadius: 10 }}>
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => handleDelete(payment)} style={{ borderRadius: 10 }}>
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-0 p-4">
          <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
            <span className="text-secondary">
              Page {pagination.page || page} of {pagination.totalPages || 1}
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-light"
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                style={{ borderRadius: 12 }}
              >
                Previous
              </button>
              <button
                className="btn btn-light"
                type="button"
                disabled={page >= (pagination.totalPages || 1) || isLoading}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                style={{ borderRadius: 12 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: 'rgba(15, 23, 42, 0.48)', zIndex: 1050 }}
        >
          <form className="card border-0 w-100" onSubmit={handleSubmit} style={{ maxWidth: 900, maxHeight: '92vh', overflow: 'auto', borderRadius: 26, boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)' }}>
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>
                    {editingPayment ? 'Edit payment' : 'Add payment'}
                  </h3>
                  <p className="text-secondary mb-0">Record rent or service charge payments against a lease.</p>
                </div>
                <button className="btn btn-light btn-icon" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>
                  <IconX size={18} />
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Lease</label>
                  <div className="input-icon">
                    <span className="input-icon-addon">
                      <IconFileInvoice size={18} />
                    </span>
                    <select className="form-select" name="lease_id" value={form.lease_id} onChange={handleFormChange} required>
                      <option value="">Select lease</option>
                      {leases.map((lease) => (
                        <option key={lease.id} value={lease.id}>
                          {lease.tenant_name} · {lease.property_name} · {lease.unit_number || 'No unit'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Service charge demand</label>
                  <select className="form-select" name="service_charge_demand_id" value={form.service_charge_demand_id} onChange={handleFormChange}>
                    <option value="">None</option>
                    {filteredDemands.map((demand) => (
                      <option key={demand.id} value={demand.id}>
                        {demand.property_name} · {toDateInput(demand.period_start)} to {toDateInput(demand.period_end)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Category</label>
                  <select className="form-select" name="payment_category" value={form.payment_category} onChange={handleFormChange} required>
                    <option value="rent">Rent</option>
                    <option value="service_charge">Service charge</option>
                    <option value="deposit">Deposit</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Amount paid</label>
                  <input className="form-control" name="amount_paid" type="number" min="0" step="0.01" value={form.amount_paid} onChange={handleFormChange} required />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Payment date</label>
                  <div className="input-icon">
                    <span className="input-icon-addon">
                      <IconCalendarEvent size={18} />
                    </span>
                    <input className="form-control" name="payment_date" type="date" value={form.payment_date} onChange={handleFormChange} required />
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" name="status" value={form.status} onChange={handleFormChange}>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Period start</label>
                  <input className="form-control" name="payment_for_period_start" type="date" value={form.payment_for_period_start} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Period end</label>
                  <input className="form-control" name="payment_for_period_end" type="date" value={form.payment_for_period_end} onChange={handleFormChange} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Payment method</label>
                  <input className="form-control" name="payment_method" value={form.payment_method} onChange={handleFormChange} placeholder="bank_transfer" />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Receipt number</label>
                  <input className="form-control" name="receipt_number" value={form.receipt_number} onChange={handleFormChange} placeholder="RCT-001" />
                </div>
                <div className="col-12">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" name="notes" rows="3" value={form.notes} onChange={handleFormChange} />
                </div>
              </div>
            </div>

            <div className="card-footer bg-white border-0 p-4">
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-light" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>
                  Cancel
                </button>
                <button className="btn text-white border-0" type="submit" disabled={isSaving} style={{ background: emerald, borderRadius: 12 }}>
                  {isSaving ? 'Saving...' : editingPayment ? 'Save changes' : 'Create payment'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Payments;
