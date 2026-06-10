import { IconArrowUpRight, IconDotsVertical, IconInbox, IconPlus } from '@tabler/icons-react';
import { getStatusStyle } from '../utils/statusStyles';

export const PageHeader = ({ eyebrow, title, description, action, children }) => (
  <section className="tenora-page-header">
    <div>
      {eyebrow && <div className="tenora-eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    <div className="tenora-page-actions">
      {children}
      {action && (
        <button className="btn btn-primary tenora-primary-btn" type="button" onClick={action.onClick}>
          {action.icon || <IconPlus size={18} />}
          {action.label}
        </button>
      )}
    </div>
  </section>
);

export const StatCard = ({ label, value, icon: Icon, helper, tone = 'emerald', onClick }) => {
  const content = (
    <>
      <div>
        <div className="tenora-stat-label">{label}</div>
        <div className="tenora-stat-value">{value}</div>
        {helper && <div className="tenora-stat-helper">{helper}</div>}
      </div>
      {Icon && <span className={`tenora-icon-tile is-${tone}`}><Icon size={22} /></span>}
    </>
  );

  return onClick ? (
    <button className="tenora-stat-card is-action" type="button" onClick={onClick}>{content}</button>
  ) : (
    <article className="tenora-stat-card">{content}</article>
  );
};

export const FilterBar = ({ children }) => (
  <section className="tenora-filter-bar">{children}</section>
);

export const EmptyState = ({
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  icon: Icon = IconInbox,
  compact = false
}) => (
  <div className={`tenora-empty-state ${compact ? 'is-compact' : ''}`}>
    <span className="tenora-empty-icon"><Icon size={24} /></span>
    <strong>{title}</strong>
    {description && <p>{description}</p>}
    {actionLabel && onAction && (
      <button className="btn btn-primary tenora-primary-btn btn-sm" type="button" onClick={onAction}>
        <IconPlus size={16} /> {actionLabel}
      </button>
    )}
  </div>
);

export const StatusBadge = ({ status, label }) => (
  <span className="tenora-status-badge text-capitalize" style={getStatusStyle(status)}>
    {label || String(status || 'unknown').replaceAll('_', ' ')}
  </span>
);

export const WorkflowStepper = ({ status = 'draft' }) => {
  const steps = ['draft', 'calculated', 'review', 'issued'];
  const statusIndex = status === 'approved' ? 2 : Math.max(0, steps.indexOf(status));

  return (
    <div className="tenora-stepper" aria-label="Budget workflow">
      {steps.map((step, index) => (
        <div className={`tenora-step ${index <= statusIndex ? 'is-complete' : ''} ${index === statusIndex ? 'is-current' : ''}`} key={step}>
          <span>{index + 1}</span>
          <small>{step}</small>
        </div>
      ))}
    </div>
  );
};

export const RowActions = ({ children, label = 'Record actions' }) => (
  <div className="dropdown">
    <button className="btn btn-sm btn-light btn-icon" type="button" data-bs-toggle="dropdown" aria-label={label} title={label}>
      <IconDotsVertical size={17} />
    </button>
    <div className="dropdown-menu dropdown-menu-end">{children}</div>
  </div>
);

export const MobileRecordCard = ({ title, subtitle, meta = [], status, children }) => (
  <article className="tenora-mobile-record">
    <div className="d-flex align-items-start justify-content-between gap-3">
      <div>
        <strong>{title}</strong>
        {subtitle && <div className="text-secondary small mt-1">{subtitle}</div>}
      </div>
      {status && <StatusBadge status={status} />}
    </div>
    {meta.length > 0 && (
      <dl>
        {meta.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value ?? '-'}</dd></div>
        ))}
      </dl>
    )}
    {children && <div className="tenora-mobile-actions">{children}</div>}
  </article>
);

export const DashboardWidget = ({ title, description, actionLabel, onAction, children, className = '' }) => (
  <article className={`tenora-dashboard-widget ${className}`}>
    <header className="tenora-widget-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {onAction && (
        <button className="tenora-widget-action" type="button" onClick={onAction} aria-label={actionLabel || `Open ${title}`} title={actionLabel || `Open ${title}`}>
          <IconArrowUpRight size={17} />
        </button>
      )}
    </header>
    <div className="tenora-widget-body">{children}</div>
  </article>
);

export const MiniMetric = ({ label, value, tone = 'default' }) => (
  <div className={`tenora-mini-metric is-${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export const RingSummary = ({ value = 0, label, detail }) => {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="tenora-ring-summary">
      <div className="tenora-ring" style={{ '--tenora-ring-value': `${safeValue * 3.6}deg` }}>
        <div><strong>{safeValue}%</strong><span>{label}</span></div>
      </div>
      {detail && <div className="tenora-ring-detail">{detail}</div>}
    </div>
  );
};
