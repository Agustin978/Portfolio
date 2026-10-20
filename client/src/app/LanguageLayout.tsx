import { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import i18n from '../i18n';
import { DEFAULT_LANGUAGE, isLanguage } from '../i18n/languages';

export function LanguageLayout() {
  const { lang } = useParams();

  useEffect(() => {
    if (isLanguage(lang)) {
      void i18n.changeLanguage(lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  if (!isLanguage(lang)) return <Navigate to={`/${DEFAULT_LANGUAGE}`} replace />;
  return <Outlet />;
}
