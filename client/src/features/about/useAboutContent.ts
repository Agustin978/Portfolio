import { useProfile, useSkills } from '../../hooks/queries';
import type { Language } from '../../i18n/languages';
import { toParagraphs } from '../../lib/paragraphs';

// Shared by the section and the menu: "About me" disappears, link included, only when we know
// there is nothing to show (no bio and no skills). While loading, or when skills fail, it stays.
// A profile error does not keep it: the hero already shows that error with its retry button.
export function useAboutContent(lang: Language) {
  const profile = useProfile(lang);
  const skills = useSkills();

  const bio = toParagraphs(profile.data?.bio);
  const groups = (skills.data ?? []).filter((group) => group.technologies.length > 0);

  const noBio = profile.isError || (profile.isSuccess && bio.length === 0);
  const noSkills = skills.isSuccess && groups.length === 0;

  return { profile, skills, bio, groups, visible: !(noBio && noSkills) };
}
