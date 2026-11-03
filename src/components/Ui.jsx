const SkeletonBlock = ({ className = '' }) => <span className={`skeleton-block ${className}`} aria-hidden="true" />;

export const Loading = ({ text = 'Loading…', variant = 'content' }) => (
  <div className={`skeleton-loading skeleton-${variant}`} role="status" aria-label={text}>
    <span className="visually-hidden">{text}</span>
    {variant === 'dashboard' ? (
      <>
        <div className="row g-3 mb-3">{Array.from({ length: 4 }, (_, i) => <div className="col-6 col-lg-3" key={i}><div className="skeleton-panel"><SkeletonBlock className="w-50" /><SkeletonBlock className="w-75 skeleton-tall" /></div></div>)}</div>
        <div className="row g-3"><div className="col-lg-5"><div className="skeleton-panel"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div></div><div className="col-lg-7"><div className="skeleton-panel"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div></div></div>
      </>
    ) : variant === 'grid' ? (
      <div className="row g-2">{Array.from({ length: 6 }, (_, i) => <div className="col-6 col-md-4" key={i}><div className="skeleton-panel"><SkeletonBlock className="w-75" /><SkeletonBlock className="w-50 skeleton-tall" /><SkeletonBlock /></div></div>)}</div>
    ) : variant === 'table' ? (
      <div className="skeleton-panel skeleton-table">{Array.from({ length: 4 }, (_, i) => <div className="skeleton-table-row" key={i}><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div>)}</div>
    ) : variant === 'detail' ? (
      <div className="skeleton-panel"><SkeletonBlock className="w-50" /><SkeletonBlock /><SkeletonBlock className="w-75" /><SkeletonBlock /></div>
    ) : (
      <div className="skeleton-panel"><SkeletonBlock className="w-75" /><SkeletonBlock /><SkeletonBlock className="w-50" /></div>
    )}
  </div>
);
export const ErrorAlert = ({ error, onRetry }) => error ? (
  <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
    <span>{error.message ?? String(error)}</span>
    {onRetry && <button className="btn btn-sm btn-outline-danger ms-3" onClick={onRetry}>Try again</button>}
  </div>
) : null;
export const Empty = ({ children }) => <div className="text-center text-muted py-4">{children}</div>;
export const FieldError = ({ msg }) => msg ? <div className="invalid-feedback d-block">{msg}</div> : null;
export const Spin = () => <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />;
