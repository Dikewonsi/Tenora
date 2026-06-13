import { IconAlertCircle, IconCircleCheck, IconInfoCircle, IconTrash, IconX } from '@tabler/icons-react';

const modalBackdropStyle = {
  background: 'rgba(15, 23, 42, 0.48)',
  zIndex: 1060
};

const modalCardStyle = {
  maxWidth: 560,
  borderRadius: 14,
  boxShadow: '0 22px 60px rgba(15, 23, 42, 0.18)'
};

const modalIconStyles = {
  danger: {
    background: '#fee2e2',
    color: '#dc2626'
  },
  success: {
    background: '#d1fae5',
    color: '#059669'
  },
  warning: {
    background: '#fef3c7',
    color: '#d97706'
  },
  info: {
    background: '#dbeafe',
    color: '#2563eb'
  }
};

const iconByVariant = {
  danger: IconAlertCircle,
  success: IconCircleCheck,
  warning: IconAlertCircle,
  info: IconInfoCircle
};

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isWorking = false,
  variant = 'danger',
  icon: IconOverride,
  onCancel,
  onConfirm
}) => {
  if (!isOpen) {
    return null;
  }

  const Icon = IconOverride || (variant === 'danger' ? IconTrash : iconByVariant[variant] || IconAlertCircle);
  const iconStyle = modalIconStyles[variant] || modalIconStyles.danger;
  const confirmClass = variant === 'danger' ? 'btn-danger' : 'text-white border-0';
  const confirmStyle = variant === 'danger' ? { borderRadius: 12 } : { borderRadius: 12, background: '#059669', borderColor: '#059669' };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={modalBackdropStyle}>
      <div className="card border-0 w-100" style={modalCardStyle}>
        <div className="card-body p-4 p-md-5">
          <div className="d-flex align-items-start gap-3 mb-4">
            <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 52, height: 52, borderRadius: 14, ...iconStyle }}>
              <Icon size={30} stroke={2.2} />
            </div>
            <div>
              <h3 className="fw-bold mb-2" style={{ color: '#101816' }}>{title}</h3>
              <p className="text-secondary mb-0">{message}</p>
            </div>
          </div>

          {details && (
            <div className="rounded-4 p-3 mb-4" style={{ background: '#f8fafc' }}>
              {details}
            </div>
          )}

          <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
            <button className="btn btn-light" type="button" onClick={onCancel} disabled={isWorking} style={{ borderRadius: 12 }}>
              {cancelLabel}
            </button>
            <button className={`btn ${confirmClass} d-inline-flex align-items-center justify-content-center gap-2`} type="button" onClick={onConfirm} disabled={isWorking} style={confirmStyle}>
              {variant === 'danger' && <Icon size={18} />}
              {isWorking ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeedbackModal = ({
  isOpen,
  title,
  message,
  guidance,
  variant = 'danger',
  buttonLabel = 'Got it',
  onClose
}) => {
  if (!isOpen) {
    return null;
  }

  const Icon = iconByVariant[variant] || IconAlertCircle;
  const iconStyle = modalIconStyles[variant] || modalIconStyles.danger;
  const accentColor = variant === 'success' ? '#059669' : variant === 'warning' ? '#d97706' : '#dc2626';
  const guidanceBackground = variant === 'success' ? '#ecfdf5' : variant === 'warning' ? '#fffbeb' : '#fef2f2';
  const guidanceColor = variant === 'success' ? '#065f46' : variant === 'warning' ? '#92400e' : '#7f1d1d';

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={modalBackdropStyle}>
      <div className="card border-0 w-100 overflow-hidden" style={modalCardStyle}>
        <div style={{ height: 6, background: accentColor }} />
        <div className="card-body p-4 p-md-5">
          <div className="d-flex justify-content-end mb-2">
            <button className="btn btn-light btn-icon" type="button" onClick={onClose} aria-label="Close modal" style={{ borderRadius: 12 }}>
              <IconX size={18} />
            </button>
          </div>

          <div className="d-flex align-items-start gap-3 mb-4">
            <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 52, height: 52, borderRadius: 14, ...iconStyle }}>
              <Icon size={38} stroke={2.2} />
            </div>
            <div>
              <h3 className="fw-bold mb-2" style={{ color: '#101816' }}>{title}</h3>
              <p className="fw-semibold mb-0" style={{ color: guidanceColor }}>{message}</p>
            </div>
          </div>

          {guidance && (
            <div className="rounded-4 p-3 mb-4" style={{ background: guidanceBackground, color: guidanceColor }}>
              {guidance}
            </div>
          )}

          <div className="d-flex justify-content-end">
            <button className="btn rounded-4 fw-bold shadow-sm text-white px-4" type="button" onClick={onClose} style={{ background: '#059669', borderColor: '#059669' }}>
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
