import ErrorBoundary from './ErrorBoundary';
import { useLanguage } from '../context/useLanguage';
export default function PageErrorBoundary({ children }) {
  const { t } = useLanguage();
  return <ErrorBoundary t={t}>{children}</ErrorBoundary>;
}
