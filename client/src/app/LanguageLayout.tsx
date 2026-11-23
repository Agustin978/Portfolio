import { useLayoutEffect } from 'react';
import { useParams } from 'react-router';
import { SiteLayout } from '../features/layout/SiteLayout';
import i18n from '../i18n';
import { isLanguage } from '../i18n/languages';
import { RootRedirect } from './RootRedirect';

export function LanguageLayout() {
  const { lang } = useParams();

  // The URL is the source of truth. A layout effect runs before the browser paints, so switching
  // between /es and /en never shows a frame in the previous language.
  useLayoutEffect(() => {
    if (isLanguage(lang) && i18n.resolvedLanguage !== lang) void i18n.changeLanguage(lang);
  }, [lang]);

  // A first segment that is not a language (/fr, /proyectos) goes to the detected language.
  if (!isLanguage(lang)) return <RootRedirect />;
  return <SiteLayout />;
}
