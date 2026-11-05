import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const openModals = new Set();
let originalRootInert = false;
let originalOverflow = '';
export default function ModalOverlay({ children, onClose }) {
  const overlay = useRef(null);
  const opener = useRef(document.activeElement);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const node = overlay.current;
    const previousFocus = opener.current;
    const dialog = node.querySelector('[role="dialog"], .modal');
    const root = document.getElementById('root');
    if (!openModals.size) {
      originalRootInert = root?.inert || false;
      originalOverflow = document.body.style.overflow;
    }
    openModals.add(node);
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    if (dialog) dialog.tabIndex = -1;
    const controls = () => [...node.querySelectorAll('a[href], button, input, textarea, select, [tabindex]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled, [aria-disabled="true"]') && element.getClientRects().length > 0);
    const focusFirst = () => (controls()[0] || dialog)?.focus();
    if (!node.contains(document.activeElement)) focusFirst();
    const topmost = () => [...openModals].at(-1) === node;
    const keyboard = event => {
      if (!topmost()) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); close.current?.(); return;
      }
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); event.stopPropagation(); dialog?.focus(); return; }
      if (!node.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault(); event.stopPropagation(); (event.shiftKey ? last : first).focus();
      }
    };
    const containFocus = event => { if (topmost() && !node.contains(event.target)) focusFirst(); };
    document.addEventListener('keydown', keyboard, true);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', keyboard, true);
      document.removeEventListener('focusin', containFocus);
      openModals.delete(node);
      if (!openModals.size) {
        if (root) root.inert = originalRootInert;
        document.body.style.overflow = originalOverflow;
      }
      if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus();
    };
  }, []);
  return createPortal(<div ref={overlay} className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) close.current?.(); }}>{children}</div>, document.body);
}
