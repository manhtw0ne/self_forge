import { goalDraftExport } from '../utils/goalDraft';
import { downloadText } from '../utils/downloadText';
import { useLanguage } from '../context/useLanguage';
import { useToast } from '../context/useToast';
export default function GoalDraftDownload({ form, timezone, disabled, editing = false }) {
  const { t } = useLanguage(); const toast = useToast();
  return <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => {
    try { const result = goalDraftExport(form, timezone, t, undefined, editing); downloadText(result.text, result.filename); }
    catch { toast.error(t('Không thể tải bản nháp.')); }
  }}>{t('Tải bản nháp mục tiêu (.txt)')}</button>;
}
