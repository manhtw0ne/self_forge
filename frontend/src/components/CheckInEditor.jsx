import {selectedCheckIn} from '../utils/checkInNavigation';
import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import {readCheckInPreview} from '../utils/checkInPreview';
import { useLanguage } from '../context/useLanguage';
import { formatCalendarDate } from '../utils/dates';

export default function CheckInEditor({ habit, disabled, saving, onSave, onCancel }) {
  const { t, language } = useLanguage();
  const [original, setOriginal] = useState(null);
  const [status, setStatus] = useState(habit.todayStatus);
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const form = useRef(null);
  const [preview,setPreview]=useState(null);const [previewBusy,setPreviewBusy]=useState(false);const [previewError,setPreviewError]=useState(false);const previewLock=useRef(false);
  const statusChanged=original&&status!==original.status;
  const inspect=async()=>{if(previewLock.current||disabled||!original)return;previewLock.current=true;setPreviewBusy(true);setPreviewError(false);setPreview(null);
    try{const {data}=await api.post('/check-ins/preview',{habitId:habit.habitId,date:habit.date,status,expected:original});setPreview(readCheckInPreview(data,original.id,original.status,status));}
    catch{setPreviewError(true);}
    finally{previewLock.current=false;setPreviewBusy(false);}
  };
  const reloadOriginal=async()=>{if(previewLock.current||saving)return;previewLock.current=true;setPreviewBusy(true);
    try{const {data}=await api.get('/check-ins',{params:{date:habit.date}});const entry=habit.expectedCheckInId==null?data.find(row=>row.habitId===habit.habitId):selectedCheckIn(data,{date:habit.date,entryId:habit.expectedCheckInId,invalid:false});if(!entry||entry.habitId!==habit.habitId)throw Error('Missing check-in');setOriginal({id:entry.id,status:entry.status,note:entry.note||''});setPreview(null);setPreviewError(false);}
    catch{setPreviewError(true);}finally{previewLock.current=false;setPreviewBusy(false);}
  };
  const dirty = original && (status !== original.status || note !== original.note);
  useEffect(() => {
    let active = true;
    api.get('/check-ins', { params: { date: habit.date } }).then(({ data }) => {
      if (!active) return;
      const entry = habit.expectedCheckInId==null?data.find(item => item.habitId === habit.habitId):selectedCheckIn(data,{date:habit.date,entryId:habit.expectedCheckInId,invalid:false});
      if (!entry||entry.habitId!==habit.habitId) { setFailed(true); return; }
      setOriginal({ id: entry.id, status: entry.status, note: entry.note || '' });
      setStatus(entry.status); setNote(entry.note || ''); setFailed(false);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [habit.habitId, habit.date,habit.expectedCheckInId, attempt]);
  useEffect(() => { form.current?.focus(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const guard = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  return <form ref={form} tabIndex={-1} className="card" aria-label={t('Sửa check-in')} onSubmit={event => {
    event.preventDefault();
    if(previewLock.current)return;
    if(statusChanged&&!preview){void inspect();return;}
    if(statusChanged&&!preview?.allowed)return;
    if (!disabled && original && dirty) onSave({ habitId: habit.habitId, date: habit.date, status, note, expected: original });
  }}>
    <h2>{t('Sửa check-in')}: {habit.name}</h2>
    <p>{formatCalendarDate(habit.date, language)}</p>
    <p>{t('Điểm và XP sẽ được điều chỉnh theo trạng thái mới.')}</p>
    {failed ? <div role="alert"><p>{t('Không thể tải check-in. Hãy thử lại trước khi sửa.')}</p><button type="button" className="btn btn-secondary" onClick={() => { setFailed(false); setAttempt(a => a + 1); }}>{t('Thử lại')}</button></div> : !original ? <p role="status">{t('Đang tải...')}</p> : <fieldset disabled={saving||previewBusy} style={{ border: 0, padding: 0 }}>
      <label className="form-label" htmlFor="checkin-status">{t('Trạng thái')}</label>
      <select disabled={disabled} id="checkin-status" className="form-select" value={status} onChange={e => {setStatus(e.target.value);setPreview(null);setPreviewError(false);}}>
        <option value="COMPLETED">{t('Hoàn thành')}</option>
        <option value="SKIPPED">{t('Bỏ qua')}</option>
        <option value="FAILED">{t('Thất bại')}</option>
      </select>
      <label className="form-label" htmlFor="checkin-note">{t('Ghi chú')}</label>
      <textarea readOnly={disabled} id="checkin-note" className="form-textarea" maxLength={255} rows={3} value={note} onChange={e => setNote(e.target.value)} />
      <small>{note.length}/255</small>
      {disabled && !saving && <p>{t('Bạn có thể chọn và sao chép ghi chú trước khi tải lại.')}</p>}
    </fieldset>}
    {previewBusy&&<p role="status">{t('Đang xem tác động dự kiến...')}</p>}
    {previewError&&<div role="alert"><p>{t('Chưa xem được tác động. Nội dung được giữ; thử lại hoặc tải check-in mới nếu dữ liệu đã thay đổi.')}</p><button type="button" className="btn btn-secondary" disabled={saving||previewBusy} onClick={reloadOriginal}>{t('Tải check-in mới và giữ nội dung đang nhập')}</button></div>}
    {statusChanged&&preview&&<div role={preview.allowed?'status':'alert'} style={{marginTop:'1rem'}}>
      {preview.allowed?<><p>{t('Điều chỉnh XP cơ sở tài khoản: {delta}',{delta:preview.accountDelta>0?'+'+preview.accountDelta:preview.accountDelta})}</p>
       {preview.companionDelta!==null&&<><p>{t('Điểm bạn đồng hành: {before} → {after} XP',{before:preview.companionXpBefore,after:preview.companionXpAfter})}</p><p>{t('Hình thái dự kiến: {before} → {after}',{before:preview.stageBefore,after:preview.stageAfter})}</p></>}
       <p>{t('Chưa gồm thưởng huy hiệu hoặc thử thách. Máy chủ sẽ kiểm tra lại khi lưu; chưa có dữ liệu nào được sửa từ bản xem trước.')}</p>
      </>:<p>{t(preview.reason==='LEGACY'?'Check-in cũ thiếu lịch sử điểm. Chỉ sửa ghi chú; cần đối soát trước khi đổi trạng thái.':'Không đủ XP tài khoản để thu hồi điểm check-in đã sử dụng. Trạng thái hiện tại được giữ.')}</p>}
      <button type="button" className="btn btn-secondary btn-sm" disabled={saving||disabled} onClick={inspect}>{t('Kiểm tra lại tác động')}</button>
    </div>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
      <button className="btn btn-primary" disabled={disabled || previewBusy || !dirty || statusChanged&&preview&&!preview.allowed}>{t(statusChanged&&!preview?'Xem tác động trước khi lưu':'Lưu thay đổi')}</button>
      <button type="button" className="btn btn-secondary" disabled={saving||previewBusy} onClick={() => {
        if (!dirty || window.confirm(t('Bỏ thay đổi check-in?'))) onCancel();
      }}>{t('Hủy')}</button>
    </div>
  </form>;
}
