import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders the gta11 application shell', () => {
  render(<App />);

  expect(screen.getByLabelText('gta11 game')).toBeInTheDocument();
});
