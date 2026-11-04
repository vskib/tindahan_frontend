import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn() }));
vi.mock('../lib/supabase.js', () => ({ supabase: { auth: { updateUser } } }));
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => globalThis.__auth }));
vi.mock('../lib/api.js', () => ({ api: vi.fn(async () => ({ data: [] })) }));

import Account from './Account.jsx';

describe('Account email updates', () => {
  beforeEach(() => {
    updateUser.mockReset().mockResolvedValue({ error: null });
    globalThis.__auth = {
      profile: { id: 'owner-id', role: 'owner', full_name: 'Store Owner', store_name: 'Test Store' },
      email: 'owner@example.com',
      isOwner: true,
      logout: vi.fn(),
    };
  });

  it('lets owners request an email change and explains confirmation', async () => {
    const user = userEvent.setup();
    render(<Account />);
    const input = screen.getByLabelText('New email');
    await user.clear(input);
    await user.type(input, 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'Update email' }));

    expect(updateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(await screen.findByRole('status')).toHaveTextContent('Confirmation email sent');
  });

  it('does not offer email changes to cashiers', () => {
    globalThis.__auth = { ...globalThis.__auth, isOwner: false, profile: { ...globalThis.__auth.profile, role: 'cashier' } };
    render(<Account />);
    expect(screen.queryByLabelText('New email')).not.toBeInTheDocument();
  });

  it('shows Supabase errors', async () => {
    updateUser.mockResolvedValue({ error: { message: 'Email is already registered.' } });
    const user = userEvent.setup();
    render(<Account />);
    const input = screen.getByLabelText('New email');
    await user.clear(input);
    await user.type(input, 'taken@example.com');
    await user.click(screen.getByRole('button', { name: 'Update email' }));
    expect(await screen.findByText('Email is already registered.')).toBeInTheDocument();
  });
});
