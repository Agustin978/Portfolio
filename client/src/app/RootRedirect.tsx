import { Navigate } from 'react-router';
import i18n from '../i18n';
import { DEFAULT_LANGUAGE, isLanguage } from '../i18n/languages';

// Sends "/" and any first segment that is not a language to the detected one (the browser's
// first supported language on a first visit, the current one afterwards).
export function RootRedirect() {
  const detected = i18n.resolvedLanguage;
  const lang = isLanguage(detected) ? detected : DEFAULT_LANGUAGE;
  return <Navigate to={`/${lang}`} replace />;
}
