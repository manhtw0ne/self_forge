import {useEffect, useRef, useState} from 'react';
import ModalOverlay from './ModalOverlay';
import {useLanguage} from '../context/useLanguage';

export default function BatchCompleteCheckInsDialog({habits, date, disabled, saving, onSave, onClose}) {
  const {language} = useLanguage();
  const en = language === 'en';
  const [selected, setSelected] = useState([]);
  const [review, setReview] = useState(null);
  const [error, setError] = useState(false);
  const lock = useRef(false);
  const selectedHabits = habits.filter(habit => selected.includes(habit.habitId));
  const reviewHabits = habits.filter(habit => review?.includes(habit.habitId));

  useEffect(() => {
    if (!selected.length && !review) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [selected, review]);

  const close = () => {
    if (lock.current || saving) return;
    if ((selected.length || review) && !window.confirm(en ? 'Discard this group check-in selection?' : 'Bỏ nhóm check-in đang chọn?')) return;
    onClose();
  };
  const toggle = habitId => {
    if (review || saving || disabled) return;
    setSelected(current => current.includes(habitId) ? current.filter(id => id !== habitId) : [...current, habitId]);
  };
  const save = async () => {
    if (lock.current || disabled || !review?.length) return;
    lock.current = true;
    setError(false);
    try {
      if (await onSave({date, habitIds: review})) onClose();
      else setError(true);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
    }
  };

  return <ModalOverlay onClose={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="batch-checkin-title" onClick={event => event.stopPropagation()}>
      <h2 id="batch-checkin-title">{en ? 'Complete several habits' : 'Hoàn thành nhiều thói quen'}</h2>
      <p>{en ? `Choose only the habits you finished on ${date}.` : `Chỉ chọn những thói quen bạn đã thực hiện trong ngày ${date}.`}</p>
      <p>{en ? 'This never marks unselected habits as failed or skipped. Add a note from the individual check-in action.' : 'Thao tác này không tự đánh dấu thất bại hoặc bỏ qua các việc chưa chọn. Dùng check-in từng việc nếu cần ghi chú.'}</p>
      {error && <p role="alert">{en ? 'The group was not confirmed. Keep this selection, reload the dashboard, then review saved check-ins before trying again.' : 'Chưa xác nhận được cả nhóm. Giữ lựa chọn này, tải lại Dashboard rồi kiểm tra check-in đã lưu trước khi thử lại.'}</p>}
      <fieldset disabled={disabled || saving} style={{border: 0, padding: 0}}>
        {review ? <>
          <h3>{en ? 'Review before saving' : 'Xem lại trước khi lưu'}</h3>
          <p>{en ? `${reviewHabits.length} habit${reviewHabits.length === 1 ? '' : 's'} will be marked completed.` : `${reviewHabits.length} thói quen sẽ được đánh dấu hoàn thành.`}</p>
          <ul style={{margin: '0 0 1rem', paddingInlineStart: '1.25rem'}}>{reviewHabits.map(habit => <li key={habit.habitId}>{habit.name}</li>)}</ul>
          <p>{en ? 'The server checks the full group together. If another device recorded one differently, nothing new in this group is saved.' : 'Máy chủ kiểm tra cả nhóm cùng lúc. Nếu thiết bị khác đã ghi một việc khác trạng thái, không có việc mới nào trong nhóm được lưu.'}</p>
          <button className="btn btn-primary" type="button" onClick={save}>{en ? 'Confirm completed habits' : 'Xác nhận hoàn thành'}</button>{' '}
          <button className="btn btn-secondary" type="button" onClick={() => { setReview(null); setError(false); }}>{en ? 'Edit selection' : 'Sửa lựa chọn'}</button>
        </> : <>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '.75rem', margin: '1rem 0'}}>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setSelected(habits.map(habit => habit.habitId))}>{en ? 'Select all' : 'Chọn tất cả'}</button>
            <button className="btn btn-secondary btn-sm" type="button" disabled={!selected.length} onClick={() => setSelected([])}>{en ? 'Clear selection' : 'Bỏ chọn'}</button>
            <span aria-live="polite">{en ? `${selectedHabits.length} selected` : `Đã chọn ${selectedHabits.length}`}</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '.5rem'}}>
            {habits.map(habit => <label key={habit.habitId} className="habit-item" style={{cursor: disabled ? 'default' : 'pointer'}}>
              <input type="checkbox" checked={selected.includes(habit.habitId)} onChange={() => toggle(habit.habitId)} />
              <span className="habit-info"><span className="habit-name">{habit.name}</span><span className="habit-meta">{habit.completedThisWeek}/{habit.targetPerWeek} {en ? 'this week' : 'tuần này'}</span></span>
            </label>)}
          </div>
          <button className="btn btn-primary" type="button" disabled={!selected.length} style={{marginTop: '1rem'}} onClick={() => { setReview([...selected]); setError(false); }}>{en ? 'Review selected habits' : 'Xem lại các việc đã chọn'}</button>
        </>}
      </fieldset>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: '.75rem', marginTop: '1rem'}}>
        <button className="btn btn-secondary" type="button" disabled={saving} onClick={close}>{en ? 'Close' : 'Đóng'}</button>
      </div>
    </section>
  </ModalOverlay>;
}
