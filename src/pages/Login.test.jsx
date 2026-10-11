import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const login = vi.fn();
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => ({ status: 'anon', message: null, login }) }));
import Login from './Login.jsx';

describe('Login page', () => {
  it('shows a generic error on failure and re-enables the form', async () => {
    login.mockRejectedValueOnce(new Error('Incorrect email or password.'));
    const user = userEvent.setup();
    render(<Login />);
    await user.type(screen.getByLabelText('Email'), 'a@b.co');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.getByRole('button', { name: /log in/i })).toBeEnabled();
    expect(login).toHaveBeenCalledWith('a@b.co', 'wrong-password');
  });
});
