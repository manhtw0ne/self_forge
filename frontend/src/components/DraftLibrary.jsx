import DraftDownload from './DraftDownload';
import { useEffect, useState } from 'react';
import { useLanguage } from '../context/useLanguage';
import { useToast } from '../context/useToast';
import { listAccountDrafts, draftFields } from '../utils/draftLibrary';
import { formatCalendarDate } from '../utils/dates';
import { removeJournalDraft } from '../utils/journalDraft';
import { removeReviewDraft } from '../utils/reviewDraft';

export default function DraftLibrary({ userId, kind, currentDate, maximumDate, onOpen }) {
  const { t, language } = useLanguage(); const toast = useToast();
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState({ drafts: [], invalidCount: 0 });
  const [error, setError] = useState(false);
  const [limit, setLimit] = useState(10);
  useEffect(() => {
    try { setData(listAccountDrafts(sessionStorage, userId, kind, maximumDate)); setError(false); }
    catch { setError(true); }
  }, [attempt, userId, kind, currentDate, maximumDate]);
  const fields = draftFields[kind];
  const drafts = data.drafts.filter(item => item.date !== currentDate);
  const discard = date => {
    if (!window.confirm(t('Xóa bản nháp ngày {date} trên tab này? Nội dung đã lưu trên máy chủ không thay đổi.', { date: formatCalendarDate(date, language) }))) return;
    try {
      if (kind === 'journal') removeJournalDraft(sessionStorage, userId, date); else removeReviewDraft(sessionStorage, userId, date);
      setAttempt(value => value + 1);
    } catch { toast.error(t('Không thể đọc danh sách bản nháp trên tab này.')); }
  };
  return <section className="card" style={{ marginTop: '1.5rem' }}>
    <h2>{t('Bản nháp của các ngày trước')}</h2>
    <p>{t('Bản nháp chỉ ở tab trình duyệt này, chưa đồng bộ lên máy chủ. Đóng tab có thể làm mất bản nháp; tải file để giữ một bản riêng.')}</p>
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAttempt(value => value + 1)}>{t('Tải lại bản nháp')}</button>
    {error ? <p role="alert">{t('Không thể đọc danh sách bản nháp trên tab này.')}</p> : <>
      {data.invalidCount > 0 && <p role="status">{t('Có {count} bản nháp không đọc được; dữ liệu này chưa bị xóa.', { count: data.invalidCount })}</p>}
      {!drafts.length && <p>{t('Không có bản nháp của ngày khác trên tab này.')}</p>}
      {drafts.slice(0, limit).map(item => <details key={item.date} style={{ marginTop: '1rem' }}>
        <summary>{formatCalendarDate(item.date, language)}</summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '0.75rem 0' }}>
          {onOpen && <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen(item.date)}>{t('Mở ngày này')}</button>}
          <DraftDownload kind={kind} date={item.date} form={item.form} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => discard(item.date)}>{t('Xóa bản nháp')}</button>
        </div>
        {Object.entries(fields).map(([field, label]) => <div key={field}><strong>{t(label)}</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.form[field]}</p></div>)}
      </details>)}
      {drafts.length > limit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLimit(value => value + 10)}>{t('Xem thêm bản nháp')}</button>}
    </>}
  </section>;
}
