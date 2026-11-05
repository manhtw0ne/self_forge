import { journalExport } from '../utils/journalExport';
import { downloadText } from '../utils/downloadText';
import { useLanguage } from '../context/useLanguage';
import { useToast } from '../context/useToast';
export default function SavedJournalDownload({ entry, disabled }) {
  const { t, language } = useLanguage(); const toast = useToast();
  return <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} title={t('Nội dung đã tải từ máy chủ, không gồm thay đổi chưa lưu.')} onClick={() => {
    try { const result = journalExport(entry, language, t); downloadText(result.text, result.filename); }
    catch { toast.error(t('Không thể tải nhật ký đã lưu. Hãy tải lại dữ liệu rồi thử lại.')); }
  }}>{t('Tải nhật ký đã lưu (.txt)')}</button>;
}
