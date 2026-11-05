import { pomodoroExport } from '../utils/pomodoroExport';
import { downloadText } from '../utils/downloadText';
import { useLanguage } from '../context/useLanguage';
import { useToast } from '../context/useToast';
export default function PomodoroExport({ session, timezone, disabled = false }) {
  const { t, language } = useLanguage(); const toast = useToast();
  return <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} title={t('File chỉ chứa dữ liệu phiên đã tải từ máy chủ, không gồm ghi chú đang nhập.')} onClick={() => {
    try { const result = pomodoroExport(session, timezone, language, t); downloadText(result.text, result.filename); }
    catch { toast.error(t('Không thể tải bản sao phiên. Hãy tải lại dữ liệu rồi thử lại.')); }
  }}>{t('Tải phiên đã lưu (.txt)')}</button>;
}
