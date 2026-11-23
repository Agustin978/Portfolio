import { useLocation, type To } from 'react-router';
import { useLang } from '../../app/useLang';

// Anchors are the same in both languages, so a shared link like /en#contacto still works.
export const SECTION_IDS = {
  top: 'inicio',
  main: 'contenido',
  projects: 'proyectos',
  about: 'sobre-mi',
  contact: 'contacto',
} as const;

// Links to a section of the home page. From the home itself they keep the query string, so jumping
// to another section does not drop the project filter (?category=).
export function useSectionLink() {
  const lang = useLang();
  const { pathname, search } = useLocation();
  const home = `/${lang}`;
  return (id: string): To => ({
    pathname: home,
    search: pathname === home ? search : '',
    hash: id,
  });
}
