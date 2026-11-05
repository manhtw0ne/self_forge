import { readSessionNoteDraft, writeSessionNoteDraft, removeSessionNoteDraft } from '../utils/sessionNoteDraft';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/useLanguage';
import api from '../api/client';
export default function PomodoroNote({ session, userId, onSaved, onStateChange }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(session.note || '');
  const [baseNote, setBaseNote] = useState(session.note || '');
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const [draft, setDraft] = useState(null);
  const [draftError, setDraftError] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const open = () => {
    setNote(session.note || ''); setBaseNote(session.note || ''); setConflict(false); setLatest(null); setError(''); setDraftSaved(false); setSavedNotice(false);
    try { setDraft(readSessionNoteDraft(window.sessionStorage, userId, session.id)); setDraftError(false); }
    catch { setDraft(null); setDraftError(true); }
    setEditing(true);
  };
  const changeNote = value => {
    setNote(value);
    try { writeSessionNoteDraft(window.sessionStorage, userId, session.id, value); setDraftError(false); setDraftSaved(true); }
    catch { setDraftError(true); setDraftSaved(false); }
  };
  const discard = () => {
    if (!window.confirm(t('Bỏ bản nháp ghi chú phiên? Ghi chú trên server vẫn được giữ.'))) return;
    try { removeSessionNoteDraft(window.sessionStorage, userId, session.id); setDraft(null); setNote(baseNote); setDraftError(false); setDraftSaved(false); }
    catch { setDraftError(true); }
  };
  const dirty = editing && note !== baseNote;
  useEffect(() => {
    onStateChange?.(session.id, { dirty, saving });
    return () => onStateChange?.(session.id, null);
  }, [session.id, dirty, saving, onStateChange]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);
  const save = async event => {
    event.preventDefault();
    if (busy.current || draft !== null || conflict) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const { data } = await api.patch('/pomodoro/' + session.id + '/note', { note, expectedNote: baseNote });
      try { removeSessionNoteDraft(window.sessionStorage, userId, session.id); setDraft(null); setDraftError(false); setDraftSaved(false); }
      catch { setDraftError(true); }
      onSaved(data); setSavedNotice(true); setEditing(false);
    } catch (err) { if (err.response?.status === 409) setConflict(true); setError(err.response?.data?.detail || 'Không thể lưu ghi chú. Nội dung vẫn được giữ để thử lại.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const loadLatest = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setLatest(null);
    try { const { data } = await api.get('/pomodoro/' + session.id); setLatest(data); }
    catch { setError('Chưa tải được ghi chú mới. Nội dung đang nhập vẫn được giữ.'); }
    finally { busy.current = false; setSaving(false); }
  };
  if (!editing) return <div style={{ width: '100%' }}>
    {savedNotice && <p role="status">{t(draftError ? 'Ghi chú đã lưu lên server, nhưng chưa xóa được bản nháp trong tab. Khi mở lại, kiểm tra trước khi khôi phục.' : 'Đã lưu ghi chú phiên.')}</p>}
    {session.note && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{session.note}</p>}
    <button className="btn btn-secondary btn-sm" onClick={open}>{t(session.note ? 'Sửa ghi chú phiên' : 'Thêm ghi chú phiên')}</button>
  </div>;
  return <form onSubmit={save} style={{ marginTop: '0.5rem', width: '100%' }}>
    {draft !== null && <div role="status"><p>{t('Có bản nháp ghi chú phiên trong tab này. Khôi phục để tiếp tục sửa.')}</p>
      <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => { setNote(draft); setDraft(null); setDraftSaved(true); }}>{t('Khôi phục bản nháp')}</button>
      <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={discard}>{t('Bỏ bản nháp')}</button></div>}
    {draftError && <div role="alert"><p>{t('Không thể đọc hoặc lưu bản nháp. Giữ trang mở để tránh mất nội dung.')}</p><button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={discard}>{t('Bỏ bản nháp')}</button></div>}
    {draftSaved && <p role="status">{t('Đã giữ bản nháp trong tab này — chưa lưu lên server.')}</p>}
    <label className="form-label" htmlFor={'session-note-' + session.id}>{t('Bạn đã làm được gì trong phiên này?')}</label>
    <textarea id={'session-note-' + session.id} className="form-textarea" value={note} maxLength={255} rows={3}
      disabled={saving || draft !== null} readOnly={conflict} onChange={event => changeNote(event.target.value)} autoFocus />
    <small>{note.length}/255</small>
    {error && <p role="alert">{t(error)}</p>}
    {conflict && <div role="status" style={{ marginTop: '0.75rem' }}>
      <p>{t('Ghi chú đang nhập vẫn được giữ. Bạn có thể sao chép trước khi chọn bản mới.')}</p>
      <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={loadLatest}>{t('Xem ghi chú mới')}</button>
      {latest && <div className="card" style={{ marginTop: '0.75rem' }}>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{latest.note || t('Chưa có ghi chú.')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => {
            onSaved(latest); setBaseNote(latest.note || ''); changeNote(latest.note || ''); setConflict(false); setLatest(null); setError(''); setDraft(null);
          }}>{t('Dùng ghi chú mới')}</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => {
            onSaved(latest); setBaseNote(latest.note || ''); setConflict(false); setLatest(null); setError('');
          }}>{t('Giữ nội dung đang nhập để lưu tiếp')}</button>
        </div>
      </div>}
    </div>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
      <button className="btn btn-primary btn-sm" disabled={saving || draft !== null || conflict}>{t(saving ? 'Đang lưu...' : 'Lưu ghi chú')}</button>
      <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => {
        if (!dirty || draftSaved || window.confirm(t('Bỏ thay đổi ghi chú phiên?'))) setEditing(false);
      }}>{t('Đóng')}</button>
    </div>
  </form>;
}
