import { ContactSection } from '../contact/ContactSection';
import { Hero } from '../hero/Hero';
import { PageTitle } from '../layout/PageTitle';
import { ProjectsSection } from '../projects/ProjectsSection';

// Each section fetches its own data, so one failing never takes the others down.
export function Home() {
  return (
    <>
      <PageTitle />
      <Hero />
      <ProjectsSection />
      <ContactSection />
    </>
  );
}
