import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only cleans up on its own when the runner exposes globals; ours does not.
afterEach(cleanup);

// jsdom has no layout, so it does not scroll. ScrollRestoration calls these on every navigation;
// without the no-ops jsdom logs "Not implemented" (scrollTo) or throws (scrollIntoView).
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
