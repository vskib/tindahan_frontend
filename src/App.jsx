import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import { configError } from './lib/supabase.js';
import Layout from './components/Layout.jsx';
import { Loading } from './components/Ui.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import POS from './pages/POS.jsx';
import Products from './pages/Products.jsx';
import Inventory from './pages/Inventory.jsx';
import Sales from './pages/Sales.jsx';
import Account from './pages/Account.jsx';

function RequireAuth() {
  const { status, message, retry } = useAuth();
  if (status === 'loading') return <div className="container py-5"><Loading text="Starting…" /></div>;
  if (status === 'anon') return <Navigate to="/login" replace />;
  if (status === 'error') return (
    <div className="container py-5 text-center">
      <div className="alert alert-danger d-inline-block">{message}</div>
      <div><button className="btn btn-primary" onClick={retry}>Try again</button></div>
    </div>
  );
  return <Layout />;
}
// The API enforces roles; this only keeps cashiers from landing on pages that would just show errors.
function RequireOwner() {
  const { isOwner } = useAuth();
  return isOwner ? <Outlet /> : <Navigate to="/pos" replace />;
}
const Home = () => (useAuth().isOwner ? <Dashboard /> : <Navigate to="/pos" replace />);

export default function App() {
  if (configError) return <div className="container py-5"><div className="alert alert-danger"><strong>Setup incomplete.</strong> {configError}</div></div>;
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route index element={<Home />} />
            <Route path="pos" element={<POS />} />
            <Route path="products" element={<Products />} />
            <Route path="sales" element={<Sales />} />
            <Route path="account" element={<Account />} />
            <Route element={<RequireOwner />}>
              <Route path="inventory" element={<Inventory />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
