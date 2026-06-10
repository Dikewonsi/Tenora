import { useEffect, useState } from 'react';
import { IconArrowLeft, IconCalculator, IconChecks, IconDeviceFloppy, IconEye, IconRefresh } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import { EmptyState, MobileRecordCard, StatusBadge, WorkflowStepper } from '../components/TenoraUI';

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const formatPercentage = (value) => {
  const numericValue = Number(value);
  return `${percentage.format(Number.isFinite(numericValue) ? numericValue * 100 : 0)}%`;
};
const dateOnly = (value) => (value ? String(value).slice(0, 10) : '-');

const ServiceChargeBudgetSchedule = () => {
  const { budgetId } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [draftRows, setDraftRows] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);

  const budget = schedule?.budget || {};
  const allocations = schedule?.allocations || [];
  const validation = schedule?.validation || {};

  const loadSchedule = async () => {
    setIsLoading(true);

    try {
      const response = await apiClient.get(`/service-charge-budgets/${budgetId}/schedule`);
      const nextSchedule = response.data.data.schedule;
      setSchedule(nextSchedule);
      setDraftRows(Object.fromEntries((nextSchedule.allocations || []).map((allocation) => [
        allocation.id,
        { final_charge: allocation.final_charge, adjustment_note: allocation.adjustment_note || '' }
      ])));
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Schedule could not be loaded', message: error.response?.data?.message || error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId]);

  const calculate = async () => {
    setIsWorking(true);

    try {
      const response = await apiClient.post(`/service-charge-budgets/${budgetId}/calculate`);
      setSchedule(response.data.data.schedule);
      setFeedbackModal({ variant: 'success', title: 'Schedule calculated', message: 'All active property units have been allocated.' });
      await loadSchedule();
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Schedule could not be calculated', message: error.response?.data?.message || error.message });
    } finally {
      setIsWorking(false);
    }
  };

  const saveAllocation = async (allocationId) => {
    setIsWorking(true);

    try {
      const response = await apiClient.patch(`/service-charge-allocations/${allocationId}`, {
        final_charge: Number(draftRows[allocationId].final_charge),
        adjustment_note: draftRows[allocationId].adjustment_note
      });
      setSchedule(response.data.data.schedule);
      setFeedbackModal({ variant: 'success', title: 'Allocation updated', message: 'The final charge and adjustment note were saved.' });
      await loadSchedule();
    } catch (error) {
      setFeedbackModal({ variant: 'danger', title: 'Allocation could not be saved', message: error.response?.data?.message || error.message });
    } finally {
      setIsWorking(false);
    }
  };

  const issue = async () => {
    setIsWorking(true);

    try {
      const response = await apiClient.post(`/service-charge-budgets/${budgetId}/issue`);
      setSchedule(response.data.data.schedule);
      setConfirmIssue(false);
      setFeedbackModal({ variant: 'success', title: 'Demands issued', message: 'One demand was created for each occupied unit allocation.' });
      await loadSchedule();
    } catch (error) {
      setConfirmIssue(false);
      setFeedbackModal({ variant: 'danger', title: 'Demands could not be issued', message: error.response?.data?.message || error.message });
    } finally {
      setIsWorking(false);
    }
  };

  const currentFinalTotal = allocations.reduce((total, allocation) => {
    const draft = draftRows[allocation.id]?.final_charge;
    return total + Number(draft ?? allocation.final_charge ?? 0);
  }, 0);
  const difference = currentFinalTotal - Number(budget.total_budget || 0);
  const changedAllocationIds = allocations
    .filter((allocation) => (
      Number(draftRows[allocation.id]?.final_charge ?? 0) !== Number(allocation.final_charge ?? 0)
      || String(draftRows[allocation.id]?.adjustment_note ?? '') !== String(allocation.adjustment_note ?? '')
    ))
    .map((allocation) => allocation.id);
  const isReadyToIssue = allocations.length > 0
    && changedAllocationIds.length === 0
    && validation.total_matches_budget
    && (validation.vacant_units || []).length === 0;

  const saveAll = async () => {
    if (changedAllocationIds.length === 0) return;
    setIsWorking(true);

    try {
      const results = await Promise.allSettled(changedAllocationIds.map((allocationId) => apiClient.patch(`/service-charge-allocations/${allocationId}`, {
        final_charge: Number(draftRows[allocationId].final_charge),
        adjustment_note: draftRows[allocationId].adjustment_note
      })));

      const successfulIds = new Set();
      const failedIds = new Set();

      results.forEach((result, index) => {
        const allocationId = changedAllocationIds[index];
        if (result.status === 'fulfilled') successfulIds.add(allocationId);
        else failedIds.add(allocationId);
      });

      const response = await apiClient.get(`/service-charge-budgets/${budgetId}/schedule`);
      const nextSchedule = response.data.data.schedule;
      setSchedule(nextSchedule);
      setDraftRows(Object.fromEntries((nextSchedule.allocations || []).map((allocation) => [
        allocation.id,
        failedIds.has(allocation.id)
          ? draftRows[allocation.id]
          : { final_charge: allocation.final_charge, adjustment_note: allocation.adjustment_note || '' }
      ])));

      if (failedIds.size > 0) {
        const failedUnits = allocations
          .filter((allocation) => failedIds.has(allocation.id))
          .map((allocation) => allocation.unit_name_snapshot)
          .join(', ');
        setFeedbackModal({
          variant: 'danger',
          title: 'Some allocations were not saved',
          message: `${successfulIds.size} saved, ${failedIds.size} failed. Unsaved values were preserved for: ${failedUnits}.`
        });
      } else {
        setFeedbackModal({
          variant: 'success',
          title: 'Schedule saved',
          message: `${successfulIds.size} changed allocation${successfulIds.size === 1 ? '' : 's'} saved.`
        });
      }
    } catch (error) {
      setFeedbackModal({
        variant: 'danger',
        title: 'Schedule could not be reconciled',
        message: `${error.response?.data?.message || error.message}. Your unsaved values remain on screen.`
      });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="tenora-properties tenora-schedule">
      <section className="tenora-schedule-header">
        <div className="tenora-schedule-header-main">
          <div>
            <button className="tenora-back-link" type="button" onClick={() => navigate('/service-charges')}><IconArrowLeft size={16} /> Service charge budgets</button>
            <div className="d-flex align-items-center gap-2 mt-3"><span className="tenora-eyebrow">Allocation schedule</span><StatusBadge status={budget.status || 'draft'} /></div>
            <h1>{budget.budget_title || 'Service charge budget'}</h1>
            <p>{budget.property_name || 'Property'} · {dateOnly(budget.period_start)} to {dateOnly(budget.period_end)}</p>
            <div className="tenora-schedule-stepper"><WorkflowStepper status={budget.status === 'calculated' ? 'review' : budget.status} /></div>
          </div>
          <div className="tenora-schedule-actions">
            <button className="btn btn-light d-flex align-items-center justify-content-center gap-2" type="button" onClick={loadSchedule}><IconRefresh size={18} /> Refresh</button>
            <button className="btn btn-primary tenora-primary-btn" type="button" onClick={calculate} disabled={isWorking || budget.status === 'issued'}><IconCalculator size={18} /> Calculate</button>
            {changedAllocationIds.length > 0 && <button className="btn btn-warning d-flex align-items-center justify-content-center gap-2" type="button" onClick={saveAll} disabled={isWorking || budget.status === 'issued'}><IconDeviceFloppy size={18} /> Save All ({changedAllocationIds.length})</button>}
            <button className="btn btn-success d-flex align-items-center justify-content-center gap-2" type="button" onClick={() => setConfirmIssue(true)} disabled={isWorking || !isReadyToIssue || budget.status === 'issued'}><IconChecks size={18} /> Approve and Issue</button>
          </div>
        </div>
      </section>

      <section className="tenora-schedule-summary">
        {[
          ['Total budget', money.format(Number(budget.total_budget || 0))],
          ['Active units', budget.total_units || allocations.length],
          ['Total unit area', `${Number(budget.total_area_sqm || 0).toLocaleString()} sqm`],
          ['Final schedule', money.format(currentFinalTotal)]
        ].map(([label, value]) => <article key={label}><small>{label}</small><strong>{isLoading ? '...' : value}</strong></article>)}
      </section>

      <section className="tenora-schedule-validation">
        {!validation.total_matches_budget && allocations.length > 0 && <div className="is-warning"><strong>Budget mismatch</strong><span>Final charges are {money.format(Math.abs(difference))} {difference > 0 ? 'over' : 'under'} the budget.</span></div>}
        {(validation.vacant_units || []).length > 0 && <div className="is-warning"><strong>Vacant units</strong><span>Add active occupants before issue: {validation.vacant_units.join(', ')}.</span></div>}
        {changedAllocationIds.length > 0 && <div className="is-info"><strong>Unsaved changes</strong><span>{changedAllocationIds.length} allocation change{changedAllocationIds.length === 1 ? '' : 's'} must be saved.</span></div>}
        {isReadyToIssue && budget.status !== 'issued' && <div className="is-success"><strong>Ready to issue</strong><span>The schedule matches the budget and every allocation has an occupant.</span></div>}
      </section>

      <section className="tenora-property-workspace">
        <header><div><h2>Unit allocation schedule</h2><p>Review calculated values, adjustments, demands, and balances.</p></div><span className="tenora-inventory-context">{allocations.length} allocation{allocations.length === 1 ? '' : 's'}</span></header>
        <div className="table-responsive tenora-desktop-table"><table className="table table-vcenter card-table mb-0">
          <thead><tr><th>Unit</th><th>Tenant/Occupant</th><th>Area</th><th>Share</th><th>Calculated</th><th style={{ minWidth: 150 }}>Final Charge</th><th style={{ minWidth: 220 }}>Adjustment Note</th><th>Demand/Payment</th><th className="text-end">Action</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan="9" className="text-center py-5 text-secondary">Loading schedule...</td></tr>}
            {!isLoading && allocations.length === 0 && <tr><td colSpan="9" className="text-center py-5 text-secondary">No schedule yet. Click Calculate to allocate the budget to property units.</td></tr>}
            {!isLoading && allocations.map((allocation) => (
              <tr key={allocation.id} className={changedAllocationIds.includes(allocation.id) ? 'tenora-changed-row' : ''}>
                <td><strong>{allocation.unit_name_snapshot}</strong></td>
                <td>{allocation.tenant_name_snapshot || <span className="text-warning">Vacant</span>}<div className="small text-secondary">{allocation.tenant_email_snapshot || allocation.tenant_phone_snapshot || ''}</div></td>
                <td>{allocation.floor_area_sqm_snapshot === null ? '-' : `${Number(allocation.floor_area_sqm_snapshot).toLocaleString()} sqm`}</td>
                <td>{formatPercentage(allocation.percentage_share)}</td>
                <td>{money.format(Number(allocation.calculated_charge || 0))}</td>
                <td><input className="form-control form-control-sm" type="number" min="0" step="0.01" value={draftRows[allocation.id]?.final_charge ?? allocation.final_charge} disabled={budget.status === 'issued'} onChange={(event) => setDraftRows((current) => ({ ...current, [allocation.id]: { ...current[allocation.id], final_charge: event.target.value } }))} /></td>
                <td><input className="form-control form-control-sm" value={draftRows[allocation.id]?.adjustment_note ?? ''} disabled={budget.status === 'issued'} onChange={(event) => setDraftRows((current) => ({ ...current, [allocation.id]: { ...current[allocation.id], adjustment_note: event.target.value } }))} placeholder="Reason for adjustment" /></td>
                <td>{allocation.demand_id ? <div><StatusBadge status={allocation.demand_status} /><div className="small text-secondary mt-1">Balance {money.format(Number(allocation.balance || 0))}</div></div> : <span className="text-secondary">Not issued</span>}</td>
                <td className="text-end">{allocation.demand_id ? <button className="btn btn-sm btn-light" type="button" onClick={() => navigate(`/service-charges/${allocation.demand_id}/document`)} aria-label="Preview demand notice" title="Preview demand"><IconEye size={16} /></button> : <button className="btn btn-sm btn-light" type="button" disabled={isWorking || budget.status === 'issued' || !changedAllocationIds.includes(allocation.id)} onClick={() => saveAllocation(allocation.id)}>Save</button>}</td>
              </tr>
            ))}
          </tbody>
          {allocations.length > 0 && <tfoot><tr><th colSpan="4">Totals</th><th>{money.format(allocations.reduce((total, allocation) => total + Number(allocation.calculated_charge || 0), 0))}</th><th>{money.format(currentFinalTotal)}</th><th colSpan="3" /></tr></tfoot>}
        </table></div>
        <div className="tenora-mobile-list">
          {allocations.map((allocation) => (
            <MobileRecordCard
              key={allocation.id}
              title={allocation.unit_name_snapshot}
              subtitle={allocation.tenant_name_snapshot || 'Vacant unit'}
              status={allocation.demand_status || allocation.status}
              meta={[
                ['Area', allocation.floor_area_sqm_snapshot === null ? '-' : `${Number(allocation.floor_area_sqm_snapshot).toLocaleString()} sqm`],
                ['Share', formatPercentage(allocation.percentage_share)],
                ['Calculated', money.format(Number(allocation.calculated_charge || 0))],
                ['Balance', allocation.demand_id ? money.format(Number(allocation.balance || 0)) : 'Not issued']
              ]}
            >
              <div className="w-100 d-grid gap-2">
                <label className="form-label mb-0">Final charge</label>
                <input className="form-control" type="number" min="0" step="0.01" value={draftRows[allocation.id]?.final_charge ?? allocation.final_charge} disabled={budget.status === 'issued'} onChange={(event) => setDraftRows((current) => ({ ...current, [allocation.id]: { ...current[allocation.id], final_charge: event.target.value } }))} />
                <label className="form-label mb-0 mt-1">Adjustment note</label>
                <input className="form-control" value={draftRows[allocation.id]?.adjustment_note ?? ''} disabled={budget.status === 'issued'} onChange={(event) => setDraftRows((current) => ({ ...current, [allocation.id]: { ...current[allocation.id], adjustment_note: event.target.value } }))} placeholder="Reason for adjustment" />
                <div className="d-flex justify-content-end mt-1">
                  {allocation.demand_id
                    ? <button className="btn btn-light btn-sm d-flex align-items-center gap-2" type="button" onClick={() => navigate(`/service-charges/${allocation.demand_id}/document`)}><IconEye size={16} /> Preview demand</button>
                    : <button className="btn btn-light btn-sm" type="button" disabled={isWorking || budget.status === 'issued' || !changedAllocationIds.includes(allocation.id)} onClick={() => saveAllocation(allocation.id)}>Save row</button>}
                </div>
              </div>
            </MobileRecordCard>
          ))}
          {!isLoading && allocations.length === 0 && <EmptyState compact title="No schedule yet" description="Click Calculate to allocate the budget across active property units." icon={IconCalculator} />}
        </div>
      </section>

      <ConfirmModal isOpen={confirmIssue} title="Approve and issue demands?" message={`This will create ${allocations.length} tenant demand record${allocations.length === 1 ? '' : 's'}. The schedule must match the budget and every unit must have an active occupant.`} confirmLabel="Approve and issue" isWorking={isWorking} onCancel={() => setConfirmIssue(false)} onConfirm={issue} />
      <FeedbackModal isOpen={Boolean(feedbackModal)} {...(feedbackModal || {})} onClose={() => setFeedbackModal(null)} />
    </div>
  );
};

export default ServiceChargeBudgetSchedule;
