import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Esc closes the dialog unless dismissible={false}. */
export default function Modal({ title, onClose, children, footer, size = '', dismissible = true }) {
  const titleId = useId();
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && dismissible) onClose?.(); };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('input:not([disabled]), select, textarea, button.btn-primary')?.focus();
    return () => { document.removeEventListener('keydown', onKey); };
  }, [dismissible, onClose]);
  return createPortal(
    <div className="modal modal-open" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
      <div className={`modal-box max-h-[calc(100vh-2rem)] p-0 ${size}`}>
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
          <h2 className="text-lg font-semibold" id={titleId}>{title}</h2>
          {dismissible && <button type="button" className="btn btn-sm btn-circle btn-ghost" aria-label="Close" onClick={onClose}>×</button>}
        </div>
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-5">{children}</div>
        {footer && <div className="modal-action mt-0 border-t border-base-300 px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
