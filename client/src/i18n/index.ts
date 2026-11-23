import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';

// <html lang> follows the active language, so screen readers pronounce the page correctly.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = i18n.resolvedLanguage ?? lng;
});

// The path comes first: a direct link to /en starts in English on the first render instead of
// flashing Spanish until an effect runs. On "/" there is no language in the path, so the browser's
// languages decide (the first supported one), which RootRedirect then puts in the URL.
// Resources are bundled, so init finishes synchronously, before React renders.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: DEFAULT_LANGUAGE,
    nonExplicitSupportedLngs: true,
    // "es-AR" resolves to "es": language is the short code everywhere (URL, <html lang>, API).
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: { order: ['path', 'navigator'], lookupFromPathIndex: 0, caches: [] },
  });

export default i18n;
