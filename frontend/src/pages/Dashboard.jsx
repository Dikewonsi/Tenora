import { useEffect, useState } from 'react';
import {
  IconAlertTriangle,
  IconBuildingEstate,
  IconCashBanknote,
  IconFileInvoice,
  IconPlus,
  IconReceipt,
  IconRulerMeasure,
  IconUsers
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { DashboardWidget, EmptyState, MiniMetric, RingSummary, StatusBadge } from '../components/TenoraUI';

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
const getExpiryFilter = (daysRemaining) => {
  const days = Number(daysRemaining);
  if (days < 30) return 'under30';
  if (days < 60) return '30';
  if (days < 90) return '60';
  return '90';
};

const getMonthRange = (monthValue) => {
  const [year, month] = monthValue.split('-').map(Number);
  const end = new Date(year, month, 0);
  return {
    from: `${monthValue}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState(null);
  const [monthPayments, setMonthPayments] = useState([]);
  const [overdueDemands, setOverdueDemands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const range = getMonthRange(month);

    Promise.all([
      apiClient.get('/dashboard/summary'),
      apiClient.get('/payments', { params: { status: 'paid', date_from: range.from, date_to: range.to, limit: 100 } }),
      apiClient.get('/service-charge-demands', { params: { status: 'overdue', limit: 20 } })
    ])
      .then(([summaryResponse, paymentResponse, demandResponse]) => {
        if (!active) return;
        setSummary(summaryResponse.data.data.summary);
        setMonthPayments(paymentResponse.data.data.payments || []);
        setOverdueDemands(demandResponse.data.data.demands || []);
        setError('');
      })
      .catch((dashboardError) => {
        if (active) setError(dashboardError.response?.data?.message || dashboardError.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [month]);

  const counts = summary?.counts || {};
  const demands = summary?.serviceChargeDemands || {};
  const expiry = summary?.rentExpiry || { buckets: {}, leases: [] };
  const totalUnits = Number(counts.total_units || 0);
  const occupiedUnits = Number(counts.occupied_units || 0);
  const vacantUnits = Number(counts.vacant_units || 0);
  const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const totalDemanded = Number(demands.total_demanded || 0);
  const totalDemandPaid = Number(demands.total_demand_paid || 0);
  const serviceChargeCollectionRate = totalDemanded
    ? Math.min(100, Math.round((totalDemandPaid / totalDemanded) * 100))
    : 0;
  const recordedPaymentsTotal = monthPayments.reduce((total, payment) => total + Number(payment.amount_paid || 0), 0);
  const rentPaymentsTotal = monthPayments
    .filter((payment) => payment.payment_category === 'rent')
    .reduce((total, payment) => total + Number(payment.amount_paid || 0), 0);
  const serviceChargePaymentsTotal = monthPayments
    .filter((payment) => payment.payment_category === 'service_charge')
    .reduce((total, payment) => total + Number(payment.amount_paid || 0), 0);
  const otherPaymentsTotal = recordedPaymentsTotal - rentPaymentsTotal - serviceChargePaymentsTotal;
  const expiringCount = (expiry.leases || []).length;
  const firstName = (user?.fullName || user?.full_name || user?.name || 'Manager').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  const openCreate = (path, create) => navigate(path, { state: { openCreate: create } });
  const quickActions = [
    ['Property', '/properties', 'property', IconBuildingEstate],
    ['Tenant', '/tenants', 'tenant', IconUsers],
    ['Tenancy', '/leases', 'tenancy', IconFileInvoice],
    ['Payment', '/payments', 'payment', IconCashBanknote]
  ];
  const expiryOptions = [
    ['Expiring soon', 'expiring_soon', 'under30'],
    ['30 days', '30_days', '30'],
    ['60 days', '60_days', '60'],
    ['90 days', '90_days', '90']
  ];

  return (
    <div className="tenora-dashboard">
      <header className="tenora-dashboard-intro">
        <div>
          <div className="tenora-eyebrow">Portfolio overview</div>
          <h1>{greeting}, {firstName}</h1>
          <p>Here is what needs attention across your properties today.</p>
        </div>
        <div className="tenora-dashboard-tools">
          <label className="tenora-month-control">
            <span>Payments month</span>
            <input type="month" value={month} onChange={(event) => { setIsLoading(true); setMonth(event.target.value); }} />
          </label>
          <div className="tenora-quick-actions">
            {quickActions.map(([label, path, create, Icon]) => (
              <button type="button" key={label} onClick={() => openCreate(path, create)}>
                <Icon size={15} /><IconPlus size={11} /> <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && <div className="alert alert-danger border-0 mb-0">{error}</div>}

      <section className="tenora-dashboard-grid">
        <DashboardWidget title="Portfolio inventory" description="Current records across the workspace" actionLabel="View properties" onAction={() => navigate('/properties')}>
          <div className="tenora-portfolio-facts">
            <button type="button" onClick={() => navigate('/properties')}><span className="tenora-icon-tile"><IconBuildingEstate size={18} /></span><span><small>Properties</small><strong>{isLoading ? '...' : counts.properties || 0}</strong></span></button>
            <button type="button" onClick={() => navigate('/tenants')}><span className="tenora-icon-tile is-blue"><IconUsers size={18} /></span><span><small>Tenant records</small><strong>{isLoading ? '...' : counts.tenants || 0}</strong></span></button>
            <button type="button" onClick={() => navigate('/leases')}><span className="tenora-icon-tile is-amber"><IconFileInvoice size={18} /></span><span><small>Active tenancies</small><strong>{isLoading ? '...' : counts.active_leases || 0}</strong></span></button>
            <button type="button" onClick={() => navigate('/units')}><span className="tenora-icon-tile is-slate"><IconRulerMeasure size={18} /></span><span><small>Active floor area</small><strong>{isLoading ? '...' : `${Number(counts.total_lettable_space || 0).toLocaleString()} sqm`}</strong></span></button>
          </div>
        </DashboardWidget>

        <DashboardWidget title="Occupancy" description="Live active-unit utilisation" actionLabel="View units" onAction={() => navigate('/units')}>
          <RingSummary value={occupancyRate} label="occupied" detail={<><strong>{occupiedUnits}</strong> occupied units</>} />
          <div className="tenora-occupancy-legend">
            <span><i className="is-occupied" /> Occupied <strong>{occupiedUnits}</strong></span>
            <span><i className="is-vacant" /> Vacant <strong>{vacantUnits}</strong></span>
            <span><i className="is-total" /> Active units <strong>{totalUnits}</strong></span>
          </div>
        </DashboardWidget>

        <DashboardWidget title="Service-charge collection" description="Issued demands across all periods" actionLabel="Open service charges" onAction={() => navigate('/service-charges')}>
          <div className="tenora-widget-hero-value">{isLoading ? '...' : money.format(Number(demands.total_demand_balance || 0))}</div>
          <div className="tenora-widget-hero-label">Outstanding balance</div>
          <div className="tenora-collection-progress">
            <div><span>Collection rate</span><strong>{serviceChargeCollectionRate}%</strong></div>
            <span><i style={{ width: `${serviceChargeCollectionRate}%` }} /></span>
          </div>
          <div className="tenora-inline-metrics">
            <MiniMetric label="Demanded" value={money.format(totalDemanded)} />
            <MiniMetric label="Paid" value={money.format(totalDemandPaid)} tone="green" />
          </div>
        </DashboardWidget>

        <DashboardWidget className="tenora-dashboard-widget-wide" title="Rent expiry calendar" description={`${expiringCount} active tenancies end within 90 days`} actionLabel="View tenancy expiry" onAction={() => navigate('/leases')}>
          <div className="tenora-dashboard-expiry">
            <div className="tenora-expiry-options">
              {expiryOptions.map(([label, key, filter]) => (
                <button type="button" key={key} onClick={() => navigate('/leases', { state: { expiryBucket: filter } })}>
                  <span>{label}</span><strong>{expiry.buckets?.[key]?.length || 0}</strong>
                </button>
              ))}
            </div>
            <div className="tenora-due-list">
              {(expiry.leases || []).slice(0, 4).map((tenancy) => (
                <button type="button" key={tenancy.id} onClick={() => navigate('/leases', { state: { expiryBucket: getExpiryFilter(tenancy.days_remaining) } })}>
                  <span className="tenora-date-chip"><strong>{new Date(tenancy.end_date).getDate()}</strong><small>{new Date(tenancy.end_date).toLocaleDateString('en-NG', { month: 'short' })}</small></span>
                  <span><strong>{tenancy.tenant_name}</strong><small>{tenancy.property_name} · {tenancy.unit_name || 'No unit'}</small></span>
                  <StatusBadge status={Number(tenancy.days_remaining) < 30 ? 'overdue' : 'pending'} label={`${tenancy.days_remaining}d`} />
                </button>
              ))}
              {!isLoading && (expiry.leases || []).length === 0 && <EmptyState compact title="No upcoming due dates" description="Nothing expires in the next 90 days." />}
            </div>
          </div>
        </DashboardWidget>

        <DashboardWidget title="Monthly receipts" description={`Paid receipts recorded in ${monthLabel}`} actionLabel="View payments" onAction={() => navigate('/payments')}>
          <div className="tenora-widget-hero-value">{isLoading ? '...' : money.format(recordedPaymentsTotal)}</div>
          <div className="tenora-widget-hero-label">{monthPayments.length} recorded receipt{monthPayments.length === 1 ? '' : 's'}</div>
          <div className="tenora-collection-bars">
            <div><span><i className="is-rent" style={{ width: `${recordedPaymentsTotal ? (rentPaymentsTotal / recordedPaymentsTotal) * 100 : 0}%` }} /></span><small>Rent</small><strong>{money.format(rentPaymentsTotal)}</strong></div>
            <div><span><i className="is-service" style={{ width: `${recordedPaymentsTotal ? (serviceChargePaymentsTotal / recordedPaymentsTotal) * 100 : 0}%` }} /></span><small>Service charge</small><strong>{money.format(serviceChargePaymentsTotal)}</strong></div>
            {otherPaymentsTotal > 0 && <div><span><i className="is-other" style={{ width: `${(otherPaymentsTotal / recordedPaymentsTotal) * 100}%` }} /></span><small>Deposit / other</small><strong>{money.format(otherPaymentsTotal)}</strong></div>}
          </div>
          <button className="tenora-widget-primary-action" type="button" onClick={() => openCreate('/payments', 'payment')}><IconPlus size={15} /> Record payment</button>
        </DashboardWidget>

        <DashboardWidget title="Overdue demand cases" description={`${overdueDemands.length} overdue demand${overdueDemands.length === 1 ? '' : 's'} returned`} actionLabel="Open service charges" onAction={() => navigate('/service-charges')}>
          <div className="tenora-compact-list">
            {overdueDemands.slice(0, 4).map((demand) => (
              <div key={demand.id}>
                <span className="tenora-list-icon is-red"><IconAlertTriangle size={16} /></span>
                <span><strong>{demand.tenant_name || 'Unassigned demand'}</strong><small>{demand.property_name} · {demand.unit_name || demand.unit_number || 'No unit'}</small></span>
                <strong>{money.format(Number(demand.balance || 0))}</strong>
              </div>
            ))}
            {!isLoading && overdueDemands.length === 0 && <EmptyState compact title="No overdue demands" description="There are no overdue service-charge cases in the current response." icon={IconReceipt} />}
          </div>
        </DashboardWidget>
      </section>
    </div>
  );
};

export default Dashboard;
