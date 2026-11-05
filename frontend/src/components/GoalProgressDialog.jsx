import ModalOverlay from './ModalOverlay';
import { useRef } from 'react';
import { useLanguage } from '../context/useLanguage';

export default function GoalProgressDialog({ goal, amount, onAmount, saving, retry, onClose, onSubmit }) {
  const { t } = useLanguage();
  const dialog = useRef(null);
  const numeric = Number(amount);
  const valid = Number.isInteger(numeric) && numeric > 0 && numeric <= 2147483647;
  const preview = goal && valid && !retry ? Math.min(goal.currentValue + numeric, goal.targetValue) : null;
  const close = () => { if (!saving) onClose(); };
  return <ModalOverlay onClose={close}>
    <section ref={dialog} className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="goal-progress-title"
      style={{ maxWidth: '420px' }} onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); close(); }
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll('input, button')].filter(node => !node.disabled);
        const first = controls[0], last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <h2 id="goal-progress-title" className="modal-title">{t('Thêm tiến độ')}</h2>
      <p style={{ overflowWrap: 'anywhere' }}><strong>{goal?.name || t('Mục tiêu chưa tải được')}</strong></p>
      {goal && <p>{t('Tiến độ hiện tại: {current}/{target} {unit}', { current: goal.currentValue, target: goal.targetValue, unit: goal.unit || '' })}</p>}
      <form aria-busy={saving} onSubmit={event => { event.preventDefault(); if (!saving && valid) onSubmit(); }}>
        <div className="form-group">
          <label className="form-label" htmlFor="goal-progress-amount">{t('Số lượng thực tế vừa làm')}</label>
          <input id="goal-progress-amount" type="number" className="form-input" required min="1" max="2147483647" step="1"
            readOnly={retry} disabled={saving} value={amount} onChange={event => onAmount(event.target.value)} aria-describedby="goal-progress-help" />
        </div>
        <div id="goal-progress-help" role="status">
          {retry ? <p>{t('Số lượng được giữ nguyên để xác nhận thao tác trước, không cộng thêm lần nữa. Đóng cửa sổ vẫn giữ thao tác chờ.')}</p>
            : preview !== null && <><p>{t('Dự kiến sau khi lưu: {current}/{target} {unit}', { current: preview, target: goal.targetValue, unit: goal.unit || '' })}</p>
              {preview === goal.targetValue && <p>{t('Lần ghi nhận này sẽ hoàn thành mục tiêu. Phần vượt chỉ tiêu không được cộng thêm.')}</p>}</>}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={close}>{t('Đóng')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !valid}>{t(saving ? 'Đang lưu…' : retry ? 'Thử lại' : 'Lưu tiến độ')}</button>
        </div>
      </form>
    </section>
  </ModalOverlay>;
}
