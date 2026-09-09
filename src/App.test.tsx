import { render, screen } from '@testing-library/react';
import { App } from './App';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => vi.unstubAllGlobals());

test('renders the gta11 application shell', () => {
  render(<App />);

  expect(screen.getByLabelText('gta11 game')).toBeInTheDocument();
});

test('mounts one game canvas', () => {
  const { container } = render(<App />);
  expect(container.querySelectorAll('canvas')).toHaveLength(1);
});
