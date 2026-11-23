import { useTranslation } from 'react-i18next';
import { useLang } from '../../app/useLang';
import { ErrorBlock } from '../../components/ui/ErrorBlock';
import { PAGE_COLUMN } from '../../components/ui/layout';
import { Loading } from '../../components/ui/Loading';
import { PillLink } from '../../components/ui/PillLink';
import { Skeleton } from '../../components/ui/Skeleton';
import { SocialIcon } from '../../components/ui/SocialIcon';
import { useProfile, useSocialLinks } from '../../hooks/queries';
import { canRetry, errorMessageKey } from '../../lib/apiErrors';
import { mailtoHref, safeUrl } from '../../lib/safeUrl';
import { SECTION_IDS } from '../layout/sections';
import { LazyContactForm } from './LazyContactForm';

const TITLE_ID = 'contact-title';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// The dark panel of the design: title, availability, email and social links, and the form in a
// second column from 1024 px (below it on narrower screens).
export function ContactSection() {
  const { t } = useTranslation();
  const profile = useProfile(useLang());
  const socialLinks = useSocialLinks();

  const mailto = mailtoHref(profile.data?.publicEmail);
  const links = (socialLinks.data ?? []).flatMap((link) => {
    const href = safeUrl(link.url);
    return href ? [{ ...link, href }] : [];
  });

  return (
    <section id={SECTION_IDS.contact} aria-labelledby={TITLE_ID} className="w-full">
      <div className={`${PAGE_COLUMN} pb-[clamp(48px,8vw,80px)]`}>
        <div className="on-dark grid gap-12 rounded-panel bg-fg p-[clamp(24px,6vw,64px)] text-bg lg:grid-cols-2 lg:gap-16">
          <div className="flex min-w-0 flex-col items-start gap-5">
            <h2
              id={TITLE_ID}
              className="m-0 max-w-[14em] text-[clamp(28px,5vw,48px)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance"
            >
              {t('contact.title')}
            </h2>

            {profile.isPending ? (
              <Loading label={t('common.loading')}>
                <Skeleton tone="dark" className="h-5 w-[min(52ch,70vw)]" />
              </Loading>
            ) : (
              <p className="m-0 max-w-[52ch] text-[17px] leading-[1.6] text-pretty text-border-strong">
                {profile.data?.availability ?? t('contact.lead')}
              </p>
            )}

            {socialLinks.isError && (
              <ErrorBlock
                message={t(errorMessageKey(socialLinks.error))}
                retryLabel={t('errors.retry')}
                onRetry={canRetry(socialLinks.error) ? () => void socialLinks.refetch() : undefined}
              />
            )}

            {(mailto || links.length > 0 || socialLinks.isPending) && (
              <div className="flex flex-wrap gap-3 pt-3">
                {mailto && (
                  <PillLink href={mailto} variant="light">
                    {profile.data?.publicEmail?.trim()}
                  </PillLink>
                )}
                {links.map((link) => (
                  <PillLink
                    key={link.platform}
                    href={link.href}
                    variant="ghost"
                    icon={<SocialIcon platform={link.platform} />}
                    newTabLabel={t('common.newTab')}
                  >
                    {t(`social.${link.platform.toLowerCase()}`, {
                      defaultValue: capitalize(link.platform),
                    })}
                  </PillLink>
                ))}
                {socialLinks.isPending && (
                  <div aria-hidden="true" className="flex gap-3">
                    <Skeleton tone="dark" shape="pill" className="h-12 w-32" />
                    <Skeleton tone="dark" shape="pill" className="h-12 w-32" />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <LazyContactForm mailto={mailto} email={profile.data?.publicEmail?.trim()} />
          </div>
        </div>
      </div>
    </section>
  );
}
