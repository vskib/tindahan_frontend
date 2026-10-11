import { useState } from 'react';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useFetch } from '../lib/hooks.js';
import Modal from '../components/Modal.jsx';
import { ErrorAlert, Loading, Spin } from '../components/Ui.jsx';

function ChangePassword() {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 10) return setMsg({ kind: 'danger', text: 'Use at least 10 characters.' });
    if (pw !== pw2) return setMsg({ kind: 'danger', text: 'The two passwords do not match.' });
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg({ kind: 'danger', text: error.message });
    else { setMsg({ kind: 'success', text: 'Password changed.' }); setPw(''); setPw2(''); }
  };
  return (
    <div className="card shadow-sm mb-3"><div className="card-header"><strong>Change password</strong></div>
      <form className="card-body" onSubmit={submit}>
        {msg && <div className={`alert alert-${msg.kind}`}>{msg.text}</div>}
        <div className="mb-2"><label className="form-label" htmlFor="pw">New password</label><input id="pw" type="password" autoComplete="new-password" className="form-control" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div className="mb-3"><label className="form-label" htmlFor="pw2">Repeat new password</label><input id="pw2" type="password" autoComplete="new-password" className="form-control" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        <button className="btn btn-primary" disabled={busy}>{busy && <Spin />}Change password</button>
      </form></div>
  );
}

function AddCashier({ onClose, onSaved }) {
  const [f, setF] = useState({ full_name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try { await api('/api/users', { method: 'POST', body: { ...f, full_name: f.full_name.trim(), email: f.email.trim() } }); onSaved(); }
    catch (err) { setError(err.fields?.length ? err.fields.map((x) => `${x.path}: ${x.message}`).join('; ') : err.message); setBusy(false); }
  };
  return (
    <Modal title="Add cashier account" onClose={onClose}
      footer={<><button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-primary" form="cashier-form" disabled={busy}>{busy && <Spin />}Create account</button></>}>
      <form id="cashier-form" onSubmit={submit}>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="mb-3"><label className="form-label" htmlFor="cn">Full name</label><input id="cn" className="form-control" required value={f.full_name} onChange={set('full_name')} /></div>
        <div className="mb-3"><label className="form-label" htmlFor="ce">Email (used to log in)</label><input id="ce" type="email" className="form-control" required value={f.email} onChange={set('email')} /></div>
        <div className="mb-1"><label className="form-label" htmlFor="cp">Starting password</label><input id="cp" type="text" autoComplete="off" className="form-control" required minLength={10} value={f.password} onChange={set('password')} />
          <div className="form-text">At least 10 characters. Give it to the cashier privately; they can change it under Account.</div></div>
      </form>
    </Modal>
  );
}

function Staff({ myId }) {
  const users = useFetch(() => api('/api/users'), []);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const toggle = async (u) => {
    if (u.is_active && !window.confirm(`Disable ${u.full_name}? They will be logged out and unable to sign in.`)) return;
    setBusyId(u.id); setError(null);
    try { await api(`/api/users/${u.id}`, { method: 'PATCH', body: { is_active: !u.is_active } }); users.reload(); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  };
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header d-flex justify-content-between align-items-center"><strong>Staff accounts</strong><button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}>+ Add cashier</button></div>
      <div className="card-body p-0">
        {error && <div className="alert alert-danger m-3">{error}</div>}
        <ErrorAlert error={users.error} onRetry={users.reload} />
        {users.loading && !users.data && <Loading />}
        <div className="table-responsive"><table className="table mb-0"><tbody>
          {users.data?.data.map((u) => (
            <tr key={u.id}><td>{u.full_name}<div className="text-muted small">{u.email}</div></td><td>{u.role === 'owner' ? 'Owner' : 'Cashier'}</td>
              <td>{u.is_active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Disabled</span>}</td>
              <td className="text-end">{u.id !== myId && <button className="btn btn-sm btn-outline-secondary" disabled={busyId === u.id} onClick={() => toggle(u)}>{u.is_active ? 'Disable' : 'Enable'}</button>}</td></tr>))}
        </tbody></table></div>
      </div>
      {adding && <AddCashier onClose={() => setAdding(false)} onSaved={() => { setAdding(false); users.reload(); }} />}
    </div>
  );
}

export default function Account() {
  const { profile, email, logout, isOwner } = useAuth();
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="page-title">Account</h1>
      <div className="card shadow-sm mb-3"><div className="card-body">
        <div className="fs-5 fw-semibold">{profile.full_name}</div>
        <div className="text-muted">{email}</div>
        <div className="mb-3">{isOwner ? 'Owner' : 'Cashier'} · {profile.store_name}</div>
        <button className="btn btn-outline-danger" onClick={logout}>Log out</button>
      </div></div>
      <ChangePassword />
      {isOwner && <Staff myId={profile.id} />}
    </div>
  );
}
