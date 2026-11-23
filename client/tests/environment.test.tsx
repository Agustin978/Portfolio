import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      {count}
    </button>
  );
}

// Guards the test setup itself: jsdom, Testing Library, jest-dom matchers and cleanup.
describe('test environment', () => {
  it('renders into jsdom and handles user events', async () => {
    render(<Counter />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('1');
  });

  it('starts every test with an empty document', () => {
    expect(document.body).toBeEmptyDOMElement();
  });
});
