import { describe, expect, it } from 'vitest';
import { getCategories } from '../src/services/categories.service';
import { sendContactMessage } from '../src/services/contact.service';
import { getExperiences } from '../src/services/experiences.service';
import { getProfile } from '../src/services/profile.service';
import { getProject, getProjects } from '../src/services/projects.service';
import { getSkills } from '../src/services/skills.service';
import { getSocialLinks } from '../src/services/socialLinks.service';
import { mockApi, ok } from './helpers/mockApi';

describe('services', () => {
  it('ask for translated content in the requested language and return only data', async () => {
    const api = mockApi()
      .on('GET /profile?lang=en', ok({ fullName: 'Agustín' }))
      .on('GET /projects?lang=en', ok([{ slug: 'rucvm' }], { count: 1 }))
      .on('GET /project-categories?lang=es', ok([{ slug: 'web', name: 'Web' }]))
      .on('GET /experiences?lang=es', ok([]));

    expect(await getProfile('en')).toEqual({ fullName: 'Agustín' });
    expect(await getProjects('en')).toEqual([{ slug: 'rucvm' }]);
    expect(await getCategories('es')).toEqual([{ slug: 'web', name: 'Web' }]);
    expect(await getExperiences('es')).toEqual([]);
    expect(api.calls.map((call) => call.route)).toEqual([
      'GET /profile?lang=en',
      'GET /projects?lang=en',
      'GET /project-categories?lang=es',
      'GET /experiences?lang=es',
    ]);
  });

  it('do not send ?lang where the API does not translate', async () => {
    const api = mockApi().on('GET /skills', ok([])).on('GET /social-links', ok([]));

    await getSkills();
    await getSocialLinks();

    expect(api.calls.map((call) => call.route)).toEqual(['GET /skills', 'GET /social-links']);
  });

  it('encode the project slug in the path', async () => {
    const api = mockApi().on('GET /projects/a%2Fb%3Fx?lang=es', ok({ slug: 'a/b?x' }));

    await getProject('a/b?x', 'es');

    expect(api.calls[0]!.route).toBe('GET /projects/a%2Fb%3Fx?lang=es');
  });

  it('send the contact message as is and return the receipt', async () => {
    const api = mockApi().on('POST /contact', ok({ received: true }, {}, 201));
    const message = {
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Hola, ¿hablamos?',
      lang: 'es' as const,
      hp_check: '',
    };

    expect(await sendContactMessage(message)).toEqual({ received: true });
    expect(api.calls[0]!.body).toEqual(message);
  });
});
