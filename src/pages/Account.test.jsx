import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/supabase.js', () => ({ supabase: { auth: { updateUser: vi.fn() } } }));
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => globalThis.__auth }));
vi.mock('../lib/api.js', () => ({ api: vi.fn(async () => ({ data: [] })) }));

import Account from './Account.jsx';

const setAuth = (role) => {
  globalThis.__auth = {
    profile: { id: 'user-id', role, full_name: 'Store User', store_name: 'Test Store' },
    email: `${role}@example.com`,
    isOwner: role === 'owner',
    logout: vi.fn(),
  };
};

describe('Account permissions', () => {
  it('explains owner access and identifies the signed-in role', () => {
    setAuth('owner');
    render(<Account />);
    expect(screen.getByText('Store permissions')).toBeInTheDocument();
    expect(screen.getByText('Manage products and stock')).toBeInTheDocument();
    expect(screen.getByText('View store-wide sales and reports')).toBeInTheDocument();
    expect(screen.getByText('Your role')).toBeInTheDocument();
    expect(screen.getByText('Staff accounts')).toBeInTheDocument();
  });

  it('explains cashier access without showing owner staff controls', () => {
    setAuth('cashier');
    render(<Account />);
    expect(screen.getByText('Process sales and print receipts')).toBeInTheDocument();
    expect(screen.getByText('View your own sales history')).toBeInTheDocument();
    expect(screen.getByText('Your role')).toBeInTheDocument();
    expect(screen.queryByText('Staff accounts')).not.toBeInTheDocument();
  });
});
