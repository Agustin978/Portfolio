import { useLayoutEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import i18n from '../i18n';
import { DEFAULT_LANGUAGE, isLanguage } from '../i18n/languages';

export function LanguageLayout() {
  const { lang } = useParams();

  // The URL is the source of truth. A layout effect runs before the browser paints, so switching
  // between /es and /en never shows a frame in the previous language.
  useLayoutEffect(() => {
    if (isLanguage(lang) && i18n.resolvedLanguage !== lang) void i18n.changeLanguage(lang);
  }, [lang]);

  if (!isLanguage(lang)) return <Navigate to={`/${DEFAULT_LANGUAGE}`} replace />;
  return <Outlet />;
}
