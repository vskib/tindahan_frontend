export default function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return total > 0 ? <div className="text-base-content/60 text-sm">{total} item{total === 1 ? '' : 's'}</div> : null;
  return (
    <nav className="flex items-center justify-between" aria-label="Pages">
      <span className="text-base-content/60 text-sm">{total} items · Page {page} of {pages}</span>
      <div className="join">
        <button className="btn btn-outline btn-sm join-item" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Previous</button>
        <button className="btn btn-outline btn-sm join-item" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next ›</button>
      </div>
    </nav>
  );
}
