import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Bootstrap-styled modal without Bootstrap's JavaScript. Esc closes it unless dismissible={false}. */
export default function Modal({ title, onClose, children, footer, size = '', dismissible = true }) {
  const titleId = useId();
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && dismissible) onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    ref.current?.querySelector('input:not([disabled]), select, textarea, button.btn-primary')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open'); };
  }, [dismissible, onClose]);
  return createPortal(
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className={`modal-dialog modal-dialog-scrollable ${size}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id={titleId}>{title}</h2>
              {dismissible && <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />}
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>,
    document.body,
  );
}
