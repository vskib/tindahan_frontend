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
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card shadow-sm" style={{ marginTop: '12vh' }}>
        <div className="card-body p-4">
          <h1 className="h4 text-center mb-4">🏪 Tindahan POS</h1>
          {(error || message) && <div className="alert alert-danger" role="alert">{error || message}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-control" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="form-control" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary w-100" disabled={busy}>{busy && <Spin />}Log in</button>
          </form>
        </div>
      </div>
    </div>
  );
}
