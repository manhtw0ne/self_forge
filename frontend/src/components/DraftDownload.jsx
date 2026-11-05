import { downloadText } from '../utils/downloadText';
import { useLanguage } from '../context/useLanguage';
import { useToast } from '../context/useToast';
import { draftText } from '../utils/draftLibrary';
export default function DraftDownload({ kind, date, form, disabled = false, label = 'Tải bản nháp (.txt)', filename }) {
  const { t, language } = useLanguage(); const toast = useToast();
  const download = () => {
    try {
      downloadText(draftText(kind, date, form, language, t), filename || 'selfforge-' + kind + '-draft-' + date + '.txt');
    } catch { toast.error(t('Không thể tải bản nháp.')); }
  };
  return <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={download}>{t(label)}</button>;
}
