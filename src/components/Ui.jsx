const SkeletonBlock = ({ className = '' }) => <span className={`skeleton-block ${className}`} aria-hidden="true" />;

export const Loading = ({ text = 'Loading…', variant = 'content' }) => (
  <div className={`skeleton-loading skeleton-${variant}`} role="status" aria-label={text}>
    <span className="sr-only">{text}</span>
    {variant === 'dashboard' ? (
      <>
        <div className="grid grid-cols-12 gap-3 mb-3">{Array.from({ length: 4 }, (_, i) => <div className="col-span-6 lg:col-span-3" key={i}><div className="skeleton-panel"><SkeletonBlock className="w-1/2" /><SkeletonBlock className="w-3/4 skeleton-tall" /></div></div>)}</div>
        <div className="grid grid-cols-12 gap-3"><div className="col-span-12 lg:col-span-5"><div className="skeleton-panel"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div></div><div className="col-span-12 lg:col-span-7"><div className="skeleton-panel"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div></div></div>
      </>
    ) : variant === 'grid' ? (
      <div className="grid grid-cols-12 gap-2">{Array.from({ length: 6 }, (_, i) => <div className="col-span-6 md:col-span-4" key={i}><div className="skeleton-panel"><SkeletonBlock className="w-3/4" /><SkeletonBlock className="w-1/2 skeleton-tall" /><SkeletonBlock /></div></div>)}</div>
    ) : variant === 'table' ? (
      <div className="skeleton-panel skeleton-table">{Array.from({ length: 4 }, (_, i) => <div className="skeleton-table-row" key={i}><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div>)}</div>
    ) : variant === 'detail' ? (
      <div className="skeleton-panel"><SkeletonBlock className="w-1/2" /><SkeletonBlock /><SkeletonBlock className="w-3/4" /><SkeletonBlock /></div>
    ) : (
      <div className="skeleton-panel"><SkeletonBlock className="w-3/4" /><SkeletonBlock /><SkeletonBlock className="w-1/2" /></div>
    )}
  </div>
);
export const ErrorAlert = ({ error, onRetry }) => error ? (
  <div className="alert alert-error flex items-center justify-between" role="alert">
    <span>{error.message ?? String(error)}</span>
    {onRetry && <button className="btn btn-sm btn-outline btn-error ms-3" onClick={onRetry}>Try again</button>}
  </div>
) : null;
export const Empty = ({ children }) => <div className="text-center text-base-content/60 py-4">{children}</div>;
export const FieldError = ({ msg }) => msg ? <div className="text-sm text-error block">{msg}</div> : null;
export const Spin = () => <span className="loading loading-spinner loading-sm me-2" aria-hidden="true" />;
