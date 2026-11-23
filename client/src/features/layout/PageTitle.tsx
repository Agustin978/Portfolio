import { useTranslation } from 'react-i18next';
import { useLang } from '../../app/useLang';
import { useProfile } from '../../hooks/queries';

// React 19 hoists <title> into <head>. The name joins in once the profile arrives.
export function PageTitle({ page }: { page?: string }) {
  const { t } = useTranslation();
  const profile = useProfile(useLang());
  const parts = [page, profile.data?.fullName, t('meta.title')].filter(Boolean);
  return <title>{parts.join(' · ')}</title>;
}
