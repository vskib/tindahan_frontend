import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/api.js', () => ({ api: vi.fn(async () => ({ data: [], total: 0 })) }));
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => ({ isOwner: true }) }));
import { api } from '../lib/api.js';
import Products from './Products.jsx';

describe('Products form', () => {
  it('keeps keyboard focus while typing (regression: inputs were remounted on every keystroke)', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Products /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /add product/i }));
    const name = screen.getByLabelText('Product name');
    await user.type(name, 'Lucky Me Pancit Canton');
    expect(screen.getByLabelText('Product name')).toBe(name);              // same DOM node: not remounted
    expect(name).toHaveValue('Lucky Me Pancit Canton');
    expect(name).toHaveFocus();
  });

  it('shows friendly validation messages and sends nothing when the form is invalid', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Products /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /add product/i }));
    await user.type(screen.getByLabelText(/selling price/i), '12.345');
    api.mockClear();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter the product name.')).toBeInTheDocument();
    expect(screen.getByText(/Enter a selling price like 12 or 12.50/)).toBeInTheDocument();
    expect(screen.getByText(/Enter the cost price/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});
