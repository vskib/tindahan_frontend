export const Loading = ({ text = 'Loading…' }) => (
  <div className="text-center text-muted py-4" role="status"><span className="spinner-border spinner-border-sm me-2" />{text}</div>
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
