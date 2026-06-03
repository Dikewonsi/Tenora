import { useEffect, useMemo, useState } from 'react';
import {
  IconAlertCircle,
  IconCalendarStats,
  IconChartBar,
  IconFileInvoice,
  IconRefresh,
  IconReceiptTax
} from '@tabler/icons-react';
import apiClient from '../api/apiClient';

const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
});

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

const Reports = () => {
  const [arrears, setArrears] = useState([]);
  const [balances, setBalances] = useState([]);
  const [expiringLeases, setExpiringLeases] = useState([]);
  const [days, setDays] = useState('90');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const emerald = '#10b981';
  const emeraldDark = '#059669';
  const cardShadow = '0 16px 38px rgba(15, 23, 42, 0.06)';

  const totals = useMemo(() => ({
    rentArrears: arrears.reduce((sum, item) => sum + Number(item.balance || 0), 0),
    serviceChargeBalance: balances.reduce((sum, item) => sum + Number(item.balance || 0), 0),
    expiringCount: expiringLeases.length
  }), [arrears, balances, expiringLeases]);

  const fetchReports = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [arrearsResponse, balancesResponse, expiringResponse] = await Promise.all([
        apiClient.get('/reports/rent-arrears'),
        apiClient.get('/reports/service-charge-balances'),
        apiClient.get('/reports/expiring-leases', {
          params: { days }
        })
      ]);

      setArrears(arrearsResponse.data.data.arrears || []);
      setBalances(balancesResponse.data.data.balances || []);
      setExpiringLeases(expiringResponse.data.data.leases || []);
    } catch (reportError) {
      setError(reportError.response?.data?.message || reportError.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDaysSubmit = (event) => {
    event.preventDefault();
    fetchReports();
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
                Reports
              </span>
              <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
                Portfolio Reports
              </h1>
              <p className="fs-3 text-secondary mb-0" style={{ maxWidth: 780 }}>
                Review rent arrears, service charge balances, and leases approaching expiry.
              </p>
            </div>

            <button
              className="btn btn-lg text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={fetchReports}
              style={{ background: emerald, borderRadius: 16 }}
            >
              <IconRefresh size={20} />
              Refresh Reports
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="alert alert-danger rounded-4 border-0 mb-0" role="alert">
          {error}
        </div>
      )}

      <section className="row g-3">
        {[
          {
            label: 'Rent arrears',
            value: money.format(totals.rentArrears),
            detail: `${arrears.length} active lease${arrears.length === 1 ? '' : 's'}`,
            icon: IconAlertCircle
          },
          {
            label: 'Service charge balance',
            value: money.format(totals.serviceChargeBalance),
            detail: `${balances.length} demand${balances.length === 1 ? '' : 's'}`,
            icon: IconReceiptTax
          },
          {
            label: 'Expiring leases',
            value: totals.expiringCount,
            detail: `Within ${days || 90} days`,
            icon: IconCalendarStats
          }
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="col-12 col-lg-4" key={stat.label}>
              <article className="card border-0 h-100" style={{ borderRadius: 24, boxShadow: cardShadow }}>
                <div className="card-body p-4 d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 52, height: 52, borderRadius: 18, background: '#d1fae5', color: emeraldDark }}
                  >
                    <Icon size={25} />
                  </div>
                  <div>
                    <div className="text-secondary small fw-semibold">{stat.label}</div>
                    <div className="h2 fw-bold mb-1" style={{ color: '#101816' }}>{isLoading ? '...' : stat.value}</div>
                    <div className="small text-secondary">{stat.detail}</div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </section>

      <section className="card border-0" style={{ borderRadius: 26, boxShadow: cardShadow }}>
        <div className="card-body p-4">
          <form className="row g-3 align-items-end" onSubmit={handleDaysSubmit}>
            <div className="col-12 col-md-4 col-xl-3">
              <label className="form-label">Expiring lease window</label>
              <select className="form-select" value={days} onChange={(event) => setDays(event.target.value)}>
                <option value="30">Next 30 days</option>
                <option value="60">Next 60 days</option>
                <option value="90">Next 90 days</option>
                <option value="180">Next 180 days</option>
                <option value="365">Next 365 days</option>
              </select>
            </div>
            <div className="col-12 col-md-auto">
              <button className="btn text-white border-0 px-4" type="submit" style={{ background: emerald, borderRadius: 12 }}>
                Apply
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card border-0 overflow-hidden" style={{ borderRadius: 26, boxShadow: cardShadow }}>
        <div className="card-header bg-white border-0 p-4">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{ width: 46, height: 46, borderRadius: 15, background: '#d1fae5', color: emeraldDark }}
            >
              <IconChartBar size={22} />
            </div>
            <div>
              <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Rent Arrears</h2>
              <p className="text-secondary mb-0">Active leases with outstanding rent balance.</p>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property</th>
                <th>Rent</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Next Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">Loading rent arrears...</td>
                </tr>
              )}
              {!isLoading && arrears.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">No rent arrears found.</td>
                </tr>
              )}
              {!isLoading && arrears.map((item) => (
                <tr key={item.lease_id}>
                  <td className="fw-semibold">{item.tenant_name || '-'}</td>
                  <td>
                    <div>{item.property_name || '-'}</div>
                    <div className="small text-secondary">{item.unit_number || 'No unit'}</div>
                  </td>
                  <td>{money.format(Number(item.rent_amount || 0))}</td>
                  <td>{money.format(Number(item.rent_paid || 0))}</td>
                  <td className="fw-bold" style={{ color: emeraldDark }}>{money.format(Number(item.balance || 0))}</td>
                  <td>{toDateInput(item.next_rent_due_date) || '-'}</td>
                  <td>
                    <span className="badge text-capitalize" style={{ background: '#d1fae5', color: emeraldDark }}>
                      {item.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="row g-4">
        <div className="col-12 col-xl-6">
          <article className="card border-0 overflow-hidden h-100" style={{ borderRadius: 26, boxShadow: cardShadow }}>
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{ width: 46, height: 46, borderRadius: 15, background: '#d1fae5', color: emeraldDark }}
                >
                  <IconReceiptTax size={22} />
                </div>
                <div>
                  <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Service Charge Balances</h2>
                  <p className="text-secondary mb-0">Unpaid service charge demand balances.</p>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-vcenter card-table mb-0">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Period</th>
                    <th>Balance</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-secondary">Loading balances...</td>
                    </tr>
                  )}
                  {!isLoading && balances.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-secondary">No balances found.</td>
                    </tr>
                  )}
                  {!isLoading && balances.map((item) => (
                    <tr key={item.demand_id}>
                      <td>
                        <div className="fw-semibold">{item.tenant_name || '-'}</div>
                        <div className="small text-secondary">{item.property_name || '-'} · {item.unit_number || 'No unit'}</div>
                      </td>
                      <td>{toDateInput(item.period_start)} to {toDateInput(item.period_end)}</td>
                      <td className="fw-bold" style={{ color: emeraldDark }}>{money.format(Number(item.balance || 0))}</td>
                      <td>{toDateInput(item.due_date) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="col-12 col-xl-6">
          <article className="card border-0 overflow-hidden h-100" style={{ borderRadius: 26, boxShadow: cardShadow }}>
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{ width: 46, height: 46, borderRadius: 15, background: '#d1fae5', color: emeraldDark }}
                >
                  <IconFileInvoice size={22} />
                </div>
                <div>
                  <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Expiring Leases</h2>
                  <p className="text-secondary mb-0">Active leases ending within the selected window.</p>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-vcenter card-table mb-0">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>End Date</th>
                    <th>Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-secondary">Loading expiring leases...</td>
                    </tr>
                  )}
                  {!isLoading && expiringLeases.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-secondary">No expiring leases found.</td>
                    </tr>
                  )}
                  {!isLoading && expiringLeases.map((lease) => (
                    <tr key={lease.lease_id}>
                      <td className="fw-semibold">{lease.tenant_name || '-'}</td>
                      <td>
                        <div>{lease.property_name || '-'}</div>
                        <div className="small text-secondary">{lease.unit_number || 'No unit'}</div>
                      </td>
                      <td>{toDateInput(lease.end_date) || '-'}</td>
                      <td>{money.format(Number(lease.rent_amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

export default Reports;
