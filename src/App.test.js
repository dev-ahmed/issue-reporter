import { render, screen } from '@testing-library/react';
import App from './App';

test('renders issue reporter', () => {
  render(<App />);
  const linkElement = screen.getByText(/issue reporter/i);
  expect(linkElement).toBeInTheDocument();
});