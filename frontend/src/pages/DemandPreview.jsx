import { useEffect, useState } from 'react';
import { IconArrowLeft, IconPrinter, IconRefresh } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { getStatusStyle } from '../utils/statusStyles';

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '-');

const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
});

const DemandPreview = () => {
  const { demandId } = useParams();
  const navigate = useNavigate();
  const [documentData, setDocumentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocument = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get(`/service-charge-demands/${demandId}/document`);
      setDocumentData(response.data.data.document);
    } catch (documentError) {
      setError(documentError.response?.data?.message || documentError.message || 'Failed to load service charge demand document');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandId]);

  const demand = documentData?.demand || {};
  const property = documentData?.property || {};
  const tenant = documentData?.tenant || {};
  const lease = documentData?.lease || {};
  const metadata = documentData?.metadata || {};
  const totals = documentData?.totals || {};

  return (
    <div className="tenora-demand-preview">
      <style>
        {`
          @media print {
            body { background: #ffffff !important; }
            .tenora-print-actions, aside, header { display: none !important; }
            .tenora-document-card {
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .tenora-document-card .card-body {
              padding: 0 !important;
            }
            .tenora-document-table {
              font-size: 10px;
            }
            .tenora-document-table th,
            .tenora-document-table td {
              padding: 6px 8px !important;
            }
          }
        `}
      </style>
      <section className="tenora-print-actions">
        <div className="d-flex flex-column flex-sm-row gap-2">
          <button className="btn btn-light border d-inline-flex align-items-center gap-2" type="button" onClick={() => navigate(-1)}>
            <IconArrowLeft size={18} />
            Back to demands
          </button>
          <button className="btn btn-light border d-inline-flex align-items-center gap-2" type="button" onClick={fetchDocument}>
            <IconRefresh size={18} />
            Refresh
          </button>
        </div>

        <button className="btn btn-primary tenora-primary-btn" type="button" onClick={() => window.print()}>
          <IconPrinter size={18} />
          Print
        </button>
      </section>

      {error && (
        <div className="alert alert-danger rounded-4 border-0 mb-0" role="alert">
          {error}
        </div>
      )}

      <section className="tenora-document-card card border-0 mx-auto w-100">
        <div className="card-body p-4 p-xl-5">
          {isLoading && (
            <div className="text-center py-5 text-secondary">Loading demand document...</div>
          )}

          {!isLoading && documentData && (
            <div className="d-grid gap-4">
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-4 border-bottom pb-4">
                <div>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="tenora-document-logo">
                      T
                    </div>
                    <div>
                      <div className="h2 fw-bold mb-1" style={{ color: '#101816' }}>Tenora</div>
                      <div className="text-secondary">Property Management</div>
                    </div>
                  </div>
                  <div className="mt-3 fw-semibold">{property.property_name || 'Managed Property'}</div>
                  <div className="text-secondary">{property.address || property.location || '-'}</div>
                </div>

                <div className="text-lg-end">
                  <span className="badge text-capitalize mb-3" style={getStatusStyle(demand.status || 'draft')}>
                    {demand.status || 'draft'}
                  </span>
                  <h1 className="h3 fw-bold mb-2" style={{ color: '#101816' }}>
                    {metadata.demand_title || demand.demand_title || 'Service Charge Demand'}
                  </h1>
                  <div className="fw-semibold">{metadata.demand_reference || demand.demand_reference || '-'}</div>
                  <div className="text-secondary">Version {metadata.document_version || 1}</div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-12 col-lg-6">
                  <div className="rounded-4 p-4 h-100 border" style={{ background: '#ffffff' }}>
                    <div className="text-secondary small fw-semibold mb-2 text-uppercase">Bill To</div>
                    <div className="h4 fw-bold mb-1" style={{ color: '#101816' }}>{tenant.full_name || '-'}</div>
                    <div className="text-secondary">{tenant.email || '-'}</div>
                    <div className="text-secondary">{tenant.phone_number || '-'}</div>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="rounded-4 p-4 h-100 border" style={{ background: '#ffffff' }}>
                    <div className="text-secondary small fw-semibold mb-2 text-uppercase">Property / Tenancy</div>
                    <div className="fw-bold mb-1" style={{ color: '#101816' }}>{property.property_name || '-'}</div>
                    <div className="text-secondary">Unit: {lease.unit_number || '-'}</div>
                    <div className="text-secondary">Tenancy: {toDateInput(lease.start_date)} to {toDateInput(lease.end_date)}</div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="rounded-4 p-3 border">
                    <div className="text-secondary small">Billing period</div>
                    <div className="fw-bold">{toDateInput(demand.period_start)} to {toDateInput(demand.period_end)}</div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="rounded-4 p-3 border">
                    <div className="text-secondary small">Due date</div>
                    <div className="fw-bold">{toDateInput(demand.due_date)}</div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="rounded-4 p-3 border">
                    <div className="text-secondary small">Issued date</div>
                    <div className="fw-bold">{toDateInput(metadata.issued_at)}</div>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="tenora-document-table table table-vcenter card-table mb-0">
                  <thead>
                    <tr><th>Description</th><th>Unit</th><th>Floor Area</th><th className="text-end">Amount</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{metadata.demand_title || 'Service Charge Demand'}</td>
                      <td>{lease.unit_number || '-'}</td>
                      <td>{lease.occupied_space ? `${Number(lease.occupied_space).toLocaleString()} sqm` : '-'}</td>
                      <td className="text-end fw-bold">{money.format(Number(totals.total_amount || 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="row g-3 justify-content-end">
                <div className="col-12 col-lg-5">
                  <div className="rounded-4 p-4" style={{ background: '#ecfdf5' }}>
                    <div className="d-flex justify-content-between gap-3 mb-2">
                      <span>Total amount</span>
                      <strong>{money.format(Number(totals.total_amount || 0))}</strong>
                    </div>
                    <div className="d-flex justify-content-between gap-3 mb-2">
                      <span>Amount paid</span>
                      <strong>{money.format(Number(totals.amount_paid || 0))}</strong>
                    </div>
                    <div className="d-flex justify-content-between gap-3 h4 mb-0" style={{ color: '#101816' }}>
                      <span>Balance</span>
                      <strong>{money.format(Number(totals.balance || 0))}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {(metadata.payment_instruction || metadata.demand_note) && (
                <div className="row g-3">
                  {metadata.payment_instruction && (
                    <div className="col-12 col-lg-6">
                      <div className="rounded-4 p-4 border h-100">
                        <div className="fw-bold mb-2">Payment instruction</div>
                        <div className="text-secondary">{metadata.payment_instruction}</div>
                      </div>
                    </div>
                  )}
                  {metadata.demand_note && (
                    <div className="col-12 col-lg-6">
                      <div className="rounded-4 p-4 border h-100">
                        <div className="fw-bold mb-2">Demand note</div>
                        <div className="text-secondary">{metadata.demand_note}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-secondary small border-top pt-3">
                Issued by {metadata.issued_by_name || metadata.issued_by || '-'} on {toDateInput(metadata.issued_at)}.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DemandPreview;
