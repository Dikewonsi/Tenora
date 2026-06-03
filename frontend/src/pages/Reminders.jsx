import { useEffect, useMemo, useState } from 'react';
import {
  IconBell,
  IconCalendarEvent,
  IconCheck,
  IconEdit,
  IconFileInvoice,
  IconPlus,
  IconRefresh,
  IconSend,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { getBooleanStatusStyle, getStatusStyle } from '../utils/statusStyles';

const emptyForm = {
  lease_id: '',
  service_charge_demand_id: '',
  reminder_type: 'rent_due',
  due_date: '',
  scheduled_send_date: '',
  sent_date: '',
  channel: 'email',
  status: 'pending',
  acknowledged: false,
  acknowledged_at: '',
  message_content: ''
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

const reminderTypeLabel = (value) => (
  value ? value.replaceAll('_', ' ') : 'Reminder'
);

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [leases, setLeases] = useState([]);
  const [demands, setDemands] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [leaseId, setLeaseId] = useState('');
  const [demandId, setDemandId] = useState('');
  const [reminderType, setReminderType] = useState('');
  const [status, setStatus] = useState('');
  const [dueAfter, setDueAfter] = useState('');
  const [dueBefore, setDueBefore] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionWorking, setIsActionWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const emerald = '#10b981';
  const emeraldDark = '#059669';
  const cardShadow = '0 16px 38px rgba(15, 23, 42, 0.06)';

  const query = useMemo(() => ({
    page,
    limit: 10,
    lease_id: leaseId,
    service_charge_demand_id: demandId,
    reminder_type: reminderType,
    status,
    due_after: dueAfter,
    due_before: dueBefore
  }), [demandId, dueAfter, dueBefore, leaseId, page, reminderType, status]);

  const filteredDemands = useMemo(() => {
    if (!form.lease_id) {
      return demands;
    }

    return demands.filter((demand) => demand.lease_id === form.lease_id);
  }, [demands, form.lease_id]);

  const reminderStats = useMemo(() => {
    const pending = reminders.filter((reminder) => reminder.status === 'pending').length;
    const sent = reminders.filter((reminder) => reminder.status === 'sent').length;
    const acknowledged = reminders.filter((reminder) => reminder.acknowledged).length;
    const due = reminders.filter((reminder) => {
      const dueDate = toDateInput(reminder.due_date);
      const today = new Date().toISOString().slice(0, 10);
      return dueDate && dueDate <= today && reminder.status !== 'sent';
    }).length;

    return { pending, sent, acknowledged, due };
  }, [reminders]);

  const fetchLookups = async () => {
    const [leasesResponse, demandsResponse] = await Promise.all([
      apiClient.get('/leases', { params: { limit: 100 } }),
      apiClient.get('/service-charge-demands', { params: { limit: 100 } })
    ]);

    setLeases(leasesResponse.data.data.leases || []);
    setDemands(demandsResponse.data.data.demands || []);
  };

  const fetchReminders = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/reminders', {
        params: query
      });

      setReminders(response.data.data.reminders || []);
      setPagination(response.data.data.pagination || {
        page,
        limit: 10,
        total: 0,
        totalPages: 1
      });
    } catch (reminderError) {
      setError(reminderError.response?.data?.message || reminderError.message || 'Failed to load reminders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups().catch((lookupError) => {
      setError(lookupError.response?.data?.message || lookupError.message || 'Failed to load leases and service charge demands');
    });
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [query]);

  const handleFormChange = (event) => {
    const { name, type, checked, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'lease_id' ? { service_charge_demand_id: '' } : {})
    }));
  };

  const openCreateModal = () => {
    setEditingReminder(null);
    setForm({
      ...emptyForm,
      due_date: new Date().toISOString().slice(0, 10),
      scheduled_send_date: new Date().toISOString().slice(0, 10)
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (reminder) => {
    setEditingReminder(reminder);
    setForm({
      lease_id: reminder.lease_id || '',
      service_charge_demand_id: reminder.service_charge_demand_id || '',
      reminder_type: reminder.reminder_type || 'rent_due',
      due_date: toDateInput(reminder.due_date),
      scheduled_send_date: toDateInput(reminder.scheduled_send_date),
      sent_date: toDateInput(reminder.sent_date),
      channel: reminder.channel || 'email',
      status: reminder.status || 'pending',
      acknowledged: Boolean(reminder.acknowledged),
      acknowledged_at: toDateInput(reminder.acknowledged_at),
      message_content: reminder.message_content || ''
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReminder(null);
    setForm(emptyForm);
  };

  const nullableDate = (value) => (value === '' ? null : value);

  const getPayload = () => ({
    ...form,
    lease_id: form.lease_id || null,
    service_charge_demand_id: form.service_charge_demand_id || null,
    due_date: nullableDate(form.due_date),
    scheduled_send_date: nullableDate(form.scheduled_send_date),
    sent_date: nullableDate(form.sent_date),
    acknowledged_at: form.acknowledged ? nullableDate(form.acknowledged_at) : null
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingReminder) {
        await apiClient.put(`/reminders/${editingReminder.id}`, getPayload());
        setSuccess('Reminder updated successfully');
      } else {
        await apiClient.post('/reminders', getPayload());
        setSuccess('Reminder created successfully');
      }

      closeModal();
      await fetchReminders();
    } catch (reminderError) {
      setError(reminderError.response?.data?.message || reminderError.message || 'Failed to save reminder');
    } finally {
      setIsSaving(false);
    }
  };

  const openActionModal = (action, reminder) => {
    setActionTarget({ action, reminder });
    setError('');
    setSuccess('');
  };

  const closeActionModal = () => {
    setActionTarget(null);
  };

  const confirmAction = async () => {
    if (!actionTarget) {
      return;
    }

    setIsActionWorking(true);
    setError('');
    setSuccess('');

    try {
      if (actionTarget.action === 'delete') {
        await apiClient.delete(`/reminders/${actionTarget.reminder.id}`);
        const message = 'Reminder deleted successfully';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Reminder deleted', message });
      } else if (actionTarget.action === 'mark-sent') {
        await apiClient.put(`/reminders/${actionTarget.reminder.id}/mark-sent`);
        const message = 'Reminder marked as sent';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Reminder sent', message });
      } else {
        await apiClient.put(`/reminders/${actionTarget.reminder.id}/acknowledge`);
        const message = 'Reminder acknowledged';
        setSuccess(message);
        setFeedbackModal({ variant: 'success', title: 'Reminder acknowledged', message });
      }
      closeActionModal();
      await fetchReminders();
    } catch (reminderError) {
      const fallback = actionTarget.action === 'delete'
        ? 'Failed to delete reminder'
        : actionTarget.action === 'mark-sent'
          ? 'Failed to mark reminder as sent'
          : 'Failed to acknowledge reminder';
      const message = reminderError.response?.data?.message || reminderError.message || fallback;
      setError('');
      setFeedbackModal({ variant: 'danger', title: 'Reminder action failed', message });
      closeActionModal();
    } finally {
      setIsActionWorking(false);
    }
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchReminders();
  };

  const resetFilters = () => {
    setLeaseId('');
    setDemandId('');
    setReminderType('');
    setStatus('');
    setDueAfter('');
    setDueBefore('');
    setPage(1);
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
                Reminders
              </span>
              <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
                Reminder Centre
              </h1>
              <p className="fs-3 text-secondary mb-0" style={{ maxWidth: 780 }}>
                Schedule rent, lease, and service charge notices, then track sent and acknowledged activity.
              </p>
            </div>

            <button
              className="btn btn-lg text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={openCreateModal}
              style={{ background: emerald, borderRadius: 16 }}
            >
              <IconPlus size={20} />
              Add Reminder
            </button>
          </div>
        </div>
      </section>

      <section className="row g-3">
        {[
          { label: 'Pending', value: reminderStats.pending, icon: IconBell },
          { label: 'Due now', value: reminderStats.due, icon: IconCalendarEvent },
          { label: 'Sent', value: reminderStats.sent, icon: IconSend },
          { label: 'Acknowledged', value: reminderStats.acknowledged, icon: IconCheck }
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="col-12 col-md-6 col-xl-3" key={stat.label}>
              <article className="card border-0 h-100" style={{ borderRadius: 22, boxShadow: cardShadow }}>
                <div className="card-body p-4 d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 48, height: 48, borderRadius: 16, background: '#d1fae5', color: emeraldDark }}
                  >
                    <Icon size={23} />
                  </div>
                  <div>
                    <div className="text-secondary small fw-semibold">{stat.label}</div>
                    <div className="h2 fw-bold mb-0" style={{ color: '#101816' }}>{isLoading ? '...' : stat.value}</div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
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
            <div className="col-12 col-xl-3">
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

            <div className="col-12 col-xl-3">
              <label className="form-label">Demand</label>
              <select className="form-select" value={demandId} onChange={(event) => setDemandId(event.target.value)}>
                <option value="">All demands</option>
                {demands.map((demand) => (
                  <option key={demand.id} value={demand.id}>
                    {demand.tenant_name || demand.property_name} · {toDateInput(demand.period_start)} to {toDateInput(demand.period_end)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-xl-2">
              <label className="form-label">Type</label>
              <select className="form-select" value={reminderType} onChange={(event) => setReminderType(event.target.value)}>
                <option value="">All</option>
                <option value="rent_due">Rent due</option>
                <option value="service_charge_due">Service charge due</option>
                <option value="lease_expiry">Lease expiry</option>
                <option value="payment_overdue">Payment overdue</option>
                <option value="inspection">Inspection</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="col-12 col-md-6 col-xl-2">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="col-6 col-xl-1">
              <label className="form-label">From</label>
              <input className="form-control" type="date" value={dueAfter} onChange={(event) => setDueAfter(event.target.value)} />
            </div>

            <div className="col-6 col-xl-1">
              <label className="form-label">To</label>
              <input className="form-control" type="date" value={dueBefore} onChange={(event) => setDueBefore(event.target.value)} />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end">
              <button className="btn text-white border-0 px-4" type="submit" style={{ background: emerald, borderRadius: 12 }}>
                Apply
              </button>
              <button className="btn btn-light border px-4" type="button" onClick={resetFilters} style={{ borderRadius: 12 }}>
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
              <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Reminders</h2>
              <p className="text-secondary mb-0">
                {pagination.total} record{pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
            <button className="btn btn-light d-inline-flex align-items-center gap-2" type="button" onClick={fetchReminders} style={{ borderRadius: 12 }}>
              <IconRefresh size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Reminder</th>
                <th>Linked Record</th>
                <th>Due</th>
                <th>Scheduled</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Acknowledged</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-secondary">
                    Loading reminders...
                  </td>
                </tr>
              )}

              {!isLoading && reminders.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-secondary">
                    No reminders found.
                  </td>
                </tr>
              )}

              {!isLoading && reminders.map((reminder) => (
                <tr key={reminder.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 44, height: 44, borderRadius: 14, background: '#d1fae5', color: emeraldDark }}
                      >
                        <IconBell size={22} />
                      </div>
                      <div>
                        <div className="fw-semibold text-capitalize" style={{ color: '#101816' }}>
                          {reminderTypeLabel(reminder.reminder_type)}
                        </div>
                        <div className="small text-secondary text-truncate" style={{ maxWidth: 260 }}>
                          {reminder.message_content || 'No message content'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="fw-semibold">{reminder.tenant_name || 'Tenant not linked'}</div>
                    <div className="small text-secondary">
                      {reminder.property_name || 'Property'} · {reminder.unit_number || 'No unit'}
                    </div>
                  </td>
                  <td>{toDateInput(reminder.due_date) || '-'}</td>
                  <td>{toDateInput(reminder.scheduled_send_date) || '-'}</td>
                  <td className="text-capitalize">{reminder.channel || 'email'}</td>
                  <td>
                    <span className="badge text-capitalize" style={getStatusStyle(reminder.status || 'pending')}>
                      {reminder.status || 'pending'}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={getBooleanStatusStyle(reminder.acknowledged)}>
                      {reminder.acknowledged ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button
                        className="btn btn-sm btn-light"
                        type="button"
                        onClick={() => openActionModal('mark-sent', reminder)}
                        disabled={reminder.status === 'sent'}
                        title="Mark sent"
                        style={{ borderRadius: 10 }}
                      >
                        <IconSend size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-light"
                        type="button"
                        onClick={() => openActionModal('acknowledge', reminder)}
                        disabled={reminder.acknowledged}
                        title="Acknowledge"
                        style={{ borderRadius: 10 }}
                      >
                        <IconCheck size={16} />
                      </button>
                      <button className="btn btn-sm btn-light" type="button" onClick={() => openEditModal(reminder)} style={{ borderRadius: 10 }}>
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => openActionModal('delete', reminder)} style={{ borderRadius: 10 }}>
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
          <form className="card border-0 w-100" onSubmit={handleSubmit} style={{ maxWidth: 900, maxHeight: '92vh', overflow: 'auto', borderRadius: 26, boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)' }}>
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>
                    {editingReminder ? 'Edit reminder' : 'Add reminder'}
                  </h3>
                  <p className="text-secondary mb-0">Link the notice to a lease or service charge demand.</p>
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
                    <select className="form-select" name="lease_id" value={form.lease_id} onChange={handleFormChange}>
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
                        {demand.tenant_name || demand.property_name} · {toDateInput(demand.period_start)} to {toDateInput(demand.period_end)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Reminder type</label>
                  <select className="form-select" name="reminder_type" value={form.reminder_type} onChange={handleFormChange} required>
                    <option value="rent_due">Rent due</option>
                    <option value="service_charge_due">Service charge due</option>
                    <option value="lease_expiry">Lease expiry</option>
                    <option value="payment_overdue">Payment overdue</option>
                    <option value="inspection">Inspection</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Due date</label>
                  <input className="form-control" name="due_date" type="date" value={form.due_date} onChange={handleFormChange} />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Scheduled send date</label>
                  <input className="form-control" name="scheduled_send_date" type="date" value={form.scheduled_send_date} onChange={handleFormChange} />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Sent date</label>
                  <input className="form-control" name="sent_date" type="date" value={form.sent_date} onChange={handleFormChange} />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Channel</label>
                  <select className="form-select" name="channel" value={form.channel} onChange={handleFormChange}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="phone">Phone</option>
                    <option value="letter">Letter</option>
                    <option value="in_app">In app</option>
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" name="status" value={form.status} onChange={handleFormChange}>
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Acknowledged date</label>
                  <input className="form-control" name="acknowledged_at" type="date" value={form.acknowledged_at} onChange={handleFormChange} disabled={!form.acknowledged} />
                </div>

                <div className="col-12">
                  <label className="form-check">
                    <input className="form-check-input" name="acknowledged" type="checkbox" checked={form.acknowledged} onChange={handleFormChange} />
                    <span className="form-check-label">Tenant has acknowledged this reminder</span>
                  </label>
                </div>

                <div className="col-12">
                  <label className="form-label">Message content</label>
                  <textarea
                    className="form-control"
                    name="message_content"
                    rows="4"
                    value={form.message_content}
                    onChange={handleFormChange}
                    placeholder="Reminder message or internal note"
                  />
                </div>
              </div>
            </div>

            <div className="card-footer bg-white border-0 p-4">
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-light" type="button" onClick={closeModal} style={{ borderRadius: 12 }}>Cancel</button>
                <button className="btn text-white border-0" type="submit" disabled={isSaving} style={{ background: emerald, borderRadius: 12 }}>
                  {isSaving ? 'Saving...' : editingReminder ? 'Save changes' : 'Create reminder'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(actionTarget)}
        title={
          actionTarget?.action === 'delete'
            ? 'Delete reminder?'
            : actionTarget?.action === 'mark-sent'
              ? 'Mark reminder as sent?'
              : 'Acknowledge reminder?'
        }
        message={
          actionTarget?.action === 'delete'
            ? `This will permanently remove the ${reminderTypeLabel(actionTarget?.reminder?.reminder_type)} reminder.`
            : actionTarget?.action === 'mark-sent'
              ? 'This will update the reminder status to sent and record the sent date.'
              : 'This will mark the reminder as acknowledged by the tenant.'
        }
        details={(
          <>
            <div className="small text-secondary mb-1">Reminder details</div>
            <div className="fw-semibold" style={{ color: '#101816' }}>
              {actionTarget?.reminder?.tenant_name || 'Tenant'} · {toDateInput(actionTarget?.reminder?.due_date) || 'No due date'}
            </div>
          </>
        )}
        confirmLabel={
          actionTarget?.action === 'delete'
            ? 'Delete reminder'
            : actionTarget?.action === 'mark-sent'
              ? 'Mark sent'
              : 'Acknowledge'
        }
        variant={actionTarget?.action === 'delete' ? 'danger' : 'success'}
        isWorking={isActionWorking}
        onCancel={closeActionModal}
        onConfirm={confirmAction}
      />

      <FeedbackModal
        isOpen={Boolean(feedbackModal)}
        {...(feedbackModal || {})}
        onClose={() => setFeedbackModal(null)}
      />
    </div>
  );
};

export default Reminders;
