import { apiClient } from './apiClient';
import type { ContactMessage, ContactReceipt } from './types';

// The 201 only says the message was stored, not that the email went out.
export const sendContactMessage = (message: ContactMessage) =>
  apiClient.post<ContactReceipt>('/contact', message).then((body) => body.data);
