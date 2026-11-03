import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Spin } from '../components/Ui.jsx';

export default function Login() {
  const { status, message, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (status === 'ready') return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try { await login(email, password); } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <div className="mx-auto w-full max-w-md px-4">
      <div className="card mt-[12vh] border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body p-6">
          <h1 className="mb-4 text-center text-2xl font-bold">🏪 Che's Tindahan</h1>
          {(error || message) && <div className="alert alert-error" role="alert">{error || message}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium" htmlFor="email">Email</label>
              <input id="email" type="email" className="input input-bordered w-full" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label>
              <input id="password" type="password" className="input input-bordered w-full" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spin />}Log in</button>
          </form>
        </div>
      </div>
    </div>
  );
}
