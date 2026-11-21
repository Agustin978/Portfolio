import { afterAll } from 'vitest';
import { disconnectPrisma } from '../../src/shared/db/index.js';

// Runs after every test file: the API suites reach the database through the app's lazy client,
// which no test owns, so nothing else would close its connections.
afterAll(disconnectPrisma);
