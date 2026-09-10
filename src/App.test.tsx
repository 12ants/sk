import { render, screen } from '@testing-library/react';
import { App } from './App';
import { gameUiStore } from './game/ui/gameUiStore';

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

test('mounts the React loading overlay alongside its canvas', () => {
  gameUiStore.setLoading(true);
  render(<App />);
  expect(screen.getByRole('heading', { name: 'gta11' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/Loading/);
});
