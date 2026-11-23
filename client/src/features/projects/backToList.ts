import type { MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useLang } from '../../app/useLang';
import { SECTION_IDS } from '../layout/sections';

// Router state the project cards attach to their link: the detail knows the list is right behind
// it in the history.
export const FROM_LIST = { fromList: true } as const;

const cameFromList = (state: unknown) =>
  typeof state === 'object' && state !== null && 'fromList' in state;

// "← Projects" from the detail. Coming from a card it steps back in the history, so the list
// comes back with its filter and scroll position. Opened directly (shared link, new tab, after a
// language switch) it is a plain link to the projects section.
export function useBackToList() {
  const lang = useLang();
  const { state } = useLocation();
  const navigate = useNavigate();
  const fromList = cameFromList(state);

  return {
    to: { pathname: `/${lang}`, hash: SECTION_IDS.projects },
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      // Modified clicks (new tab, new window) keep the link's own behavior.
      if (!fromList || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
        return;
      event.preventDefault();
      void navigate(-1);
    },
  };
}
