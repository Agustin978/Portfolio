import { Navigate } from 'react-router';
import i18n from '../i18n';
import { DEFAULT_LANGUAGE, isLanguage } from '../i18n/languages';

// Picks the language from the browser the first time someone lands on "/".
export function RootRedirect() {
  const detected = i18n.language?.split('-')[0];
  const lang = isLanguage(detected) ? detected : DEFAULT_LANGUAGE;
  return <Navigate to={`/${lang}`} replace />;
}
