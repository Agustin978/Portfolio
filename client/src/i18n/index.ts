import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';

// The URL is the source of truth for the active language (LanguageLayout syncs it);
// the detector is only used to pick the initial redirect from "/".
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: DEFAULT_LANGUAGE,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: { order: ['navigator'], caches: [] },
  });

export default i18n;
