import type { ContactInput } from './contact.schemas.js';
import type { ContactRepository } from './contact.repository.js';

// The message is stored before anything else can go wrong; sending the email comes after.
export const createContactService = ({ repository }: { repository: ContactRepository }) => ({
  async submit(input: ContactInput) {
    await repository.create(input);
  },
});

export type ContactService = ReturnType<typeof createContactService>;
