export default function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return total > 0 ? <div className="text-muted small">{total} item{total === 1 ? '' : 's'}</div> : null;
  return (
    <nav className="d-flex justify-content-between align-items-center" aria-label="Pages">
      <span className="text-muted small">{total} items · Page {page} of {pages}</span>
      <div className="btn-group">
        <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Previous</button>
        <button className="btn btn-outline-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next ›</button>
      </div>
    </nav>
  );
}
