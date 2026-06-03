import { useEffect, useMemo, useState } from 'react';
import {
  IconAlertCircle,
  IconBell,
  IconBuildingEstate,
  IconCalendarEvent,
  IconCashBanknote,
  IconClipboardList,
  IconFileInvoice,
  IconHomeStats,
  IconReportMoney,
  IconRulerMeasure,
  IconUsers
} from '@tabler/icons-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import apiClient from '../api/apiClient';

const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
});

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    apiClient.get('/dashboard/summary')
      .then((response) => {
        if (isMounted) {
          setSummary(response.data.data.summary);
        }
      })
      .catch((dashboardError) => {
        if (isMounted) {
          setError(dashboardError.response?.data?.message || dashboardError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const counts = summary?.counts || {};
  const payments = summary?.payments || {};
  const demands = summary?.serviceChargeDemands || {};
  const reminders = summary?.reminders || {};
  const activeLeaseCount = Number(counts.active_leases || counts.leases || 0);
  const totalUnits = Number(counts.total_units || 0);
  const totalLettableSpace = Number(counts.total_lettable_space || 0);
  const expiringLeaseCount = Number(counts.expiring_leases_90_days || summary?.expiringLeases?.length || 0);

  const chartData = useMemo(() => ([
    { name: 'Properties', value: Number(counts.properties || 0) },
    { name: 'Tenants', value: Number(counts.tenants || 0) },
    { name: 'Leases', value: Number(counts.leases || 0) },
    { name: 'Payments', value: Number(counts.payments || 0) }
  ]), [counts.leases, counts.payments, counts.properties, counts.tenants]);

  const stats = [
    {
      label: 'Properties',
      value: counts.properties || 0,
      icon: IconBuildingEstate
    },
    {
      label: 'Tenants',
      value: counts.tenants || 0,
      icon: IconUsers
    },
    {
      label: 'Active leases',
      value: activeLeaseCount,
      icon: IconHomeStats
    },
    {
      label: 'Payments',
      value: counts.payments || 0,
      icon: IconCashBanknote
    }
  ];

  const operationalMetrics = [
    {
      label: 'Total units',
      value: totalUnits.toLocaleString(),
      detail: 'Across managed properties',
      icon: IconBuildingEstate
    },
    {
      label: 'Lettable space',
      value: `${totalLettableSpace.toLocaleString()} sqm`,
      detail: 'Tracked portfolio space',
      icon: IconRulerMeasure
    },
    {
      label: 'Open demands',
      value: demands.open_demands || 0,
      detail: 'Draft, issued, or pending',
      icon: IconClipboardList
    },
    {
      label: 'Expiring leases',
      value: expiringLeaseCount,
      detail: 'Within the next 90 days',
      icon: IconCalendarEvent
    }
  ];

  const paymentBreakdown = [
    ['Total paid', money.format(Number(payments.total_paid || 0))],
    ['Rent paid', money.format(Number(payments.rent_paid || 0))],
    ['Service charge paid', money.format(Number(payments.service_charge_paid || 0))],
    ['Service charge balance', money.format(Number(demands.total_demand_balance || 0))]
  ];

  const reminderTiles = [
    ['Pending', reminders.pending || 0],
    ['Due', reminders.due_today_or_overdue || 0],
    ['Ack.', reminders.acknowledged || 0]
  ];

  return (
  <div
    className="d-grid gap-4"
    style={{
      background:
        'radial-gradient(circle at top left, rgba(16, 185, 129, 0.10), transparent 28%), #f8fffb',
      minHeight: '100vh'
    }}
  >
    <section
      className="card border-0 overflow-hidden"
      style={{
        borderRadius: 32,
        background: '#ffffff',
        boxShadow: '0 24px 70px rgba(15, 23, 42, 0.08)'
      }}
    >
      <div className="card-body p-4 p-xl-5">
        <div className="row g-4 align-items-center">
          <div className="col-12 col-xl-7">
            <span
              className="badge rounded-pill border-0 mb-3 px-3 py-2"
              style={{ background: '#d1fae5', color: '#047857' }}
            >
              Premium Property Operations
            </span>

            <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
              Portfolio Dashboard
            </h1>

            <p className="fs-4 text-secondary mb-0" style={{ maxWidth: 720 }}>
              Monitor properties, tenants, leases, payments, service charges, and reminders from one executive workspace.
            </p>
          </div>

          <div className="col-12 col-xl-5">
            <div
              className="p-4 text-white h-100"
              style={{
                borderRadius: 26,
                background: 'linear-gradient(135deg, #064e3b 0%, #059669 55%, #10b981 100%)',
                boxShadow: '0 22px 45px rgba(5, 150, 105, 0.26)'
              }}
            >
              <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                <div>
                  <div style={{ color: 'rgba(255,255,255,.72)' }}>Service charge balance</div>
                  <div className="h1 fw-bold mb-0">
                    {money.format(Number(demands.total_demand_balance || 0))}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-center bg-white"
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 20,
                    color: '#059669'
                  }}
                >
                  <IconReportMoney size={30} />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <div style={{ color: 'rgba(255,255,255,.72)' }}>Properties</div>
                  <div className="h3 fw-bold mb-0">{isLoading ? '...' : stats[0]?.value || 0}</div>
                </div>
                <div className="col-6">
                  <div style={{ color: 'rgba(255,255,255,.72)' }}>Tenants</div>
                  <div className="h3 fw-bold mb-0">{isLoading ? '...' : stats[1]?.value || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {error && (
      <div className="alert alert-warning rounded-4 border-0 shadow-sm mb-0" role="alert">
        {error}
      </div>
    )}

    <section className="row g-3" aria-busy={isLoading}>
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div className="col-12 col-sm-6 col-xl-3" key={stat.label}>
            <div
              className="card border-0 h-100"
              style={{
                borderRadius: 26,
                boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)'
              }}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <p className="text-secondary mb-2">{stat.label}</p>
                    <h2 className="fw-bold mb-0" style={{ color: '#101816' }}>
                      {isLoading ? '...' : stat.value}
                    </h2>
                  </div>

                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 18,
                      background: '#ecfdf5',
                      color: '#059669'
                    }}
                  >
                    <Icon size={25} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>

    <section className="row g-3">
      {operationalMetrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div className="col-12 col-md-6 col-xl-3" key={metric.label}>
            <div
              className="card border-0 h-100"
              style={{
                borderRadius: 24,
                background: '#ffffff',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.045)'
              }}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 16,
                      background: '#d1fae5',
                      color: '#047857'
                    }}
                  >
                    <Icon size={22} />
                  </div>

                  <div>
                    <div className="fw-bold" style={{ color: '#101816' }}>
                      {metric.value}
                    </div>
                    <div className="text-secondary small">{metric.label}</div>
                  </div>
                </div>

                <div className="text-secondary small">{metric.detail}</div>
              </div>
            </div>
          </div>
        );
      })}
    </section>

    <section className="row g-4">
      <div className="col-12 col-xl-8">
        <div
          className="card border-0 h-100"
          style={{
            borderRadius: 30,
            boxShadow: '0 20px 55px rgba(15, 23, 42, 0.065)'
          }}
        >
          <div className="card-body p-4 p-xl-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
              <div>
                <h2 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>
                  Portfolio Activity
                </h2>
                <p className="text-secondary mb-0">
                  A quick overview of your core property management records.
                </p>
              </div>

              <span
                className="badge rounded-pill border-0 px-3 py-2"
                style={{ background: '#ecfdf5', color: '#047857' }}
              >
                Live summary
              </span>
            </div>

            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                    contentStyle={{
                      border: 0,
                      borderRadius: 16,
                      boxShadow: '0 14px 32px rgba(15, 23, 42, 0.12)'
                    }}
                  />
                  <Bar dataKey="value" fill="#059669" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-4">
        <div className="d-grid gap-4">
          <div
            className="card border-0"
            style={{
              borderRadius: 30,
              boxShadow: '0 20px 55px rgba(15, 23, 42, 0.065)'
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                <div>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>
                    Financial Snapshot
                  </h3>
                  <p className="text-secondary mb-0">Payments and service charge movement.</p>
                </div>

                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: '#d1fae5',
                    color: '#047857'
                  }}
                >
                  <IconFileInvoice size={24} />
                </div>
              </div>

              <div className="d-grid gap-3">
                {paymentBreakdown.map(([label, value]) => (
                  <div className="d-flex justify-content-between align-items-center gap-3" key={label}>
                    <span className="text-secondary">{label}</span>
                    <strong style={{ color: '#101816' }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="card border-0"
            style={{
              borderRadius: 30,
              boxShadow: '0 20px 55px rgba(15, 23, 42, 0.065)'
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                <div>
                  <h3 className="fw-bold mb-1" style={{ color: '#101816' }}>
                    Reminders
                  </h3>
                  <p className="text-secondary mb-0">Pending and acknowledged activity.</p>
                </div>

                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: '#d1fae5',
                    color: '#047857'
                  }}
                >
                  <IconBell size={24} />
                </div>
              </div>

              <div className="row g-2">
                {reminderTiles.map(([label, value]) => (
                  <div className="col-4" key={label}>
                    <div
                      className="rounded-4 p-3 text-center"
                      style={{ background: '#ecfdf5' }}
                    >
                      <div className="fw-bold fs-3" style={{ color: '#101816' }}>
                        {value}
                      </div>
                      <small className="text-secondary">{label}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-4" style={{ background: '#f8fffb' }}>
                <div className="d-flex align-items-start gap-2 text-secondary small">
                  <IconAlertCircle size={18} style={{ color: '#059669', marginTop: 2 }} />
                  <span>
                    Reminder workflow tracks pending, sent, and acknowledged notices.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);
};

export default Dashboard;
