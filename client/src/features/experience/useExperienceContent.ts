import { useExperiences } from '../../hooks/queries';
import type { Language } from '../../i18n/languages';

// Shared by the section and the menu: "Experience" disappears, link included, only once we know
// there are no entries. While loading, or after an error (the section shows it), it stays.
export function useExperienceContent(lang: Language) {
  const experiences = useExperiences(lang);
  const visible = !(experiences.isSuccess && experiences.data.length === 0);
  return { experiences, visible };
}
