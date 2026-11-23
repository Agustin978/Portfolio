import { useParams } from 'react-router';
import { DEFAULT_LANGUAGE, isLanguage, type Language } from '../i18n/languages';

// The language of the data always comes from the URL. LanguageLayout already redirects an
// unsupported segment, so the fallback only covers components rendered outside it.
export function useLang(): Language {
  const { lang } = useParams();
  return isLanguage(lang) ? lang : DEFAULT_LANGUAGE;
}
